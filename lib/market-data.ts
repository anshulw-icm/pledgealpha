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

let lastKnownGood = {
  nifty: 24000,
  banknifty: 52000,
  niftyVol: 0.15,
  bankniftyVol: 0.20,
  savedAt: 0,
}

interface FetchResult {
  value: number
  ok: boolean
}

async function fetchSpot(url: string, fallback: number): Promise<FetchResult> {
  try {
    const res = await fetch(`${url}?interval=1d&range=1d`, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 300 },
    })
    if (!res.ok) return { value: fallback, ok: false }
    const d = await res.json()
    const price = d?.chart?.result?.[0]?.meta?.regularMarketPrice
    if (typeof price === 'number' && price > 1000) return { value: price, ok: true }
    return { value: fallback, ok: false }
  } catch {
    return { value: fallback, ok: false }
  }
}

async function fetchVol(url: string, fallback: number): Promise<FetchResult> {
  try {
    const res = await fetch(`${url}?interval=1d&range=1mo`, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return { value: fallback, ok: false }
    const d = await res.json()
    const raw: (number | null)[] = d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
    const c = raw.filter((x): x is number => x !== null && x !== undefined && isFinite(x))
    if (c.length < 5) return { value: fallback, ok: false }
    const returns = c.slice(1).map((v, i) => Math.log(v / c[i]))
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1)
    const vol = Math.sqrt(variance * 252)
    if (isFinite(vol) && vol > 0.05 && vol < 2) return { value: vol, ok: true }
    return { value: fallback, ok: false }
  } catch {
    return { value: fallback, ok: false }
  }
}

export async function getMarketData(): Promise<MarketData> {
  const lkg = lastKnownGood
  const [niftyR, bankniftyR, niftyVolR, bankniftyVolR] = await Promise.all([
    fetchSpot(NIFTY,  lkg.nifty),
    fetchSpot(BNIFTY, lkg.banknifty),
    fetchVol(NIFTY,   lkg.niftyVol),
    fetchVol(BNIFTY,  lkg.bankniftyVol),
  ])

  // isStale if either spot price fetch failed — those are the critical ones
  const isStale = !niftyR.ok || !bankniftyR.ok

  if (!isStale) {
    lastKnownGood = {
      nifty: niftyR.value,
      banknifty: bankniftyR.value,
      niftyVol: niftyVolR.ok ? niftyVolR.value : lkg.niftyVol,
      bankniftyVol: bankniftyVolR.ok ? bankniftyVolR.value : lkg.bankniftyVol,
      savedAt: Date.now(),
    }
  }

  return {
    nifty: niftyR.value,
    banknifty: bankniftyR.value,
    niftyVol: niftyVolR.ok ? niftyVolR.value : lkg.niftyVol,
    bankniftyVol: bankniftyVolR.ok ? bankniftyVolR.value : lkg.bankniftyVol,
    isStale,
  }
}
