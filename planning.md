# PledgeAlpha — Complete Project Context

**Live URL:** https://pledgealpha.vercel.app  
**Stack:** Next.js 16.2.9 · Neon PostgreSQL · Prisma 7 · Auth.js v5 · Groq (free) · Tailwind v4  
**Budget:** ₹0/month (all free tier)  
**Last updated:** June 2026

---

## What It Is

PledgeAlpha is a free educational platform that lets users model how their SEBI-eligible mutual fund portfolio can serve as **options margin collateral** — and simulate the potential yield from running options strategies on top of it.

No broker integration. No real money moves. Everything is labelled "simulated results" and "educational only".

---

## Hard Constraints (Must Never Break)

- **Never say:** Buy, Sell, Recommended, Guaranteed
- **Always say:** Analysis, Scenario, Simulation, Potential Outcome
- Every strategy must show **max loss as prominently as max profit**
- All outputs labelled **"educational only"** and **"simulated results"**
- **No paid AI APIs** — Groq is the only AI API (free tier)
- Groq system prompt must always include: *"Never recommend buying or selling any security. Never guarantee returns. Frame everything as educational scenarios and simulations only. Never calculate any numbers yourself."*

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16.2.9 (App Router, Turbopack) | Server actions, streaming, ISR |
| Database | Neon PostgreSQL (free tier) | Serverless, scales to zero |
| ORM | Prisma 7 + `@prisma/adapter-neon` | Type-safe, works in Edge |
| Auth | Auth.js v5 (next-auth beta.31) + GitHub OAuth | Free, no SMTP needed |
| AI | Groq SDK (Llama 3.3-70B, free tier) | Only free LLM API available |
| Styling | Tailwind v4 + custom `--pa-*` design tokens | |
| Charts | Recharts 3.8 | |
| Deployment | Vercel (free tier) | |

### Critical: Prisma 7 Configuration
Prisma 7 broke the `url` field in `schema.prisma`. The DB URL must live **only** in `prisma.config.ts`:

```ts
// prisma.config.ts
import { defineConfig } from 'prisma/config'
import { neonAdapter } from '@prisma/adapter-neon'

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
    adapter: () => neonAdapter({ connectionString: process.env.DATABASE_URL! }),
  },
})
```

`schema.prisma` datasource block must have **no `url` field** — it causes P1012 build error on Vercel.

### Build Command (Vercel)
```json
"scripts": {
  "build": "prisma generate && next build",
  "postinstall": "prisma generate"
}
```

### Next.js 16 Breaking Change
`searchParams` in server page components is now a `Promise`. Must `await` it:
```ts
export default async function Page({ searchParams }: { searchParams: Promise<{ risk?: string }> }) {
  const { risk } = await searchParams
}
```

### Tailwind v4 Pattern
Two places must stay in sync:
1. `@theme { --color-pa-* }` — generates Tailwind utility classes (`bg-pa-black`, `text-pa-profit`, etc.)
2. `:root { --pa-* }` — raw CSS vars for components using `style={{ color: "var(--pa-text-1)" }}`

---

## Database Schema

```prisma
model User {
  id              String           @id @default(cuid())
  name            String?
  email           String?          @unique
  emailVerified   DateTime?
  image           String?
  createdAt       DateTime         @default(now())
  accounts        Account[]
  sessions        Session[]
  portfolios      Portfolio[]
  simulatedTrades SimulatedTrade[]
}

model Portfolio {
  id        String    @id @default(cuid())
  userId    String
  name      String    @default("My Portfolio")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  user      User      @relation(...)
  holdings  Holding[]
}

model Holding {
  id              String   @id @default(cuid())
  portfolioId     String
  name            String
  schemeCode      String?   // mfapi.in scheme code for live NAV
  isin            String?
  units           Float
  nav             Float
  currentValue    Float
  assetType       String    // one of AssetType enum values
  isPledgeable    Boolean   @default(false)
  haircut         Float     @default(0)
  pledgeableValue Float     @default(0)
  portfolio       Portfolio @relation(...)
}

model SimulatedTrade {
  id                  String   @id @default(cuid())
  userId              String
  portfolioId         String
  strategyName        String
  underlying          String   // "NIFTY" | "BANKNIFTY"
  expiryLabel         String
  expiryIsoDate       String   // "2026-06-26" — used for remaining DTE calc
  riskAppetite        String
  spotAtEntry         Float
  netPremium          Float
  maxProfit           Float
  maxLoss             Float
  marginRequired      Float
  breakevenUpper      Float
  breakevenLower      Float?
  probabilityOfProfit Float
  annualizedYield     Float
  legsJson            String   @db.Text  // JSON array of StrategyLeg[]
  status              String   @default("active")
  createdAt           DateTime @default(now())
  user                User     @relation(...)
}
```

