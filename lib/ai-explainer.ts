import Groq from 'groq-sdk'
import type { StrategyCandidate, ExplainedStrategy, AIExplanation } from './strategy-types'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM = `You are a financial education assistant for PledgeAlpha.
Never recommend buying or selling any security. Never guarantee returns.
Frame everything as educational scenarios and simulations only.
Never calculate any numbers yourself — use ONLY the numbers in the JSON input.
Output valid JSON only. No markdown. No text outside the JSON object.`

function fallback(c: StrategyCandidate, risk: string): AIExplanation {
  const net = Math.round(c.netPremium * c.lotSize).toLocaleString('en-IN')
  const upper = Math.round(c.breakevenUpper).toLocaleString('en-IN')
  const lower = c.breakevenLower ? Math.round(c.breakevenLower).toLocaleString('en-IN') : null
  return {
    summary: `This scenario involves a ${c.name} on ${c.underlying}. You collect ₹${net} upfront. You keep this amount if ${c.underlying} stays ${lower ? `between ₹${lower} and ₹${upper}` : `below ₹${upper}`} by ${c.expiry.label}.`,
    analogy: 'Think of it like collecting advance rent — you earn upfront and keep everything as long as the market stays in range.',
    riskWarning: `Maximum scenario loss is ₹${Math.round(c.maxLoss).toLocaleString('en-IN')} if ${c.underlying} moves sharply beyond the breakeven levels.`,
    whySelected: `Selected based on the highest score for your ${risk} profile.`,
  }
}

export async function explainStrategies(
  candidates: StrategyCandidate[],
  marginAvailable: number,
  riskAppetite: string
): Promise<ExplainedStrategy[]> {
  const top3 = candidates.slice(0, 3)
  if (top3.length === 0) return []

  try {
    const payload = top3.map(c => ({
      id: c.id,
      name: c.name,
      underlying: c.underlying,
      expiry: c.expiry.label,
      net_premium_inr: Math.round(c.netPremium * c.lotSize),
      max_profit_inr: Math.round(c.maxProfit),
      max_loss_inr: Math.round(c.maxLoss),
      probability_of_profit: `${(c.probabilityOfProfit * 100).toFixed(0)}%`,
      annualized_yield: `${(c.annualizedYield * 100).toFixed(1)}% p.a. (simulation)`,
      margin_required_inr: Math.round(c.marginRequired),
      score: c.score.toFixed(1),
      breakeven_lower: c.breakevenLower ? Math.round(c.breakevenLower) : null,
      breakeven_upper: Math.round(c.breakevenUpper),
    }))

    const userMsg = `Margin available: ₹${marginAvailable.toLocaleString('en-IN')} | Risk profile: ${riskAppetite}

${JSON.stringify(payload, null, 2)}

Return JSON: {"strategies":[{"id":"...","summary":"...","analogy":"...","riskWarning":"...","whySelected":"..."},...]}
Rules: summary=2-3 sentences, analogy=1 non-financial metaphor, riskWarning=1 sentence on max loss, whySelected=1 sentence.`

    const resp = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userMsg }],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const parsed = JSON.parse(resp.choices[0].message.content ?? '{}')
    const map: Record<string, AIExplanation> = {}
    for (const s of parsed.strategies ?? []) {
      if (s.id && s.summary) {
        map[s.id] = { summary: s.summary, analogy: s.analogy, riskWarning: s.riskWarning, whySelected: s.whySelected }
      }
    }

    return top3.map(c => ({
      ...c,
      explanation: map[c.id] ?? fallback(c, riskAppetite),
      aiPowered: !!map[c.id],
    }))
  } catch {
    return top3.map(c => ({ ...c, explanation: fallback(c, riskAppetite), aiPowered: false }))
  }
}
