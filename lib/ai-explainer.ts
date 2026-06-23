import Groq from 'groq-sdk'
import type { StrategyCandidate, ExplainedStrategy, AIExplanation } from './strategy-types'
import type { MarketData } from './market-data'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM = `You are a financial education assistant for PledgeAlpha.
Never recommend buying or selling any security. Never guarantee returns.
Frame everything as educational scenarios and simulations only.
Never calculate any numbers yourself — use ONLY the numbers provided in the JSON input.
Output valid JSON only. No markdown fences. No text outside the JSON object.`

// Portfolio summary built from user holdings for AI context
export interface PortfolioSummary {
  totalValue: number
  pledgeableValue: number
  topHoldings: { name: string; assetType: string; pct: number }[]
  assetMix: { label: string; pct: number }[]
}

function buildFallback(c: StrategyCandidate, risk: string): AIExplanation {
  const net = Math.round(c.netPremium * c.lotSize).toLocaleString('en-IN')
  const upper = Math.round(c.breakevenUpper).toLocaleString('en-IN')
  const lower = c.breakevenLower ? Math.round(c.breakevenLower).toLocaleString('en-IN') : null
  return {
    summary: `This scenario involves a ${c.name} on ${c.underlying}. You collect ₹${net} upfront as premium. You keep this amount if ${c.underlying} stays ${lower ? `between ₹${lower} and ₹${upper}` : `above ₹${upper}`} by ${c.expiry.label}.`,
    analogy: 'Think of it like collecting advance rent — you earn upfront and keep everything as long as the market stays in range.',
    riskWarning: `Maximum scenario loss is ₹${Math.round(c.maxLoss).toLocaleString('en-IN')} if ${c.underlying} moves sharply beyond the breakeven.`,
    whySelected: `Selected based on the highest composite score for your ${risk} profile — balancing yield, probability of profit, and margin efficiency.`,
    portfolioFit: `This strategy uses ${c.underlying} as the underlying, which aligns with the equity mutual fund exposure in your portfolio.`,
  }
}

