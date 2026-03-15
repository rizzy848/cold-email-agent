"use client";

import Link from "next/link";
import {
  Mail,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Globe,
  FileText,
  Send,
  Layers,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: <Globe size={22} className="text-emerald-400" />,
    title: "Live Web Research Agent",
    desc: "Autonomously searches the web for recent company news, product launches, and funding rounds — weaves real facts into every email.",
  },
  {
    icon: <Shield size={22} className="text-violet-400" />,
    title: "Zero-Hallucination Drafting",
    desc: "Only uses real data from your resume. No invented credentials, no generic AI phrases, no fake attachment references.",
  },
  {
    icon: <Layers size={22} className="text-indigo-400" />,
    title: "Campaign Mode",
    desc: "Target up to 10 companies simultaneously. Each email individually researched and tailored — your entire internship blitz in one click.",
  },
  {
    icon: <Send size={22} className="text-amber-400" />,
    title: "Gmail Integration",
    desc: "Sends finalized emails directly via Gmail OAuth. Review before sending — you stay in control.",
  },
];

const steps = [
  { label: "Upload your resume once", num: "01", detail: "Parsed once, used across all emails" },
  { label: "Paste job descriptions or add companies", num: "02", detail: "Single email or bulk campaign mode" },
  { label: "Agents research, draft & personalize", num: "03", detail: "Web research + resume matching + zero-hallucination review" },
  { label: "Review & send via Gmail", num: "04", detail: "You approve before anything goes out" },
];

const agentPipeline = [
  { name: "Job Analysis Agent", color: "bg-indigo-500/20 border-indigo-500/30 text-indigo-400" },
  { name: "Web Research Agent", color: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" },
  { name: "Email Drafting Agent", color: "bg-violet-500/20 border-violet-500/30 text-violet-400" },
  { name: "Signature Formatter", color: "bg-amber-500/20 border-amber-500/30 text-amber-400" },
  { name: "Gmail Sender", color: "bg-blue-500/20 border-blue-500/30 text-blue-400" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Mail size={16} className="text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">MailForge</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/history" className="text-white/40 hover:text-white/70 transition-colors text-sm">
              History
            </Link>
            <Link
              href="/campaign"
              className="text-white/50 hover:text-white/80 transition-colors text-sm flex items-center gap-1.5"
            >
              <Layers size={13} />
              Campaign
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition-all px-4 py-2 rounded-lg text-sm font-medium"
            >
              Launch App <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 text-center relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-emerald-600/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 border border-indigo-500/30 bg-indigo-500/10 rounded-full px-4 py-1.5 text-sm text-indigo-300 mb-8">
            <Zap size={12} className="fill-indigo-400 text-indigo-400" />
            Autonomous outreach agent — built at UofT GenAI Hackathon
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Your autonomous{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              outreach agent
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            MailForge researches companies in real time, drafts hyper-personalized cold emails from
            your actual resume, and runs your entire internship campaign — autonomously.
          </p>

          {/* Agent pipeline visualization */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {agentPipeline.map((agent, i) => (
              <div key={agent.name} className="flex items-center gap-2">
                <span
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium ${agent.color}`}
                >
                  {agent.name}
                </span>
                {i < agentPipeline.length - 1 && (
                  <ArrowRight size={12} className="text-white/20" />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/campaign"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition-all hover:scale-105 px-6 py-3.5 rounded-xl font-semibold text-base shadow-lg shadow-indigo-900/40"
            >
              <Layers size={16} />
              Launch Campaign Mode
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-all px-6 py-3.5 rounded-xl font-medium text-base"
            >
              Single Email
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <div className="border-y border-white/5 bg-white/[0.02] py-4 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6 text-sm text-white/40">
          {[
            "Live web research — no API key needed",
            "No generic AI phrases",
            "No invented credentials",
            "Up to 10 companies at once",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-500" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Campaign mode highlight */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-indigo-600/10 to-violet-600/10 border border-indigo-500/20 rounded-3xl p-8 md:p-12">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                Flagship Feature
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Campaign Mode — your whole internship blitz in one click
            </h2>
            <p className="text-white/50 text-lg mb-8 max-w-2xl leading-relaxed">
              Add up to 10 companies, upload your resume once, hit launch. MailForge researches
              each company autonomously, extracts the right context, and generates a unique,
              personalized email per company — all running in parallel.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[
                { stat: "10x", label: "Faster than manual outreach" },
                { stat: "100%", label: "Real resume data, zero hallucinations" },
                { stat: "Live", label: "Web research for every company" },
              ].map((s) => (
                <div key={s.label} className="bg-white/5 rounded-2xl p-5 text-center border border-white/5">
                  <p className="text-2xl font-bold text-indigo-400 mb-1">{s.stat}</p>
                  <p className="text-xs text-white/40">{s.label}</p>
                </div>
              ))}
            </div>
            <Link
              href="/campaign"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition-all px-6 py-3.5 rounded-xl font-semibold shadow-lg shadow-indigo-900/40"
            >
              <Layers size={16} />
              Try Campaign Mode
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Five agents. One pipeline.</h2>
          <p className="text-white/40 text-center mb-12 max-w-xl mx-auto">
            Each specialized agent handles one job. Together they produce emails that feel researched,
            human, and hyper-relevant.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 hover:bg-white/[0.05] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
          <p className="text-white/40 text-center mb-16 max-w-lg mx-auto">
            From resume upload to Gmail — the entire outreach pipeline runs automatically.
          </p>

          <div className="relative">
            <div className="absolute left-6 top-6 bottom-6 w-px bg-gradient-to-b from-indigo-500 to-violet-500 opacity-30" />

            <div className="space-y-8">
              {steps.map((step, i) => (
                <div key={step.num} className="flex items-start gap-6 relative">
                  <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shrink-0 text-indigo-400 font-mono text-xs font-bold z-10">
                    {step.num}
                  </div>
                  <div className="pt-2">
                    <p className="font-medium text-white/90">{step.label}</p>
                    <p className="text-sm text-white/30 mt-1">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link
              href="/campaign"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all px-8 py-4 rounded-xl font-semibold text-lg shadow-xl shadow-indigo-900/30"
            >
              Get started free <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-sm text-white/25">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Mail size={14} />
          <span className="font-medium text-white/40">MailForge</span>
        </div>
        <p>Built at UofT GenAI Hackathon — autonomous outreach for internship hunters.</p>
      </footer>
    </div>
  );
}
