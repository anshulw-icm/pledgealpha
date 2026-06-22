"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import { generatePayoff } from "@/lib/payoff";
import type { StrategyCandidate } from "@/lib/strategy-types";

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function PayoffChart({ candidate }: { candidate: StrategyCandidate }) {
  const data = generatePayoff(candidate);
  const posData = data.map((p) => ({ price: p.price, pos: p.pnl >= 0 ? p.pnl : null, neg: null }));
  const negData = data.map((p) => ({ price: p.price, pos: null, neg: p.pnl < 0 ? p.pnl : null }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <XAxis
            dataKey="price"
            tickFormatter={(v) => Number(v).toLocaleString("en-IN")}
            tick={{ fill: "#6E6E73", fontSize: 10 }}
            axisLine={{ stroke: "#38383A" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => "₹" + (Number(v) / 1000).toFixed(0) + "k"}
            tick={{ fill: "#6E6E73", fontSize: 10 }}
            axisLine={{ stroke: "#38383A" }}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(v) => [typeof v === "number" ? INR(v) : "—", "Scenario P&L"]}
            labelFormatter={(v) => `Price: ${Number(v).toLocaleString("en-IN")}`}
            contentStyle={{ backgroundColor: "#3A3A3C", border: "1px solid #48484A", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#A1A1A6" }}
            itemStyle={{ color: "#F5F5F7" }}
          />
          <ReferenceLine y={0} stroke="#48484A" strokeDasharray="3 3" />
          <ReferenceLine
            x={candidate.spotAtGeneration}
            stroke="#636366"
            strokeDasharray="3 3"
            label={{ value: "Now", fill: "#6E6E73", fontSize: 10, position: "top" }}
          />
          {candidate.breakevenUpper && (
            <ReferenceLine
              x={Math.round(candidate.breakevenUpper)}
              stroke="#FF3B30"
              strokeDasharray="3 3"
              label={{ value: "BE", fill: "#FF3B30", fontSize: 10, position: "top" }}
            />
          )}
          {candidate.breakevenLower && (
            <ReferenceLine
              x={Math.round(candidate.breakevenLower)}
              stroke="#FF3B30"
              strokeDasharray="3 3"
              label={{ value: "BE", fill: "#FF3B30", fontSize: 10, position: "top" }}
            />
          )}
          <Line
            data={posData}
            dataKey="pos"
            stroke="#34C759"
            dot={false}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            data={negData}
            dataKey="neg"
            stroke="#FF3B30"
            dot={false}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div style={{
        marginTop: 12,
        padding: "10px 14px",
        borderRadius: 8,
        border: "1px solid rgba(255,59,48,0.18)",
        backgroundColor: "rgba(255,59,48,0.04)",
      }}>
        <p style={{ fontSize: 11, color: "#6E6E73", lineHeight: 1.5, margin: 0 }}>
          ⚠️ This payoff diagram shows a simulated scenario at expiry only. Not investment advice.
          Options trading involves substantial risk of loss. Simulated results do not represent actual trading outcomes.
        </p>
      </div>
    </div>
  );
}
