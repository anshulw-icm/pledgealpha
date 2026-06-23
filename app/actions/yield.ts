"use server";

import { auth } from "@/lib/auth";
import { getPortfolio } from "@/app/actions/portfolio";
import { getMarketData } from "@/lib/market-data";
import { getNiftyExpiry, getBankNiftyExpiry } from "@/lib/expiry";
import { generateCandidates } from "@/lib/strategy-engine";
import { explainStrategies } from "@/lib/ai-explainer";
import { COLLATERAL_RULES, type AssetType } from "@/lib/collateral-data";
import { getFundReturns, getEffectiveRate } from "@/lib/fund-returns";
import type { RiskAppetite } from "@/app/actions/strategy";
import type { AIExplanation } from "@/lib/strategy-types";

export interface HoldingBreakdownItem {
  name: string;
  assetType: string;
  assetLabel: string;
  returnRate: number;                    // rate actually used in calculation
  returnSource: "live" | "benchmark";   // where the rate came from
  value: number;
  annualContribution: number;           // ₹ this holding contributes per year
}

export interface PassiveAnalysis {
  weightedXIRR: number;
  totalValue: number;
  pledgeableValue: number;
  projectedMonthlyReturn: number;
  holdingBreakdown: HoldingBreakdownItem[];
  liveDataCount: number;
  benchmarkCount: number;
}

export interface OverlayAnalysis {
  strategyName: string;
  underlying: string;
  expiryLabel: string;
  annualizedYield: number;
  maxProfit: number;
  maxLoss: number;
  marginRequired: number;
  probabilityOfProfit: number;
  spotAtGeneration: number;
  score: number;
  aiPowered: boolean;
  explanation: AIExplanation;
  hvUsed: number;
  isStale: boolean;
}

export interface ComparisonData {
  combinedXIRR: number;
  combinedMonthlyReturn: number;
  incrementalMonthlyRupees: number;
  incrementalAnnualRupees: number;
  // Income calculation breakdown — for transparent display in the UI
  evPerCycle: number;                   // EV = maxProfit×POP − maxLoss×(1−POP) per cycle
  cyclesPerYear: number;                // 365 / dte
  annualOptionsIncomeEV: number;        // evPerCycle × cyclesPerYear
  monthlyOptionsIncomeEV: number;
  annualOptionsIncomeBestCase: number;  // maxProfit × cyclesPerYear (best case)
  monthlyOptionsIncomeBestCase: number;
}

export interface YieldAnalysis {
  passive: PassiveAnalysis;
  overlay: OverlayAnalysis;
  comparison: ComparisonData;
  marginAvailable: number;
  marketData: { nifty: number; banknifty: number; isStale: boolean };
  generatedAt: string;
  riskAppetite: RiskAppetite;
}

