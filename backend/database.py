from sqlalchemy import create_engine, Column, String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone
import uuid
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./emails.db")

# PostgreSQL doesn't need check_same_thread
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class GmailToken(Base):
    __tablename__ = "gmail_tokens"

    id = Column(String, primary_key=True, default="default")
    token_json = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class EmailRecord(Base):
    __tablename__ = "emails"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_email = Column(String, nullable=False)
    recipient_name = Column(String, default="")
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    tone = Column(String, default="professional")
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String, default="sent")  # "sent" | "failed"
    research_hook = Column(Text, default="")  # personalization hook used


class CampaignBatch(Base):
    """A batch of cold emails sent to multiple companies at once."""
    __tablename__ = "campaign_batches"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String, default="processing")  # processing | done | partial
    total = Column(Integer, default=0)
    completed = Column(Integer, default=0)
    tone = Column(String, default="professional")


class CampaignEmail(Base):
    """A single email generated as part of a campaign batch."""
    __tablename__ = "campaign_emails"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_id = Column(String, ForeignKey("campaign_batches.id"), nullable=False)
    company = Column(String, default="")
    role = Column(String, default="")
    recipient_email = Column(String, default="")
    subject = Column(String, default="")
    body = Column(Text, default="")
    research_hook = Column(Text, default="")
    company_news = Column(Text, default="")  # JSON array
    status = Column(String, default="draft")  # draft | sent | failed | skipped
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
