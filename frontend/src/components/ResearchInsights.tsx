"use client";

import { Globe, Newspaper, Sparkles } from "lucide-react";

interface Props {
  researchHook: string;
  companyNews: string[];
  company: string;
}

export default function ResearchInsights({ researchHook, companyNews, company }: Props) {
  if (!researchHook && companyNews.length === 0) return null;

  return (
    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
          <Globe size={12} className="text-emerald-400" />
        </div>
        <span className="text-sm font-semibold text-emerald-400">Live Research</span>
        <span className="text-xs text-white/30 ml-1">— {company}</span>
      </div>

      {researchHook && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-emerald-400" />
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Personalization Hook Used
            </p>
          </div>
          <p className="text-sm text-white/80 bg-white/[0.03] rounded-xl px-4 py-3 leading-relaxed italic border border-white/5">
            "{researchHook}"
          </p>
        </div>
      )}

      {companyNews.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Newspaper size={12} className="text-white/30" />
            <p className="text-xs font-medium text-white/30 uppercase tracking-wider">
              Recent News Found
            </p>
          </div>
          <ul className="space-y-1.5">
            {companyNews.map((item, i) => (
              <li key={i} className="text-xs text-white/40 leading-relaxed pl-3 border-l border-white/10">
                {item.replace(/^- /, "")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
