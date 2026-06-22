"use server";

import { auth } from "@/lib/auth";
import { getPortfolio } from "@/app/actions/portfolio";
import { getMarketData } from "@/lib/market-data";
import { getNiftyExpiry, getBankNiftyExpiry } from "@/lib/expiry";
import { generateCandidates } from "@/lib/strategy-engine";
import { explainStrategies } from "@/lib/ai-explainer";
import type { StrategyResult } from "@/lib/strategy-types";

export type RiskAppetite = "conservative" | "moderate" | "aggressive";

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

  const strategies = await explainStrategies(candidates, marginAvailable, riskAppetite);

  return {
    strategies,
    marginAvailable,
    marketData: { nifty: marketData.nifty, banknifty: marketData.banknifty, isStale: marketData.isStale },
    generatedAt: new Date().toISOString(),
  };
}
