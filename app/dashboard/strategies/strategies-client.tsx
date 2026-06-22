"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { generateStrategies, type RiskAppetite } from "@/app/actions/strategy";
import type { StrategyResult, ExplainedStrategy } from "@/lib/strategy-types";

const PayoffChart = dynamic(() => import("./payoff-chart"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

type AppStep = "risk-select" | "loading" | "results";

const RISK_OPTIONS = [
  {
    key: "conservative" as RiskAppetite,
    label: "Conservative",
    eyebrow: "LOWER RISK",
    strategies: "Cash-Secured Puts · Bull Put Spreads",
    yieldRange: "4–12%",
    pop: "70–80%",
    zoneColor: "var(--pa-profit)",
    zoneBg: "rgba(52,199,89,0.08)",
    zoneBorder: "rgba(52,199,89,0.18)",
    desc: "Higher probability. Lower yield. Defined maximum loss.",
  },
  {
    key: "moderate" as RiskAppetite,
    label: "Moderate",
    eyebrow: "MEDIUM RISK",
    strategies: "Iron Condors · Bull Put Spreads · Bear Call Spreads",
    yieldRange: "8–20%",
    pop: "58–70%",
    zoneColor: "var(--pa-warning)",
    zoneBg: "rgba(255,149,0,0.08)",
    zoneBorder: "rgba(255,149,0,0.18)",
    desc: "Balanced yield and probability. Range-bound strategies.",
  },
  {
    key: "aggressive" as RiskAppetite,
    label: "Aggressive",
    eyebrow: "HIGHER RISK",
    strategies: "Iron Condors · Bear Call Spreads · Bull Put Spreads",
    yieldRange: "15–35%",
    pop: "45–60%",
    zoneColor: "var(--pa-loss)",
    zoneBg: "rgba(255,59,48,0.08)",
    zoneBorder: "rgba(255,59,48,0.18)",
    desc: "Higher potential yield. More sensitive to market moves.",
  },
] as const;

const LOADING_PHASES = [
  "Fetching live NIFTY & BANKNIFTY data…",
  "Running Black-Scholes pricing engine…",
  "Scoring strategy candidates…",
  "Groq AI curating best scenarios…",
];

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// ── Label component (Bearprint-style eyebrow) ─────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--pa-text-3)", margin: 0, textTransform: "uppercase", fontWeight: 500 }}>
      {children}
    </p>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function StrategiesClient({ marginAvailable }: { marginAvailable: number }) {
  const [step, setStep] = useState<AppStep>("risk-select");
  const [riskIdx, setRiskIdx] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openChartIdx, setOpenChartIdx] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function handleSelect() {
    setError(null);
    setStep("loading");
    setLoadingPhase(0);
    let phase = 0;
    timerRef.current = setInterval(() => {
      phase++;
      if (phase < LOADING_PHASES.length) setLoadingPhase(phase);
      else if (timerRef.current) clearInterval(timerRef.current);
    }, 700);

    startTransition(async () => {
      try {
        const data = await generateStrategies(RISK_OPTIONS[riskIdx].key);
        if (timerRef.current) clearInterval(timerRef.current);
        setResult(data);
        setStep("results");
      } catch (err) {
        if (timerRef.current) clearInterval(timerRef.current);
        setError(err instanceof Error ? err.message : "Failed to generate strategy scenarios.");
        setStep("risk-select");
      }
    });
  }

  if (step === "loading") {
    return <LoadingView phase={loadingPhase} marginAvailable={marginAvailable} />;
  }

  if (step === "results" && result) {
    return (
      <ResultsView
        result={result}
        openChartIdx={openChartIdx}
        setOpenChartIdx={setOpenChartIdx}
        onReset={() => { setStep("risk-select"); setResult(null); setOpenChartIdx(null); }}
        riskLabel={RISK_OPTIONS[riskIdx].label}
        riskOpt={RISK_OPTIONS[riskIdx]}
      />
    );
  }

  const opt = RISK_OPTIONS[riskIdx];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--pa-black)", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <header style={{
        height: 56, display: "flex", alignItems: "center", padding: "0 20px",
        borderBottom: "1px solid var(--pa-border-1)", flexShrink: 0, gap: 16,
      }}>
        <Link href="/dashboard" style={{ color: "var(--pa-text-3)", fontSize: 12, textDecoration: "none", letterSpacing: "0.02em" }}>
          ← Dashboard
        </Link>
        <div style={{ width: 1, height: 16, backgroundColor: "var(--pa-border-2)" }} />
        <span style={{ fontSize: 13, color: "var(--pa-text-2)", fontWeight: 500 }}>Strategy Scenarios</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--pa-text-3)", textTransform: "uppercase" }}>Margin</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--pa-profit)", fontVariantNumeric: "tabular-nums" }}>{INR(marginAvailable)}</span>
        </div>
      </header>

      {/* Risk selector — centered, cinematic */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 20px 60px" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>

          {/* Tab selector */}
          <div style={{
            display: "flex", gap: 2, backgroundColor: "var(--pa-surface-1)",
            border: "1px solid var(--pa-border-1)", borderRadius: 12, padding: 4, marginBottom: 32,
          }}>
            {RISK_OPTIONS.map((o, i) => (
              <button
                key={o.key}
                onClick={() => setRiskIdx(i)}
                style={{
                  flex: 1, height: 34, borderRadius: 9,
                  backgroundColor: i === riskIdx ? "var(--pa-surface-3)" : "transparent",
                  border: i === riskIdx ? "1px solid var(--pa-border-2)" : "1px solid transparent",
                  color: i === riskIdx ? "var(--pa-text-1)" : "var(--pa-text-3)",
                  fontSize: 12, fontWeight: 500, cursor: "pointer",
                  transition: "all 200ms ease",
                  letterSpacing: "0.01em",
                }}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Zone card — Bearprint style */}
          <div style={{
            backgroundColor: "var(--pa-surface-1)",
            border: `1px solid ${opt.zoneBorder}`,
            borderRadius: 16, padding: "24px 24px 20px",
            marginBottom: 16,
          }}>
            {/* Zone badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              backgroundColor: opt.zoneBg, border: `1px solid ${opt.zoneBorder}`,
              borderRadius: 100, padding: "4px 10px", marginBottom: 20,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: opt.zoneColor }} />
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: opt.zoneColor, textTransform: "uppercase" }}>
                {opt.eyebrow}
              </span>
            </div>

            {/* Big label */}
            <p style={{ fontSize: "clamp(32px,6vw,52px)", fontWeight: 700, color: "var(--pa-text-1)", letterSpacing: "-0.03em", lineHeight: 1, margin: "0 0 16px" }}>
              {opt.label}
            </p>

            {/* Metrics row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <Label>Yield Range (sim.)</Label>
                <p style={{ fontSize: 20, fontWeight: 600, color: opt.zoneColor, margin: "4px 0 0", fontVariantNumeric: "tabular-nums" }}>{opt.yieldRange} p.a.</p>
              </div>
              <div>
                <Label>Est. Probability</Label>
                <p style={{ fontSize: 20, fontWeight: 600, color: "var(--pa-text-1)", margin: "4px 0 0", fontVariantNumeric: "tabular-nums" }}>{opt.pop}</p>
              </div>
            </div>

            {/* Strategy types */}
            <p style={{ fontSize: 12, color: "var(--pa-text-2)", margin: "0 0 4px" }}>{opt.strategies}</p>
            <p style={{ fontSize: 12, color: "var(--pa-text-4)", margin: 0 }}>{opt.desc}</p>
          </div>

          {/* CTA */}
          <button
            onClick={handleSelect}
            style={{
              width: "100%", height: 46, borderRadius: 12,
              backgroundColor: "#ffffff", color: "#000000",
              fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer",
              letterSpacing: "-0.01em", marginBottom: 12,
            }}
          >
            Generate {opt.label} Scenarios →
          </button>

          {error && (
            <div style={{
              padding: "12px 14px", borderRadius: 10,
              border: "1px solid rgba(255,59,48,0.25)", backgroundColor: "rgba(255,59,48,0.06)",
              color: "var(--pa-loss)", fontSize: 13, marginBottom: 12,
            }}>
              {error}
            </div>
          )}

          <p style={{ fontSize: 11, color: "var(--pa-text-4)", textAlign: "center", lineHeight: 1.6 }}>
            Live NIFTY/BANKNIFTY data · Black-Scholes pricing · Groq AI · Educational only
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Loading view ─────────────────────────────────────────────────────────────

function LoadingView({ phase, marginAvailable }: { phase: number; marginAvailable: number }) {
  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "var(--pa-black)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32,
    }}>
      <Logo size="md" />

      <div style={{ display: "flex", flexDirection: "column", gap: 0, width: 300 }}>
        {LOADING_PHASES.map((text, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", borderRadius: 8,
            backgroundColor: i === phase ? "var(--pa-surface-1)" : "transparent",
            border: i === phase ? "1px solid var(--pa-border-1)" : "1px solid transparent",
            transition: "all 250ms ease-out",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: i < phase ? "var(--pa-profit)" : i === phase ? "var(--pa-surface-2)" : "transparent",
              border: i >= phase ? `1px solid ${i === phase ? "var(--pa-border-2)" : "var(--pa-border-1)"}` : "none",
              transition: "all 250ms ease-out",
            }}>
              {i < phase && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5 L4.5 7.5 L8 3" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <p style={{
              fontSize: 13, margin: 0,
              color: i < phase ? "var(--pa-text-2)" : i === phase ? "var(--pa-text-1)" : "var(--pa-text-4)",
              fontWeight: i === phase ? 500 : 400,
              transition: "color 250ms ease-out",
            }}>
              {text}
            </p>
          </div>
        ))}
      </div>

      <div style={{
        display: "flex", gap: 6, alignItems: "center",
        backgroundColor: "var(--pa-surface-1)", border: "1px solid var(--pa-border-1)",
        borderRadius: 100, padding: "6px 14px",
      }}>
        <span style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--pa-text-3)", textTransform: "uppercase" }}>Margin</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--pa-profit)", fontVariantNumeric: "tabular-nums" }}>{INR(marginAvailable)}</span>
      </div>
    </div>
  );
}

