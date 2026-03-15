"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  ChevronDown,
  ChevronUp,
  Send,
  Layers,
} from "lucide-react";
import ResumeUpload from "@/components/ResumeUpload";

// ---- Types ----
interface JobTarget {
  id: string;
  company: string;
  role: string;
  recipientEmail: string;
  jobDescription: string;
}

interface CampaignResult {
  id: string | null;
  company: string;
  role: string;
  recipient_email: string;
  subject: string;
  body: string;
  research_hook: string;
  company_news: string[];
  status: "draft" | "sent" | "failed" | "sending";
  error?: string;
}

type CampaignState = "idle" | "generating" | "done" | "error";

function makeJob(): JobTarget {
  return {
    id: Math.random().toString(36).slice(2),
    company: "",
    role: "",
    recipientEmail: "",
    jobDescription: "",
  };
}

// ---- Campaign result card ----
function ResultCard({
  result,
  batchId,
  onSend,
}: {
  result: CampaignResult;
  batchId: string;
  onSend: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusColor = {
    draft: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
    sent: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    failed: "text-red-400 bg-red-400/10 border-red-400/20",
    sending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  }[result.status];

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
          {result.status === "sent" ? (
            <CheckCircle2 size={18} className="text-emerald-400" />
          ) : result.status === "failed" ? (
            <XCircle size={18} className="text-red-400" />
          ) : result.status === "sending" ? (
            <Loader2 size={18} className="text-yellow-400 animate-spin" />
          ) : (
            <Mail size={18} className="text-indigo-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white">{result.company}</span>
            <span className="text-white/30 text-sm">·</span>
            <span className="text-white/50 text-sm">{result.role}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ml-auto ${statusColor}`}>
              {result.status}
            </span>
          </div>
          <p className="text-xs text-white/30 mt-0.5 truncate">{result.recipient_email}</p>
          {result.subject && (
            <p className="text-sm text-white/60 mt-1.5 font-medium truncate">{result.subject}</p>
          )}

          {/* Research hook badge */}
          {result.research_hook && (
            <div className="flex items-center gap-1.5 mt-2">
              <Globe size={11} className="text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-400/70 truncate">{result.research_hook}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-white/30 hover:text-white/60 transition-colors shrink-0"
          disabled={!result.body}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded body */}
      {expanded && result.body && (
        <div className="border-t border-white/5 px-5 pb-5 pt-4 space-y-4">
          {result.company_news.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-white/30 uppercase tracking-wider font-medium">
                Company News Found
              </p>
              {result.company_news.map((n, i) => (
                <p key={i} className="text-xs text-white/40 pl-3 border-l border-white/10 leading-relaxed">
                  {n.replace(/^- /, "")}
                </p>
              ))}
            </div>
          )}

          <div>
            <p className="text-xs text-white/30 uppercase tracking-wider font-medium mb-2">
              Email Body
            </p>
            <pre className="text-sm text-white/70 bg-white/[0.02] rounded-xl p-4 whitespace-pre-wrap font-sans leading-relaxed border border-white/5">
              {result.body}
            </pre>
          </div>

          {result.status === "draft" && result.id && (
            <button
              onClick={() => onSend(result.id!)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            >
              <Send size={13} />
              Send via Gmail
            </button>
          )}

          {result.error && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20">
              Error: {result.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Main Campaign Page ----
export default function CampaignPage() {
  const [jobs, setJobs] = useState<JobTarget[]>([makeJob()]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [tone, setTone] = useState<"professional" | "friendly" | "concise">("professional");
  const [campaignState, setCampaignState] = useState<CampaignState>("idle");
  const [results, setResults] = useState<CampaignResult[]>([]);
  const [batchId, setBatchId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const addJob = () => {
    if (jobs.length >= 10) return;
    setJobs((j) => [...j, makeJob()]);
  };

  const removeJob = (id: string) => {
    setJobs((j) => j.filter((jj) => jj.id !== id));
  };

  const updateJob = (id: string, patch: Partial<JobTarget>) => {
    setJobs((j) => j.map((jj) => (jj.id === id ? { ...jj, ...patch } : jj)));
  };

  const isReady =
    resumeFile &&
    jobs.every((j) => j.jobDescription.trim() && j.recipientEmail.trim());

  const handleLaunchCampaign = async () => {
    if (!isReady) return;

    setCampaignState("generating");
    setErrorMsg("");
    setResults([]);

    const jobsPayload = jobs.map((j) => ({
      job_description: j.jobDescription,
      recipient_email: j.recipientEmail,
      company_name: j.company,
      role_name: j.role,
    }));

    const fd = new FormData();
    fd.append("tone", tone);
    fd.append("jobs_json", JSON.stringify(jobsPayload));
    fd.append("resume", resumeFile!);

    try {
      const res = await fetch(`${API}/api/campaign/generate`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Campaign generation failed");
      }

      const data = await res.json();
      setBatchId(data.batch_id);
      setResults(data.results as CampaignResult[]);
      setCampaignState("done");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setErrorMsg(message);
      setCampaignState("error");
    }
  };

  const handleSendOne = async (emailId: string) => {
    setResults((prev) =>
      prev.map((r) => (r.id === emailId ? { ...r, status: "sending" } : r))
    );

    try {
      const res = await fetch(`${API}/api/campaign/${batchId}/send/${emailId}`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Send failed");

      setResults((prev) =>
        prev.map((r) => (r.id === emailId ? { ...r, status: "sent" } : r))
      );
    } catch {
      setResults((prev) =>
        prev.map((r) =>
          r.id === emailId ? { ...r, status: "failed", error: "Send failed" } : r
        )
      );
    }
  };

  const sentCount = results.filter((r) => r.status === "sent").length;
  const draftCount = results.filter((r) => r.status === "draft").length;
  const researchedCount = results.filter((r) => r.research_hook).length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="text-white/25 hover:text-white/60 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
              <Layers size={12} />
            </div>
            <span className="font-semibold">MailForge</span>
          </div>
          <span className="text-white/20 text-sm ml-2">/ Campaign Mode</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Hero */}
        <div>
          <h1 className="text-2xl font-bold mb-2">Campaign Mode</h1>
          <p className="text-white/40 text-sm">
            Generate personalized cold emails for up to 10 companies at once. Each email is
            individually researched, tailored to the job, and grounded in your resume.
          </p>
        </div>

        {campaignState === "idle" || campaignState === "error" ? (
          <div className="space-y-8">
            {/* Resume + tone */}
            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 space-y-5">
              <h2 className="font-semibold text-sm text-white/70 uppercase tracking-wider">
                Your Profile
              </h2>

              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                  Resume (used for all emails) *
                </label>
                <ResumeUpload file={resumeFile} onFileSelect={setResumeFile} />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                  Tone for all emails
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["professional", "friendly", "concise"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
                        tone === t
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                          : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Job targets */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm text-white/70 uppercase tracking-wider">
                  Target Companies ({jobs.length}/10)
                </h2>
                <button
                  onClick={addJob}
                  disabled={jobs.length >= 10}
                  className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-30 transition-colors"
                >
                  <Plus size={14} />
                  Add Company
                </button>
              </div>

              {jobs.map((job, idx) => (
                <div
                  key={job.id}
                  className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-indigo-500">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    {jobs.length > 1 && (
                      <button
                        onClick={() => removeJob(job.id)}
                        className="text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/30 mb-1.5">
                        Company Name (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Shopify"
                        value={job.company}
                        onChange={(e) => updateJob(job.id, { company: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/30 mb-1.5">
                        Role (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Software Engineer Intern"
                        value={job.role}
                        onChange={(e) => updateJob(job.id, { role: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/30 mb-1.5">
                      Recruiter Email *
                    </label>
                    <input
                      type="email"
                      placeholder="recruiter@company.com"
                      value={job.recipientEmail}
                      onChange={(e) => updateJob(job.id, { recipientEmail: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/30 mb-1.5">
                      Job Description *
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Paste the full job description here…"
                      value={job.jobDescription}
                      onChange={(e) => updateJob(job.id, { jobDescription: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {errorMsg && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-300">{errorMsg}</p>
              </div>
            )}

            {/* Launch button */}
            <button
              onClick={handleLaunchCampaign}
              disabled={!isReady}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.005] active:scale-100 py-4 rounded-xl font-semibold shadow-lg shadow-indigo-900/30"
            >
              <Sparkles size={16} />
              Launch Campaign — {jobs.length} {jobs.length === 1 ? "Company" : "Companies"}
            </button>
          </div>
        ) : campaignState === "generating" ? (
          /* Generating state */
          <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <Loader2 size={28} className="text-indigo-400 animate-spin" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold">Campaign Running</h2>
              <p className="text-white/40 text-sm max-w-md">
                Researching {jobs.length} companies, analyzing job descriptions, and drafting
                personalized emails — all in parallel.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {jobs.map((job, i) => (
                <span
                  key={job.id}
                  className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-white/50 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  {job.company || `Company ${i + 1}`}
                </span>
              ))}
            </div>
          </div>
        ) : (
          /* Results */
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Emails Generated", value: results.length, color: "text-white" },
                {
                  label: "Researched",
                  value: researchedCount,
                  color: "text-emerald-400",
                },
                { label: "Sent", value: sentCount, color: "text-indigo-400" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 text-center"
                >
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-white/30 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {draftCount > 0 && (
              <p className="text-sm text-white/40">
                {draftCount} email{draftCount > 1 ? "s" : ""} ready to send. Expand each card to
                review and send.
              </p>
            )}

            {/* Result cards */}
            <div className="space-y-3">
              {results.map((result) => (
                <ResultCard
                  key={result.id || result.company}
                  result={result}
                  batchId={batchId}
                  onSend={handleSendOne}
                />
              ))}
            </div>

            <button
              onClick={() => {
                setCampaignState("idle");
                setResults([]);
                setJobs([makeJob()]);
              }}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              <Plus size={14} />
              Start New Campaign
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
