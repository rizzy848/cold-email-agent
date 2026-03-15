"""
Recruiter email finder — three-layer pipeline (all free, no credit card):

1. LLM extracts company name from job description
2. DuckDuckGo resolves the company domain
3. Hunter.io domain search (if HUNTER_API_KEY set) → verified emails with confidence scores
4. Fallback: DuckDuckGo regex scrape for publicly listed emails
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

SKIP_LOCAL_PARTS = {
    "noreply", "no-reply", "support", "info", "hello", "careers",
    "jobs", "contact", "team", "press", "legal", "privacy", "security",
    "admin", "abuse", "unsubscribe", "news", "newsletter",
}

SKIP_DOMAINS = {
    "linkedin.com", "indeed.com", "glassdoor.com", "google.com",
    "wikipedia.org", "ycombinator.com", "twitter.com", "x.com",
    "facebook.com", "crunchbase.com", "github.com", "youtube.com",
}


# ── Models ─────────────────────────────────────────────────────────────────────

class FindRecruitersRequest(BaseModel):
    job_description: str


# ── Internal helpers ───────────────────────────────────────────────────────────

def _llm_client() -> Groq:
    return Groq(api_key=os.getenv("LLM_API_KEY"))


def _extract_company(jd: str, client: Groq) -> dict:
    """Pull company name, optional recruiter name, and domain hint from the JD."""
    response = client.chat.completions.create(
        model=os.getenv("LLM_MODEL", "llama-3.3-70b-versatile"),
        max_tokens=120,
        messages=[{
            "role": "user",
            "content": (
                "Extract from this job description and return ONLY valid JSON with these exact keys:\n"
                '- "company": company name (string)\n'
                '- "recruiter_name": recruiter or hiring manager name if explicitly mentioned, else ""\n'
                '- "domain_hint": company website domain if mentioned (e.g. shopify.com), else ""\n\n'
                f"Job Description:\n{jd[:2000]}\n\nJSON:"
            ),
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


def _resolve_domain(company: str, domain_hint: str) -> str:
    """Resolve company web domain. Uses hint if provided, else DuckDuckGo."""
    if domain_hint and "." in domain_hint:
        clean = domain_hint.replace("https://", "").replace("http://", "")
        clean = clean.replace("www.", "").split("/")[0]
        return clean.lower()

    if not DDG_AVAILABLE or not company:
        return ""

    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(f"{company} official website", max_results=5))
        for r in results:
            href = r.get("href", "")
            m = re.search(r"https?://(?:www\.)?([a-zA-Z0-9\-]+\.[a-zA-Z]{2,4})(?:/|$)", href)
            if m:
                domain = m.group(1).lower()
                if domain not in SKIP_DOMAINS:
                    return domain
    except Exception:
        pass
    return ""


async def _hunter_search(domain: str) -> list[dict]:
    """Hunter.io domain-search. Returns [] if key missing or request fails."""
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

        emails = res.json().get("data", {}).get("emails", [])

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
                "email": e["value"],
                "title": e.get("position") or "",
                "confidence": min(int(e.get("confidence", 50)), 100),
                "source": "hunter",
            }
            for e in emails[:8]
            if e.get("value")
        ]
    except Exception:
        return []


def _ddg_email_search(company: str, domain: str) -> list[dict]:
    """Scrape DuckDuckGo results for publicly listed company emails as fallback."""
    if not DDG_AVAILABLE:
        return []

    found: set[str] = set()
    queries = []
    if domain:
        queries.append(f'recruiter OR "talent acquisition" "@{domain}"')
    queries.append(f'"{company}" recruiter "hiring manager" email contact')

    try:
        with DDGS() as ddgs:
            for query in queries[:2]:
                for item in list(ddgs.text(query, max_results=6)):
                    blob = item.get("body", "") + " " + item.get("title", "")
                    for email in EMAIL_REGEX.findall(blob):
                        local = email.split("@")[0].lower()
                        if local in SKIP_LOCAL_PARTS:
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


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("/find-recruiters")
async def find_recruiters(payload: FindRecruitersRequest):
    """
    Given a job description, auto-detect the company, find its domain,
    and return recruiter emails from Hunter.io (or DuckDuckGo fallback).
    """
    jd = payload.job_description.strip()
    if not jd:
        raise HTTPException(status_code=400, detail="job_description is required.")

    client = _llm_client()

    # 1. Extract company from JD
    extracted = _extract_company(jd, client)
    company = extracted.get("company", "").strip()
    if not company:
        raise HTTPException(status_code=422, detail="Could not detect company name from job description.")

    # 2. Resolve domain
    domain = _resolve_domain(company, extracted.get("domain_hint", ""))

    # 3. Hunter.io (preferred)
    contacts = await _hunter_search(domain)

    # 4. DuckDuckGo fallback
    if not contacts:
        contacts = _ddg_email_search(company, domain)

    return {
        "company": company,
        "domain": domain,
        "contacts": contacts,
        "hunter_used": bool(contacts and contacts[0].get("source") == "hunter"),
    }
