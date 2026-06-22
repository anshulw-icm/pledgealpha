"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { COLLATERAL_RULES, type AssetType } from "@/lib/collateral-data";

interface DBHolding {
  id: string;
  name: string;
  units: number;
  currentValue: number;
  pledgeableValue: number;
  isPledgeable: boolean;
  haircut: number;
  assetType: string;
}

interface Props {
  holdings: DBHolding[];
  totalValue: number;
  pledgeableValue: number;
  pledgeableCount: number;
}

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function useCountUp(target: number, active: boolean, duration = 1200) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * ease));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [active, target, duration]);

  return value;
}

export default function PortfolioSection({ holdings, totalValue, pledgeableValue, pledgeableCount }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [scanIndex, setScanIndex] = useState(-1);
  const [showCounter, setShowCounter] = useState(false);
  const counterValue = useCountUp(pledgeableValue, showCounter);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("pa-unlocked") === "true") {
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (!unlocking) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    holdings.forEach((_, i) => {
      timers.push(setTimeout(() => setScanIndex(i), i * 150));
    });

    timers.push(setTimeout(() => setShowCounter(true), holdings.length * 150 + 400));

    timers.push(setTimeout(() => {
      sessionStorage.setItem("pa-unlocked", "true");
      setUnlocked(true);
      setUnlocking(false);
    }, holdings.length * 150 + 1800));

    return () => timers.forEach(clearTimeout);
  }, [unlocking, holdings]);

  if (!unlocked && !unlocking) {
    return (
      <>
        {/* Summary numbers without interactive reveal */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 opacity-40 pointer-events-none select-none blur-sm">
          <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-5">
            <p className="text-pa-text-3 text-[11px] tracking-wide uppercase mb-2">Portfolio Value</p>
            <p className="text-pa-text-1 text-[20px] font-semibold tracking-[-0.02em]">{INR(totalValue)}</p>
          </div>
          <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-5">
            <p className="text-pa-text-3 text-[11px] tracking-wide uppercase mb-2">Pledgeable Value</p>
            <p className="text-pa-profit text-[20px] font-semibold tracking-[-0.02em]">••••••</p>
          </div>
          <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-5 col-span-2 sm:col-span-1">
            <p className="text-pa-text-3 text-[11px] tracking-wide uppercase mb-2">Margin Available</p>
            <p className="text-pa-text-1 text-[20px] font-semibold">••••••</p>
          </div>
        </div>

        <div className="text-center py-10">
          <p className="text-pa-text-3 text-[13px] mb-8">
            {holdings.length} holdings · {INR(totalValue)} portfolio value
          </p>
          <button
            onClick={() => setUnlocking(true)}
            className="h-12 px-10 rounded-2xl bg-white text-black text-[16px] font-semibold hover:bg-pa-text-1 transition-colors"
          >
            Unlock My Margin →
          </button>
          <p className="text-pa-text-4 text-[11px] mt-3">
            Simulated analysis · Not investment advice
          </p>
        </div>
      </>
    );
  }

  if (unlocking && !unlocked) {
    return (
      <div className="space-y-6">
        {/* Scanning holdings */}
        <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-pa-border-1">
            <p className="text-pa-text-3 text-[11px] tracking-wide uppercase">Scanning portfolio…</p>
          </div>
          <div className="divide-y divide-pa-border-1/60">
            {holdings.slice(0, 8).map((h, i) => (
              <div key={h.id} className="px-5 py-3 flex items-center justify-between relative overflow-hidden">
                {/* Scan line */}
                {scanIndex === i && (
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    backgroundColor: "rgba(245,245,247,0.06)",
                    animation: "scan-line 400ms ease-out forwards",
                  }} />
                )}
                <p className={`text-[13px] truncate flex-1 transition-colors duration-300 ${scanIndex >= i ? "text-pa-text-1" : "text-pa-text-4"}`}>
                  {h.name}
                </p>
                <p className={`text-[13px] font-medium ml-4 transition-all duration-500 ${
                  scanIndex >= i
                    ? h.isPledgeable ? "text-pa-profit" : "text-pa-text-4"
                    : "text-transparent"
                }`}>
                  {h.isPledgeable ? INR(h.pledgeableValue) : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Counter */}
        {showCounter && (
          <div className="text-center py-8" style={{ animation: "count-bounce 0.6s ease-out" }}>
            <p className="text-pa-text-3 text-[11px] tracking-[0.2em] uppercase mb-4">MARGIN UNLOCKED</p>
            <p className="text-[56px] font-semibold text-pa-profit tracking-[-0.03em] num">
              {INR(counterValue)}
            </p>
            <p className="text-pa-text-4 text-[12px] mt-2">Simulated pledgeable margin · Educational only</p>
          </div>
        )}
      </div>
    );
  }

  // Normal unlocked view
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-[pa-fade-in_0.4s_ease-out]">
        <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-5">
          <p className="text-pa-text-3 text-[11px] tracking-wide uppercase mb-2">Portfolio Value</p>
          <p className="text-pa-text-1 text-[20px] font-semibold tracking-[-0.02em]">{INR(totalValue)}</p>
          <p className="text-pa-text-4 text-[12px] mt-1">{holdings.length} holdings</p>
        </div>
        <div className="bg-pa-surface-1 border border-pa-profit/20 rounded-2xl p-5">
          <p className="text-pa-text-3 text-[11px] tracking-wide uppercase mb-2">Pledgeable Value</p>
          <p className="text-pa-profit text-[20px] font-semibold tracking-[-0.02em]">{INR(pledgeableValue)}</p>
          <p className="text-pa-text-4 text-[12px] mt-1">{pledgeableCount} of {holdings.length} eligible</p>
        </div>
        <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-5 col-span-2 sm:col-span-1">
          <p className="text-pa-text-3 text-[11px] tracking-wide uppercase mb-2">Haircut Impact</p>
          <p className="text-pa-text-1 text-[20px] font-semibold tracking-[-0.02em]">{INR(totalValue - pledgeableValue)}</p>
          <p className="text-pa-text-4 text-[12px] mt-1">locked as margin buffer</p>
        </div>
      </div>

      {/* CTAs */}
      <div className="bg-pa-surface-1 border border-pa-border-2 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-pa-text-1 font-medium text-[15px] tracking-[-0.01em]">Ready to run strategy scenarios?</p>
          <p className="text-pa-text-2 text-[13px] mt-1">
            Model covered calls, cash-secured puts, and spreads against your{" "}
            <span className="text-pa-profit font-medium">{INR(pledgeableValue)}</span> pledgeable margin.
          </p>
        </div>
        <Link href="/dashboard/strategies">
          <Button className="bg-white hover:bg-pa-text-1 text-black font-medium shrink-0 text-[13px]">
            Run Scenarios →
          </Button>
        </Link>
      </div>

      {pledgeableValue > 0 && (
        <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-pa-text-1 font-medium text-[15px] tracking-[-0.01em]">See Your Yield Potential</p>
            <p className="text-pa-text-2 text-[13px] mt-1">
              Compare passive returns vs simulated options overlay on your{" "}
              <span className="text-pa-profit font-medium">{INR(pledgeableValue)}</span> margin.
            </p>
          </div>
          <Link href="/dashboard/yield?risk=moderate">
            <Button className="bg-white hover:bg-pa-text-1 text-black font-medium shrink-0 text-[13px]">
              Compare Yield →
            </Button>
          </Link>
        </div>
      )}

      {/* Holdings list */}
      <div className="bg-pa-surface-1 border border-pa-border-1 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-pa-border-1 flex items-center justify-between">
          <p className="text-pa-text-1 text-[14px] font-medium">Holdings</p>
          <Link href="/dashboard/upload">
            <Button variant="ghost" size="sm" className="text-pa-text-3 hover:text-pa-text-1 text-xs">
              Update →
            </Button>
          </Link>
        </div>
        <div className="hidden sm:grid grid-cols-[1fr_90px_90px_90px] gap-2 px-5 py-2.5 border-b border-pa-border-1/40">
          <p className="text-pa-text-3 text-[11px] tracking-wide uppercase">Scheme</p>
          <p className="text-pa-text-3 text-[11px] tracking-wide uppercase text-right">Value</p>
          <p className="text-pa-text-3 text-[11px] tracking-wide uppercase text-right">Type</p>
          <p className="text-pa-text-3 text-[11px] tracking-wide uppercase text-right">Pledgeable</p>
        </div>
        <div className="divide-y divide-pa-border-1/60">
          {holdings.slice(0, 8).map((h) => {
            const rule = COLLATERAL_RULES[h.assetType as AssetType];
            return (
              <div key={h.id} className="px-5 py-3.5 sm:grid sm:grid-cols-[1fr_90px_90px_90px] sm:gap-2 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-pa-text-1 text-[14px] truncate">{h.name}</p>
                  <p className="text-pa-text-3 text-[12px] mt-0.5">{h.units.toLocaleString("en-IN")} units</p>
                </div>
                <p className="text-pa-text-1 text-[13px] sm:text-right hidden sm:block">{INR(h.currentValue)}</p>
                <div className="sm:text-right hidden sm:flex sm:justify-end">
                  <Badge
                    variant="outline"
                    className={`text-[11px] px-2 py-0 ${h.isPledgeable ? "border-pa-profit/30 text-pa-profit" : "border-pa-border-2 text-pa-text-4"}`}
                  >
                    {rule?.label ?? h.assetType}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-pa-text-1 text-[13px] sm:hidden">{INR(h.currentValue)}</p>
                  <p className={`text-[13px] font-medium ${h.isPledgeable ? "text-pa-profit" : "text-pa-text-4"}`}>
                    {h.isPledgeable ? INR(h.pledgeableValue) : "—"}
                  </p>
                </div>
              </div>
            );
          })}
          {holdings.length > 8 && (
            <div className="px-5 py-3">
              <p className="text-pa-text-4 text-[12px]">+{holdings.length - 8} more holdings</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
