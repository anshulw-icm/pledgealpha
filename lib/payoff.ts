import type { StrategyCandidate } from './strategy-types'

export interface PayoffPoint {
  price: number
  pnl: number
}

// Generates expiry P&L across ±15% of spot — pure math, safe to import in client components
export function generatePayoff(candidate: StrategyCandidate, numPoints = 60): PayoffPoint[] {
  const { spotAtGeneration, legs, lotSize } = candidate
  const range = spotAtGeneration * 0.15
  const min = Math.round(spotAtGeneration - range)
  const max = Math.round(spotAtGeneration + range)
  const step = Math.max(1, Math.round((max - min) / numPoints))
  const points: PayoffPoint[] = []

  for (let price = min; price <= max; price += step) {
    let pnl = 0
    for (const leg of legs) {
      const intrinsic = leg.type === 'call'
        ? Math.max(0, price - leg.strike)
        : Math.max(0, leg.strike - price)
      pnl += leg.position === 'short'
        ? (leg.premium - intrinsic) * lotSize
        : (intrinsic - leg.premium) * lotSize
    }
    points.push({ price, pnl: Math.round(pnl) })
  }
  return points
}
