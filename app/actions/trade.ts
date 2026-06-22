'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getMarketData } from '@/lib/market-data'
import { getPortfolio } from '@/app/actions/portfolio'
import type { ExplainedStrategy } from '@/lib/strategy-types'
import type { StrategyLeg } from '@/lib/strategy-types'
import { NSE_LOT_SIZES } from '@/lib/collateral-data'

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

function calcPnLAtSpot(legs: StrategyLeg[], lotSize: number, spot: number): number {
  return legs.reduce((total, leg) => {
    const intrinsic = leg.type === 'call'
      ? Math.max(0, spot - leg.strike)
      : Math.max(0, leg.strike - spot)
    const perUnit = leg.position === 'long'
      ? intrinsic - leg.premium
      : leg.premium - intrinsic
    return total + perUnit * lotSize
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

    const currentPnL = calcPnLAtSpot(legs, lotSize, currentSpot)

    const expiryMs = new Date(trade.expiryIsoDate).getTime()
    const dte = Math.max(1, (expiryMs - Date.now()) / (1000 * 60 * 60 * 24))
    const thetaDecayToday = Math.abs(trade.netPremium) * lotSize * 0.02 / dte

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
  const currentPnL = calcPnLAtSpot(legs, lotSize, currentSpot)
  const dte = Math.max(1, (new Date(trade.expiryIsoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const thetaDecayToday = Math.abs(trade.netPremium) * lotSize * 0.02 / dte

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
