import type { ExpiryInfo } from './expiry'

export interface StrategyLeg {
  type: 'call' | 'put'
  strike: number
  position: 'long' | 'short'
  premium: number
  delta: number
}

export interface StrategyCandidate {
  id: string
  name: string
  underlying: 'NIFTY' | 'BANKNIFTY'
  expiry: ExpiryInfo
  legs: StrategyLeg[]
  netPremium: number       // index-points per unit (credit collected)
  maxProfit: number        // ₹ total
  maxLoss: number          // ₹ total
  delta: number            // net position delta
  theta: number            // net theta, index-points/day per unit
  vega: number             // net vega, per 1% sigma per unit
  marginRequired: number   // ₹
  probabilityOfProfit: number
  annualizedYield: number
  score: number
  breakevenLower: number | null
  breakevenUpper: number
  spotAtGeneration: number
  lotSize: number
  hvUsed: number            // annualised historical vol used for BS pricing
}

export interface AIExplanation {
  summary: string
  analogy: string
  riskWarning: string
  whySelected: string
  portfolioFit: string   // how this strategy connects to the user's specific holdings
}

export interface ExplainedStrategy extends StrategyCandidate {
  explanation: AIExplanation
  aiPowered: boolean
}

export interface StrategyResult {
  strategies: ExplainedStrategy[]
  marginAvailable: number
  marketData: { nifty: number; banknifty: number; isStale: boolean }
  generatedAt: string
  marketCommentary: string  // AI-generated market context (empty string if Groq failed)
}
