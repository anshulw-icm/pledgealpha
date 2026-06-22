"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import {
  parseCSV,
  calculateHolding,
  calculatePortfolioSummary,
  type ParsedHolding,
} from "@/lib/portfolio-parser";
import { COLLATERAL_RULES, type AssetType } from "@/lib/collateral-data";
import { savePortfolio } from "@/app/actions/portfolio";
import { fetchNavByCode } from "@/app/actions/nav";

type Method = "csv" | "excel" | "manual";
type Step = "method" | "input" | "review";

interface ManualRow {
  schemeCode: string;
  name: string;
  units: string;
  nav: string;
  lookingUp: boolean;
  lookupError: string;
}

const EMPTY_ROW: ManualRow = {
  schemeCode: "",
  name: "",
  units: "",
  nav: "",
  lookingUp: false,
  lookupError: "",
};

const METHOD_OPTIONS = [
  {
    id: "csv" as Method,
    icon: "📄",
    title: "Upload CSV",
    desc: "Export from CAMS, KFintech, or your broker",
    accept: ".csv",
  },
  {
    id: "excel" as Method,
    icon: "📊",
    title: "Upload Excel",
    desc: "Standard .xlsx / .xls format",
    accept: ".xlsx,.xls",
  },
  {
    id: "manual" as Method,
    icon: "✏️",
    title: "Enter Manually",
    desc: "Type in each holding one by one",
    accept: "",
  },
];

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<Method | null>(null);
  const [holdings, setHoldings] = useState<ParsedHolding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manualRows, setManualRows] = useState<ManualRow[]>([EMPTY_ROW]);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File) {
    setError(null);
    const reader = new FileReader();
    reader.onerror = () => setError("Could not read the file.");
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        let csvText: string;
        if (file.name.toLowerCase().endsWith(".csv")) {
          csvText = content as string;
        } else {
          const wb = XLSX.read(content as ArrayBuffer, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          csvText = XLSX.utils.sheet_to_csv(ws);
        }
        const raw = parseCSV(csvText);
        setHoldings(raw.map(calculateHolding));
        setStep("review");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to parse file.");
      }
    };
    if (file.name.toLowerCase().endsWith(".csv")) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  }

  function updateRow(i: number, field: keyof ManualRow, value: string | boolean) {
    setManualRows((rows) => {
      const next = [...rows];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function removeRow(i: number) {
    setManualRows((rows) => rows.filter((_, idx) => idx !== i));
  }

  async function lookupNav(i: number) {
    const code = manualRows[i].schemeCode.trim();
    if (!code) return;
    updateRow(i, "lookingUp", true);
    updateRow(i, "lookupError", "");
    try {
      const result = await fetchNavByCode(code);
      if (!result) {
        updateRow(i, "lookupError", "Scheme code not found in AMFI");
      } else {
        setManualRows((rows) => {
          const next = [...rows];
          next[i] = { ...next[i], name: result.schemeName, nav: String(result.nav), lookingUp: false, lookupError: "" };
          return next;
        });
        return;
      }
    } catch {
      updateRow(i, "lookupError", "AMFI lookup failed — enter NAV manually");
    }
    updateRow(i, "lookingUp", false);
  }

  function handleLoadDemo() {
    const demoHoldings = [
      { name: "Axis Bluechip Fund - Direct Plan - Growth", schemeCode: "120465", units: 500, nav: 52.34 },
      { name: "HDFC Mid-Cap Opportunities Fund - Direct - Growth", schemeCode: "100270", units: 200, nav: 98.76 },
      { name: "SBI Liquid Fund - Direct Plan - Growth", schemeCode: "119020", units: 100, nav: 3542.18 },
      { name: "Mirae Asset Large Cap Fund - Direct - Growth", schemeCode: "118989", units: 350, nav: 91.22 },
      { name: "Parag Parikh Flexi Cap Fund - Direct - Growth", schemeCode: "122639", units: 450, nav: 67.85 },
      { name: "ICICI Pru Nifty 50 Index Fund - Direct - Growth", schemeCode: "120586", units: 800, nav: 28.43 },
      { name: "Kotak Gilt Fund - Direct Plan - Growth", schemeCode: "120177", units: 150, nav: 105.60 },
      { name: "Nippon India Small Cap Fund - Direct - Growth", schemeCode: "118778", units: 300, nav: 142.33 },
      { name: "Aditya Birla SL Banking & PSU Debt - Direct", schemeCode: "119551", units: 1200, nav: 28.91 },
      { name: "UTI Nifty 50 ETF", schemeCode: "135000", units: 600, nav: 247.15 },
    ]
    const parsed = demoHoldings.map(h => calculateHolding(h))
    setHoldings(parsed)
    setStep("review")
  }

  function handleManualSubmit() {
    setError(null);
    try {
      const raw = manualRows
        .filter((r) => r.name.trim() && r.units.trim() && r.nav.trim())
        .map((r) => {
          const units = parseFloat(r.units);
          const nav = parseFloat(r.nav);
          if (isNaN(units) || units <= 0) throw new Error(`Invalid units for "${r.name}"`);
          if (isNaN(nav) || nav <= 0) throw new Error(`Invalid NAV for "${r.name}"`);
          return { name: r.name.trim(), schemeCode: r.schemeCode || undefined, units, nav };
        });
      if (raw.length === 0) throw new Error("Add at least one complete holding.");
      setHoldings(raw.map(calculateHolding));
      setStep("review");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Check your entries.");
    }
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await savePortfolio("My Portfolio", holdings);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Save failed. Please try again.");
      }
    });
  }

  const summary = holdings.length > 0 ? calculatePortfolioSummary(holdings) : null;

  const inputClass =
    "bg-pa-surface-2 border border-pa-border-1 rounded-lg px-3 py-2 text-pa-text-1 text-[13px] placeholder:text-pa-text-4 focus:outline-none focus:border-pa-border-3 transition-colors";

  return (
    <div className="min-h-screen bg-pa-black">

      {/* Header */}
      <header className="border-b border-pa-border-1 bg-pa-black/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-pa-text-3 hover:text-pa-text-1 text-lg leading-none transition-colors"
          >
            ←
          </button>
          <Logo size="sm" />
          <span className="text-pa-text-1 text-[14px] font-medium">/ Upload Portfolio</span>
          {step !== "method" && (
            <Badge variant="outline" className="border-pa-border-2 text-pa-text-3 text-[11px] ml-auto">
              {step === "input" ? "Step 2 of 3" : "Step 3 of 3"}
            </Badge>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10 space-y-8">

        {/* ── Step 1: method selection ── */}
        {step === "method" && (
          <>
            <div>
              <h1 className="text-[20px] font-semibold text-pa-text-1 tracking-[-0.02em]">
                How would you like to add your portfolio?
              </h1>
              <p className="text-pa-text-2 text-[14px] mt-1">
                Your data stays on your device until you choose to save.
              </p>
            </div>

            {/* Demo portfolio banner */}
            <div className="bg-pa-surface-1 border border-pa-border-2 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-pa-text-1 text-[14px] font-medium">Try with a sample portfolio</p>
                <p className="text-pa-text-3 text-[12px] mt-0.5">10 real mutual fund schemes · instant load</p>
              </div>
              <button
                onClick={handleLoadDemo}
                className="h-9 px-4 bg-white text-black text-[13px] font-medium rounded-xl hover:bg-pa-text-1 transition-colors shrink-0"
              >
                Load Demo Portfolio →
              </button>
            </div>

            <div className="grid gap-2.5">
              {METHOD_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setMethod(m.id); setError(null); setStep("input"); }}
                  className="flex items-center gap-4 p-4 bg-pa-surface-1 border border-pa-border-1 hover:border-pa-border-3 rounded-xl text-left transition-colors group"
                >
                  <span className="text-2xl">{m.icon}</span>
                  <div>
                    <p className="text-pa-text-1 font-medium text-[14px] group-hover:text-white transition-colors">
                      {m.title}
                    </p>
                    <p className="text-pa-text-3 text-[12px] mt-0.5">{m.desc}</p>
                  </div>
                  <span className="ml-auto text-pa-text-4 group-hover:text-pa-text-2 transition-colors">→</span>
                </button>
              ))}
            </div>

            <div className="bg-pa-surface-1/50 border border-pa-border-1 rounded-xl p-4 space-y-2">
              <p className="text-pa-text-2 text-[12px] font-medium">Expected CSV format</p>
              <code className="block text-pa-profit text-[12px] font-mono">Scheme Name,Units,NAV</code>
              <code className="block text-pa-text-4 text-[12px] font-mono">Axis Bluechip Fund - Growth,500,52.34</code>
              <p className="text-pa-text-4 text-[12px]">Optional columns: Scheme Code, ISIN</p>
            </div>
          </>
        )}

        {/* ── Step 2a: file upload ── */}
        {step === "input" && method !== "manual" && (
          <>
            <div>
              <h1 className="text-[20px] font-semibold text-pa-text-1 tracking-[-0.02em]">
                Upload your {method === "csv" ? "CSV" : "Excel"} file
              </h1>
              <p className="text-pa-text-2 text-[14px] mt-1">
                Parsed locally — nothing leaves your device until you save.
              </p>
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-pa-border-2 hover:border-pa-border-3 rounded-2xl p-16 text-center cursor-pointer transition-colors"
            >
              <p className="text-4xl mb-3">{method === "csv" ? "📄" : "📊"}</p>
              <p className="text-pa-text-1 font-medium text-[14px]">Click to select file</p>
              <p className="text-pa-text-3 text-[12px] mt-1">
                {method === "csv" ? ".csv files" : ".xlsx and .xls files"}
              </p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept={METHOD_OPTIONS.find((m) => m.id === method)?.accept}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {error && (
              <div className="bg-pa-loss/8 border border-pa-loss/25 rounded-xl p-4">
                <p className="text-pa-loss text-[13px]">{error}</p>
              </div>
            )}

            <Button variant="ghost" onClick={() => setStep("method")} className="text-pa-text-3 hover:text-pa-text-1">
              ← Back
            </Button>
          </>
        )}

        {/* ── Step 2b: manual entry ── */}
        {step === "input" && method === "manual" && (
          <>
            <div>
              <h1 className="text-[20px] font-semibold text-pa-text-1 tracking-[-0.02em]">Enter your holdings</h1>
              <p className="text-pa-text-2 text-[14px] mt-1">
                Enter the AMFI scheme code to auto-fill name and NAV, or type all fields manually.
              </p>
            </div>

            <div className="space-y-3">
              {manualRows.map((row, i) => (
                <div key={i} className="bg-pa-surface-1 border border-pa-border-1 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      placeholder="AMFI Scheme Code (e.g. 120503)"
                      value={row.schemeCode}
                      onChange={(e) => updateRow(i, "schemeCode", e.target.value)}
                      className={`flex-1 ${inputClass} font-mono`}
                    />
                    <button
                      onClick={() => lookupNav(i)}
                      disabled={!row.schemeCode.trim() || row.lookingUp}
                      className="px-3 py-2 bg-pa-profit/8 hover:bg-pa-profit/15 border border-pa-profit/25 text-pa-profit text-[12px] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      {row.lookingUp ? "…" : "Lookup NAV"}
                    </button>
                    <button
                      onClick={() => removeRow(i)}
                      disabled={manualRows.length === 1}
                      className="text-pa-text-4 hover:text-pa-loss disabled:opacity-20 transition-colors px-1 shrink-0 text-lg"
                    >
                      ×
                    </button>
                  </div>
                  {row.lookupError && <p className="text-pa-loss text-[12px] px-1">{row.lookupError}</p>}
                  <div className="grid grid-cols-[1fr_90px_90px] gap-2">
                    <input placeholder="Scheme name" value={row.name} onChange={(e) => updateRow(i, "name", e.target.value)} className={inputClass} />
                    <input placeholder="Units" type="number" min="0" step="any" value={row.units} onChange={(e) => updateRow(i, "units", e.target.value)} className={inputClass} />
                    <input placeholder="NAV (₹)" type="number" min="0" step="any" value={row.nav} onChange={(e) => updateRow(i, "nav", e.target.value)} className={inputClass} />
                  </div>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setManualRows((r) => [...r, { ...EMPTY_ROW }])}
                className="text-pa-text-2 hover:text-pa-text-1 hover:bg-pa-surface-2 mt-1"
              >
                + Add row
              </Button>
            </div>

            {error && (
              <div className="bg-pa-loss/8 border border-pa-loss/25 rounded-xl p-4">
                <p className="text-pa-loss text-[13px]">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep("method")} className="text-pa-text-3 hover:text-pa-text-1">
                ← Back
              </Button>
              <Button onClick={handleManualSubmit} className="bg-white hover:bg-pa-text-1 text-black font-medium text-[13px]">
                Analyse Holdings →
              </Button>
            </div>
          </>
        )}

        {/* ── Step 3: review & save ── */}
        {step === "review" && summary && (
          <>
            <div>
              <h1 className="text-[20px] font-semibold text-pa-text-1 tracking-[-0.02em]">Portfolio Analysis</h1>
              <p className="text-pa-text-2 text-[14px] mt-1">Review the simulated analysis before saving.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Value", value: INR(summary.totalValue), color: "text-pa-text-1" },
                { label: "Pledgeable Value", value: INR(summary.pledgeableValue), color: "text-pa-profit" },
                { label: "Margin Unlocked", value: INR(summary.marginUnlocked), color: "text-pa-profit" },
                { label: "Eligible Holdings", value: `${summary.pledgeableCount} / ${summary.totalCount}`, color: "text-pa-text-1" },
              ].map((c) => (
                <div key={c.label} className="bg-pa-surface-1 border border-pa-border-1 rounded-xl p-4">
                  <p className="text-pa-text-3 text-[11px] uppercase tracking-wide mb-1">{c.label}</p>
                  <p className={`font-semibold text-[16px] tracking-[-0.02em] ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-pa-surface-1 border border-pa-border-1 rounded-xl overflow-hidden">
              <div className="px-4 py-3.5 border-b border-pa-border-1">
                <p className="text-pa-text-1 text-[14px] font-medium">Holdings breakdown</p>
              </div>
              <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px_80px] gap-2 px-4 py-2.5 border-b border-pa-border-1/40">
                {["Scheme", "Value", "Category", "Haircut", "Pledgeable"].map((h) => (
                  <p key={h} className={`text-pa-text-3 text-[11px] uppercase tracking-wide ${h !== "Scheme" ? "text-right" : ""}`}>{h}</p>
                ))}
              </div>
              <div className="divide-y divide-pa-border-1/60">
                {holdings.map((h, i) => {
                  const rule = COLLATERAL_RULES[h.assetType as AssetType];
                  return (
                    <div key={i} className="px-4 py-3 sm:grid sm:grid-cols-[1fr_80px_80px_80px_80px] sm:gap-2 flex flex-col gap-1">
                      <div>
                        <p className="text-pa-text-1 text-[14px]">{h.name}</p>
                        <p className="text-pa-text-3 text-[12px] mt-0.5">
                          {h.units.toLocaleString("en-IN")} units @ ₹{h.nav.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-pa-text-1 text-[13px] sm:text-right">{INR(h.currentValue)}</p>
                      <div className="sm:text-right">
                        <Badge
                          variant="outline"
                          className={`text-[11px] px-1.5 py-0 ${h.isPledgeable ? "border-pa-profit/30 text-pa-profit" : "border-pa-border-2 text-pa-text-3"}`}
                        >
                          {rule?.label ?? h.assetType}
                        </Badge>
                      </div>
                      <p className="text-pa-text-2 text-[13px] sm:text-right">
                        {h.isPledgeable ? `${(h.haircut * 100).toFixed(0)}%` : "—"}
                      </p>
                      <p className={`text-[13px] sm:text-right font-medium ${h.isPledgeable ? "text-pa-profit" : "text-pa-text-4"}`}>
                        {h.isPledgeable ? INR(h.pledgeableValue) : "Ineligible"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-pa-surface-1/40 border border-pa-border-1 rounded-xl p-4">
              <p className="text-pa-text-3 text-[12px] leading-relaxed">
                <span className="text-pa-text-2 font-medium">Simulated results.</span>{" "}
                Haircut percentages are illustrative, based on general SEBI/NSE margin framework guidelines.
                Actual eligibility and haircuts depend on your broker and current NSE circulars. Educational only.
              </p>
            </div>

            {error && (
              <div className="bg-pa-loss/8 border border-pa-loss/25 rounded-xl p-4">
                <p className="text-pa-loss text-[13px]">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => { setStep("method"); setHoldings([]); setManualRows([{ ...EMPTY_ROW }]); }}
                className="text-pa-text-3 hover:text-pa-text-1"
              >
                ← Start over
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending}
                className="bg-white hover:bg-pa-text-1 text-black font-medium text-[13px]"
              >
                {isPending ? "Saving…" : "Save Portfolio →"}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
