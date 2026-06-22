"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { getActiveTrades, closeTrade, type TradeResult } from "@/app/actions/trade";

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function TradesPage() {
  const [trades, setTrades] = useState<TradeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingId, startClose] = useTransition();

  useEffect(() => {
    getActiveTrades().then((t) => {
      setTrades(t);
      setLoading(false);
    });
  }, []);

  function handleClose(tradeId: string) {
    startClose(async () => {
      await closeTrade(tradeId);
      setTrades((prev) => prev.filter((t) => t.tradeId !== tradeId));
    });
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--pa-black)" }}>
      {/* Header */}
      <header style={{
        height: 56, display: "flex", alignItems: "center", padding: "0 20px", gap: 16,
        borderBottom: "1px solid var(--pa-border-1)",
        position: "sticky", top: 0, backgroundColor: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)", zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ color: "var(--pa-text-3)", fontSize: 12, textDecoration: "none" }}>
          ← Dashboard
        </Link>
        <div style={{ width: 1, height: 16, backgroundColor: "var(--pa-border-2)" }} />
        <Logo size="sm" />
        <span style={{ fontSize: 13, color: "var(--pa-text-2)", fontWeight: 500 }}>Simulated Trades</span>
        <div style={{
          marginLeft: 8, padding: "2px 8px", borderRadius: 100,
          backgroundColor: "var(--pa-surface-2)", border: "1px solid var(--pa-border-2)",
        }}>
          <span style={{ fontSize: 10, color: "var(--pa-text-3)", letterSpacing: "0.08em" }}>SIMULATION ONLY</span>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px" }}>
        <p style={{ fontSize: 11, color: "var(--pa-text-4)", textAlign: "center", marginBottom: 24, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Mark-to-market scenario P&amp;L · Educational simulation · Not actual trades
        </p>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 13, color: "var(--pa-text-3)" }}>Loading scenarios…</p>
          </div>
        ) : trades.length === 0 ? (
          /* Empty state */
          <div style={{
            border: "1px dashed var(--pa-border-2)", borderRadius: 20, padding: "80px 24px",
            textAlign: "center",
          }}>
            <p style={{ fontSize: 40, marginBottom: 16 }}>📊</p>
            <p style={{ fontSize: 15, fontWeight: 500, color: "var(--pa-text-2)", marginBottom: 8 }}>
              No simulated scenarios yet
            </p>
            <p style={{ fontSize: 13, color: "var(--pa-text-3)", maxWidth: 320, margin: "0 auto 24px", lineHeight: 1.6 }}>
              Run strategy scenarios and click "Simulate This Scenario" to track simulated P&L here.
            </p>
            <Link
              href="/dashboard/strategies"
              style={{
                display: "inline-flex", height: 40, padding: "0 20px", borderRadius: 10,
                backgroundColor: "#ffffff", color: "#000000", fontSize: 13, fontWeight: 600,
                textDecoration: "none", alignItems: "center",
              }}
            >
              Run Scenarios →
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {trades.map((t, i) => (
              <TradeCard key={t.tradeId} trade={t} onClose={() => handleClose(t.tradeId)} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TradeCard({ trade: t, onClose, index }: { trade: TradeResult; onClose: () => void; index: number }) {
  const pnlPositive = t.currentPnL > 0;
  const pnlNeutral = t.currentPnL === 0;

  return (
    <div style={{
      backgroundColor: "var(--pa-surface-1)", border: "1px solid var(--pa-border-1)",
      borderRadius: 14, overflow: "hidden",
      animation: `pa-slide-up 0.4s ease-out ${index * 100}ms both`,
    }}>
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 10px",
        borderBottom: "1px solid var(--pa-border-1)",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--pa-text-1)", margin: 0, letterSpacing: "-0.01em" }}>
            {t.strategyName}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, backgroundColor: "var(--pa-surface-2)", border: "1px solid var(--pa-border-2)", color: "var(--pa-text-3)" }}>
            {t.underlying} · {t.expiryLabel}
          </span>
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 100,
            backgroundColor: t.status === "active" ? "rgba(52,199,89,0.08)" : "var(--pa-surface-2)",
            border: `1px solid ${t.status === "active" ? "rgba(52,199,89,0.2)" : "var(--pa-border-2)"}`,
            color: t.status === "active" ? "var(--pa-profit)" : "var(--pa-text-3)",
            fontWeight: 600,
          }}>
            {t.status === "active" ? "Active" : "Closed"}
          </span>
          {t.status === "active" && (
            <button
              onClick={onClose}
              style={{
                fontSize: 11, padding: "2px 10px", borderRadius: 100,
                border: "1px solid var(--pa-border-2)", backgroundColor: "transparent",
                color: "var(--pa-text-3)", cursor: "pointer", transition: "all 150ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--pa-text-1)"; e.currentTarget.style.borderColor = "var(--pa-border-3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--pa-text-3)"; e.currentTarget.style.borderColor = "var(--pa-border-2)"; }}
            >
              Close Simulation
            </button>
          )}
        </div>
      </div>

      {/* Current P&L — large + prominent */}
      <div style={{ padding: "20px 18px 12px", textAlign: "center" }}>
        <p style={{
          fontSize: 36, fontWeight: 600,
          color: pnlNeutral ? "var(--pa-text-2)" : pnlPositive ? "var(--pa-profit)" : "var(--pa-loss)",
          margin: "0 0 4px", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
        }}>
          {pnlPositive ? "+" : ""}{INR(t.currentPnL)}
        </p>
        <p style={{ fontSize: 11, color: "var(--pa-text-4)", margin: 0, letterSpacing: "0.02em" }}>
          Mark-to-market scenario P&L · Simulation only
        </p>
      </div>

      {/* Metrics row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "0 18px 16px", gap: 0 }}>
        {[
          { label: "Entry Spot", value: INR(t.spotAtEntry), sub: "at entry" },
          { label: "Current Spot", value: INR(t.currentSpot), sub: "live" },
          { label: "Theta Today", value: INR(t.thetaDecayToday), sub: "est. decay/day" },
          { label: "Margin", value: INR(t.marginRequired), sub: "indicative" },
        ].map((m, i) => (
          <div
            key={m.label}
            style={{
              padding: "0 8px",
              borderRight: i < 3 ? "1px solid var(--pa-border-1)" : "none",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--pa-text-3)", textTransform: "uppercase", margin: "0 0 4px" }}>
              {m.label}
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--pa-text-1)", margin: "0 0 2px", fontVariantNumeric: "tabular-nums" }}>
              {m.value}
            </p>
            <p style={{ fontSize: 10, color: "var(--pa-text-4)", margin: 0 }}>{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Breakeven row */}
      <div style={{
        margin: "0 18px 14px", padding: "8px 12px", borderRadius: 8,
        backgroundColor: "var(--pa-surface-2)", border: "1px solid var(--pa-border-1)",
        display: "flex", gap: 20, flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 12, color: "var(--pa-text-3)" }}>
          Upper BE: <span style={{ color: "var(--pa-text-1)", fontVariantNumeric: "tabular-nums" }}>{INR(t.breakevenUpper)}</span>
        </span>
        {t.breakevenLower && (
          <span style={{ fontSize: 12, color: "var(--pa-text-3)" }}>
            Lower BE: <span style={{ color: "var(--pa-text-1)", fontVariantNumeric: "tabular-nums" }}>{INR(t.breakevenLower)}</span>
          </span>
        )}
        <span style={{ fontSize: 12, color: "var(--pa-text-3)" }}>
          Probability: <span style={{ color: "var(--pa-text-1)" }}>{(t.probabilityOfProfit * 100).toFixed(0)}%</span>
          <span style={{ color: "var(--pa-text-4)", fontSize: 10 }}> (BS model)</span>
        </span>
        <span style={{ fontSize: 12, color: "var(--pa-text-3)" }}>
          Max profit: <span style={{ color: "var(--pa-profit)", fontVariantNumeric: "tabular-nums" }}>{INR(t.maxProfit)}</span>
          {" / "}Max loss: <span style={{ color: "var(--pa-loss)", fontVariantNumeric: "tabular-nums" }}>{INR(t.maxLoss)}</span>
        </span>
      </div>
    </div>
  );
}
