import { normCdf, bsPrice, bsDelta, bsTheta, bsVega } from './black-scholes'
import type { ExpiryInfo } from './expiry'
import type { MarketData } from './market-data'
import type { StrategyCandidate, StrategyLeg } from './strategy-types'

const R = 0.065 // RBI repo rate

type RiskAppetite = 'conservative' | 'moderate' | 'aggressive'

interface Ctx {
  spot: number
  vol: number
  expiry: ExpiryInfo
  lotSize: number
  grid: number
  margin: number
  underlying: 'NIFTY' | 'BANKNIFTY'
}

// Risk-neutral probability that underlying is above K at expiry
function probAbove(S: number, K: number, T: number, sigma: number): number {
  if (T <= 0) return S > K ? 1 : 0
  if (K <= 0) return 1
  const d2 = (Math.log(S / K) + (R - 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T))
  return normCdf(d2)
}

function findStrike(
  spot: number, targetDelta: number, T: number, sigma: number,
  grid: number, type: 'call' | 'put'
): number {
  const atm = Math.round(spot / grid) * grid
  let best = atm
  let bestDiff = Infinity
  for (let i = -20; i <= 20; i++) {
    const K = atm + i * grid
    if (K <= 0) continue
    const diff = Math.abs(bsDelta(spot, K, T, R, sigma, type) - targetDelta)
    if (diff < bestDiff) { bestDiff = diff; best = K }
  }
  return best
}

function calcScore(
  annYield: number, pop: number, maxProfit: number, maxLoss: number,
  marginReq: number, marginAvail: number
): number {
  return (
    Math.min(annYield, 1) * 0.35 +
    pop * 0.30 +
    Math.min(maxProfit / maxLoss, 1) * 0.20 +
    (1 - Math.min(marginReq / marginAvail, 1)) * 0.15
  ) * 100
}

function passes(premium: number, maxLoss: number, marginReq: number, pop: number, avail: number): boolean {
  return premium > 0 && pop >= 0.50 && maxLoss <= avail * 0.60 && marginReq <= avail * 0.90
}

// ── Strategy builders ────────────────────────────────────────────────────────

function buildCSP(ctx: Ctx): StrategyCandidate | null {
  const { spot, vol, expiry, lotSize, grid, margin, underlying } = ctx
  const T = expiry.dte / 365
  if (T < 0.003) return null

  const K = findStrike(spot, -0.25, T, vol, grid, 'put')
  const prem = bsPrice(spot, K, T, R, vol, 'put')
  if (prem <= 0) return null

  const maxProfit = prem * lotSize
  const maxLoss = (K - prem) * lotSize
  const breakeven = K - prem
  const marginReq = K * lotSize * 0.20
  const pop = probAbove(spot, breakeven, T, vol)

  if (!passes(prem, maxLoss, marginReq, pop, margin)) return null

  const dte = expiry.dte
  const annYield = (maxProfit / marginReq) * (365 / dte)
  const legs: StrategyLeg[] = [{ type: 'put', strike: K, position: 'short', premium: prem, delta: bsDelta(spot, K, T, R, vol, 'put') }]

  return {
    id: `csp-${underlying}-${K}`,
    name: 'Cash-Secured Put',
    underlying, expiry, legs,
    netPremium: prem,
    maxProfit, maxLoss,
    delta: -legs[0].delta,
    theta: -bsTheta(spot, K, T, R, vol, 'put'),
    vega: -bsVega(spot, K, T, R, vol),
    marginRequired: marginReq,
    probabilityOfProfit: pop,
    annualizedYield: annYield,
    score: calcScore(annYield, pop, maxProfit, maxLoss, marginReq, margin),
    breakevenLower: null,
    breakevenUpper: breakeven,
    spotAtGeneration: spot,
    lotSize,
    hvUsed: vol,
  }
}

