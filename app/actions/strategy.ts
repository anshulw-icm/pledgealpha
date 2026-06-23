"use server";

import { auth } from "@/lib/auth";
import { getPortfolio } from "@/app/actions/portfolio";
import { getMarketData } from "@/lib/market-data";
import { getNiftyExpiry, getBankNiftyExpiry } from "@/lib/expiry";
import { generateCandidates } from "@/lib/strategy-engine";
import { explainStrategies, type PortfolioSummary } from "@/lib/ai-explainer";
import type { StrategyResult } from "@/lib/strategy-types";
import { COLLATERAL_RULES, type AssetType } from "@/lib/collateral-data";

export type RiskAppetite = "conservative" | "moderate" | "aggressive";

function buildPortfolioSummary(holdings: {
  name: string;
  assetType: string;
  currentValue: number;
  pledgeableValue: number;
}[]): PortfolioSummary {
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const pledgeableValue = holdings.reduce((s, h) => s + h.pledgeableValue, 0);

  const topHoldings = [...holdings]
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 5)
    .map(h => ({
      name: h.name,
      assetType: COLLATERAL_RULES[h.assetType as AssetType]?.label ?? h.assetType,
      pct: totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0,
    }));

  // Group by asset type label, compute percentages
  const byType: Record<string, number> = {};
  for (const h of holdings) {
    const label = COLLATERAL_RULES[h.assetType as AssetType]?.label ?? h.assetType;
    byType[label] = (byType[label] ?? 0) + h.currentValue;
  }
  const assetMix = Object.entries(byType)
    .map(([label, value]) => ({ label, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  return { totalValue, pledgeableValue, topHoldings, assetMix };
}

export async function generateStrategies(riskAppetite: RiskAppetite): Promise<StrategyResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Please sign in to generate scenarios.");

  const portfolio = await getPortfolio();
  if (!portfolio) throw new Error("Upload a portfolio first.");

  const marginAvailable = portfolio.holdings.reduce((s, h) => s + h.pledgeableValue, 0);
  if (marginAvailable < 5000) throw new Error("Minimum ₹5,000 pledgeable value required.");

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
    marginAvailable,
  });

  if (candidates.length === 0) {
    throw new Error("No viable scenarios for your margin level. Try uploading a larger portfolio.");
  }

  const portfolioSummary = buildPortfolioSummary(portfolio.holdings);

  const { strategies, marketCommentary } = await explainStrategies(
    candidates,
    marginAvailable,
    riskAppetite,
    marketData,
    portfolioSummary,
  );

  return {
    strategies,
    marginAvailable,
    marketData: { nifty: marketData.nifty, banknifty: marketData.banknifty, isStale: marketData.isStale },
    generatedAt: new Date().toISOString(),
    marketCommentary,
  };
}
