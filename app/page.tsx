import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ProblemCounter } from "./components/problem-counter";

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-pa-black text-pa-text-1 overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 h-14 flex items-center px-6 border-b border-pa-border-1/50 bg-pa-black/80 backdrop-blur-xl">
        <Logo size="sm" />
        <nav className="hidden sm:flex items-center gap-6 ml-8">
          <a href="#solution" className="text-pa-text-3 text-[13px] hover:text-pa-text-1 transition-colors">How it works</a>
          <a href="#features" className="text-pa-text-3 text-[13px] hover:text-pa-text-1 transition-colors">Features</a>
        </nav>
        <Link
          href="/login"
          className="ml-auto h-8 px-4 rounded-lg bg-pa-surface-2 border border-pa-border-2 text-pa-text-1 text-[13px] font-medium flex items-center hover:border-pa-border-3 transition-colors"
        >
          Sign In →
        </Link>
      </header>

      {/* ── Hero (100vh) ───────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">

        {/* Logo mark fades in first */}
        <div className="animate-[pa-fade-in_0.6s_ease-out] mb-8">
          <Logo size="md" />
        </div>

        {/* Headline slides up */}
        <h1 className="animate-[pa-slide-up_0.8s_ease-out_0.2s_both] text-[clamp(40px,6vw,72px)] font-semibold tracking-[-0.03em] leading-[1.05] max-w-3xl mx-auto mb-5">
          Your mutual funds<br />
          <span className="text-pa-text-2">are sleeping money.</span>
        </h1>

        {/* Subline */}
        <p className="animate-[pa-fade-in_0.6s_ease-out_0.4s_both] text-[18px] text-pa-text-2 leading-relaxed max-w-[500px] mx-auto mb-10">
          Model how SEBI-eligible mutual funds serve as margin
          collateral for options strategies. Educational. Free.
        </p>

        {/* CTA */}
        <Link
          href="/login"
          className="animate-[pa-fade-in_0.6s_ease-out_0.6s_both] inline-flex h-11 items-center px-7 rounded-xl bg-white text-black text-[15px] font-semibold hover:bg-pa-text-1 transition-colors tracking-[-0.01em]"
        >
          Get Started →
        </Link>

        <p className="animate-[pa-fade-in_0.6s_ease-out_0.6s_both] mt-3 text-[12px] text-pa-text-4">
          No broker integration · Not investment advice
        </p>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <div
            className="w-1 h-1 rounded-full bg-pa-text-3"
            style={{ animation: "bounce-dot 2s ease-in-out infinite" }}
          />
        </div>
      </section>

      {/* ── Stats strip ────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 -mt-4 pb-20">
        <div className="grid grid-cols-3 gap-px bg-pa-border-1 rounded-2xl overflow-hidden border border-pa-border-1">
          {[
            { value: "Up to 90%", label: "Of eligible MF value unlockable as margin" },
            { value: "6–28% p.a.", label: "Annualised yield range across scenario types" },
            { value: "52–82%", label: "Probability of profit range (Black-Scholes)" },
          ].map(({ value, label }) => (
            <div key={label} className="bg-pa-surface-1 px-6 py-5 text-center">
              <p className="text-[22px] font-semibold tracking-[-0.03em] text-pa-text-1 num">{value}</p>
              <p className="text-[11px] text-pa-text-3 mt-1.5 leading-snug">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-pa-text-4 text-center mt-3">
          Based on current market conditions · Illustrative range · Not a forecast
        </p>
      </div>

      {/* ── Problem section (₹0 count-up) ─────────────────────────────────── */}
      <section className="bg-pa-surface-1 border-t border-b border-pa-border-1 py-24 px-6 text-center">
        <ProblemCounter />
        <p className="text-[11px] tracking-[0.15em] uppercase text-pa-text-3 mb-8">
          OF YOUR MUTUAL FUND PORTFOLIO IS IN THE MARKET RIGHT NOW
        </p>
        <p className="text-pa-text-2 text-[18px] max-w-[600px] mx-auto leading-relaxed">
          Most investors park ₹10–50 lakhs in mutual funds that do nothing beyond their NAV.
          But those same funds qualify as SEBI-approved collateral — sitting idle while options
          markets offer structured yield scenarios on top.
        </p>
      </section>

      {/* ── Solution section ────────────────────────────────────────────────── */}
      <section id="solution" className="bg-pa-black py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.03em] text-pa-text-1 text-center mb-16">
            Three steps. Zero new capital.
          </h2>
          <div className="grid sm:grid-cols-3 gap-10">
            {[
              {
                n: "01",
                title: "Upload portfolio",
                body: "Import from CAMS, KFintech, or enter manually. Instant SEBI-eligible classification and haircut-adjusted pledgeable value.",
              },
              {
                n: "02",
                title: "Review margin",
                body: "See each holding's eligibility, haircut rate, and total pledgeable margin in real time.",
              },
              {
                n: "03",
                title: "Run scenarios",
                body: "Choose risk appetite. The engine generates ranked, AI-explained strategy scenarios with payoff charts.",
              },
            ].map((s) => (
              <div key={s.n} className="flex flex-col gap-4">
                <span className="text-[48px] font-semibold text-pa-text-4 tracking-[-0.04em] leading-none num">
                  {s.n}
                </span>
                <h3 className="text-[16px] font-medium text-pa-text-1 tracking-[-0.01em]">{s.title}</h3>
                <p className="text-[14px] text-pa-text-3 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-16 text-center">
            <Link
              href="/login"
              className="inline-flex h-11 px-7 rounded-xl bg-white text-black text-[15px] font-semibold hover:bg-pa-text-1 transition-colors items-center tracking-[-0.01em]"
            >
              Start Now →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="bg-pa-surface-1 border-t border-pa-border-1 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-14">
            <div className="h-px flex-1 bg-pa-border-1" />
            <p className="text-[11px] tracking-[0.18em] text-pa-text-3 uppercase font-medium">What it does</p>
            <div className="h-px flex-1 bg-pa-border-1" />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                tag: "01 · Collateral",
                title: "Smart Collateral Analysis",
                body: "Upload your CAMS or KFintech export. Instant SEBI-eligible classification and haircut-adjusted pledgeable value.",
                preview: [
                  { name: "SBI Liquid Fund", val: "₹3,36,507" },
                  { name: "UTI Nifty 50 ETF", val: "₹1,33,461" },
                  { name: "Nippon Small Cap", val: "₹27,754" },
                ],
              },
              {
                tag: "02 · Engine",
                title: "Strategy Scenario Engine",
                body: "Iron Condors, CSPs, Bull Put Spreads — scored by probability of profit, annualised yield, and margin efficiency.",
                preview: [
                  { name: "Bull Put Spread · NIFTY", val: "9.2%" },
                  { name: "Iron Condor · BANKNIFTY", val: "14.1%" },
                  { name: "Cash-Secured Put · NIFTY", val: "6.8%" },
                ],
              },
              {
                tag: "03 · AI",
                title: "AI-Powered Explanations",
                body: "Groq (Llama 3.3) explains every scenario — what it is, what can go wrong, why it was selected. Educational only.",
                preview: null,
                quote: `"This spread profits if NIFTY stays above 23,500 at expiry — a level it hasn't broken in 3 weeks."`,
              },
            ].map((c) => (
              <div key={c.tag} className="bg-pa-black border border-pa-border-1 rounded-2xl p-6 flex flex-col gap-5">
                <span className="text-[11px] font-medium tracking-[0.1em] text-pa-text-3 uppercase">{c.tag}</span>
                <div>
                  <h3 className="text-[15px] font-semibold text-pa-text-1 tracking-[-0.015em] mb-1.5">{c.title}</h3>
                  <p className="text-[13px] text-pa-text-3 leading-relaxed">{c.body}</p>
                </div>
                <div className="mt-auto bg-pa-surface-1 rounded-xl p-3.5 space-y-2.5">
                  {c.preview
                    ? c.preview.map((h) => (
                        <div key={h.name} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-pa-profit flex-shrink-0" />
                          <p className="text-[11px] text-pa-text-2 truncate flex-1">{h.name}</p>
                          <p className="text-[11px] text-pa-profit num flex-shrink-0">{h.val}</p>
                        </div>
                      ))
                    : (
                        <>
                          <p className="text-[12px] text-pa-text-1 leading-relaxed">{c.quote}</p>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-pa-warning" />
                            <p className="text-[11px] text-pa-warning">Risk: gap-down beyond breakeven erases premium</p>
                          </div>
                          <p className="text-[11px] text-pa-text-3 italic">Groq · Llama 3.3 · educational only</p>
                        </>
                      )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA (60vh) ────────────────────────────────────────────────── */}
      <section className="bg-pa-black min-h-[60vh] flex flex-col items-center justify-center px-6 text-center border-t border-pa-border-1">
        <h2 className="text-[clamp(32px,5vw,48px)] font-semibold tracking-[-0.03em] text-pa-text-1 mb-4">
          Your portfolio is sleeping.
        </h2>
        <p className="text-pa-text-2 text-[20px] mb-10">
          See what it could unlock.
        </p>
        <Link
          href="/login"
          className="inline-flex h-12 items-center px-8 rounded-xl bg-white text-black text-[16px] font-semibold hover:bg-pa-text-1 transition-colors tracking-[-0.01em]"
        >
          Analyse My Portfolio →
        </Link>
      </section>

      {/* ── Compliance ──────────────────────────────────────────────────────── */}
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

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-pa-surface-1 border-t border-pa-border-1 px-6 py-7">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <Logo size="sm" />
          <p className="text-[12px] text-pa-text-4">
            Educational platform only. · © 2026 PledgeAlpha
          </p>
        </div>
      </footer>

    </div>
  );
}
