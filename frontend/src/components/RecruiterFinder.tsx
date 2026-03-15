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

interface FindResult {
  company: string;
  domain: string;
  hunter_used: boolean;
  contacts: Contact[];
}

interface Props {
  onSelect: (email: string) => void;
  jobDescription?: string;
}

function ConfidenceBadge({ score, source }: { score: number; source: string }) {
  if (source === "hunter") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
        <Zap size={10} className="fill-emerald-400" />
        Verified
      </span>
    );
  }
  const color =
    score >= 70 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
    : score >= 40 ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
    : "text-white/30 bg-white/5 border-white/10";
  return (
    <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${color}`}>
      {score}% match
    </span>
  );
}

export default function RecruiterFinder({ onSelect, jobDescription }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FindResult | null>(null);
  const [error, setError] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const searchFromJD = async () => {
    if (!jobDescription?.trim()) return;
    await runSearch(null, jobDescription);
  };

  const runSearch = async (company: string | null, jd: string | null) => {
    setLoading(true);
    setError("");
    setResult(null);
    setSelectedEmail("");

    try {
      let res: Response;

      if (jd) {
        res = await fetch(`${API}/api/find-recruiters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_description: jd }),
        });
      } else {
        res = await fetch(
          `${API}/api/find-recruiters?company=${encodeURIComponent(company || "")}`,
        );
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Search failed");

      if (!data.contacts || data.contacts.length === 0) {
        setError("No recruiter emails found. Try adding a Hunter.io API key for better results.");
      } else {
        setResult(data);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (contact: Contact) => {
    setSelectedEmail(contact.email);
    onSelect(contact.email);
  };

  const hasJD = !!jobDescription?.trim();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-white/40 uppercase tracking-wider">
          Find Recruiter Email
        </label>
        {result?.hunter_used && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <Zap size={10} className="fill-emerald-400" />
            Hunter.io verified
          </span>
        )}
        {result && !result.hunter_used && (
          <span className="text-xs text-white/25 flex items-center gap-1">
            <Globe size={10} />
            Web search
          </span>
        )}
      </div>

      {/* Auto-detect button when JD is pasted */}
      {hasJD && !result && (
        <button
          onClick={searchFromJD}
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
              Auto-find Recruiter from Job Description
            </>
          )}
        </button>
      )}

      {/* No JD yet — show placeholder */}
      {!hasJD && !result && (
        <div className="flex items-center gap-2 text-xs text-white/25 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
          <Search size={13} />
          Paste a job description above to auto-find recruiter emails
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
      {result && result.contacts.length > 0 && (
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Globe size={13} className="text-white/30" />
              <span className="text-xs text-white/40 font-medium">{result.company}</span>
              {result.domain && (
                <span className="text-xs text-white/20">{result.domain}</span>
              )}
            </div>
            <span className="text-xs text-white/25">
              {result.contacts.length} contact{result.contacts.length > 1 ? "s" : ""} — click to use
            </span>
          </div>

          {/* Contact list */}
          <div className="divide-y divide-white/[0.04]">
            {result.contacts.map((c, i) => {
              const isSelected = selectedEmail === c.email;
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(c)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all ${
                    isSelected
                      ? "bg-indigo-600/15 border-l-2 border-indigo-500"
                      : "hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-indigo-500/30" : "bg-white/5"
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
                      <p className="text-sm text-white/80 font-medium">
                        {c.name || "Unknown"}
                      </p>
                      <ConfidenceBadge score={c.confidence} source={c.source} />
                    </div>
                    <p className="text-xs text-indigo-400/80 font-mono truncate mt-0.5">
                      {c.email}
                    </p>
                    {c.title && (
                      <p className="text-xs text-white/30 truncate">{c.title}</p>
                    )}
                  </div>

                  <ChevronRight
                    size={14}
                    className={`shrink-0 ${isSelected ? "text-indigo-400" : "text-white/15"}`}
                  />
                </button>
              );
            })}
          </div>

          {/* Search again link */}
          <div className="px-4 py-2.5 border-t border-white/5">
            <button
              onClick={searchFromJD}
              className="text-xs text-white/25 hover:text-white/50 transition-colors"
            >
              Search again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
