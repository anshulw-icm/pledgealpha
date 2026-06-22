import { classifyAsset, COLLATERAL_RULES } from "./collateral-data";

export interface RawHolding {
  name: string;
  schemeCode?: string;
  isin?: string;
  units: number;
  nav: number;
}

export interface ParsedHolding {
  name: string;
  schemeCode?: string;
  isin?: string;
  units: number;
  nav: number;
  currentValue: number;
  assetType: string;
  isPledgeable: boolean;
  haircut: number;
  pledgeableValue: number;
}

export interface PortfolioSummary {
  totalValue: number;
  pledgeableValue: number;
  nonPledgeableValue: number;
  marginUnlocked: number;
  pledgeableCount: number;
  totalCount: number;
}

export function calculateHolding(raw: RawHolding): ParsedHolding {
  const currentValue = raw.units * raw.nav;
  const assetType = classifyAsset(raw.name);
  const rule = COLLATERAL_RULES[assetType as keyof typeof COLLATERAL_RULES];

  return {
    ...raw,
    currentValue,
    assetType,
    isPledgeable: rule.isPledgeable,
    haircut: rule.haircut,
    pledgeableValue: rule.isPledgeable ? currentValue * (1 - rule.haircut) : 0,
  };
}

export function calculatePortfolioSummary(holdings: ParsedHolding[]): PortfolioSummary {
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const pledgeableValue = holdings.reduce((s, h) => s + h.pledgeableValue, 0);
  return {
    totalValue,
    pledgeableValue,
    nonPledgeableValue: totalValue - pledgeableValue,
    marginUnlocked: pledgeableValue,
    pledgeableCount: holdings.filter((h) => h.isPledgeable).length,
    totalCount: holdings.length,
  };
}

/**
 * Parse a CSV string into raw holdings.
 *
 * Accepts flexible column names:
 *   name/scheme/fund  →  holding name
 *   units/quantity/qty  →  unit count
 *   nav/price/rate  →  NAV per unit
 *   code/scheme code  →  optional scheme code
 *   isin  →  optional ISIN
 *
 * Tolerates quoted fields, leading/trailing whitespace, and a BOM character.
 */
export function parseCSV(csvText: string): RawHolding[] {
  // Strip BOM and normalise line endings
  const clean = csvText.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean.trim().split("\n").filter((l) => l.trim());

  if (lines.length < 2) throw new Error("CSV needs a header row and at least one data row.");

  const unquote = (s: string) => s.trim().replace(/^["']|["']$/g, "");
  const header = lines[0].split(",").map((h) => unquote(h).toLowerCase());

  const idx = (keywords: string[]) =>
    header.findIndex((h) => keywords.some((k) => h.includes(k)));

  const nameIdx   = idx(["scheme", "fund", "name"]);
  const unitsIdx  = idx(["unit", "quantity", "qty"]);
  const navIdx    = idx(["nav", "price", "rate"]);
  const codeIdx   = idx(["scheme code", "code"]);
  const isinIdx   = idx(["isin"]);

  if (nameIdx === -1)  throw new Error("CSV missing a name/scheme/fund column.");
  if (unitsIdx === -1) throw new Error("CSV missing a units/quantity column.");
  if (navIdx === -1)   throw new Error("CSV missing a NAV/price column.");

  const holdings: RawHolding[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(unquote);
    if (!cols[nameIdx]) continue;

    const units = parseFloat(cols[unitsIdx]);
    const nav   = parseFloat(cols[navIdx]);
    if (isNaN(units) || isNaN(nav) || units <= 0 || nav <= 0) continue;

    holdings.push({
      name: cols[nameIdx],
      units,
      nav,
      schemeCode: codeIdx >= 0 ? cols[codeIdx] || undefined : undefined,
      isin:       isinIdx >= 0 ? cols[isinIdx] || undefined  : undefined,
    });
  }

  if (holdings.length === 0) throw new Error("No valid holdings found. Check your columns and values.");
  return holdings;
}