---

## Design System

### Color Tokens (Apple-grey dark — NOT pure black)

```css
/* @theme in globals.css — generates Tailwind utilities */
--color-pa-black:     #131313;   /* base background — not pitch black */
--color-pa-surface-1: #1C1C1E;   /* Apple-style card surface */
--color-pa-surface-2: #252527;   /* elevated */
--color-pa-surface-3: #313133;   /* modals */
--color-pa-border-1:  #2C2C2E;   /* default border — visible */
--color-pa-border-2:  #3A3A3C;   /* hover */
--color-pa-border-3:  #4A4A4C;   /* active */
--color-pa-text-1:    #F5F5F7;   /* primary */
--color-pa-text-2:    #98989D;   /* secondary */
--color-pa-text-3:    #838387;   /* muted — was too dark at #515154, fixed */
--color-pa-text-4:    #5C5C60;   /* disabled — was invisible at #3A3A3C, fixed */
--color-pa-profit:    #34C759;   /* green — financial gain only */
--color-pa-loss:      #FF3B30;   /* red — financial loss only */
--color-pa-warning:   #FF9500;   /* orange — stale data, caution */
--color-pa-blue:      #0071E3;   /* blue CTA */
```

Both `@theme` and `:root { --pa-* }` must always have identical values.

### Fonts
`body` uses `Space Grotesk` → system-ui fallback. `font-feature-settings: "ss01", "cv01"` for ligatures.  
`.num` class applies `font-variant-numeric: tabular-nums` — used on all financial figures.

### Animations (defined in globals.css)
- `pa-slide-up` — cards, page transitions
- `pa-fade-in` — hero elements
- `pa-pulse` — loading states
- `scan-line` — portfolio unlock scanner effect
- `count-bounce` — number reveal
- `bounce-dot` — scroll indicator

---

## Pages

### `/` — The Vault Landing Page
**File:** `app/page.tsx` (server component)

- Fixed nav with blur backdrop
- Hero: Logo → headline → subline → CTA, staggered animations
- Stats strip: 3-col grid showing yield range / margin unlock / probability range
- Problem section: `<ProblemCounter>` client component — scroll-triggered `₹0` fade-in
- Solution: 3-step "01 / 02 / 03" layout
- Features: 3-card grid (Collateral / Engine / AI)
- Final CTA: 60vh section
- Compliance box + footer

### `/login`
**File:** `app/login/page.tsx`  
GitHub OAuth sign-in via Auth.js.

### `/dashboard`
**Files:** `app/dashboard/page.tsx` (server) + `app/dashboard/portfolio-section.tsx` (client)

Server fetches portfolio, passes props to `PortfolioSection`. Client handles the **unlock animation**:
- State 0: locked — blurred portfolio values, "Unlock My Margin" button
- State 1: unlocking — scan line sweeps across each holding with 150ms stagger, count-up animations on values
- State 2: unlocked — normal view, persisted in `sessionStorage('pa-unlocked')` to avoid replay

### `/dashboard/upload`
**File:** `app/dashboard/upload/page.tsx`

- Upload via CSV/Excel (CAMS / KFintech format)
- Manual entry
- **"Load Demo Portfolio"** — one-click populates 10 real MF schemes (Axis Bluechip, HDFC Mid-Cap, SBI Liquid, etc.) for quick demo without uploading a file

### `/dashboard/strategies`
**Files:** `app/dashboard/strategies/page.tsx` + `strategies-client.tsx` + `payoff-chart.tsx`

**Cinematic risk selection flow:**
1. Step 0: "What's your risk appetite?" full-screen prompt
2. Step 1: Three scenario cards animate in (pa-slide-up with stagger)
3. `showConfirm`: strategy cards appear with 500ms delay after selection
4. Clicking "Simulate This Scenario →" calls `simulateTrade()` server action

