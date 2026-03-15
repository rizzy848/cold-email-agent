"""
Recruiter email finder — three-layer pipeline:
1. Extract company name from job description using LLM
2. Find company domain via DuckDuckGo (free)
3. Hunter.io domain search (if HUNTER_API_KEY set) → verified emails
4. Fallback: DuckDuckGo regex email scrape from public pages
"""
import os
import re
import json
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq

try:
    from duckduckgo_search import DDGS
    DDG_AVAILABLE = True
except ImportError:
    DDG_AVAILABLE = False

router = APIRouter()

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

SKIP_EMAILS = {"noreply", "no-reply", "support", "info", "hello", "careers",
               "jobs", "contact", "team", "press", "legal", "privacy", "security"}

RECRUITING_ROLES = {"recruiter", "talent", "hiring", "hr", "human resources",
                    "people", "acquisition", "staffing", "workforce"}


# ── Request/Response models ────────────────────────────────────────────────────

class FindRecruitersRequest(BaseModel):
    job_description: str


class Contact(BaseModel):
    name: str
    email: str
    title: str
    confidence: int   # 0-100
    source: str       # "hunter" | "web"


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_llm_client() -> Groq:
    return Groq(api_key=os.getenv("LLM_API_KEY"))


def _extract_company_from_jd(job_description: str, client: Groq) -> dict:
    """Use LLM to pull company name, recruiter name, and domain hint from JD."""
    response = client.chat.completions.create(
        model=os.getenv("LLM_MODEL", "llama-3.3-70b-versatile"),
        max_tokens=150,
        messages=[{
            "role": "user",
            "content": f"""Extract from this job description and return ONLY valid JSON with these exact keys:
- company: the company name (string)
- recruiter_name: recruiter or hiring manager name if explicitly stated, else empty string
- domain_hint: company website domain if mentioned (e.g. shopify.com), else empty string

Job Description:
{job_description[:2000]}

JSON:""",
        }],
    )
    text = response.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    try:
        return json.loads(text.strip())
    except Exception:
        return {"company": "", "recruiter_name": "", "domain_hint": ""}


def _find_company_domain(company_name: str, domain_hint: str = "") -> str:
    """Resolve the company's web domain."""
    # Use hint if it looks like a domain
    if domain_hint and "." in domain_hint:
        clean = domain_hint.replace("https://", "").replace("http://", "")
        clean = clean.replace("www.", "").split("/")[0]
        return clean.lower()

    if not DDG_AVAILABLE or not company_name:
        return ""

    skip_domains = {
        "linkedin.com", "indeed.com", "glassdoor.com", "google.com",
        "wikipedia.org", "ycombinator.com", "twitter.com", "x.com",
        "facebook.com", "crunchbase.com",
    }

    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(f"{company_name} official website", max_results=5))
        for r in results:
            href = r.get("href", "")
            match = re.search(
                r"https?://(?:www\.)?([a-zA-Z0-9\-]+\.[a-zA-Z]{2,4})(?:/|$)", href
            )
            if match:
                domain = match.group(1).lower()
                if domain not in skip_domains:
                    return domain
    except Exception:
        pass
    return ""


async def _hunter_search(domain: str) -> list[dict]:
    """Call Hunter.io domain-search API. Returns [] if no key or request fails."""
    api_key = os.getenv("HUNTER_API_KEY", "").strip()
    if not api_key or not domain:
        return []

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://api.hunter.io/v2/domain-search",
                params={"domain": domain, "api_key": api_key, "limit": 20},
                timeout=8,
            )
        if res.status_code != 200:
            return []

        data = res.json().get("data", {})
        emails = data.get("emails", [])

        def _score(e: dict) -> int:
            pos = (e.get("position") or "").lower()
            if any(kw in pos for kw in ["recruiter", "talent", "hiring"]):
                return 3
            if any(kw in pos for kw in ["hr", "people", "acquisition"]):
                return 2
            return 1

        emails.sort(key=_score, reverse=True)

        return [
            {
                "name": f"{e.get('first_name', '')} {e.get('last_name', '')}".strip(),
                "email": e.get("value", ""),
                "title": e.get("position", "") or "",
                "confidence": min(int(e.get("confidence", 50)), 100),
                "source": "hunter",
            }
            for e in emails[:8]
            if e.get("value")
        ]
    except Exception:
        return []


def _ddg_email_search(company_name: str, domain: str = "") -> list[dict]:
    """Scrape publicly indexed pages for email addresses via DuckDuckGo."""
    if not DDG_AVAILABLE:
        return []

    found: set[str] = set()
    queries = []
    if domain:
        queries.append(f'recruiter OR "talent acquisition" "@{domain}"')
    queries.append(f'"{company_name}" recruiter hiring manager email contact')

    try:
        with DDGS() as ddgs:
            for query in queries[:2]:
                items = list(ddgs.text(query, max_results=6))
                for item in items:
                    blob = (item.get("body", "") + " " + item.get("title", "")).lower()
                    for email in EMAIL_REGEX.findall(blob):
                        local = email.split("@")[0].lower()
                        if local in SKIP_EMAILS:
                            continue
                        if domain and domain not in email.lower():
                            continue
                        found.add(email.lower())
    except Exception:
        pass

    return [
        {"name": "", "email": e, "title": "", "confidence": 35, "source": "web"}
        for e in list(found)[:5]
    ]


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/find-recruiters")
async def find_recruiters_from_jd(payload: FindRecruitersRequest):
    """
    Auto-extract company from job description, then find recruiter emails
    via Hunter.io (if configured) and DuckDuckGo fallback.
    """
    if not payload.job_description.strip():
        raise HTTPException(status_code=400, detail="job_description is required.")

    client = _get_llm_client()

    # Step 1: Extract company info from JD
    extracted = _extract_company_from_jd(payload.job_description, client)
    company_name = extracted.get("company", "").strip()
    domain_hint = extracted.get("domain_hint", "").strip()

    if not company_name:
        raise HTTPException(status_code=422, detail="Could not detect company name from job description.")

    # Step 2: Resolve domain
    domain = _find_company_domain(company_name, domain_hint)

    # Step 3: Hunter.io (preferred — higher confidence)
    contacts = await _hunter_search(domain)

    # Step 4: DuckDuckGo fallback if Hunter.io returned nothing
    if not contacts:
        contacts = _ddg_email_search(company_name, domain)

    hunter_configured = bool(os.getenv("HUNTER_API_KEY", "").strip())

    return {
        "company": company_name,
        "domain": domain,
        "hunter_used": hunter_configured and bool(contacts and contacts[0]["source"] == "hunter"),
        "contacts": contacts,
    }


@router.get("/find-recruiters")
async def find_recruiters_by_name(company: str):
    """
    Legacy GET endpoint — search by company name directly.
    Kept for backward compatibility.
    """
    if not company.strip():
        raise HTTPException(status_code=400, detail="company is required.")

    domain = _find_company_domain(company)
    contacts = await _hunter_search(domain)
    if not contacts:
        contacts = _ddg_email_search(company, domain)

    return {
        "company": company,
        "domain": domain,
        "contacts": contacts,
    }
