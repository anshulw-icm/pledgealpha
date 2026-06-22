// Static NSE-approved collateral classification rules with haircuts.
// Based on SEBI circular SEBI/HO/MRD/DP/CIR/P/2019/95 and NSE margin framework.
// Keyword-based classification — update when NSE revises the approved list.

export type AssetType =
  | "MF_LARGE_CAP"
  | "MF_MID_CAP"
  | "MF_SMALL_CAP"
  | "MF_DEBT"
  | "MF_LIQUID"
  | "ETF_LARGE_CAP"
  | "ETF_MID_CAP"
  | "GOVT_BOND"
  | "CORP_BOND_AAA"
  | "EQUITY_NIFTY50"
  | "EQUITY_NIFTY100"
  | "OTHER";

export interface CollateralRule {
  haircut: number;       // fraction, e.g. 0.10 = 10% haircut
  isPledgeable: boolean;
  label: string;
}

export const COLLATERAL_RULES: Record<AssetType, CollateralRule> = {
  MF_LARGE_CAP:    { haircut: 0.10, isPledgeable: true,  label: "Large Cap MF" },
  MF_MID_CAP:      { haircut: 0.25, isPledgeable: true,  label: "Mid Cap MF" },
  MF_SMALL_CAP:    { haircut: 0.35, isPledgeable: true,  label: "Small Cap MF" },
  MF_DEBT:         { haircut: 0.10, isPledgeable: true,  label: "Debt MF" },
  MF_LIQUID:       { haircut: 0.05, isPledgeable: true,  label: "Liquid MF" },
  ETF_LARGE_CAP:   { haircut: 0.10, isPledgeable: true,  label: "Large Cap ETF" },
  ETF_MID_CAP:     { haircut: 0.20, isPledgeable: true,  label: "Mid Cap ETF" },
  GOVT_BOND:       { haircut: 0.05, isPledgeable: true,  label: "Government Bond" },
  CORP_BOND_AAA:   { haircut: 0.10, isPledgeable: true,  label: "AAA Corporate Bond" },
  EQUITY_NIFTY50:  { haircut: 0.15, isPledgeable: true,  label: "Nifty 50 Stock" },
  EQUITY_NIFTY100: { haircut: 0.20, isPledgeable: true,  label: "Nifty 100 Stock" },
  OTHER:           { haircut: 0.50, isPledgeable: false, label: "Other (Ineligible)" },
};

// Keyword-based classifier — maps scheme name fragments to asset types.
// Checks in priority order: liquid → gilt → debt → small → mid → large/etf.
export function classifyAsset(name: string): AssetType {
  const n = name.toLowerCase();

  if (n.includes("liquid") || n.includes("overnight") || n.includes("money market"))
    return "MF_LIQUID";

  if (n.includes("gilt") || n.includes("g-sec") || n.includes("government securities"))
    return "GOVT_BOND";

  if (
    n.includes("debt") ||
    n.includes("bond fund") ||
    n.includes("income fund") ||
    n.includes("banking & psu") ||
    n.includes("banking and psu") ||
    n.includes("short duration") ||
    n.includes("ultra short") ||
    n.includes("low duration") ||
    n.includes("credit risk") ||
    n.includes("corporate bond")
  )
    return "MF_DEBT";

  if (n.includes("small cap") || n.includes("smallcap") || n.includes("small-cap"))
    return "MF_SMALL_CAP";

  if (n.includes("mid cap") || n.includes("midcap") || n.includes("mid-cap"))
    return "MF_MID_CAP";

  if (
    n.includes("etf") &&
    (n.includes("nifty 50") || n.includes("nifty50") || n.includes("sensex") || n.includes("large"))
  )
    return "ETF_LARGE_CAP";

  if (n.includes("etf"))
    return "ETF_MID_CAP";

  if (
    n.includes("large cap") ||
    n.includes("largecap") ||
    n.includes("large-cap") ||
    n.includes("bluechip") ||
    n.includes("blue chip") ||
    n.includes("top 100") ||
    n.includes("top100") ||
    n.includes("nifty 50") ||
    n.includes("flexi cap") ||
    n.includes("flexicap") ||
    n.includes("multi cap") ||
    n.includes("multicap") ||
    n.includes("elss") ||
    n.includes("tax saver") ||
    n.includes("focused") ||
    n.includes("value fund") ||
    n.includes("dividend yield") ||
    n.includes("balanced advantage") ||
    n.includes("aggressive hybrid")
  )
    return "MF_LARGE_CAP";

  return "OTHER";
}