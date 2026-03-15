import os
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

HUNTER_API_KEY = os.getenv("HUNTER_API_KEY")
RECRUITING_KEYWORDS = {"recruiter", "talent", "hiring", "hr", "human resources", "acquisition", "people"}


@router.get("/find-recruiters")
async def find_recruiters(company: str):
    if not HUNTER_API_KEY:
        raise HTTPException(status_code=503, detail="Hunter.io API key not configured.")

    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://api.hunter.io/v2/domain-search",
            params={"company": company, "api_key": HUNTER_API_KEY, "limit": 20},
            timeout=10,
        )

    if res.status_code != 200:
        raise HTTPException(status_code=502, detail="Hunter.io request failed.")

    data = res.json().get("data", {})
    emails = data.get("emails", [])

    # Prefer HR/recruiting contacts, fall back to all
    recruiters = [
        e for e in emails
        if any(kw in (e.get("position") or "").lower() for kw in RECRUITING_KEYWORDS)
    ]
    if not recruiters:
        recruiters = emails

    return {
        "domain": data.get("domain", ""),
        "contacts": [
            {
                "name": f"{e.get('first_name', '')} {e.get('last_name', '')}".strip(),
                "email": e.get("value", ""),
                "title": e.get("position", ""),
            }
            for e in recruiters[:8]
            if e.get("value")
        ],
    }
