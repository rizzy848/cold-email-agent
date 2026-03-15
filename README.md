# Cold Email Agent

A multi-agent system built strictly for job hunters. Unlike standard LLM wrappers, the Cold Email Agent ensures that every outreach is factually grounded in the user's real resume and the specific job description — no hallucinated credentials, no generic AI filler.

## How to Use

1. Connect your Gmail account using the **Connect Gmail** button.
2. Paste the full job description into the text box.
3. Enter the recruiter's email address.
4. Choose a tone: **Professional**, **Friendly**, or **Concise**.
5. Upload your resume as a PDF (max 5MB).
6. Optionally check **"Attach resume as PDF"** to include it as an attachment.
7. Click **"Generate Cold Email"**.
8. Three AI agents analyze the job, draft a personalized email, and format your signature.
9. Review and edit the draft if needed.
10. Click **"Regenerate"** to get a different version.
11. Click **"Send Email"** to send it directly from your Gmail account.
12. View past emails in the **History** page (top right corner).

## Tech Stack

- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS — deployed on Vercel
- **Backend:** Python + FastAPI + Uvicorn — deployed on Railway
- **Database:** PostgreSQL (Railway)
- **LLM:** Groq API (llama-3.3-70b-versatile)
- **Email:** Gmail API via OAuth 2.0

## Prerequisites

- Google Cloud Project with Gmail API enabled and OAuth 2.0 credentials
- Groq API key (free at console.groq.com)
- PostgreSQL database (Railway or any provider)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/rizzy848/cold-email-agent.git
   cd cold-email-agent
   ```

2. Set up the backend:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Configure `backend/.env`:
   ```
   LLM_API_KEY=your_groq_api_key
   LLM_MODEL=llama-3.3-70b-versatile
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/gmail/callback
   DATABASE_URL=your_postgresql_connection_string
   FRONTEND_URL=http://localhost:3000
   ```

4. Run the backend:
   ```bash
   uvicorn main:app --reload
   ```

5. Set up the frontend:
   ```bash
   cd ../frontend
   npm install
   ```

6. Configure `frontend/.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

7. Run the frontend:
   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000)
