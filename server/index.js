/**
 * server/index.js
 *
 * Express backend that:
 * 1. Proxies Yahoo Finance requests (avoids CORS in browser)
 * 2. Wraps Claude API calls (keeps API key server-side, never exposed to browser)
 * 3. Serves structured market data to the React frontend
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'
import axios from 'axios'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// ── Anthropic client (server-side only) ────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-sonnet-4-6'

app.use(cors())
app.use(express.json())

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /api/market
// Fetches live market data from Yahoo Finance (server-side, no CORS issue)
// Returns merged object with all fields, each tagged live:true/false
// ─────────────────────────────────────────────────────────────

// Feb 27, 2026 12:00 UTC = conflict start baseline
const FEB27_UNIX = Math.floor(new Date('2026-02-27T12:00:00Z').getTime() / 1000)

async function fetchYahooSymbol(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo`
  const res = await axios.get(url, {
    timeout: 8000,
    headers: { 'User-Agent': 'Mozilla/5.0' }, // Yahoo requires a UA
  })
  const result = res.data?.chart?.result?.[0]
  if (!result) throw new Error(`No result for ${symbol}`)

  const current = result.meta?.regularMarketPrice
  if (!current) throw new Error(`No price for ${symbol}`)

  // Find closest close price to Feb 27
  const timestamps = result.timestamp || []
  const closes = result.indicators?.quote?.[0]?.close || []
  let baseline = null
  let minDiff = Infinity
  timestamps.forEach((t, i) => {
    const diff = Math.abs(t - FEB27_UNIX)
    if (diff < minDiff && closes[i] != null) {
      minDiff = diff
      baseline = closes[i]
    }
  })

  // Reject if more than 4 trading days away
  const pct = baseline && minDiff < 4 * 86400
    ? +((current - baseline) / baseline * 100).toFixed(1)
    : null

  return { current: +current.toFixed(2), pct }
}

app.get('/api/market', async (req, res) => {
  const symbols = {
    brent: 'BZ=F',
    wti:   'CL=F',
    gold:  'GC=F',
    vix:   '^VIX',
    ita:   'ITA',
    xle:   'XLE',
    icln:  'ICLN',
    jets:  'JETS',
  }

  // Fetch USD/EUR from Frankfurter (CORS-friendly, no key)
  const fxPromise = axios.get('https://api.frankfurter.app/latest?from=USD&to=EUR', { timeout: 5000 })
    .then(r => r.data?.rates?.EUR ? +r.data.rates.EUR.toFixed(4) : null)
    .catch(() => null)

  const [fxResult, ...symbolResults] = await Promise.allSettled([
    fxPromise,
    ...Object.entries(symbols).map(([key, sym]) =>
      fetchYahooSymbol(sym).then(r => ({ key, ...r }))
    ),
  ])

  const data = { _liveKeys: [], _errors: [] }

  if (fxResult.status === 'fulfilled' && fxResult.value) {
    data.usdeur = fxResult.value
    data._liveKeys.push('usdeur')
  }

  symbolResults.forEach((r, i) => {
    const key = Object.keys(symbols)[i]
    if (r.status === 'fulfilled') {
      const { current, pct } = r.value
      data[key] = current
      data._liveKeys.push(key)
      if (pct !== null) {
        data[`${key}_pct`] = pct
        data._liveKeys.push(`${key}_pct`)
      }
    } else {
      data._errors.push(`${key}: ${r.reason?.message || 'failed'}`)
    }
  })

  res.json(data)
})

// ─────────────────────────────────────────────────────────────
// ROUTE: POST /api/news
// Calls Claude with web_search to fetch today's top conflict headlines
// ─────────────────────────────────────────────────────────────
app.post('/api/news', async (req, res) => {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: 'Respond with ONLY a JSON array. Start with [ and end with ]. No markdown, no explanation.',
      messages: [{
        role: 'user',
        content: `Search for the 8 most significant developments today (${today}) across:
- US-Iran ceasefire status and Islamabad talks
- Strait of Hormuz shipping
- Energy prices and markets
- Lebanon conflict
- Diplomatic developments

Return ONLY this JSON array:
[{"time":"HH:MM","headline":"factual headline under 85 chars","source":"outlet name","category":"MILITARY|ENERGY|DIPLOMATIC|MARKETS|HUMANITARIAN","severity":"CRITICAL|HIGH|MEDIUM|LOW"}]`,
      }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    })

    const textBlock = response.content.filter(b => b.type === 'text').pop()
    if (!textBlock) throw new Error('No text in Claude response')

    const raw = textBlock.text.replace(/```[a-z]*\s*/gi, '').replace(/```/g, '').trim()
    const start = raw.indexOf('[')
    const end   = raw.lastIndexOf(']')
    if (start === -1 || end === -1) throw new Error(`No array found. Got: ${raw.slice(0, 100)}`)

    const items = JSON.parse(raw.slice(start, end + 1))
    res.json({ items })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────────────────────────
// ROUTE: POST /api/digest
// Generates an AI intelligence digest using live market data + web search
// Body: { marketData: { brent, wti, vix, ... } }
// ─────────────────────────────────────────────────────────────
app.post('/api/digest', async (req, res) => {
  const d = req.body?.marketData || {}

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: 'Senior geopolitical and financial intelligence analyst. Write structured markdown briefings. Direct and analytical — no filler.',
      messages: [{
        role: 'user',
        content: `Intelligence digest — US-Iran ceasefire, ${new Date().toLocaleDateString()}.

CURRENT DATA:
- Brent: $${d.brent ?? 96.80}/bbl | WTI: $${d.wti ?? 93.40}/bbl
- Hormuz: ${d.hormuz_open ?? true ? 'REOPENING (ceasefire)' : 'CLOSED'}
- VIX: ${d.vix ?? 27.8} | Gold: $${d.gold ?? 3095}
- Defense ETF: +${d.ita_pct ?? 19}% | Energy ETF: +${d.xle_pct ?? 18}% | Airlines: ${d.jets_pct ?? -18}%
- Iran killed: ~3,400 (HRANA) | Lebanon: 1,500+
- Islamabad talks underway

Write using these ## headers:
## Ceasefire Status
## Energy & Markets
## Business Impact
## Key Risks — Next 14 Days`,
      }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    })

    const textBlock = response.content.filter(b => b.type === 'text').pop()
    if (!textBlock) throw new Error('No text in Claude response')

    res.json({ digest: textBlock.text })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, model: MODEL, ts: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`\n🛢  Iran War Intel server running on http://localhost:${PORT}`)
  console.log(`   Model: ${MODEL}`)
  console.log(`   Anthropic key: ${process.env.ANTHROPIC_API_KEY ? '✓ found' : '✗ MISSING — set ANTHROPIC_API_KEY in .env'}\n`)
})