function buildBullPutSpread(ctx: Ctx): StrategyCandidate | null {
  const { spot, vol, expiry, lotSize, grid, margin, underlying } = ctx
  const T = expiry.dte / 365
  if (T < 0.003) return null

  const Ks = findStrike(spot, -0.30, T, vol, grid, 'put')
  const Kl = Ks - 2 * grid
  const ps = bsPrice(spot, Ks, T, R, vol, 'put')
  const pl = bsPrice(spot, Kl, T, R, vol, 'put')
  const net = ps - pl
  if (net <= 0) return null

  const wing = Ks - Kl
  const maxProfit = net * lotSize
  const maxLoss = (wing - net) * lotSize
  const breakeven = Ks - net
  const marginReq = maxLoss * 1.25
  const pop = probAbove(spot, breakeven, T, vol)

  if (!passes(net, maxLoss, marginReq, pop, margin)) return null

  const dte = expiry.dte
  const annYield = (maxProfit / marginReq) * (365 / dte)
  const legs: StrategyLeg[] = [
    { type: 'put', strike: Ks, position: 'short', premium: ps, delta: bsDelta(spot, Ks, T, R, vol, 'put') },
    { type: 'put', strike: Kl, position: 'long',  premium: pl, delta: bsDelta(spot, Kl, T, R, vol, 'put') },
  ]

  return {
    id: `bps-${underlying}-${Ks}`,
    name: 'Bull Put Spread',
    underlying, expiry, legs,
    netPremium: net,
    maxProfit, maxLoss,
    delta: -legs[0].delta + legs[1].delta,
    theta: -(bsTheta(spot, Ks, T, R, vol, 'put') - bsTheta(spot, Kl, T, R, vol, 'put')),
    vega: -(bsVega(spot, Ks, T, R, vol) - bsVega(spot, Kl, T, R, vol)),
    marginRequired: marginReq,
    probabilityOfProfit: pop,
    annualizedYield: annYield,
    score: calcScore(annYield, pop, maxProfit, maxLoss, marginReq, margin),
    breakevenLower: null,
    breakevenUpper: breakeven,
    spotAtGeneration: spot,
    lotSize,
    hvUsed: vol,
  }
}

function buildBearCallSpread(ctx: Ctx): StrategyCandidate | null {
  const { spot, vol, expiry, lotSize, grid, margin, underlying } = ctx
  const T = expiry.dte / 365
  if (T < 0.003) return null

  const Ks = findStrike(spot, 0.30, T, vol, grid, 'call')
  const Kl = Ks + 2 * grid
  const ps = bsPrice(spot, Ks, T, R, vol, 'call')
  const pl = bsPrice(spot, Kl, T, R, vol, 'call')
  const net = ps - pl
  if (net <= 0) return null

  const wing = Kl - Ks
  const maxProfit = net * lotSize
  const maxLoss = (wing - net) * lotSize
  const breakeven = Ks + net
  const marginReq = maxLoss * 1.25
  const pop = 1 - probAbove(spot, breakeven, T, vol)

  if (!passes(net, maxLoss, marginReq, pop, margin)) return null

  const dte = expiry.dte
  const annYield = (maxProfit / marginReq) * (365 / dte)
  const legs: StrategyLeg[] = [
    { type: 'call', strike: Ks, position: 'short', premium: ps, delta: bsDelta(spot, Ks, T, R, vol, 'call') },
    { type: 'call', strike: Kl, position: 'long',  premium: pl, delta: bsDelta(spot, Kl, T, R, vol, 'call') },
  ]

  return {
    id: `bcs-${underlying}-${Ks}`,
    name: 'Bear Call Spread',
    underlying, expiry, legs,
    netPremium: net,
    maxProfit, maxLoss,
    delta: -legs[0].delta + legs[1].delta,
    theta: -(bsTheta(spot, Ks, T, R, vol, 'call') - bsTheta(spot, Kl, T, R, vol, 'call')),
    vega: -(bsVega(spot, Ks, T, R, vol) - bsVega(spot, Kl, T, R, vol)),
    marginRequired: marginReq,
    probabilityOfProfit: pop,
    annualizedYield: annYield,
    score: calcScore(annYield, pop, maxProfit, maxLoss, marginReq, margin),
    breakevenLower: null,
    breakevenUpper: breakeven,
    spotAtGeneration: spot,
    lotSize,
    hvUsed: vol,
  }
}

