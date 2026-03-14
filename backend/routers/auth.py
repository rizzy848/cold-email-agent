from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from services.gmail import get_auth_url, exchange_code_for_token, is_gmail_connected
import os

router = APIRouter()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


@router.get("/auth/gmail")
def gmail_auth():
    """Redirect user to Google OAuth consent screen."""
    url = get_auth_url()
    return RedirectResponse(url)


@router.get("/auth/gmail/callback")
def gmail_callback(code: str):
    """Handle OAuth callback, store token, redirect to frontend."""
    exchange_code_for_token(code)
    return RedirectResponse(f"{FRONTEND_URL}/dashboard?gmail=connected")


@router.get("/auth/gmail/status")
def gmail_status():
    return {"connected": is_gmail_connected()}
