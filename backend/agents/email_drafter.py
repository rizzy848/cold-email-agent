import os
from groq import Groq


TONE_INSTRUCTIONS = {
    "professional": "formal and professional, using clear business language",
    "friendly": "warm and personable while still being professional",
    "concise": "brief and to the point — no fluff, under 150 words",
}


def draft_email(job_info: dict, resume_text: str, tone: str, client: Groq, research_hook: str = "") -> dict:
    """
    Draft a personalized cold email, optionally enriched with a research hook.
    Returns: { subject, body }
    """
    tone_desc = TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["professional"])
    requirements = ", ".join(job_info.get("requirements", []))

    research_section = ""
    if research_hook:
        research_section = f"\nPersonalization hook (weave this naturally into the opening — do NOT copy-paste it verbatim):\n{research_hook}\n"

    response = client.chat.completions.create(
        model=os.getenv("LLM_MODEL", "llama-3.3-70b-versatile"),
        max_tokens=1024,
        messages=[
            {
                "role": "system",
                "content": """You are an expert cold email writer for tech internship hunters.
Rules you MUST follow:
- Only use skills, projects, and experience from the provided resume
- Never invent credentials, projects, or claims not in the resume
- Never use generic AI phrases like "I hope this finds you well", "I am writing to express", "passion for technology"
- Never reference attachments unless the resume explicitly mentions them
- If a personalization hook is provided, open with a genuine reference to it — make it feel researched, not generic
- Write naturally, like a real human
- Keep it under 200 words""",
            },
            {
                "role": "user",
                "content": f"""Write a cold email for a tech internship application.

Job Info:
- Company: {job_info.get('company', 'the company')}
- Role: {job_info.get('role', 'the position')}
- Key requirements: {requirements}
{research_section}
My Resume:
{resume_text}

Tone: {tone_desc}

Return ONLY the email with this exact format:
SUBJECT: <subject line>
BODY:
<email body>""",
            },
        ],
    )

    text = response.choices[0].message.content.strip()

    # Parse subject and body
    subject = ""
    body_lines = []
    body_start = False

    for line in text.split("\n"):
        if line.upper().startswith("SUBJECT:"):
            subject = line.split(":", 1)[1].strip()
        elif line.upper().startswith("BODY:"):
            body_start = True
        elif body_start:
            body_lines.append(line)

    body = "\n".join(body_lines).strip()

    if not subject or not body:
        subject = f"Internship Application — {job_info.get('role', 'Software Engineering')}"
        body = text

    return {"subject": subject, "body": body}
