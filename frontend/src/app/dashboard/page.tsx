"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Sparkles, FileText, AlertCircle, Clock, Layers } from "lucide-react";
import ResumeUpload from "@/components/ResumeUpload";
import AgentProgress, { AgentStep } from "@/components/AgentProgress";
import EmailPreview from "@/components/EmailPreview";
import ResearchInsights from "@/components/ResearchInsights";
import { Suspense } from "react";
import GmailConnect from "@/components/GmailConnect";

// ----- Types -----
interface FormData {
  jobDescription: string;
  recipientEmail: string;
  tone: "professional" | "friendly" | "concise";
}

type AppState = "idle" | "processing" | "done" | "error";

// ----- Initial agent steps -----
const makeInitialSteps = (): AgentStep[] => [
  {
    id: "research",
    label: "Job Analysis Agent",
    description: "Extracts company, role, and key requirements from the job description",
    status: "idle",
  },
  {
    id: "web",
    label: "Web Research Agent",
    description: "Searches the web for company news & tech context — no API key needed",
    status: "idle",
  },
  {
    id: "draft",
    label: "Email Drafting Agent",
    description: "Writes a personalized email using your resume + live research",
    status: "idle",
  },
  {
    id: "format",
    label: "Signature Formatter",
    description: "Formats sign-off from your resume data",
    status: "idle",
  },
  {
    id: "send",
    label: "Gmail Draft Writer",
    description: "Pushes finalized email to Gmail drafts",
    status: "idle",
  },
];