// ── Results view ─────────────────────────────────────────────────────────────

function ResultsView({
  result, openChartIdx, setOpenChartIdx, onReset, riskLabel, riskOpt,
}: {
  result: StrategyResult;
  openChartIdx: number | null;
  setOpenChartIdx: (i: number | null) => void;
  onReset: () => void;
  riskLabel: string;
  riskOpt: typeof RISK_OPTIONS[number];
}) {
  const { strategies, marginAvailable, marketData } = result;
  const anyAI = strategies.some((s) => s.aiPowered);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--pa-black)", paddingBottom: 80 }}>
      <header style={{
        height: 56, display: "flex", alignItems: "center", padding: "0 20px", gap: 16,
        borderBottom: "1px solid var(--pa-border-1)",
        position: "sticky", top: 0,
        backgroundColor: "rgba(29,29,31,0.92)", backdropFilter: "blur(16px)",
        zIndex: 10,
      }}>
        <button onClick={onReset} style={{ color: "var(--pa-text-3)", fontSize: 12, background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: "0.02em" }}>
          ← Back
        </button>
        <div style={{ width: 1, height: 16, backgroundColor: "var(--pa-border-2)" }} />

        {/* Zone badge in header */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          backgroundColor: riskOpt.zoneBg, border: `1px solid ${riskOpt.zoneBorder}`,
          borderRadius: 100, padding: "3px 9px",
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: riskOpt.zoneColor }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: riskOpt.zoneColor, textTransform: "uppercase" }}>
            {riskLabel}
          </span>
        </div>

        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--pa-text-1)", letterSpacing: "-0.01em" }}>
          {anyAI ? "AI-Selected Scenarios" : "Top Scenarios"}
        </span>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {marketData.isStale && (
            <span style={{ fontSize: 11, color: "var(--pa-warning)" }}>⚠ Cached data</span>
          )}
          <span style={{ fontSize: 11, color: "var(--pa-text-3)", fontVariantNumeric: "tabular-nums" }}>
            NIFTY {marketData.nifty.toLocaleString("en-IN")} · BANK {marketData.banknifty.toLocaleString("en-IN")}
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px" }}>
        <p style={{ fontSize: 11, color: "var(--pa-text-4)", textAlign: "center", marginBottom: 24, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Simulated scenarios · Educational only · Not investment advice
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {strategies.map((s, i) => (
            <StrategyCard
              key={s.id}
              strategy={s}
              marginAvailable={marginAvailable}
              index={i}
              chartOpen={openChartIdx === i}
              onToggleChart={() => setOpenChartIdx(openChartIdx === i ? null : i)}
              riskOpt={riskOpt}
            />
          ))}
        </div>

        <div style={{
          marginTop: 40, padding: "16px 20px", borderRadius: 12,
          border: "1px solid var(--pa-border-1)", backgroundColor: "var(--pa-surface-1)",
        }}>
          <p style={{ fontSize: 11, color: "var(--pa-text-3)", lineHeight: 1.7, margin: 0, letterSpacing: "0.01em" }}>
            PledgeAlpha generates educational scenarios using Black-Scholes for options pricing and Groq AI (Llama 3.3) for
            scenario curation. All outputs are simulations only. Strategy scenarios are not recommendations to buy or sell any security.
          </p>
        </div>
      </main>
    </div>
  );
}

