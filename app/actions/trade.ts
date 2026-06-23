'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getMarketData } from '@/lib/market-data'
import { getPortfolio } from '@/app/actions/portfolio'
import type { ExplainedStrategy } from '@/lib/strategy-types'
import type { StrategyLeg } from '@/lib/strategy-types'
import { NSE_LOT_SIZES } from '@/lib/collateral-data'
import { bsPrice, bsTheta } from '@/lib/black-scholes'

const R = 0.065 // risk-free rate

export interface TradeResult {
  tradeId: string
  strategyName: string
  underlying: string
  spotAtEntry: number
  currentSpot: number
  currentPnL: number
  maxProfit: number
  maxLoss: number
  breakevenUpper: number
  breakevenLower: number | null
  marginRequired: number
  probabilityOfProfit: number
  expiryLabel: string
  createdAt: string
  status: string
  thetaDecayToday: number
  riskAppetite: string
}

// Black-Scholes mark-to-market: re-prices each leg at current spot + remaining DTE.
// This correctly accounts for time value, unlike intrinsic-only (expiry payoff).
function calcMTMPnL(
  legs: StrategyLeg[],
  lotSize: number,
  currentSpot: number,
  currentVol: number,
  remainingDte: number,
): number {
  const T = Math.max(0.5 / 365, remainingDte / 365)
  return legs.reduce((total, leg) => {
    const currentPrice = bsPrice(currentSpot, leg.strike, T, R, currentVol, leg.type)
    const perUnit = leg.position === 'long'
      ? currentPrice - leg.premium   // long: gain when price rises above entry
      : leg.premium - currentPrice   // short: gain as price decays below entry premium
    return total + perUnit * lotSize
  }, 0)
}

// Actual BS theta — index-point gain/loss from time decay today across all legs.
function calcThetaToday(
  legs: StrategyLeg[],
  lotSize: number,
  currentSpot: number,
  currentVol: number,
  remainingDte: number,
): number {
  const T = Math.max(0.5 / 365, remainingDte / 365)
  return legs.reduce((total, leg) => {
    const theta = bsTheta(currentSpot, leg.strike, T, R, currentVol, leg.type)
    // theta is negative (option loses value per day). Short gains from that decay.
    return total + (leg.position === 'short' ? -theta : theta) * lotSize
  }, 0)
}

export async function simulateTrade(
  strategy: ExplainedStrategy,
  riskAppetite: string
): Promise<{ tradeId: string }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const portfolio = await getPortfolio()
  if (!portfolio) throw new Error('No portfolio found')

  const trade = await db.simulatedTrade.create({
    data: {
      userId: session.user.id,
      portfolioId: portfolio.id,
      strategyName: strategy.name,
      underlying: strategy.underlying,
      expiryLabel: strategy.expiry.label,
      expiryIsoDate: strategy.expiry.isoDate,
      riskAppetite,
      spotAtEntry: strategy.spotAtGeneration,
      netPremium: strategy.netPremium,
      maxProfit: strategy.maxProfit,
      maxLoss: strategy.maxLoss,
      marginRequired: strategy.marginRequired,
      breakevenUpper: strategy.breakevenUpper,
      breakevenLower: strategy.breakevenLower ?? null,
      probabilityOfProfit: strategy.probabilityOfProfit,
      annualizedYield: strategy.annualizedYield,
      legsJson: JSON.stringify(strategy.legs),
      status: 'active',
    },
  })

  return { tradeId: trade.id }
}

export async function getActiveTrades(): Promise<TradeResult[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const trades = await db.simulatedTrade.findMany({
    where: { userId: session.user.id, status: 'active' },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  if (trades.length === 0) return []

  const market = await getMarketData()

  return trades.map((trade) => {
    const legs: StrategyLeg[] = JSON.parse(trade.legsJson)
    const lotSize = NSE_LOT_SIZES[trade.underlying as keyof typeof NSE_LOT_SIZES] ?? 75
    const currentSpot = trade.underlying === 'BANKNIFTY' ? market.banknifty : market.nifty
    const currentVol = trade.underlying === 'BANKNIFTY' ? market.bankniftyVol : market.niftyVol

    const expiryMs = new Date(trade.expiryIsoDate).getTime()
    const dte = Math.max(0.5, (expiryMs - Date.now()) / (1000 * 60 * 60 * 24))

    const currentPnL = calcMTMPnL(legs, lotSize, currentSpot, currentVol, dte)
    const thetaDecayToday = calcThetaToday(legs, lotSize, currentSpot, currentVol, dte)

    return {
      tradeId: trade.id,
      strategyName: trade.strategyName,
      underlying: trade.underlying,
      spotAtEntry: trade.spotAtEntry,
      currentSpot,
      currentPnL: Math.round(currentPnL),
      maxProfit: trade.maxProfit,
      maxLoss: trade.maxLoss,
      breakevenUpper: trade.breakevenUpper,
      breakevenLower: trade.breakevenLower,
      marginRequired: trade.marginRequired,
      probabilityOfProfit: trade.probabilityOfProfit,
      expiryLabel: trade.expiryLabel,
      createdAt: trade.createdAt.toISOString(),
      status: trade.status,
      thetaDecayToday: Math.round(thetaDecayToday),
      riskAppetite: trade.riskAppetite,
    }
  })
}

export async function closeTrade(tradeId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  await db.simulatedTrade.update({
    where: { id: tradeId, userId: session.user.id },
    data: { status: 'closed' },
  })
}

export async function getTradeById(tradeId: string): Promise<TradeResult | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const trade = await db.simulatedTrade.findFirst({
    where: { id: tradeId, userId: session.user.id },
  })
  if (!trade) return null

  const market = await getMarketData()
  const legs: StrategyLeg[] = JSON.parse(trade.legsJson)
  const lotSize = NSE_LOT_SIZES[trade.underlying as keyof typeof NSE_LOT_SIZES] ?? 75
  const currentSpot = trade.underlying === 'BANKNIFTY' ? market.banknifty : market.nifty
  const currentVol = trade.underlying === 'BANKNIFTY' ? market.bankniftyVol : market.niftyVol
  const dte = Math.max(0.5, (new Date(trade.expiryIsoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const currentPnL = calcMTMPnL(legs, lotSize, currentSpot, currentVol, dte)
  const thetaDecayToday = calcThetaToday(legs, lotSize, currentSpot, currentVol, dte)

  return {
    tradeId: trade.id,
    strategyName: trade.strategyName,
    underlying: trade.underlying,
    spotAtEntry: trade.spotAtEntry,
    currentSpot,
    currentPnL: Math.round(currentPnL),
    maxProfit: trade.maxProfit,
    maxLoss: trade.maxLoss,
    breakevenUpper: trade.breakevenUpper,
    breakevenLower: trade.breakevenLower,
    marginRequired: trade.marginRequired,
    probabilityOfProfit: trade.probabilityOfProfit,
    expiryLabel: trade.expiryLabel,
    createdAt: trade.createdAt.toISOString(),
    status: trade.status,
    thetaDecayToday: Math.round(thetaDecayToday),
    riskAppetite: trade.riskAppetite,
  }
}