// ----- Main page -----
export default function DashboardPage() {
  const [formData, setFormData] = useState<FormData>({
    jobDescription: "",
    recipientEmail: "",
    tone: "professional",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>(makeInitialSteps());
  const [appState, setAppState] = useState<AppState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Email result state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Research state
  const [researchHook, setResearchHook] = useState("");
  const [companyNews, setCompanyNews] = useState<string[]>([]);
  const [detectedCompany, setDetectedCompany] = useState("");

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // ---- submit ----
  const handleGenerate = async () => {
    if (!formData.jobDescription.trim() || !resumeFile) return;

    setAppState("processing");
    setErrorMsg("");
    setEmailSent(false);
    setResearchHook("");
    setCompanyNews([]);
    setDetectedCompany("");
    setSteps(makeInitialSteps());

    const update = (id: string, patch: Partial<AgentStep>) =>
      setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

    try {
      // Step 1: Analyze job description
      update("research", { status: "running", detail: "Parsing job description…" });

      const fd = new FormData();
      fd.append("job_description", formData.jobDescription);
      fd.append("recipient_email", formData.recipientEmail);
      fd.append("tone", formData.tone);
      fd.append("resume", resumeFile);

      // Step 2: Web research (fires concurrently on backend — show it running)
      await sleep(400);
      update("research", { status: "done", detail: "Role & company data extracted" });
      update("web", { status: "running", detail: "Searching web for company news…" });

      const res = await fetch(`${API}/api/generate-email`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Backend error");
      }

      const data = await res.json();

      // Update research step with what was found
      const hookFound = !!data.research_hook;
      const newsCount = (data.company_news || []).length;
      update("web", {
        status: "done",
        detail: hookFound
          ? `Found ${newsCount} news item(s) — personalization hook generated`
          : "No recent news found — standard email generated",
      });
      await sleep(200);

      // Step 3: Draft
      update("draft", { status: "running", detail: "Composing personalized email…" });
      await sleep(300);
      update("draft", { status: "done", detail: "Draft generated" });
      await sleep(200);

      // Step 4: Format
      update("format", { status: "running", detail: "Formatting signature…" });
      await sleep(300);
      update("format", { status: "done", detail: "Signature applied" });
      await sleep(200);

      // Step 5: Gmail (triggered by user)
      update("send", { status: "idle", detail: "Waiting for your confirmation" });

      setEmailSubject(data.subject || "");
      setEmailBody(data.body || "");
      setRecipientName(data.recipient_name || "Recruiter");
      setResearchHook(data.research_hook || "");
      setCompanyNews(data.company_news || []);

      // Extract company name from job description for display
      const companyMatch = formData.jobDescription.match(/(?:at|@)\s+([A-Z][a-zA-Z\s]+)/);
      setDetectedCompany(companyMatch?.[1]?.trim() || "the company");

      setAppState("done");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setErrorMsg(message);
      setSteps((prev) =>
        prev.map((s) =>
          s.status === "running" ? { ...s, status: "error", detail: message } : s
        )
      );
      setAppState("error");
    }
  };

  const handleSend = async (subject: string, body: string) => {
    setIsSending(true);
    setSteps((prev) =>
      prev.map((s) =>
        s.id === "send" ? { ...s, status: "running", detail: "Sending email…" } : s
      )
    );

    try {
      const res = await fetch(`${API}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          recipient_email: formData.recipientEmail,
          tone: formData.tone,
        }),
      });

      if (!res.ok) throw new Error("Failed to send email");

      setSteps((prev) =>
        prev.map((s) =>
          s.id === "send" ? { ...s, status: "done", detail: "Email sent ✓" } : s
        )
      );
      setEmailSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send email";
      setSteps((prev) =>
        prev.map((s) =>
          s.id === "send" ? { ...s, status: "error", detail: message } : s
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleRegenerate = () => {
    setAppState("idle");
    setEmailSubject("");
    setEmailBody("");
    setEmailSent(false);
    setResearchHook("");
    setCompanyNews([]);
    setSteps(makeInitialSteps());
  };

  const isReady = formData.jobDescription.trim() && formData.recipientEmail.trim() && resumeFile;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Top bar */}
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/" className="text-white/25 hover:text-white/60 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
              <Mail size={12} />
            </div>
            <span className="font-semibold">MailForge</span>
          </div>
          <span className="text-white/20 text-sm ml-2">/ Orchestrator</span>
          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/campaign"
              className="text-white/50 hover:text-white/80 transition-colors text-sm flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 px-3 py-1.5 rounded-lg border border-indigo-500/30"
            >
              <Layers size={13} />
              Campaign Mode
            </Link>
            <Link
              href="/history"
              className="text-white/30 hover:text-white/70 transition-colors text-sm flex items-center gap-1.5"
            >
              <Clock size={14} />
              History
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* ---- Left: Form + Output ---- */}
          <div className="space-y-6">
            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 space-y-5">
              <div>
                <h1 className="text-xl font-bold mb-1">Generate Cold Email</h1>
                <p className="text-sm text-white/40">
                  Paste the job description, upload your resume, and let the agents work.
                </p>
              </div>

              {/* Job Description */}
              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                  Job Description *
                </label>
                <div className="relative">
                  <FileText size={15} className="absolute left-3 top-3.5 text-white/25" />
                  <textarea
                    rows={6}
                    placeholder="Paste the full job description here…"
                    value={formData.jobDescription}
                    onChange={(e) => setFormData((f) => ({ ...f, jobDescription: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all resize-none"
                  />
                </div>
              </div>

              {/* Recipient email */}
              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                  Recruiter Email *
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                  <input
                    type="email"
                    placeholder="recruiter@company.com"
                    value={formData.recipientEmail}
                    onChange={(e) => setFormData((f) => ({ ...f, recipientEmail: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all"
                  />
                </div>
              </div>

              {/* Tone selector */}
              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                  Email Tone
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["professional", "friendly", "concise"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFormData((f) => ({ ...f, tone: t }))}
                      className={`py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
                        formData.tone === t
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                          : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resume upload */}
              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                  Your Resume *
                </label>
                <ResumeUpload file={resumeFile} onFileSelect={setResumeFile} />
              </div>

              {/* Gmail connect status */}
              <Suspense fallback={null}>
                <GmailConnect />
              </Suspense>

              {/* Error */}
              {errorMsg && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-300">{errorMsg}</p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleGenerate}
                disabled={!isReady || appState === "processing"}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-100 py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-900/30"
              >
                {appState === "processing" ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Agents are working…
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    Generate Cold Email
                  </>
                )}
              </button>
            </div>

            {/* Research insights */}
            {appState === "done" && (
              <ResearchInsights
                researchHook={researchHook}
                companyNews={companyNews}
                company={detectedCompany}
              />
            )}

            {/* Email preview */}
            {appState === "done" && emailBody && (
              <EmailPreview
                subject={emailSubject}
                body={emailBody}
                recipientName={recipientName}
                recipientEmail={formData.recipientEmail}
                onSend={(subject, body) => handleSend(subject, body)}
                onRegenerate={handleRegenerate}
                isSending={isSending}
                emailSent={emailSent}
              />
            )}
          </div>

          {/* ---- Right: Agent pipeline ---- */}
          <div className="lg:sticky lg:top-20">
            <AgentProgress steps={steps} />

            <div className="mt-4 bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">
                How it works
              </p>
              {[
                "Analyzes the job description for role, company & requirements",
                "Searches the web for recent company news — no API key needed",
                "Drafts email using your resume + live research hook",
                "Formats a clean signature from your resume details",
                "Clean draft lands in your Gmail — you hit send",
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-indigo-500 text-xs font-mono mt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-xs text-white/40 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>

            {/* Campaign mode CTA */}
            <div className="mt-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-5">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
                Applying to multiple companies?
              </p>
              <p className="text-xs text-white/40 mb-3 leading-relaxed">
                Campaign Mode generates personalized emails for up to 10 companies at once — each
                researched and tailored.
              </p>
              <Link
                href="/campaign"
                className="flex items-center justify-center gap-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 text-indigo-300 text-sm font-medium py-2.5 rounded-xl transition-all"
              >
                <Layers size={14} />
                Launch Campaign Mode
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