export async function explainStrategies(
  candidates: StrategyCandidate[],
  marginAvailable: number,
  riskAppetite: string,
  marketData: MarketData,
  portfolio: PortfolioSummary,
): Promise<{ strategies: ExplainedStrategy[]; marketCommentary: string }> {
  if (candidates.length === 0) return { strategies: [], marketCommentary: '' }

  // Math-ranked fallback (used if AI fails or to pad short AI selections)
  const mathRanked = [...candidates].sort((a, b) => b.score - a.score)

  try {
    const candidatePayload = candidates.map(c => ({
      id: c.id,
      name: c.name,
      underlying: c.underlying,
      expiry: c.expiry.label,
      dte: c.expiry.dte,
      net_premium_inr: Math.round(c.netPremium * c.lotSize),
      max_profit_inr: Math.round(c.maxProfit),
      max_loss_inr: Math.round(c.maxLoss),
      prob_of_profit: `${(c.probabilityOfProfit * 100).toFixed(0)}%`,
      annualized_yield: `${(c.annualizedYield * 100).toFixed(1)}%`,
      margin_required_inr: Math.round(c.marginRequired),
      math_score: c.score.toFixed(1),
      breakeven_upper: Math.round(c.breakevenUpper),
      breakeven_lower: c.breakevenLower ? Math.round(c.breakevenLower) : null,
      delta: c.delta.toFixed(2),
    }))

    const marketPayload = {
      nifty_spot: Math.round(marketData.nifty),
      nifty_hv_30d_pct: (marketData.niftyVol * 100).toFixed(1),
      banknifty_spot: Math.round(marketData.banknifty),
      banknifty_hv_30d_pct: (marketData.bankniftyVol * 100).toFixed(1),
      data_quality: marketData.isStale ? 'stale_fallback' : 'live',
    }

    const portfolioPayload = {
      total_value_inr: Math.round(portfolio.totalValue),
      pledgeable_value_inr: Math.round(portfolio.pledgeableValue),
      top_holdings: portfolio.topHoldings.map(h => ({
        name: h.name,
        type: h.assetType,
        portfolio_pct: `${h.pct.toFixed(0)}%`,
      })),
      asset_mix: portfolio.assetMix.map(a => `${a.label} ${a.pct.toFixed(0)}%`).join(', '),
    }

    const prompt = `Risk profile: ${riskAppetite} | Margin available: ₹${marginAvailable.toLocaleString('en-IN')}

LIVE MARKET DATA:
${JSON.stringify(marketPayload)}

USER PORTFOLIO:
${JSON.stringify(portfolioPayload)}

ALL STRATEGY CANDIDATES (${candidates.length} available):
${JSON.stringify(candidatePayload, null, 2)}

TASKS:
1. marketCommentary: Write 2-3 sentences about what current market conditions mean for options premium-selling strategies. Reference the actual HV percentages. Note whether HV is relatively high or low (NIFTY typical range 10-25%), and what that means for premium richness. Be educational, not predictive.

2. selectedIds: Pick the 3 best candidate IDs for this user's risk profile and market conditions. Do NOT simply pick the highest math_score — use your judgment: consider which strategy types suit the current vol environment, which DTE offers better theta, and how the user's portfolio composition (heavy equity MFs = correlated to NIFTY) affects fit. Spread across different underlyings if sensible.

3. strategies: For each selected ID write:
   - summary: 2-3 sentences explaining the scenario mechanics and what has to happen to keep the premium
   - analogy: 1 creative non-financial metaphor that captures the risk/reward
   - riskWarning: 1 sentence on the specific max-loss scenario (use the actual rupee number)
   - whySelected: 1 sentence explaining why this was chosen over other candidates for this profile
   - portfolioFit: 1 sentence connecting this strategy to the user's specific portfolio composition (reference their actual asset types and how it creates alignment or diversification)

Return JSON (no markdown, no extra text):
{
  "marketCommentary": "...",
  "selectedIds": ["id1", "id2", "id3"],
  "strategies": [
    {"id":"...","summary":"...","analogy":"...","riskWarning":"...","whySelected":"...","portfolioFit":"..."}
  ]
}`

    const resp = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 2800,
      response_format: { type: 'json_object' },
    })

    const parsed = JSON.parse(resp.choices[0].message.content ?? '{}')

    const marketCommentary: string = typeof parsed.marketCommentary === 'string'
      ? parsed.marketCommentary
      : ''

    // Build explanation map from AI output
    const explanationMap: Record<string, AIExplanation> = {}
    for (const s of (parsed.strategies ?? [])) {
      if (s.id && s.summary) {
        explanationMap[s.id] = {
          summary: s.summary,
          analogy: s.analogy ?? '',
          riskWarning: s.riskWarning ?? '',
          whySelected: s.whySelected ?? '',
          portfolioFit: s.portfolioFit ?? '',
        }
      }
    }

    // Use AI-selected ordering; pad with math-ranked if AI returned < 3
    const selectedIds: string[] = Array.isArray(parsed.selectedIds) ? parsed.selectedIds : []
    const aiOrdered = selectedIds
      .map(id => candidates.find(c => c.id === id))
      .filter((c): c is StrategyCandidate => c !== undefined)

    const usedIds = new Set(selectedIds)
    const remaining = mathRanked.filter(c => !usedIds.has(c.id))
    const final = [...aiOrdered, ...remaining].slice(0, 3)

    const strategies: ExplainedStrategy[] = final.map(c => ({
      ...c,
      explanation: explanationMap[c.id] ?? buildFallback(c, riskAppetite),
      aiPowered: !!explanationMap[c.id],
    }))

    return { strategies, marketCommentary }
  } catch {
    // Groq unavailable — fall back to math ranking with template explanations
    const strategies: ExplainedStrategy[] = mathRanked.slice(0, 3).map(c => ({
      ...c,
      explanation: buildFallback(c, riskAppetite),
      aiPowered: false,
    }))
    return { strategies, marketCommentary: '' }
  }
}
