// Abramowitz & Stegun approximation — max error < 7.5e-8
export function normCdf(x: number): number {
  if (x < -8) return 0
  if (x > 8) return 1
  const a = Math.abs(x)
  const t = 1 / (1 + 0.2316419 * a)
  const poly =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  const pdf = Math.exp(-a * a / 2) / Math.sqrt(2 * Math.PI)
  const cdf = 1 - pdf * poly
  return x >= 0 ? cdf : 1 - cdf
}

function normPdf(x: number): number {
  return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI)
}

function d1d2(S: number, K: number, T: number, r: number, sigma: number): [number, number] {
  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
  return [d1, d1 - sigma * sqrtT]
}

export function bsPrice(
  S: number, K: number, T: number, r: number, sigma: number, type: 'call' | 'put'
): number {
  if (T <= 0) return Math.max(0, type === 'call' ? S - K : K - S)
  const [d1, d2] = d1d2(S, K, T, r, sigma)
  const df = Math.exp(-r * T)
  return type === 'call'
    ? S * normCdf(d1) - K * df * normCdf(d2)
    : K * df * normCdf(-d2) - S * normCdf(-d1)
}

export function bsDelta(
  S: number, K: number, T: number, r: number, sigma: number, type: 'call' | 'put'
): number {
  if (T <= 0) return type === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0)
  const [d1] = d1d2(S, K, T, r, sigma)
  return type === 'call' ? normCdf(d1) : normCdf(d1) - 1
}

export function bsGamma(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) return 0
  const [d1] = d1d2(S, K, T, r, sigma)
  return normPdf(d1) / (S * sigma * Math.sqrt(T))
}

// Theta in index-points per calendar day per option unit
export function bsTheta(
  S: number, K: number, T: number, r: number, sigma: number, type: 'call' | 'put'
): number {
  if (T <= 0) return 0
  const [d1, d2] = d1d2(S, K, T, r, sigma)
  const sqrtT = Math.sqrt(T)
  const df = Math.exp(-r * T)
  const decay = -(S * normPdf(d1) * sigma) / (2 * sqrtT)
  return type === 'call'
    ? (decay - r * K * df * normCdf(d2)) / 365
    : (decay + r * K * df * normCdf(-d2)) / 365
}

// Vega in index-points per 1% change in implied vol
export function bsVega(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) return 0
  const [d1] = d1d2(S, K, T, r, sigma)
  return S * normPdf(d1) * Math.sqrt(T) / 100
}
