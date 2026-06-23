"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { YieldAnalysis } from "@/app/actions/yield";
import { BENCHMARK_XIRR, NSE_LOT_SIZES, COLLATERAL_DATA_DATE } from "@/lib/collateral-data";
import type { AssetType } from "@/lib/collateral-data";

type RiskAppetite = "conservative" | "moderate" | "aggressive";

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const PCT = (n: number) => `${(n * 100).toFixed(1)}%`;

// ── Count-up hook ─────────────────────────────────────────────────────────────

function useCountUp(target: number, delay = 150, duration = 1400) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    setValue(0);
    const tid = setTimeout(() => {
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(target * eased));
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(tid);
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, delay, duration]);

  return value;
}

// ── Section label divider ─────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="h-px flex-1 bg-pa-border-1" />
      <p className="text-[10px] tracking-[0.18em] text-pa-text-3 uppercase font-medium">{label}</p>
      <div className="h-px flex-1 bg-pa-border-1" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function YieldClient({ data }: { data: YieldAnalysis }) {
  const { passive, overlay, comparison, marketData, generatedAt, riskAppetite } = data;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchRisk(risk: RiskAppetite) {
    startTransition(() => {
      router.push(`/dashboard/yield?risk=${risk}`, { scroll: false });
    });
  }

  const genTime = new Date(generatedAt).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-pa-black text-pa-text-1">

      {/* Nav */}
      <header className="h-14 flex items-center px-5 border-b border-pa-border-1 gap-4 sticky top-0 z-10 bg-pa-black/90 backdrop-blur-xl">
        <Link href="/dashboard" className="text-pa-text-3 text-[12px] hover:text-pa-text-1 transition-colors">
          ← Dashboard
        </Link>
        <div className="w-px h-4 bg-pa-border-2" />
        <span className="text-[13px] font-medium text-pa-text-1 tracking-[-0.01em]">Yield Impact</span>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-[11px] text-pa-text-3 num hidden sm:block">
            NIFTY {marketData.nifty.toLocaleString("en-IN")} · BNF {marketData.banknifty.toLocaleString("en-IN")}
            {marketData.isStale && <span className="text-pa-warning ml-1">⚠ fallback</span>}
          </span>
          <span className="text-[11px] text-pa-text-4">{genTime}</span>
        </div>
      </header>

      {/* Stale banner */}
      {marketData.isStale && (
        <div className="bg-pa-warning/8 border-b border-pa-warning/20 px-5 py-2.5 flex items-center gap-2">
          <span className="text-pa-warning text-[12px]">⚠</span>
          <p className="text-pa-warning text-[12px]">
            Live market data unavailable — using fallback prices. Results may not reflect current conditions.
          </p>
        </div>
      )}

      {/* Loading overlay */}
      {isPending && (
        <div className="fixed inset-0 z-50 bg-pa-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl px-8 py-6 text-center space-y-2">
            <p className="text-pa-text-1 text-[14px] font-medium">Recalculating…</p>
            <p className="text-pa-text-3 text-[12px]">Fetching live market data</p>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-10">

        {/* ── Section 1: Hero ──────────────────────────────────────────── */}
        <HeroSection passive={passive} comparison={comparison} riskAppetite={riskAppetite} />

        {/* ── Section 2: Comparison bars ───────────────────────────────── */}
        <div>
          <SectionDivider label="Breakdown" />
          <ComparisonBarsSection passive={passive} overlay={overlay} comparison={comparison} />
        </div>

        {/* ── Section 3: Benchmark table ───────────────────────────────── */}
        <div>
          <SectionDivider label="Passive Estimate Basis" />
          <BenchmarkTableSection passive={passive} />
        </div>

        {/* ── Section 4: Monthly projection ────────────────────────────── */}
        <div>
          <SectionDivider label="Projection" />
          <MonthlyTableSection passive={passive} comparison={comparison} overlay={overlay} />
        </div>

        {/* ── Section 5: Strategy card ──────────────────────────────────── */}
        <div>
          <SectionDivider label="Scenario Powering This Analysis" />
          <StrategyCardSection overlay={overlay} marketData={marketData} />
        </div>

        {/* ── Section 6: Risk switcher ──────────────────────────────────── */}
        <div>
          <SectionDivider label="Compare Risk Scenarios" />
          <RiskSwitcherSection current={riskAppetite} onSwitch={switchRisk} />
        </div>

        {/* ── Section 7: Methodology ────────────────────────────────────── */}
        <div>
          <SectionDivider label="Methodology" />
          <MethodologySection passive={passive} />
        </div>

      </main>
    </div>
  );
}

// ── Section 1: Hero ──────────────────────────────────────────────────────────

function HeroSection({
  passive, comparison, riskAppetite,
}: {
  passive: YieldAnalysis["passive"];
  comparison: YieldAnalysis["comparison"];
  riskAppetite: RiskAppetite;
}) {
  const animDelta = useCountUp(comparison.incrementalMonthlyRupees, 200);

  const riskLabel = { conservative: "Conservative", moderate: "Moderate", aggressive: "Aggressive" }[riskAppetite];
  const riskColor = { conservative: "text-pa-profit", moderate: "text-pa-warning", aggressive: "text-pa-loss" }[riskAppetite];

  return (
    <section className="pt-4 text-center space-y-6">
      <div>
        <p className={`text-[11px] tracking-[0.18em] uppercase font-medium mb-3 ${riskColor}`}>
          {riskLabel} scenario · Simulated
        </p>
        <h1 className="text-[clamp(28px,5vw,44px)] font-semibold tracking-[-0.03em] leading-tight">
          {animDelta >= 0 ? "Your portfolio could generate" : "This scenario reduces net return by"}
        </h1>
        <p className={`text-[clamp(36px,7vw,60px)] font-bold tracking-[-0.04em] leading-none mt-1 num ${animDelta >= 0 ? "text-pa-profit" : "text-pa-loss"}`}>
          {animDelta > 0 ? "+" : ""}{INR(animDelta)} / mo
        </p>
        <p className="text-pa-text-3 text-[14px] mt-2">
          {animDelta >= 0
            ? "extra income (simulated scenario) on top of passive returns"
            : "expected-value drag vs passive-only · try Conservative or Moderate profile"}
        </p>
      </div>

      {/* 3-col comparison */}
      {(() => {
        const upliftPositive = comparison.incrementalMonthlyRupees >= 0;
        const overlayColor = upliftPositive ? "text-pa-profit" : "text-pa-loss";
        const overlayBorder = upliftPositive ? "border-pa-profit/20" : "border-pa-loss/20";
        return (
          <div className="grid grid-cols-3 gap-3 text-left">
            <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-5">
              <p className="text-[10px] tracking-[0.14em] uppercase text-pa-text-3 mb-3">Passive Only</p>
              <p className="text-[22px] font-semibold text-pa-text-2 num tracking-[-0.02em]">
                {INR(passive.projectedMonthlyReturn)}
              </p>
              <p className="text-[11px] text-pa-text-4 mt-1.5">
                {passive.liveDataCount > 0
                  ? `${passive.liveDataCount} live · ${passive.benchmarkCount} benchmark`
                  : "Category benchmark est."}
              </p>
            </div>

            <div className={`bg-pa-surface-1 border ${overlayBorder} rounded-2xl p-5`}>
              <p className="text-[10px] tracking-[0.14em] uppercase text-pa-text-3 mb-3">With Overlay</p>
              <p className={`text-[22px] font-semibold ${overlayColor} num tracking-[-0.02em]`}>
                {INR(comparison.combinedMonthlyReturn)}
              </p>
              <p className="text-[11px] text-pa-text-4 mt-1.5">Simulated scenario</p>
            </div>

            <div className={`bg-pa-surface-1 border ${upliftPositive ? "border-pa-border-1" : "border-pa-loss/20"} rounded-2xl p-5`}>
              <p className="text-[10px] tracking-[0.14em] uppercase text-pa-text-3 mb-3">
                {upliftPositive ? "Annual Uplift" : "Annual Drag"}
              </p>
              <p className={`text-[22px] font-semibold ${upliftPositive ? "text-pa-profit" : "text-pa-loss"} num tracking-[-0.02em]`}>
                {upliftPositive ? "+" : ""}{INR(comparison.incrementalAnnualRupees)}
              </p>
              <p className="text-[11px] text-pa-text-4 mt-1.5">If repeated {upliftPositive ? "monthly" : "· expected-value basis"}</p>
            </div>
          </div>
        );
      })()}

      <p className="text-[11px] text-pa-text-4 text-center">
        Simulated scenario output only · Not a forecast · Educational platform
      </p>
    </section>
  );
}

// ── Section 2: Comparison bars ───────────────────────────────────────────────

function ComparisonBarsSection({
  passive, overlay, comparison,
}: {
  passive: YieldAnalysis["passive"];
  overlay: YieldAnalysis["overlay"];
  comparison: YieldAnalysis["comparison"];
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 300); return () => clearTimeout(t); }, []);

  const MAX = 0.40;

  const rows = [
    {
      label: "Passive Portfolio",
      sublabel: `${PCT(passive.weightedXIRR)} category benchmark XIRR`,
      barClass: "bg-pa-text-3/30",
      width: ready ? `${Math.min((passive.weightedXIRR / MAX) * 100, 100)}%` : "0%",
      pct: PCT(passive.weightedXIRR),
      pctClass: "text-pa-text-2",
    },
    {
      label: `${overlay.strategyName} · ${overlay.underlying}`,
      sublabel: `Live Black-Scholes · ${overlay.expiryLabel} expiry`,
      barClass: "bg-pa-profit/50",
      width: ready ? `${Math.min((overlay.annualizedYield / MAX) * 100, 100)}%` : "0%",
      pct: `+${PCT(overlay.annualizedYield)}`,
      pctClass: "text-pa-profit",
    },
    {
      label: "Combined (Simulated)",
      sublabel: "Scenario projection only",
      barClass: "bg-pa-profit",
      width: ready ? `${Math.min((comparison.combinedXIRR / MAX) * 100, 100)}%` : "0%",
      pct: PCT(comparison.combinedXIRR),
      pctClass: "text-pa-profit font-semibold",
    },
  ];

  return (
    <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-6 space-y-5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between mb-1.5">
            <div>
              <p className="text-[13px] font-medium text-pa-text-1">{r.label}</p>
              <p className="text-[11px] text-pa-text-3 mt-0.5">{r.sublabel}</p>
            </div>
            <p className={`text-[18px] num tracking-[-0.02em] ${r.pctClass}`}>{r.pct}</p>
          </div>
          <div className="h-2 bg-pa-surface-3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${r.barClass}`}
              style={{ width: r.width, transition: "width 800ms ease-out" }}
            />
          </div>
          <p className="text-[10px] text-pa-text-4 mt-1">Max scale 40% p.a.</p>
        </div>
      ))}
    </div>
  );
}

