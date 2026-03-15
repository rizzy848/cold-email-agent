import os
import json
from groq import Groq

try:
    from duckduckgo_search import DDGS
    DDG_AVAILABLE = True
except ImportError:
    DDG_AVAILABLE = False


def research_company(company_name: str, role: str) -> dict:
    """
    Search the web for company info using DuckDuckGo (free, no API key).
    Returns: { news, tech_context, summary }
    """
    if not DDG_AVAILABLE:
        return {"news": [], "tech_context": [], "summary": ""}

    news_snippets = []
    tech_snippets = []

    try:
        with DDGS() as ddgs:
            # Recent company news
            news_results = list(
                ddgs.news(f"{company_name} 2024 2025 funding product launch", max_results=4)
            )
            for r in news_results:
                news_snippets.append(f"- {r.get('title', '')} ({r.get('date', '')}): {r.get('body', '')[:200]}")

            # Tech stack / engineering culture
            tech_results = list(
                ddgs.text(
                    f"{company_name} engineering tech stack {role} team culture site:linkedin.com OR site:techcrunch.com OR site:engineering blog",
                    max_results=3,
                )
            )
            for r in tech_results:
                tech_snippets.append(f"- {r.get('title', '')}: {r.get('body', '')[:200]}")
    except Exception:
        pass

    return {
        "news": news_snippets,
        "tech_context": tech_snippets,
        "summary": "",
    }


def summarize_research(company_name: str, role: str, research: dict, client: Groq) -> str:
    """
    Use LLM to distill raw research into a 2-3 sentence personalization hook.
    """
    if not research["news"] and not research["tech_context"]:
        return ""

    raw = "\n".join(research["news"] + research["tech_context"])

    response = client.chat.completions.create(
        model=os.getenv("LLM_MODEL", "llama-3.3-70b-versatile"),
        max_tokens=200,
        messages=[
            {
                "role": "user",
                "content": f"""You are helping write a cold email to {company_name} for a {role} position.

Here is recent information about {company_name}:
{raw}

Write 1-2 specific sentences that could be used as a personalization hook in a cold email.
- Reference a SPECIFIC recent event, product, or initiative from the research
- Make it feel genuine, not flattery
- If nothing useful found, reply with: NONE

Hook:""",
            }
        ],
    )

    result = response.choices[0].message.content.strip()
    if result == "NONE" or len(result) < 10:
        return ""
    return result
