import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-pa-black text-pa-text-1 overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 h-14 flex items-center px-6 border-b border-pa-border-1/50 bg-pa-black/80 backdrop-blur-xl">
        <Logo size="sm" />
        <nav className="hidden sm:flex items-center gap-6 ml-8">
          <a href="#features" className="text-pa-text-3 text-[13px] hover:text-pa-text-1 transition-colors">Features</a>
          <a href="#how-it-works" className="text-pa-text-3 text-[13px] hover:text-pa-text-1 transition-colors">How it works</a>
        </nav>
        <Link
          href="/login"
          className="ml-auto h-8 px-4 rounded-lg bg-pa-surface-2 border border-pa-border-2 text-pa-text-1 text-[13px] font-medium flex items-center hover:border-pa-border-3 transition-colors"
        >
          Sign In →
        </Link>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-20 px-6 text-center overflow-hidden">
        {/* Radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] opacity-[0.12]"
          style={{
            background: "radial-gradient(ellipse at center top, #34C759 0%, transparent 70%)",
          }}
        />

        <p className="relative text-[11px] tracking-[0.2em] text-pa-text-3 uppercase font-medium mb-6">
          Educational · Simulation · Zero Cost
        </p>

        <h1 className="relative text-[clamp(34px,6.5vw,68px)] font-semibold tracking-[-0.03em] leading-[1.05] max-w-3xl mx-auto mb-5">
          Your mutual funds<br />
          <span className="text-pa-profit">are sleeping money.</span>
        </h1>

        <p className="relative text-[16px] text-pa-text-2 leading-relaxed max-w-[480px] mx-auto mb-10">
          Model how SEBI-eligible mutual funds serve as margin collateral for
          options strategies. Explore scenarios, learn the mechanics — free.
        </p>

        <Link
          href="/login"
          className="relative inline-flex h-11 items-center px-7 rounded-xl bg-white text-black text-[15px] font-semibold hover:bg-pa-text-1 transition-colors tracking-[-0.01em]"
        >
          Start Exploring →
        </Link>

        <p className="relative mt-4 text-[12px] text-pa-text-4">
          No broker integration · Not investment advice
        </p>

        {/* ── Simulated stats strip ─────────────────────────────────────────── */}
        <div className="relative mt-16 max-w-2xl mx-auto grid grid-cols-3 gap-px bg-pa-border-1 rounded-2xl overflow-hidden border border-pa-border-1">
          {[
            { value: "₹6,59,043", label: "Simulated pledgeable margin", color: "text-pa-profit" },
            { value: "4–35%", label: "Annualised yield range (simulation)", color: "text-pa-warning" },
            { value: "68–82%", label: "Probability of profit range (model)", color: "text-pa-text-1" },
          ].map(({ value, label, color }) => (
            <div key={label} className="bg-pa-surface-1 px-6 py-5 text-center">
              <p className={`text-[22px] font-semibold tracking-[-0.03em] num ${color}`}>{value}</p>
              <p className="text-[11px] text-pa-text-3 mt-1.5 leading-snug">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-pa-text-4 mt-3">
          ↑ Illustrative scenario output only — not a forecast
        </p>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-20">
        <div className="flex items-center gap-3 mb-12">
          <div className="h-px flex-1 bg-pa-border-1" />
          <p className="text-[11px] tracking-[0.18em] text-pa-text-3 uppercase font-medium">What it does</p>
          <div className="h-px flex-1 bg-pa-border-1" />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium tracking-[0.1em] text-pa-text-3 uppercase">01 · Collateral</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="14" height="10" rx="2" stroke="#6E6E73" strokeWidth="1.3"/>
                <path d="M5 7h6M5 10h4" stroke="#6E6E73" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-pa-text-1 tracking-[-0.015em] mb-1.5">Smart Collateral Analysis</h3>
              <p className="text-[13px] text-pa-text-3 leading-relaxed">
                Upload your CAMS or KFintech export. Instant SEBI-eligible classification and haircut-adjusted pledgeable value.
              </p>
            </div>
            {/* Mini preview */}
            <div className="mt-auto bg-pa-surface-2 rounded-xl p-3.5 space-y-2.5">
              {[
                { name: "SBI Liquid Fund", pct: "95%", val: "₹3,36,507", eligible: true },
                { name: "UTI Nifty 50 ETF", pct: "90%", val: "₹1,33,461", eligible: true },
                { name: "Nippon Small Cap", pct: "65%", val: "₹27,754", eligible: true },
              ].map((h) => (
                <div key={h.name} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-pa-profit flex-shrink-0" />
                  <p className="text-[11px] text-pa-text-2 truncate flex-1">{h.name}</p>
                  <p className="text-[11px] text-pa-profit num flex-shrink-0">{h.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium tracking-[0.1em] text-pa-text-3 uppercase">02 · Engine</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 12 L5 8 L9 10 L14 4" stroke="#6E6E73" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="14" cy="4" r="1.5" fill="#34C759"/>
              </svg>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-pa-text-1 tracking-[-0.015em] mb-1.5">Strategy Scenario Engine</h3>
              <p className="text-[13px] text-pa-text-3 leading-relaxed">
                Iron Condors, CSPs, Bull Put Spreads — scored by probability of profit, annualised yield, and margin efficiency.
              </p>
            </div>
            {/* Mini preview */}
            <div className="mt-auto bg-pa-surface-2 rounded-xl p-3.5 space-y-2.5">
              {[
                { name: "Bull Put Spread · NIFTY", score: 74, yield: "9.2%", pop: "73%" },
                { name: "Iron Condor · BANKNIFTY", score: 71, yield: "14.1%", pop: "64%" },
                { name: "Cash-Secured Put · NIFTY", score: 68, yield: "6.8%", pop: "78%" },
              ].map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-6 h-4 rounded bg-pa-surface-3 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] text-pa-text-2 num">{s.score}</span>
                  </div>
                  <p className="text-[11px] text-pa-text-2 truncate flex-1">{s.name}</p>
                  <p className="text-[11px] text-pa-profit num flex-shrink-0">{s.yield}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium tracking-[0.1em] text-pa-text-3 uppercase">03 · AI</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="#6E6E73" strokeWidth="1.3"/>
                <path d="M8 5.5v3l2 1.2" stroke="#6E6E73" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-pa-text-1 tracking-[-0.015em] mb-1.5">AI-Powered Explanations</h3>
              <p className="text-[13px] text-pa-text-3 leading-relaxed">
                Groq (Llama 3.3) explains every scenario — what it is, what can go wrong, why it was selected.
              </p>
            </div>
            {/* Mini preview */}
            <div className="mt-auto bg-pa-surface-2 rounded-xl p-3.5 space-y-2">
              <p className="text-[12px] text-pa-text-1 leading-relaxed">
                "This spread profits if NIFTY stays above 23,500 at expiry — a level it hasn't broken in 3 weeks."
              </p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-pa-warning" />
                <p className="text-[11px] text-pa-warning">Risk: gap-down beyond breakeven erases premium</p>
              </div>
              <p className="text-[11px] text-pa-text-3 italic">Groq · Llama 3.3 · educational only</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-pa-border-1 px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-px flex-1 bg-pa-border-1" />
            <p className="text-[11px] tracking-[0.18em] text-pa-text-3 uppercase font-medium">User flow</p>
            <div className="h-px flex-1 bg-pa-border-1" />
          </div>

          <div className="grid sm:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                title: "Upload portfolio",
                body: "Import from CAMS, KFintech, or enter manually. CSV and Excel supported.",
                accent: "bg-pa-profit/10 border-pa-profit/20 text-pa-profit",
              },
              {
                step: "02",
                title: "Review margin",
                body: "See each holding's SEBI eligibility, haircut rate, and total pledgeable margin.",
                accent: "bg-pa-warning/10 border-pa-warning/20 text-pa-warning",
              },
              {
                step: "03",
                title: "Run scenarios",
                body: "Choose risk appetite. The engine generates ranked, AI-explained strategy scenarios.",
                accent: "bg-pa-blue/10 border-pa-blue/20 text-pa-blue",
              },
            ].map((s) => (
              <div key={s.step} className="flex flex-col gap-3">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${s.accent}`}>
                  <span className="text-[12px] font-semibold num">{s.step}</span>
                </div>
                <h3 className="text-[15px] font-semibold text-pa-text-1 tracking-[-0.015em]">{s.title}</h3>
                <p className="text-[13px] text-pa-text-3 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/login"
              className="inline-flex h-11 px-7 rounded-xl bg-white text-black text-[15px] font-semibold hover:bg-pa-text-1 transition-colors items-center tracking-[-0.01em]"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Compliance ───────────────────────────────────────────────────────── */}
      <section className="border-t border-pa-border-1 px-6 py-8">
        <div className="max-w-2xl mx-auto bg-pa-surface-1/60 border border-pa-border-1 rounded-xl p-5">
          <p className="text-[11px] text-pa-text-3 leading-relaxed text-center">
            <span className="text-pa-text-2 font-medium">Simulated results only.</span>{" "}
            PledgeAlpha is a free educational platform. All outputs are scenario simulations and do not constitute
            investment advice. Not affiliated with SEBI, NSE, BSE, or any broker or fund house.
            Options trading involves substantial risk of loss.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-pa-border-1 px-6 py-7">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <Logo size="sm" />
          <p className="text-[12px] text-pa-text-4">
            Educational platform · Not investment advice · © 2026 PledgeAlpha
          </p>
        </div>
      </footer>

    </div>
  );
}