export async function getYieldAnalysis(riskAppetite: RiskAppetite = "moderate"): Promise<YieldAnalysis> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Please sign in to continue.");

  const portfolio = await getPortfolio();
  if (!portfolio) throw new Error("Upload a portfolio first to see yield analysis.");

  const holdings = portfolio.holdings;
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const pledgeableValue = holdings.reduce((s, h) => s + h.pledgeableValue, 0);
  if (totalValue === 0) throw new Error("Portfolio has no holdings with value.");

  // Fetch live 1-year NAV returns in parallel, fall back to benchmarks
  const fundReturns = await getFundReturns(
    holdings.map((h) => ({
      schemeCode: h.schemeCode ?? undefined,
      assetType: h.assetType,
      name: h.name,
    }))
  );

  let weightedSum = 0;
  let liveDataCount = 0;
  let benchmarkCount = 0;
  const holdingBreakdown: HoldingBreakdownItem[] = [];

  for (const h of holdings) {
    const key = h.schemeCode ?? h.name;
    const fr = fundReturns.get(key);
    const rule = COLLATERAL_RULES[h.assetType as AssetType];

    const returnRate = fr
      ? getEffectiveRate(fr, h.assetType)
      : (0.09);
    const returnSource: "live" | "benchmark" =
      fr?.source === "live" ? "live" : "benchmark";

    if (returnSource === "live") liveDataCount++;
    else benchmarkCount++;

    weightedSum += returnRate * h.currentValue;
    holdingBreakdown.push({
      name: h.name,
      assetType: h.assetType,
      assetLabel: rule?.label ?? h.assetType,
      returnRate,
      returnSource,
      value: h.currentValue,
      annualContribution: Math.round(returnRate * h.currentValue),
    });
  }

  const weightedXIRR = weightedSum / totalValue;
  const projectedMonthlyReturn = Math.round((totalValue * weightedXIRR) / 12);

  const passive: PassiveAnalysis = {
    weightedXIRR,
    totalValue,
    pledgeableValue,
    projectedMonthlyReturn,
    holdingBreakdown,
    liveDataCount,
    benchmarkCount,
  };

  if (pledgeableValue < 5000) throw new Error("Minimum ₹5,000 pledgeable margin required to model an overlay.");

  const [marketData, niftyExpiry, bankniftyExpiry] = await Promise.all([
    getMarketData(),
    getNiftyExpiry(),
    getBankNiftyExpiry(),
  ]);

  const candidates = generateCandidates({
    riskAppetite,
    marketData,
    niftyExpiry,
    bankniftyExpiry,
    marginAvailable: pledgeableValue,
  });

  if (candidates.length === 0) throw new Error("No viable strategy scenarios for your margin level.");

  const [best] = candidates;

  // Build minimal portfolio summary for AI context in yield explanation
  const byType: Record<string, number> = {};
  for (const h of holdings) {
    const label = COLLATERAL_RULES[h.assetType as AssetType]?.label ?? h.assetType;
    byType[label] = (byType[label] ?? 0) + h.currentValue;
  }
  const portfolioSummary = {
    totalValue,
    pledgeableValue,
    topHoldings: [...holdings]
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 5)
      .map(h => ({
        name: h.name,
        assetType: COLLATERAL_RULES[h.assetType as AssetType]?.label ?? h.assetType,
        pct: (h.currentValue / totalValue) * 100,
      })),
    assetMix: Object.entries(byType)
      .map(([label, value]) => ({ label, pct: (value / totalValue) * 100 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5),
  };

  const { strategies: explained } = await explainStrategies(
    [best], pledgeableValue, riskAppetite, marketData, portfolioSummary
  );
  const strategy = explained[0];

  const overlay: OverlayAnalysis = {
    strategyName: strategy.name,
    underlying: strategy.underlying,
    expiryLabel: strategy.expiry.label,
    annualizedYield: strategy.annualizedYield,
    maxProfit: strategy.maxProfit,
    maxLoss: strategy.maxLoss,
    marginRequired: strategy.marginRequired,
    probabilityOfProfit: strategy.probabilityOfProfit,
    spotAtGeneration: strategy.spotAtGeneration,
    score: strategy.score,
    aiPowered: strategy.aiPowered,
    explanation: strategy.explanation,
    hvUsed: strategy.hvUsed,
    isStale: marketData.isStale,
  };

  const cyclesPerYear = 365 / best.expiry.dte;
  // Expected value per cycle: probability-weighted outcome (honest projection)
  const pop = best.probabilityOfProfit;
  const evPerCycle = best.maxProfit * pop - best.maxLoss * (1 - pop);
  const annualOptionsIncomeEV = evPerCycle * cyclesPerYear;
  const monthlyOptionsIncomeEV = Math.round(annualOptionsIncomeEV / 12);
  // Best-case (every trade hits max profit — shown for reference)
  const annualOptionsIncomeBestCase = best.maxProfit * cyclesPerYear;
  const monthlyOptionsIncomeBestCase = Math.round(annualOptionsIncomeBestCase / 12);

  // Use expected value as the basis for combined projections
  const combinedMonthlyReturn = projectedMonthlyReturn + monthlyOptionsIncomeEV;
  const combinedXIRR = (totalValue * weightedXIRR + annualOptionsIncomeEV) / totalValue;

  const comparison: ComparisonData = {
    combinedXIRR,
    combinedMonthlyReturn,
    incrementalMonthlyRupees: monthlyOptionsIncomeEV,
    incrementalAnnualRupees: monthlyOptionsIncomeEV * 12,
    evPerCycle: Math.round(evPerCycle),
    cyclesPerYear: Math.round(cyclesPerYear * 10) / 10,
    annualOptionsIncomeEV: Math.round(annualOptionsIncomeEV),
    monthlyOptionsIncomeEV,
    annualOptionsIncomeBestCase: Math.round(annualOptionsIncomeBestCase),
    monthlyOptionsIncomeBestCase,
  };

  return {
    passive,
    overlay,
    comparison,
    marginAvailable: pledgeableValue,
    marketData: { nifty: marketData.nifty, banknifty: marketData.banknifty, isStale: marketData.isStale },
    generatedAt: new Date().toISOString(),
    riskAppetite,
  };
}