**Payoff chart:** Progressive draw animation — `visibleCount` increments by 3 every 16ms; reference lines (breakeven, spot) fade in after draw completes.

**Strategy filtering by risk:**
- Conservative: CSP (NIFTY), CSP (BANKNIFTY), Bull Put Spread
- Moderate: Iron Condor (NIFTY), Bull Put Spread, Bear Call Spread (BANKNIFTY), Iron Condor (BANKNIFTY)
- Aggressive: Iron Condors + Bear Call Spreads + Bull Put Spreads (both underlyings)

### `/dashboard/yield`
**Files:** `app/dashboard/yield/page.tsx` + `yield-client.tsx`

Sections:
1. **Hero** — "Your portfolio could generate +₹X/mo" with count-up animation; 3-col comparison (passive / with overlay / annual uplift)
2. **Breakdown** — animated bar chart comparing passive XIRR vs overlay yield vs combined
3. **Passive Estimate Basis** — per-holding return rates table showing live vs benchmark source
4. **Projection** — income formula breakdown (see Income Calculation below) + 6-month table
5. **Scenario Card** — strategy powering the analysis, max profit/loss, greeks, AI explanation
6. **Risk Switcher** — conservative / moderate / aggressive tabs trigger live recalculation
7. **Methodology** — full data source disclosure

### `/dashboard/trades`
**File:** `app/dashboard/trades/page.tsx`

- Client component, calls `getActiveTrades()` on mount
- Per-trade card: large P&L (green/red), entry vs current spot, theta today, margin, breakevens
- "Close Simulation" button via `useTransition`

---

## Core Library

### `lib/black-scholes.ts`
Fully analytic implementation. No approximations for premiums.

- `bsPrice(S, K, T, r, sigma, type)` — Black-Scholes option price
- `bsDelta(S, K, T, r, sigma, type)` — Delta (0 to ±1)
- `bsGamma(S, K, T, r, sigma)` — Gamma
- `bsTheta(S, K, T, r, sigma, type)` — Theta in index-points per calendar day per unit (always negative — option loses value with time)
- `bsVega(S, K, T, r, sigma)` — Vega per 1% change in sigma
- `normCdf(x)` — Abramowitz & Stegun approximation, max error < 7.5e-8

Risk-free rate `R = 0.065` (RBI repo rate).

### `lib/strategy-engine.ts`
Generates ranked strategy candidates given market data + margin available.

**Strike selection:** Binary search over ±20 strikes around ATM to find closest to target delta:
- CSP: target delta = -0.25 (short put ~25-delta)
- Bull Put Spread short leg: -0.30 delta
- Bear Call Spread short leg: +0.30 delta
- Iron Condor short legs: ±0.20 delta

**Margin rules:**
- CSP: `K × lotSize × 0.20` (SEBI pledge margin)
- Spreads / Condors: `maxLoss × 1.25`

**Annualised yield:** `(maxProfit / marginRequired) × (365 / dte)`

**Scoring (0-100):**
```
score = annYield×0.35 + POP×0.30 + (maxProfit/maxLoss)×0.20 + (1 - marginReq/marginAvail)×0.15
```

**Filters:** `premium > 0 && POP >= 50% && maxLoss <= 60% of available && marginReq <= 90% of available`

**Lot sizes:** NIFTY = 75, BANKNIFTY = 30 (NSE circular, verified June 2026)

### `lib/market-data.ts`
Fetches live market data from Yahoo Finance (unofficial API).

```
NIFTY:     https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI
BANKNIFTY: https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEBANK
```

- **Spot price:** `?interval=1d&range=1d` → `meta.regularMarketPrice` (~5-min delay)
- **Historical volatility:** `?interval=1d&range=1mo` → 30-day annualised HV from daily log-returns × √252
- **`isStale` flag:** Tracks HTTP fetch success/failure directly (old approach compared values to fallback — silently failed on first server startup)
- **`lastKnownGood` cache:** Module-level object persists across Next.js revalidation cycles, used as fallback when Yahoo is unavailable
- Returns `{ nifty, banknifty, niftyVol, bankniftyVol, isStale }`

