"use server";

import { lookupNavByCode } from "@/lib/amfi";

export interface NavLookupResult {
  schemeCode: string;
  schemeName: string;
  nav: number;
  date: string;
}

/**
 * Server action: look up current NAV for a single AMFI scheme code.
 * Returns null if the code is not found or AMFI is unreachable.
 * Called from the manual-entry UI in the upload flow.
 */
export async function fetchNavByCode(
  schemeCode: string
): Promise<NavLookupResult | null> {
  if (!schemeCode.trim()) return null;
  const result = await lookupNavByCode(schemeCode.trim());
  if (!result) return null;
  return {
    schemeCode: result.schemeCode,
    schemeName: result.schemeName,
    nav: result.nav,
    date: result.date,
  };
}
