export interface MarketData {
  nifty: number
  banknifty: number
  niftyVol: number
  bankniftyVol: number
  isStale: boolean
}

const UA = 'Mozilla/5.0 (compatible; PledgeAlpha/1.0; +https://pledgealpha.vercel.app)'
const NIFTY  = 'https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI'
const BNIFTY = 'https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEBANK'

// Persists across 15-min cache invalidations — uses real recent prices as fallback
let lastKnownGood = {
  nifty: 24000,
  banknifty: 52000,
  niftyVol: 0.15,
  bankniftyVol: 0.20,
  savedAt: 0,
}

async function fetchSpot(url: string, fallback: number): Promise<number> {
  try {
    const res = await fetch(`${url}?interval=1d&range=1d`, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 300 },
    })
    if (!res.ok) return fallback
    const d = await res.json()
    const price = d?.chart?.result?.[0]?.meta?.regularMarketPrice
    return typeof price === 'number' && price > 0 ? price : fallback
  } catch {
    return fallback
  }
}

async function fetchVol(url: string, fallback: number): Promise<number> {
  try {
    const res = await fetch(`${url}?interval=1d&range=1mo`, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return fallback
    const d = await res.json()
    const raw: (number | null)[] = d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
    const c = raw.filter((x): x is number => x !== null && x !== undefined && isFinite(x))
    if (c.length < 5) return fallback
    const returns = c.slice(1).map((v, i) => Math.log(v / c[i]))
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1)
    const vol = Math.sqrt(variance * 252)
    return isFinite(vol) && vol > 0.05 && vol < 2 ? vol : fallback
  } catch {
    return fallback
  }
}

export async function getMarketData(): Promise<MarketData> {
  const lkg = lastKnownGood
  const [nifty, banknifty, niftyVol, bankniftyVol] = await Promise.all([
    fetchSpot(NIFTY,  lkg.nifty),
    fetchSpot(BNIFTY, lkg.banknifty),
    fetchVol(NIFTY,   lkg.niftyVol),
    fetchVol(BNIFTY,  lkg.bankniftyVol),
  ])

  // Stale = got same values as our fallback AND we've had a good fetch before
  const isStale = nifty === lkg.nifty && banknifty === lkg.banknifty && lkg.savedAt > 0

  if (!isStale) {
    lastKnownGood = { nifty, banknifty, niftyVol, bankniftyVol, savedAt: Date.now() }
  }

  return { nifty, banknifty, niftyVol, bankniftyVol, isStale }
}