### `lib/expiry.ts`
Calculates next NSE expiry dates.
- NIFTY: last Thursday of each month (monthly), or nearest Thursday (weekly)
- BANKNIFTY: last Wednesday of each month
- Returns `ExpiryInfo { label, dte, isoDate }` — use `.isoDate` not `.date`

### `lib/collateral-data.ts`
SEBI-approved haircut rates from NSE circular NSCCL/CMPT/59271:

| Asset Type | Haircut | Pledgeable |
|---|---|---|
| Large Cap MF | 10% | Yes |
| Mid Cap MF | 25% | Yes |
| Small Cap MF | 35% | Yes |
| Debt MF | 10% | Yes |
| Liquid MF | 5% | Yes |
| Large Cap ETF | 10% | Yes |
| Mid Cap ETF | 20% | Yes |
| Govt Bond | 5% | Yes |
| AAA Corp Bond | 10% | Yes |
| Nifty 50 Stock | 15% | Yes |
| Nifty 100 Stock | 20% | Yes |
| Other | 50% | No |

Benchmark XIRR values (AMFI 5-yr rolling averages) used when live NAV unavailable.

Keyword classifier `classifyAsset(name)` maps scheme name fragments → asset type. Priority order: liquid → gilt → debt → small cap → mid cap → ETF → large cap → other.

### `lib/fund-returns.ts`
Fetches actual 1-year NAV returns from **mfapi.in** (free, no auth required).

- URL: `https://api.mfapi.in/mf/{schemeCode}`
- Returns 12-month NAV history → compute simple return `(latest - 1yrAgo) / 1yrAgo`
- **24-hour module-level cache** using a `Map<string, {rate, ts}>` — avoids hammering the free API
- Falls back to category benchmark if scheme code not available or API fails
- `getEffectiveRate(fr, assetType)` adjusts raw return for debt funds (uses `returnRate * 0.85` to account for tax drag)

### `lib/portfolio-parser.ts`
Parses CAMS/KFintech CSV/XLSX exports.

- Extracts: scheme name, scheme code, units, latest NAV, current value
- Classifies asset type via `classifyAsset()`
- Applies haircut: `pledgeableValue = currentValue × (1 - haircut)`
- Sets `isPledgeable` from collateral rules
- Handles both CSV and Excel (`.xlsx`) via `xlsx` library

### `lib/ai-explainer.ts`
Calls Groq (Llama 3.3-70B) to explain each strategy in plain English.

Returns `AIExplanation { summary, analogy, riskWarning }`.

System prompt always includes:
> "Never recommend buying or selling any security. Never guarantee returns. Frame everything as educational scenarios and simulations only. Never calculate any numbers yourself."

Falls back to a system-generated explanation (no Groq call) if the API is unavailable.

### `lib/payoff.ts`
Generates payoff curve data for Recharts.

- Sweeps spot from `spot × 0.85` to `spot × 1.15`
- For each point: calculates `pnl = sum of (intrinsic - premium) × lotSize` per leg
- Used by `payoff-chart.tsx` for the progressive draw animation

---

## Server Actions

### `app/actions/portfolio.ts`
- `getPortfolio()` — fetches user's latest portfolio with all holdings
- `savePortfolio(holdings)` — upserts portfolio (replaces existing holdings)

### `app/actions/strategy.ts`
- `generateStrategies(riskAppetite)` — calls `getMarketData()` + `getExpiry()` + `generateCandidates()` + `explainStrategies()`; returns `ExplainedStrategy[]`

### `app/actions/yield.ts`
- `getYieldAnalysis(riskAppetite)` — full pipeline: portfolio → fund returns → market data → strategy → comparison

**Income Calculation (as of latest):**
```
cyclesPerYear = 365 / dte
evPerCycle    = maxProfit × POP − maxLoss × (1 − POP)   // expected value
annualEV      = evPerCycle × cyclesPerYear
monthlyEV     = annualEV / 12

combinedXIRR         = (totalValue × weightedXIRR + annualEV) / totalValue
combinedMonthlyReturn = projectedMonthlyReturn + monthlyEV
```

Both EV and best-case numbers exposed in `ComparisonData` for display.

**Passive XIRR:**
```
weightedXIRR = Σ(returnRate_i × value_i) / totalValue
projectedMonthlyReturn = (totalValue × weightedXIRR) / 12
```

