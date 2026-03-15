"use client";

import { useState } from "react";
import { Search, Loader2, User, ChevronDown } from "lucide-react";

interface Contact {
  name: string;
  email: string;
  title: string;
}

interface Props {
  onSelect: (email: string) => void;
}

export default function RecruiterFinder({ onSelect }: Props) {
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const handleSearch = async () => {
    if (!company.trim()) return;
    setLoading(true);
    setError("");
    setContacts(null);
    setOpen(true);

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${base}/api/find-recruiters?company=${encodeURIComponent(company)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Search failed");
      setContacts(data.contacts);
      if (data.contacts.length === 0) setError("No contacts found for this company.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-white/40 uppercase tracking-wider">
        Find Recruiter
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Company name (e.g. Google, Shopify)"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !company.trim()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </div>

      {/* Results dropdown */}
      {open && (contacts !== null || error) && (
        <div className="bg-[#13131a] border border-white/10 rounded-xl overflow-hidden">
          {error && (
            <p className="text-sm text-white/40 px-4 py-3">{error}</p>
          )}
          {contacts && contacts.length > 0 && (
            <div>
              <p className="text-xs text-white/25 px-4 pt-3 pb-1 uppercase tracking-wider">
                {contacts.length} contact{contacts.length > 1 ? "s" : ""} found — click to use
              </p>
              {contacts.map((c, i) => (
                <button
                  key={i}
                  onClick={() => { onSelect(c.email); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-t border-white/5 first:border-0"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <User size={13} className="text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white/80 font-medium truncate">{c.name || "Unknown"}</p>
                    <p className="text-xs text-white/40 truncate">{c.email}</p>
                    {c.title && <p className="text-xs text-indigo-400/70 truncate">{c.title}</p>}
                  </div>
                  <ChevronDown size={12} className="text-white/20 ml-auto shrink-0 -rotate-90" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
