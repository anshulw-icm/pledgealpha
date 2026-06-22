export interface NavResult {
  schemeCode: string;
  schemeName: string;
  nav: number;
  date: string;
}

// Module-level in-memory cache — survives across requests on same serverless instance.
// Next.js fetch cache (revalidate: 21600) handles cold-start deduplication.
let navCache: Map<string, NavResult> | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function fetchAllNavs(): Promise<Map<string, NavResult>> {
  const res = await fetch("https://www.amfiindia.com/spages/NAVAll.txt", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; PledgeAlpha/1.0; +https://pledgealpha.vercel.app)",
    },
    next: { revalidate: 21600 },
  });

  if (!res.ok) throw new Error(`AMFI responded ${res.status}`);

  const text = await res.text();
  const map = new Map<string, NavResult>();

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line === ";") continue;

    const parts = line.split(";");
    // Data lines: SchemeCode;ISIN1;ISIN2;SchemeName;NAV;Date
    if (parts.length < 6) continue;

    const schemeCode = parts[0].trim();
    const schemeName = parts[3].trim();
    const navStr = parts[4].trim();
    const date = parts[5].trim();

    if (!schemeCode || !schemeName || !/^\d+$/.test(schemeCode)) continue;
    const nav = parseFloat(navStr);
    if (isNaN(nav) || nav <= 0) continue;

    const entry: NavResult = { schemeCode, schemeName, nav, date };
    map.set(schemeCode, entry);
  }

  return map;
}

async function getNavMap(): Promise<Map<string, NavResult>> {
  const now = Date.now();
  if (navCache && now - cacheTime < CACHE_TTL_MS) return navCache;

  try {
    navCache = await fetchAllNavs();
    cacheTime = now;
    return navCache;
  } catch (err) {
    if (navCache) return navCache; // serve stale on error
    throw err;
  }
}

/**
 * Look up current NAV by scheme code.
 * Returns null if the scheme code is not found or AMFI is unreachable.
 */
export async function lookupNavByCode(
  schemeCode: string
): Promise<NavResult | null> {
  try {
    const map = await getNavMap();
    return map.get(schemeCode.trim()) ?? null;
  } catch {
    return null;
  }
}

/**
 * Batch NAV lookup — returns a map of schemeCode → NavResult.
 * Missing codes are silently omitted from the result.
 */
export async function lookupNavsBatch(
  schemeCodes: string[]
): Promise<Map<string, NavResult>> {
  const result = new Map<string, NavResult>();
  try {
    const map = await getNavMap();
    for (const code of schemeCodes) {
      const entry = map.get(code.trim());
      if (entry) result.set(code.trim(), entry);
    }
  } catch {
    // Return empty map — caller handles missing data
  }
  return result;
}