### `app/actions/trade.ts`
- `simulateTrade(strategy, riskAppetite)` — saves trade to DB with full leg data
- `getActiveTrades()` — fetches user's active trades, calculates current MTM P&L
- `closeTrade(tradeId)` — marks trade as 'closed'
- `getTradeById(tradeId)` — single trade with P&L

**Mark-to-Market P&L (Black-Scholes, as of latest):**
```typescript
// Re-prices each leg at current spot + remaining DTE — correct MTM
function calcMTMPnL(legs, lotSize, currentSpot, currentVol, remainingDte) {
  T = max(0.5/365, remainingDte/365)
  for each leg:
    currentPrice = bsPrice(currentSpot, leg.strike, T, R, currentVol, leg.type)
    gain = leg.position === 'long'
      ? currentPrice - leg.premium    // bought: gain as price rises
      : leg.premium - currentPrice    // sold: gain as price decays
  return sum × lotSize
}
```

Old approach (removed): intrinsic-only `max(0, spot-K)` which gave expiry payoff at current spot — overstated gains because it ignored time value.

**Theta (actual BS, as of latest):**
```typescript
function calcThetaToday(legs, lotSize, currentSpot, currentVol, remainingDte) {
  // bsTheta returns negative (option loses value per day)
  // Short legs gain from decay, long legs lose
  for each leg:
    theta = bsTheta(currentSpot, leg.strike, T, R, currentVol, leg.type)
    sign = leg.position === 'short' ? -1 : 1
  return sum × lotSize
}
```

### `app/actions/nav.ts`
- `updateHoldingNAVs(portfolioId)` — refreshes NAV for all holdings from mfapi.in

---

## Environment Variables

```
# Required on Vercel
DATABASE_URL            # Neon PostgreSQL connection string
AUTH_SECRET             # Auth.js secret (random string)
NEXTAUTH_URL            # https://pledgealpha.vercel.app  ← critical for OAuth redirect
AUTH_URL                # same as NEXTAUTH_URL
AUTH_GITHUB_ID          # GitHub OAuth App client ID
AUTH_GITHUB_SECRET      # GitHub OAuth App client secret
GROQ_API_KEY            # Groq API key (free tier)
```

**GitHub OAuth App settings** (github.com/settings/developers):
- Homepage URL: `https://pledgealpha.vercel.app`
- Callback URL: `https://pledgealpha.vercel.app/api/auth/callback/github`

---

## Deployment History & Fixes

### Vercel Build Fix
Problem: `prisma generate` not running → Prisma client not found.  
Fix: Added `postinstall: "prisma generate"` and `build: "prisma generate && next build"`.

### Prisma 7 Schema Fix
Problem: `url = env("DATABASE_URL")` in `schema.prisma` → P1012 error on Vercel.  
Fix: Remove `url` from schema entirely. URL lives only in `prisma.config.ts`.

### GitHub OAuth Redirect Fix
Problem: `NEXTAUTH_URL` was set to a preview deploy URL → GitHub rejected `redirect_uri`.  
Fix: Updated `NEXTAUTH_URL` and `AUTH_URL` to `https://pledgealpha.vercel.app`. Also updated GitHub OAuth App callback URL manually.

### Stale Detection Fix
Problem: On first server startup, `savedAt === 0` blocked the stale check even when Yahoo failed.  
Fix: Track `ok` boolean from each fetch directly instead of comparing values to fallback.

### ExpiryInfo Field Name
`strategy.expiry.isoDate` — not `.date` (TypeScript will catch this).

---

## Component Inventory

| File | Type | Purpose |
|---|---|---|
| `app/page.tsx` | Server | Landing page (The Vault) |
| `app/login/page.tsx` | Server | GitHub OAuth sign-in |
| `app/dashboard/page.tsx` | Server | Dashboard shell, passes data to PortfolioSection |
| `app/dashboard/portfolio-section.tsx` | Client | Unlock animation, holding cards, count-up |
| `app/dashboard/upload/page.tsx` | Client | Portfolio upload + demo loader |
| `app/dashboard/strategies/page.tsx` | Server | Fetches initial data |
| `app/dashboard/strategies/strategies-client.tsx` | Client | Cinematic risk flow, strategy cards, simulate button |
| `app/dashboard/strategies/payoff-chart.tsx` | Client | Recharts payoff with draw animation |
| `app/dashboard/yield/page.tsx` | Server | Calls getYieldAnalysis, passes to YieldClient |
| `app/dashboard/yield/yield-client.tsx` | Client | Full yield dashboard with all sections |
| `app/dashboard/yield/loading.tsx` | — | Suspense skeleton |
| `app/dashboard/trades/page.tsx` | Client | Active simulated trades with BS MTM P&L |
| `app/components/page-transition.tsx` | Client | `usePathname()` keyed slide-up on route change |
| `app/components/problem-counter.tsx` | Client | IntersectionObserver-triggered ₹0 reveal |
| `components/logo.tsx` | Server | PledgeAlpha logo (size sm/md/lg) |