function buildIronCondor(ctx: Ctx): StrategyCandidate | null {
  const { spot, vol, expiry, lotSize, grid, margin, underlying } = ctx
  const T = expiry.dte / 365
  if (T < 0.003) return null

  const Ksc = findStrike(spot, 0.20,  T, vol, grid, 'call')
  const Klc = Ksc + 2 * grid
  const Ksp = findStrike(spot, -0.20, T, vol, grid, 'put')
  const Klp = Ksp - 2 * grid

  const psc = bsPrice(spot, Ksc, T, R, vol, 'call')
  const plc = bsPrice(spot, Klc, T, R, vol, 'call')
  const psp = bsPrice(spot, Ksp, T, R, vol, 'put')
  const plp = bsPrice(spot, Klp, T, R, vol, 'put')
  const net = (psc - plc) + (psp - plp)
  if (net <= 0) return null

  const wing = 2 * grid
  const maxProfit = net * lotSize
  const maxLoss = (wing - net) * lotSize
  if (maxLoss <= 0) return null
  const breakevenUpper = Ksc + net
  const breakevenLower = Ksp - net
  const marginReq = maxLoss * 1.25
  const pop = probAbove(spot, breakevenLower, T, vol) - probAbove(spot, breakevenUpper, T, vol)

  if (!passes(net, maxLoss, marginReq, pop, margin)) return null

  const dte = expiry.dte
  const annYield = (maxProfit / marginReq) * (365 / dte)

  const legs: StrategyLeg[] = [
    { type: 'call', strike: Ksc, position: 'short', premium: psc, delta: bsDelta(spot, Ksc, T, R, vol, 'call') },
    { type: 'call', strike: Klc, position: 'long',  premium: plc, delta: bsDelta(spot, Klc, T, R, vol, 'call') },
    { type: 'put',  strike: Ksp, position: 'short', premium: psp, delta: bsDelta(spot, Ksp, T, R, vol, 'put') },
    { type: 'put',  strike: Klp, position: 'long',  premium: plp, delta: bsDelta(spot, Klp, T, R, vol, 'put') },
  ]

  const netDelta = -legs[0].delta + legs[1].delta - legs[2].delta + legs[3].delta
  const callTheta = bsTheta(spot, Ksc, T, R, vol, 'call') - bsTheta(spot, Klc, T, R, vol, 'call')
  const putTheta  = bsTheta(spot, Ksp, T, R, vol, 'put')  - bsTheta(spot, Klp, T, R, vol, 'put')
  const callVega  = bsVega(spot, Ksc, T, R, vol) - bsVega(spot, Klc, T, R, vol)
  const putVega   = bsVega(spot, Ksp, T, R, vol) - bsVega(spot, Klp, T, R, vol)

  return {
    id: `ic-${underlying}-${Ksc}-${Ksp}`,
    name: 'Iron Condor',
    underlying, expiry, legs,
    netPremium: net,
    maxProfit, maxLoss,
    delta: netDelta,
    theta: -(callTheta + putTheta),
    vega: -(callVega + putVega),
    marginRequired: marginReq,
    probabilityOfProfit: pop,
    annualizedYield: annYield,
    score: calcScore(annYield, pop, maxProfit, maxLoss, marginReq, margin),
    breakevenLower,
    breakevenUpper,
    spotAtGeneration: spot,
    lotSize,
    hvUsed: vol,
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface GenerateCandidatesInput {
  riskAppetite: RiskAppetite
  marketData: MarketData
  niftyExpiry: ExpiryInfo
  bankniftyExpiry: ExpiryInfo
  marginAvailable: number
}

export function generateCandidates({
  riskAppetite,
  marketData,
  niftyExpiry,
  bankniftyExpiry,
  marginAvailable,
}: GenerateCandidatesInput): StrategyCandidate[] {
  const nCtx: Ctx = {
    spot: marketData.nifty,
    vol: marketData.niftyVol,
    expiry: niftyExpiry,
    lotSize: 75,
    grid: 50,
    margin: marginAvailable,
    underlying: 'NIFTY',
  }
  const bCtx: Ctx = {
    spot: marketData.banknifty,
    vol: marketData.bankniftyVol,
    expiry: bankniftyExpiry,
    lotSize: 30,
    grid: 100,
    margin: marginAvailable,
    underlying: 'BANKNIFTY',
  }

  const builders: Record<RiskAppetite, (() => StrategyCandidate | null)[]> = {
    conservative: [
      () => buildCSP(nCtx),
      () => buildCSP(bCtx),
      () => buildBullPutSpread(nCtx),
    ],
    moderate: [
      () => buildIronCondor(nCtx),
      () => buildBullPutSpread(nCtx),
      () => buildBearCallSpread(bCtx),
      () => buildIronCondor(bCtx),
    ],
    aggressive: [
      () => buildIronCondor(nCtx),
      () => buildIronCondor(bCtx),
      () => buildBearCallSpread(nCtx),
      () => buildBearCallSpread(bCtx),
      () => buildBullPutSpread(nCtx),
    ],
  }

  return builders[riskAppetite]
    .map(fn => fn())
    .filter((c): c is StrategyCandidate => c !== null)
    .sort((a, b) => b.score - a.score)
}
