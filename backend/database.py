from sqlalchemy import create_engine, Column, String, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone
import uuid

DATABASE_URL = "sqlite:///./emails.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


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


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