---

## Known Limitations / Future Work

1. **Yahoo Finance rate limits** — The unofficial API can get blocked on Vercel's shared IPs. When this happens, `isStale = true` and a warning banner appears. A proper NSE data API would be more reliable but requires a subscription.

2. **Historical vol, not implied vol** — The engine uses 30-day HV from Yahoo daily closes. Actual market IV (from option chains) could differ significantly, especially around events. Labeled as "HV" in the UI.

3. **No actual margin calculator** — Margin shown is indicative (SEBI pledge rules). Actual SPAN margin is set daily by brokers and varies. Always verify with your broker before trading.

4. **Lot size staleness** — NIFTY 75, BANKNIFTY 30 are hardcoded. NSE changes these periodically. Source: `lib/collateral-data.ts`, dated June 2026.

5. **Payoff chart is expiry payoff** — The chart in strategies page shows P&L at expiry (intrinsic). The Trades page shows true MTM. These are intentionally different: the chart is illustrative of the strategy structure, trades show live position value.

6. **EV assumes independent cycles** — The income projection assumes each trade cycle is independent and identically distributed. In practice, market regimes cluster (high-vol periods, trending markets), so consecutive cycles are correlated.

---

## File Tree

```
pledgealpha/
├── app/
│   ├── actions/
│   │   ├── nav.ts           # NAV refresh
│   │   ├── portfolio.ts     # Portfolio CRUD
│   │   ├── strategy.ts      # Strategy generation
│   │   ├── trade.ts         # Simulate/close trades, BS MTM P&L
│   │   └── yield.ts         # Full yield analysis pipeline
│   ├── components/
│   │   ├── page-transition.tsx
│   │   └── problem-counter.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── portfolio-section.tsx
│   │   ├── strategies/
│   │   │   ├── page.tsx
│   │   │   ├── payoff-chart.tsx
│   │   │   └── strategies-client.tsx
│   │   ├── trades/
│   │   │   └── page.tsx
│   │   ├── upload/
│   │   │   └── page.tsx
│   │   └── yield/
│   │       ├── loading.tsx
│   │       ├── page.tsx
│   │       └── yield-client.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── globals.css          # Design tokens (@theme + :root), animations
│   ├── layout.tsx
│   └── page.tsx             # Landing page
├── components/
│   ├── logo.tsx
│   └── ui/                  # shadcn components
├── lib/
│   ├── ai-explainer.ts      # Groq (Llama 3.3) explainer
│   ├── amfi.ts              # AMFI fund lookup
│   ├── auth.ts              # Auth.js config
│   ├── black-scholes.ts     # Analytic BS: price, delta, gamma, theta, vega
│   ├── collateral-data.ts   # SEBI haircuts, lot sizes, classifier, benchmarks
│   ├── db.ts                # Prisma client singleton
│   ├── expiry.ts            # NSE expiry date calculator
│   ├── fund-returns.ts      # mfapi.in 1-yr NAV returns, 24h cache
│   ├── market-data.ts       # Yahoo Finance spot + HV, stale detection
│   ├── payoff.ts            # Payoff curve data for charts
│   ├── portfolio-parser.ts  # CAMS/KFintech CSV/XLSX parser
│   ├── strategy-engine.ts   # CSP, Bull Put Spread, Bear Call Spread, Iron Condor
│   ├── strategy-types.ts    # TypeScript interfaces
│   └── utils.ts
├── prisma/
│   └── schema.prisma
├── prisma.config.ts         # Neon adapter + DB URL (Prisma 7 requirement)
├── package.json
├── planning.md              # This file
└── CLAUDE.md / AGENTS.md    # Agent instructions
```