// ── Strategy card — Bearprint-style ──────────────────────────────────────────

function StrategyCard({
  strategy: s,
  marginAvailable,
  index,
  chartOpen,
  onToggleChart,
  riskOpt,
}: {
  strategy: ExplainedStrategy;
  marginAvailable: number;
  index: number;
  chartOpen: boolean;
  onToggleChart: () => void;
  riskOpt: typeof RISK_OPTIONS[number];
}) {
  const marginPct = Math.min(s.marginRequired / marginAvailable, 1);
  const barColor = marginPct < 0.5 ? "var(--pa-profit)" : marginPct < 0.75 ? "var(--pa-warning)" : "var(--pa-loss)";
  const delay = `${index * 100}ms`;
  const pop = (s.probabilityOfProfit * 100).toFixed(0);

  return (
    <div style={{
      backgroundColor: "var(--pa-surface-1)",
      border: "1px solid var(--pa-border-1)",
      borderRadius: 14,
      overflow: "hidden",
      animation: `pa-slide-up 260ms cubic-bezier(0.16,1,0.3,1) ${delay} both`,
    }}>
      {/* Top bar: rank + name + zone badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 10px",
        borderBottom: "1px solid var(--pa-border-1)",
      }}>
        <div style={{
          width: 28, height: 20, borderRadius: 5, backgroundColor: "var(--pa-surface-2)",
          border: "1px solid var(--pa-border-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--pa-text-2)", fontVariantNumeric: "tabular-nums" }}>
            {(index + 1).toString().padStart(2, "0")}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--pa-text-1)", margin: 0, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {s.name}
          </p>
        </div>

        <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 100,
            backgroundColor: "var(--pa-surface-2)", border: "1px solid var(--pa-border-2)",
            color: "var(--pa-text-3)", letterSpacing: "0.04em",
          }}>
            {s.underlying} · {s.expiry.label}
          </span>
          {s.aiPowered && (
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 100,
              backgroundColor: riskOpt.zoneBg, border: `1px solid ${riskOpt.zoneBorder}`,
              color: riskOpt.zoneColor, letterSpacing: "0.04em", fontWeight: 600,
            }}>
              AI
            </span>
          )}
        </div>
      </div>

      {/* Main metrics — Bearprint big number style */}
      <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0 }}>
        {/* Max profit */}
        <div style={{ paddingRight: 12, borderRight: "1px solid var(--pa-border-1)" }}>
          <Label>Max Profit</Label>
          <p style={{ fontSize: 20, fontWeight: 700, color: "var(--pa-profit)", margin: "5px 0 0", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {INR(s.maxProfit)}
          </p>
          <p style={{ fontSize: 10, color: "var(--pa-text-4)", margin: "3px 0 0" }}>simulation</p>
        </div>

        {/* Max loss */}
        <div style={{ padding: "0 12px", borderRight: "1px solid var(--pa-border-1)" }}>
          <Label>Max Loss</Label>
          <p style={{ fontSize: 20, fontWeight: 700, color: "var(--pa-loss)", margin: "5px 0 0", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {INR(s.maxLoss)}
          </p>
          <p style={{ fontSize: 10, color: "var(--pa-text-4)", margin: "3px 0 0" }}>simulation</p>
        </div>

        {/* Probability */}
        <div style={{ padding: "0 12px", borderRight: "1px solid var(--pa-border-1)" }}>
          <Label>Probability</Label>
          <p style={{ fontSize: 20, fontWeight: 700, color: "var(--pa-text-1)", margin: "5px 0 0", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {pop}%
          </p>
          <p style={{ fontSize: 10, color: "var(--pa-text-4)", margin: "3px 0 0" }}>Black-Scholes</p>
        </div>

        {/* Annualised yield */}
        <div style={{ paddingLeft: 12 }}>
          <Label>Ann. Yield</Label>
          <p style={{ fontSize: 20, fontWeight: 700, color: riskOpt.zoneColor, margin: "5px 0 0", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {(s.annualizedYield * 100).toFixed(1)}%
          </p>
          <p style={{ fontSize: 10, color: "var(--pa-text-4)", margin: "3px 0 0" }}>simulation</p>
        </div>
      </div>

      {/* Margin bar + score */}
      <div style={{ padding: "0 18px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <Label>Margin Used</Label>
            <span style={{ fontSize: 10, color: "var(--pa-text-3)", fontVariantNumeric: "tabular-nums" }}>
              {INR(s.marginRequired)} of {INR(marginAvailable)}
            </span>
          </div>
          <div style={{ height: 3, backgroundColor: "var(--pa-surface-3)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(marginPct * 100).toFixed(1)}%`, backgroundColor: barColor, borderRadius: 2, transition: "width 600ms ease-out" }} />
          </div>
        </div>
        <div style={{
          padding: "4px 10px", borderRadius: 100,
          backgroundColor: "var(--pa-surface-2)", border: "1px solid var(--pa-border-2)",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--pa-text-2)", fontVariantNumeric: "tabular-nums" }}>
            Score {s.score.toFixed(0)}
          </span>
        </div>
      </div>

      {/* Greeks strip */}
      <div style={{
        margin: "0 18px 14px",
        padding: "8px 12px", borderRadius: 8,
        backgroundColor: "var(--pa-surface-2)", border: "1px solid var(--pa-border-1)",
        display: "flex", gap: 16, flexWrap: "wrap",
      }}>
        {[
          { label: "Δ Delta", val: s.delta.toFixed(2) },
          { label: "Θ Theta/day", val: `₹${Math.abs(s.theta * s.lotSize).toFixed(0)}` },
          { label: "V Vega/1%", val: s.vega.toFixed(2) },
        ].map((g) => (
          <div key={g.label} style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ fontSize: 10, color: "var(--pa-text-3)", letterSpacing: "0.04em" }}>{g.label}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--pa-text-1)", fontFamily: "monospace" }}>{g.val}</span>
          </div>
        ))}
      </div>

      {/* AI explanation */}
      <div style={{
        margin: "0 18px 14px", padding: "14px 16px", borderRadius: 10,
        border: "1px solid var(--pa-border-1)", backgroundColor: "var(--pa-surface-2)",
      }}>
        <p style={{ fontSize: 13, color: "var(--pa-text-1)", lineHeight: 1.65, margin: "0 0 8px" }}>{s.explanation.summary}</p>
        <p style={{ fontSize: 12, color: "var(--pa-text-2)", fontStyle: "italic", margin: "0 0 8px" }}>{s.explanation.analogy}</p>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "var(--pa-loss)", marginTop: 4, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: "var(--pa-loss)", margin: 0 }}>{s.explanation.riskWarning}</p>
        </div>
        <p style={{ fontSize: 11, color: "var(--pa-text-4)", margin: 0, lineHeight: 1.5 }}>
          <span style={{ color: "var(--pa-text-3)" }}>Why selected: </span>{s.explanation.whySelected}
        </p>
      </div>

      {/* Payoff chart toggle */}
      <div style={{ padding: "0 18px 18px" }}>
        <button
          onClick={onToggleChart}
          style={{
            width: "100%", height: 36, borderRadius: 8,
            backgroundColor: "transparent", color: "var(--pa-text-3)",
            fontSize: 12, border: "1px solid var(--pa-border-1)", cursor: "pointer",
            transition: "all 150ms",
            letterSpacing: "0.02em",
          }}
          onMouseEnter={(e) => { const b = e.target as HTMLButtonElement; b.style.borderColor = "var(--pa-border-2)"; b.style.color = "var(--pa-text-1)"; }}
          onMouseLeave={(e) => { const b = e.target as HTMLButtonElement; b.style.borderColor = "var(--pa-border-1)"; b.style.color = "var(--pa-text-3)"; }}
        >
          {chartOpen ? "Hide Payoff Diagram ↑" : "View Payoff Diagram ↓"}
        </button>

        {chartOpen && (
          <div style={{ marginTop: 12, animation: "pa-slide-up 200ms ease-out both" }}>
            <PayoffChart candidate={s} />
          </div>
        )}
      </div>
    </div>
  );
}