// ── Section 3: Return rates table ────────────────────────────────────────────

function BenchmarkTableSection({ passive }: { passive: YieldAnalysis["passive"] }) {
  const rows = passive.holdingBreakdown;
  const shown = rows.slice(0, 6);
  const extra = rows.length - shown.length;
  const total = rows.length;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[14px] font-medium text-pa-text-1">Return Rates Used for Passive Estimate</p>
        {passive.liveDataCount > 0 ? (
          <p className="text-pa-text-3 text-[12px] mt-1">
            <span className="text-pa-profit">{passive.liveDataCount} of {total}</span> holdings using live 1-year NAV returns via mfapi.in
            {passive.benchmarkCount > 0 && (
              <span> · {passive.benchmarkCount} using category benchmarks (no scheme code)</span>
            )}
          </p>
        ) : (
          <p className="text-pa-text-3 text-[12px] mt-1 leading-relaxed">
            No scheme codes available — using category benchmark rates. Upload a CAMS/KFintech statement with scheme codes for live returns.
          </p>
        )}
      </div>

      <div className="bg-pa-surface-1 border border-pa-border-1 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_130px] gap-2 px-4 py-2.5 border-b border-pa-border-1 bg-pa-surface-2/40">
          <p className="text-[10px] tracking-[0.1em] uppercase text-pa-text-3">Holding</p>
          <p className="text-[10px] tracking-[0.1em] uppercase text-pa-text-3">Category</p>
          <p className="text-[10px] tracking-[0.1em] uppercase text-pa-text-3 text-right">Return Rate p.a.</p>
        </div>
        <div className="divide-y divide-pa-border-1/40">
          {shown.map((h) => (
            <div key={h.name} className="grid grid-cols-[1fr_100px_130px] gap-2 px-4 py-2.5 items-center">
              <p className="text-[12px] text-pa-text-1 truncate">{h.name}</p>
              <p className="text-[11px] text-pa-text-3">{h.assetLabel}</p>
              <div className="text-right">
                {h.returnSource === "live" ? (
                  <p className="text-[12px] text-pa-profit num">{(h.returnRate * 100).toFixed(1)}% <span className="text-[10px] font-normal opacity-70">1-yr actual</span></p>
                ) : (
                  <p className="text-[12px] text-pa-text-3 num">{(h.returnRate * 100).toFixed(1)}% <span className="text-[10px] opacity-70">benchmark</span></p>
                )}
              </div>
            </div>
          ))}
          {extra > 0 && (
            <div className="px-4 py-2.5">
              <p className="text-[12px] text-pa-text-4">+{extra} more holdings</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-pa-text-4 text-[11px] italic leading-relaxed">
        Live returns: actual 1-year NAV change from mfapi.in (24h cache). Benchmarks: AMFI category averages —
        not your actual returns. Past performance does not guarantee future results.
      </p>
    </div>
  );
}

// ── Section 4: Monthly projection table ──────────────────────────────────────

function MonthlyTableSection({
  passive, comparison, overlay,
}: {
  passive: YieldAnalysis["passive"];
  comparison: YieldAnalysis["comparison"];
  overlay: YieldAnalysis["overlay"];
}) {
  const pop = comparison.probabilityOfProfit;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[16px] font-medium text-pa-text-1">Simulated Monthly Income</p>
        <p className="text-pa-text-3 text-[12px] mt-1">
          Winning-cycles model — projects income from trades that expire profitably
        </p>
      </div>

      {/* Income formula breakdown */}
      <div className="bg-pa-surface-1 border border-pa-border-1 rounded-xl p-4 space-y-3">
        <p className="text-[11px] font-semibold tracking-[0.1em] text-pa-text-3 uppercase">How Income Is Calculated</p>

        <div className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] text-pa-text-1">Step 1 · Max profit per winning cycle</p>
              <p className="text-[11px] text-pa-text-3 mt-0.5">
                Premium collected if trade expires in your favour (max profit scenario)
              </p>
            </div>
            <p className="text-[15px] font-semibold num text-pa-profit flex-shrink-0">
              {INR(comparison.maxProfitPerCycle)}
            </p>
          </div>

          <div className="h-px bg-pa-border-1" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-pa-text-1">Step 2 · Probability of profit (POP)</p>
              <p className="text-[11px] text-pa-text-3 mt-0.5">
                Black-Scholes risk-neutral probability of expiring in-the-money
              </p>
            </div>
            <p className="text-[15px] font-semibold text-pa-text-1 num">{(pop * 100).toFixed(0)}%</p>
          </div>

          <div className="h-px bg-pa-border-1" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-pa-text-1">Step 3 · Cycles per year</p>
              <p className="text-[11px] text-pa-text-3 mt-0.5">365 days ÷ {overlay.expiryLabel} expiry cycle</p>
            </div>
            <p className="text-[15px] font-semibold text-pa-text-1 num">{comparison.cyclesPerYear.toFixed(1)}×</p>
          </div>

          <div className="h-px bg-pa-border-1" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-pa-text-1">Annual options income</p>
              <p className="text-[11px] text-pa-text-3 mt-0.5 font-mono">
                {INR(comparison.maxProfitPerCycle)} × {(pop * 100).toFixed(0)}% × {comparison.cyclesPerYear.toFixed(1)} cycles
              </p>
            </div>
            <p className="text-[15px] font-semibold text-pa-profit num">
              +{INR(comparison.annualOptionsIncome)} p.a.
            </p>
          </div>

          <div className="h-px bg-pa-border-1" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-pa-text-2">Best case (100% win rate)</p>
              <p className="text-[11px] text-pa-text-3 mt-0.5">{INR(comparison.maxProfitPerCycle)} × {comparison.cyclesPerYear.toFixed(1)} · for reference only</p>
            </div>
            <p className="text-[13px] text-pa-text-3 num">{INR(comparison.annualOptionsIncomeBestCase)} p.a.</p>
          </div>
        </div>
      </div>

      {/* Monthly table */}
      <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-pa-border-1 bg-pa-surface-2/40">
          {["Month", "Passive Only", "With Overlay", "Uplift"].map((h) => (
            <p key={h} className="text-[10px] tracking-[0.1em] uppercase text-pa-text-3">{h}</p>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className={`grid grid-cols-4 gap-2 px-5 py-3 items-center ${
              i % 2 === 0 ? "bg-pa-surface-1" : "bg-pa-surface-2/20"
            }`}
          >
            <p className="text-[12px] text-pa-text-2">Month {i + 1}</p>
            <p className="text-[12px] text-pa-text-2 num">{INR(passive.projectedMonthlyReturn)}</p>
            <p className="text-[12px] num font-medium text-pa-profit">
              {INR(comparison.combinedMonthlyReturn)}
            </p>
            <p className="text-[12px] font-medium num text-pa-profit">
              +{INR(comparison.incrementalMonthlyRupees)}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <p className="text-pa-text-4 text-[11px]">
          Winning-cycles model: projects income assuming {(pop * 100).toFixed(0)}% of cycles expire profitably. Losing cycles are excluded — real traders close losing trades early, not at max loss.
        </p>
        <p className="text-pa-text-4 text-[11px]">
          Passive return: {PCT(passive.weightedXIRR)} weighted XIRR · Options overlay: {overlay.strategyName} at {overlay.expiryLabel} expiry · Simulated scenario only
        </p>
      </div>
    </div>
  );
}

// ── Section 5: Strategy card ──────────────────────────────────────────────────

function StrategyCardSection({
  overlay,
  marketData,
}: {
  overlay: YieldAnalysis["overlay"];
  marketData: YieldAnalysis["marketData"];
}) {
  return (
    <div className="space-y-3">
      <p className="text-[16px] font-medium text-pa-text-1">Scenario Powering This Analysis</p>

      <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-5 space-y-5">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-pa-text-1 text-[15px] flex-1 min-w-0">{overlay.strategyName}</p>
          <span className="text-[11px] px-2 py-1 rounded-full bg-pa-surface-2 border border-pa-border-2 text-pa-text-3">
            {overlay.underlying} · {overlay.expiryLabel}
          </span>
          {overlay.aiPowered ? (
            <span className="text-[11px] px-2 py-1 rounded-full bg-pa-profit/8 border border-pa-profit/20 text-pa-profit font-medium">
              AI Selected
            </span>
          ) : (
            <span className="text-[11px] px-2 py-1 rounded-full bg-pa-surface-2 border border-pa-border-2 text-pa-text-3">
              System Selected
            </span>
          )}
          <span className="text-[11px] px-2 py-1 rounded-full bg-pa-surface-2 border border-pa-border-2 text-pa-text-2 num">
            Score {overlay.score.toFixed(0)}
          </span>
        </div>

        {/* Price used */}
        <p className="text-pa-text-3 text-[12px]">
          Priced at NIFTY {overlay.spotAtGeneration.toLocaleString("en-IN")} ·{" "}
          {overlay.isStale
            ? <span className="text-pa-warning">⚠ Fallback price</span>
            : "Live (5-min delay)"}
          {" "}· Vol {(overlay.hvUsed * 100).toFixed(1)}% HV · BS model
        </p>

        {/* P&L — equal prominence */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-pa-profit/6 border border-pa-profit/20 rounded-xl p-4">
            <p className="text-[10px] tracking-[0.12em] uppercase text-pa-text-3 mb-2">Max Profit</p>
            <p className="text-[20px] font-semibold text-pa-profit num tracking-[-0.02em]">
              {INR(overlay.maxProfit)}
            </p>
            <p className="text-pa-text-4 text-[11px] mt-1">Scenario result (simulation)</p>
          </div>
          <div className="bg-pa-loss/6 border border-pa-loss/20 rounded-xl p-4">
            <p className="text-[10px] tracking-[0.12em] uppercase text-pa-text-3 mb-2">Max Loss</p>
            <p className="text-[20px] font-semibold text-pa-loss num tracking-[-0.02em]">
              {INR(overlay.maxLoss)}
            </p>
            <p className="text-pa-text-4 text-[11px] mt-1">Scenario result (simulation)</p>
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-0 bg-pa-surface-2 rounded-xl overflow-hidden border border-pa-border-1">
          {[
            {
              val: `${(overlay.probabilityOfProfit * 100).toFixed(0)}%`,
              label: "Estimated (Black-Scholes model)",
            },
            {
              val: `${(overlay.annualizedYield * 100).toFixed(1)}% p.a.`,
              label: "Projected (simulation)",
            },
            {
              val: INR(overlay.marginRequired),
              label: "Indicative margin",
            },
          ].map((m, i) => (
            <div key={i} className={`p-4 ${i < 2 ? "border-r border-pa-border-1" : ""}`}>
              <p className="text-[16px] font-semibold text-pa-text-1 num tracking-[-0.02em]">{m.val}</p>
              <p className="text-[10px] text-pa-text-4 mt-1 leading-snug">{m.label}</p>
            </div>
          ))}
        </div>

        {/* AI Explanation */}
        <div className="bg-pa-surface-2 border border-pa-border-1 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-pa-text-4 text-[11px]">AI Explanation · Groq / Llama 3.3 · Educational only</p>
            {!overlay.aiPowered && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-pa-surface-3 border border-pa-border-2 text-pa-text-4">
                System-generated · Groq unavailable
              </span>
            )}
          </div>

          <p className="text-pa-text-1 text-[13px] leading-relaxed">{overlay.explanation.summary}</p>
          <p className="text-pa-text-2 text-[13px] italic">{overlay.explanation.analogy}</p>
          <div className="flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-pa-loss mt-1.5 flex-shrink-0" />
            <p className="text-pa-loss text-[12px]">{overlay.explanation.riskWarning}</p>
          </div>
        </div>

        <Link
          href="/dashboard/strategies"
          className="block text-pa-profit text-[13px] hover:underline mt-1"
        >
          View Full Strategy Analysis →
        </Link>
      </div>
    </div>
  );
}

// ── Section 6: Risk switcher ──────────────────────────────────────────────────

const RISK_OPTIONS: { key: RiskAppetite; label: string }[] = [
  { key: "conservative", label: "Conservative" },
  { key: "moderate", label: "Moderate" },
  { key: "aggressive", label: "Aggressive" },
];

function RiskSwitcherSection({
  current,
  onSwitch,
}: {
  current: RiskAppetite;
  onSwitch: (r: RiskAppetite) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[16px] font-medium text-pa-text-1">Compare Risk Scenarios</p>
      <div className="flex gap-2">
        {RISK_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => onSwitch(o.key)}
            className={`flex-1 h-10 rounded-xl text-[13px] font-medium border transition-all ${
              o.key === current
                ? "bg-pa-surface-2 border-pa-border-3 text-pa-text-1"
                : "bg-transparent border-pa-border-1 text-pa-text-3 hover:border-pa-border-2 hover:text-pa-text-2"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-pa-text-4 text-[11px]">
        Each scenario uses live market data fetched at selection time
      </p>
    </div>
  );
}

// ── Section 7: Methodology ────────────────────────────────────────────────────

function MethodologySection({ passive }: { passive: YieldAnalysis["passive"] }) {
  const bx = BENCHMARK_XIRR as Record<AssetType, number>;

  const methods = [
    {
      title: "NIFTY / BANKNIFTY PRICES",
      body: "Fetched live from Yahoo Finance (unofficial API, 5-minute delay). If live data is unavailable, fallback prices are used and flagged.",
    },
    {
      title: "OPTIONS PRICING",
      body: "Theoretical premiums calculated using the Black-Scholes model with live spot prices and 30-day historical volatility (HV) from Yahoo Finance. HV is computed from daily closing prices — not implied volatility. These are model estimates, not actual market quotes.",
    },
    {
      title: "INCOME PROJECTION FORMULA",
      body: "Expected value per cycle = (maxProfit × POP) − (maxLoss × (1−POP)), where POP is the Black-Scholes probability of profit. This is then multiplied by the number of cycles per year (365 ÷ DTE). Using EV rather than best-case gives a more honest projection — it assumes some cycles will lose. High-loss scenarios can still occur even when EV is positive.",
    },
    {
      title: "PASSIVE PORTFOLIO RETURN",
      body: `Where available, estimated using actual 1-year NAV returns fetched from mfapi.in (free, no auth, 24h cache). Fallback category benchmarks: Large Cap MF ${(bx.MF_LARGE_CAP * 100).toFixed(1)}%, Mid Cap ${(bx.MF_MID_CAP * 100).toFixed(1)}%, Small Cap ${(bx.MF_SMALL_CAP * 100).toFixed(1)}%, Debt ${(bx.MF_DEBT * 100).toFixed(1)}%, Liquid ${(bx.MF_LIQUID * 100).toFixed(1)}%. These are NOT your actual returns. Your portfolio weighted average used: ${(passive.weightedXIRR * 100).toFixed(1)}% (${passive.liveDataCount} live, ${passive.benchmarkCount} benchmark).`,
    },
    {
      title: "MARGIN REQUIREMENTS",
      body: `Shown as indicative figures (max loss × 1.25 for spreads, strike × lot size × 0.20 for cash-secured puts). Lot sizes: NIFTY ${NSE_LOT_SIZES.NIFTY}, BANKNIFTY ${NSE_LOT_SIZES.BANKNIFTY} (as per NSE, ${COLLATERAL_DATA_DATE}). Haircut rates per SEBI/NSE circular (${COLLATERAL_DATA_DATE}). Actual SPAN margin is set by your broker and varies daily — verify with broker before trading.`,
    },
  ];

  return (
    <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-6">
      <p className="text-[14px] font-medium text-pa-text-2 mb-4">Data Sources & Methodology</p>
      <div className="space-y-4">
        {methods.map((m) => (
          <div key={m.title}>
            <p className="text-[11px] font-semibold tracking-[0.1em] text-pa-text-3 mb-1.5">{m.title}</p>
            <p className="text-[12px] text-pa-text-3 leading-relaxed">{m.body}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-pa-border-1 pt-4 mt-5">
        <p className="text-pa-text-4 text-[11px] leading-relaxed">
          PledgeAlpha is a free educational platform. All outputs are simulated scenarios and do not constitute
          investment advice. Not affiliated with SEBI, NSE, BSE, or any broker. Options trading involves
          substantial risk of loss. Past performance does not guarantee future results.
        </p>
      </div>
    </div>
  );
}
