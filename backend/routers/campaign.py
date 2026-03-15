"""
Campaign router — batch cold email generation for multiple companies.
No credit card required: uses DuckDuckGo (free) + Groq free tier.
"""
import os
import json
import asyncio
from groq import Groq
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List

from database import get_db, CampaignBatch, CampaignEmail, EmailRecord
from services.pdf_parser import extract_text_from_pdf
from services.gmail import send_email, is_gmail_connected
from agents.job_analyzer import analyze_job
from agents.email_drafter import draft_email
from agents.formatter import format_signature
from agents.research_agent import research_company, summarize_research

router = APIRouter()


def get_llm_client() -> Groq:
    return Groq(api_key=os.getenv("LLM_API_KEY"))


class CampaignJob(BaseModel):
    job_description: str
    recipient_email: str
    company_name: str = ""  # optional override; extracted from JD if blank
    role_name: str = ""     # optional override


class CampaignRequest(BaseModel):
    jobs: List[CampaignJob]
    tone: str = "professional"


async def _process_one_job(
    job: CampaignJob,
    resume_text: str,
    tone: str,
    client: Groq,
    batch_id: str,
    db: Session,
) -> dict:
    """Process a single job in the campaign pipeline."""
    try:
        # Analyze JD
        job_info = analyze_job(job.job_description, client)

        # Override company/role if provided
        if job.company_name:
            job_info["company"] = job.company_name
        if job.role_name:
            job_info["role"] = job.role_name

        # Web research
        research = research_company(job_info.get("company", ""), job_info.get("role", ""))
        research_hook = summarize_research(
            job_info.get("company", ""),
            job_info.get("role", ""),
            research,
            client,
        )

        # Draft + format
        draft = draft_email(job_info, resume_text, tone, client, research_hook=research_hook)
        final_body = format_signature(draft["body"], resume_text)

        # Save campaign email record
        record = CampaignEmail(
            batch_id=batch_id,
            company=job_info.get("company", ""),
            role=job_info.get("role", ""),
            recipient_email=job.recipient_email,
            subject=draft["subject"],
            body=final_body,
            research_hook=research_hook,
            company_news=json.dumps(research.get("news", [])[:3]),
            status="draft",
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        return {
            "id": record.id,
            "company": job_info.get("company", ""),
            "role": job_info.get("role", ""),
            "recipient_email": job.recipient_email,
            "subject": draft["subject"],
            "body": final_body,
            "research_hook": research_hook,
            "company_news": research.get("news", [])[:3],
            "status": "draft",
        }

    except Exception as e:
        return {
            "id": None,
            "company": job.company_name or "Unknown",
            "role": job.role_name or "Unknown",
            "recipient_email": job.recipient_email,
            "subject": "",
            "body": "",
            "research_hook": "",
            "company_news": [],
            "status": "failed",
            "error": str(e),
        }


@router.post("/campaign/generate")
async def generate_campaign(
    tone: str = Form("professional"),
    jobs_json: str = Form(...),   # JSON-encoded list of CampaignJob objects
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Generate cold emails for multiple companies simultaneously.
    Accepts resume once + list of job targets.
    """
    # Parse jobs from JSON form field
    try:
        jobs_raw = json.loads(jobs_json)
        jobs = [CampaignJob(**j) for j in jobs_raw]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid jobs_json: {e}")

    if not jobs:
        raise HTTPException(status_code=400, detail="No jobs provided.")
    if len(jobs) > 10:
        raise HTTPException(status_code=400, detail="Max 10 companies per campaign.")

    # Parse resume once
    resume_bytes = await resume.read()
    resume_text = extract_text_from_pdf(resume_bytes)
    if not resume_text:
        raise HTTPException(status_code=400, detail="Could not extract text from resume PDF.")

    client = get_llm_client()

    # Create campaign batch record
    batch = CampaignBatch(total=len(jobs), tone=tone, status="processing")
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # Process all jobs concurrently using asyncio
    tasks = [
        _process_one_job(job, resume_text, tone, client, batch.id, db)
        for job in jobs
    ]
    results = await asyncio.gather(*tasks)

    # Update batch status
    completed = sum(1 for r in results if r["status"] == "draft")
    batch.completed = completed
    batch.status = "done" if completed == len(jobs) else "partial"
    db.commit()

    return {
        "batch_id": batch.id,
        "total": len(jobs),
        "completed": completed,
        "status": batch.status,
        "results": results,
    }


@router.post("/campaign/{batch_id}/send/{email_id}")
async def send_campaign_email(
    batch_id: str,
    email_id: str,
    db: Session = Depends(get_db),
):
    """Send a single email from a campaign batch."""
    if not is_gmail_connected():
        raise HTTPException(status_code=401, detail="Gmail not connected.")

    record = db.query(CampaignEmail).filter(
        CampaignEmail.id == email_id,
        CampaignEmail.batch_id == batch_id,
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Email not found.")

    try:
        send_email(to=record.recipient_email, subject=record.subject, body=record.body)
        record.status = "sent"

        # Also log in main emails table
        email_log = EmailRecord(
            recipient_email=record.recipient_email,
            subject=record.subject,
            body=record.body,
            tone="professional",
            status="sent",
            research_hook=record.research_hook,
        )
        db.add(email_log)
        db.commit()
        return {"status": "sent", "id": email_id}
    except Exception as e:
        record.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaign/{batch_id}")
async def get_campaign(batch_id: str, db: Session = Depends(get_db)):
    """Get campaign batch status and all emails."""
    batch = db.query(CampaignBatch).filter(CampaignBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    emails = db.query(CampaignEmail).filter(CampaignEmail.batch_id == batch_id).all()

    return {
        "batch_id": batch.id,
        "status": batch.status,
        "total": batch.total,
        "completed": batch.completed,
        "created_at": batch.created_at.isoformat(),
        "emails": [
            {
                "id": e.id,
                "company": e.company,
                "role": e.role,
                "recipient_email": e.recipient_email,
                "subject": e.subject,
                "body": e.body,
                "research_hook": e.research_hook,
                "company_news": json.loads(e.company_news or "[]"),
                "status": e.status,
            }
            for e in emails
        ],
    }


@router.get("/campaigns")
async def list_campaigns(db: Session = Depends(get_db)):
    """List all campaign batches."""
    batches = (
        db.query(CampaignBatch)
        .order_by(CampaignBatch.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": b.id,
            "status": b.status,
            "total": b.total,
            "completed": b.completed,
            "tone": b.tone,
            "created_at": b.created_at.isoformat(),
        }
        for b in batches
    ]
