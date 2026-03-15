"use client";

import { useState } from "react";
import {
  Search,
  Loader2,
  User,
  CheckCircle2,
  Globe,
  Zap,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface Contact {
  name: string;
  email: string;
  title: string;
  confidence: number;
  source: "hunter" | "web";
}

interface Props {
  onSelect: (email: string) => void;
  jobDescription?: string;
}

function ConfidenceBadge({ confidence, source }: { confidence: number; source: string }) {
  if (source === "hunter") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
        <Zap size={10} className="fill-emerald-400" />
        Verified
      </span>
    );
  }
  const style =
    confidence >= 70
      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
      : confidence >= 40
      ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
      : "text-white/30 bg-white/5 border-white/10";
  return (
    <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${style}`}>
      {confidence}%
    </span>
  );
}

export default function RecruiterFinder({ onSelect, jobDescription }: Props) {
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState("");
  const [hunterUsed, setHunterUsed] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [error, setError] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const search = async () => {
    const jd = jobDescription?.trim();
    if (!jd) return;

    setLoading(true);
    setError("");
    setContacts(null);
    setSelectedEmail("");
    setCompany("");
    setDomain("");

    try {
      const res = await fetch(`${API}/api/find-recruiters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: jd }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Search failed");

      setCompany(data.company || "");
      setDomain(data.domain || "");
      setHunterUsed(data.hunter_used || false);

      if (!data.contacts || data.contacts.length === 0) {
        setError(
          "No emails found. Try adding a free Hunter.io API key in your backend .env for better results."
        );
      } else {
        setContacts(data.contacts);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (c: Contact) => {
    setSelectedEmail(c.email);
    onSelect(c.email);
  };

  const hasJD = !!jobDescription?.trim();
  const hasResults = contacts && contacts.length > 0;

  return (
    <div className="space-y-2.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-white/40 uppercase tracking-wider">
          Find Recruiter Email
        </label>
        {hunterUsed && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <Zap size={10} className="fill-emerald-400" />
            Hunter.io verified
          </span>
        )}
        {hasResults && !hunterUsed && (
          <span className="flex items-center gap-1 text-xs text-white/25">
            <Globe size={10} />
            Web search
          </span>
        )}
      </div>

      {/* Search button — only shows when JD is pasted */}
      {hasJD ? (
        <button
          onClick={search}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Searching for recruiters…
            </>
          ) : (
            <>
              <Search size={14} />
              {contacts ? "Search Again" : "Auto-find Recruiter from Job Description"}
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-2 text-xs text-white/20 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
          <Search size={13} />
          Paste a job description above — then click to auto-find recruiter emails
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-300/80 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2 min-w-0">
              <Globe size={12} className="text-white/25 shrink-0" />
              <span className="text-xs text-white/50 font-medium truncate">{company}</span>
              {domain && (
                <span className="text-xs text-white/20 truncate hidden sm:block">{domain}</span>
              )}
            </div>
            <span className="text-xs text-white/20 shrink-0 ml-2">
              {contacts.length} found · click to use
            </span>
          </div>

          {/* Contact rows */}
          <div className="divide-y divide-white/[0.04]">
            {contacts.map((c, i) => {
              const isSelected = selectedEmail === c.email;
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(c)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all ${
                    isSelected
                      ? "bg-indigo-600/15 border-l-2 border-l-indigo-500"
                      : "hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-indigo-500/25" : "bg-white/5"
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircle2 size={15} className="text-indigo-400" />
                    ) : (
                      <User size={14} className="text-white/30" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white/80">
                        {c.name || "Unknown"}
                      </p>
                      <ConfidenceBadge confidence={c.confidence} source={c.source} />
                    </div>
                    <p className="text-xs text-indigo-400/80 font-mono truncate mt-0.5">
                      {c.email}
                    </p>
                    {c.title && (
                      <p className="text-xs text-white/30 truncate">{c.title}</p>
                    )}
                  </div>

                  <ChevronRight
                    size={13}
                    className={`shrink-0 ${isSelected ? "text-indigo-400" : "text-white/15"}`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
