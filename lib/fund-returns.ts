import { BENCHMARK_XIRR, type AssetType } from "./collateral-data";

export interface FundReturn {
  schemeCode: string;
  schemeName: string;
  oneYearReturn: number | null;  // decimal e.g. 0.142
  source: "live" | "benchmark";
  calculatedAt: string;
}

// Module-level cache — survives across requests within the same server instance
const _cache = new Map<string, { value: FundReturn; expiresAt: number }>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function calculateOneYearReturn(schemeCode: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
      next: { revalidate: 86400 },
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return null;

    const json = await res.json();
    const data: { date: string; nav: string }[] = json?.data;
    if (!Array.isArray(data) || data.length < 20) return null;

    const latestNav = parseFloat(data[0].nav);
    if (!isFinite(latestNav) || latestNav <= 0) return null;

    // mfapi dates are DD-MM-YYYY, data sorted newest first
    const target = new Date();
    target.setFullYear(target.getFullYear() - 1);
    const targetMs = target.getTime();

    let closest: { nav: string } | null = null;
    let minDiff = Infinity;

    for (const entry of data) {
      const parts = entry.date.split("-");
      if (parts.length !== 3) continue;
      const d = new Date(
        parseInt(parts[2]),
        parseInt(parts[1]) - 1,
        parseInt(parts[0])
      );
      const diff = Math.abs(d.getTime() - targetMs);
      if (diff < minDiff) {
        minDiff = diff;
        closest = entry;
      }
      // data is newest-first; once we're past 400 days out, stop
      if (d.getTime() < targetMs - 35 * 24 * 60 * 60 * 1000) break;
    }

    // Reject if best match is >30 days off target
    if (!closest || minDiff > 30 * 24 * 60 * 60 * 1000) return null;

    const navOneYearAgo = parseFloat(closest.nav);
    if (!isFinite(navOneYearAgo) || navOneYearAgo <= 0) return null;

    const ret = (latestNav - navOneYearAgo) / navOneYearAgo;
    // Sanity check: reject implausible values
    return isFinite(ret) && ret > -0.5 && ret < 3.0 ? ret : null;
  } catch {
    return null;
  }
}

export async function getFundReturns(
  holdings: Array<{ schemeCode?: string | null; assetType: string; name: string }>
): Promise<Map<string, FundReturn>> {
  const now = Date.now();
  const result = new Map<string, FundReturn>();

  await Promise.all(
    holdings.map(async (h) => {
      const key = h.schemeCode ?? h.name;

      const cached = _cache.get(key);
      if (cached && cached.expiresAt > now) {
        result.set(key, cached.value);
        return;
      }

      let fr: FundReturn;

      if (h.schemeCode) {
        const ret = await calculateOneYearReturn(h.schemeCode);
        fr = {
          schemeCode: h.schemeCode,
          schemeName: h.name,
          oneYearReturn: ret,
          source: ret !== null ? "live" : "benchmark",
          calculatedAt: new Date().toISOString(),
        };
      } else {
        fr = {
          schemeCode: "",
          schemeName: h.name,
          oneYearReturn: null,
          source: "benchmark",
          calculatedAt: new Date().toISOString(),
        };
      }

      _cache.set(key, { value: fr, expiresAt: now + TTL_MS });
      result.set(key, fr);
    })
  );

  return result;
}

// Get the effective rate for a holding — live if available, benchmark otherwise
export function getEffectiveRate(fr: FundReturn, assetType: string): number {
  if (fr.source === "live" && fr.oneYearReturn !== null) {
    return fr.oneYearReturn;
  }
  return BENCHMARK_XIRR[assetType as AssetType] ?? 0.09;
}
