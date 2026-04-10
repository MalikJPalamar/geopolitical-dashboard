/**
 * server/index.js
 * Express backend: Yahoo Finance proxy, Frankfurter FX, Claude news/digest,
 * FRED Baltic Dry Index (GET /api/bdi)
 */

import express  from 'express'
import cors     from 'cors'
import dotenv   from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'
import axios    from 'axios'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 3001
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

app.use(cors())
app.use(express.json())

// Feb 27, 2026 12:00 UTC = conflict-start baseline
const FEB27_UNIX = Math.floor(new Date('2026-02-27T12:00:00Z').getTime() / 1000)

async function fetchYahooSymbol(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo`
  const res = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } })
  const result = res.data?.chart?.result?.[0]
  if (!result) throw new Error(`No result for ${symbol}`)
  const current = result.meta?.regularMarketPrice
  if (!current) throw new Error(`No price for ${symbol}`)
  const timestamps = result.timestamp || []
  const closes    = result.indicators?.quote?.[0]?.close || []
  let baseline = null, minDiff = Infinity
  timestamps.forEach((t, i) => {
    const diff = Math.abs(t - FEB27_UNIX)
    if (diff < minDiff && closes[i] != null) { minDiff = diff; baseline = closes[i] }
  })
  const pct = baseline && minDiff < 4 * 86400
    ? +((current - baseline) / baseline * 100).toFixed(1)
    : null
  return { current: +current.toFixed(2), pct }
}

// ── GET /api/market ────────────────────────────────────────────────────────────
app.get('/api/market', async (req, res) => {
  const symbols = { brent:'BZ=F', wti:'CL=F', gold:'GC=F', vix:'^VIX', ita:'ITA', xle:'XLE', icln:'ICLN', jets:'JETS2' }
  const fxPromise = axios.get('https://api.frankfurter.app/latest?from=USD&to=EUR', { timeout: 5000 })
    .then(r => r.data?.rates?.EUR ? +r.data.rates.EUR.toFixed(4) : null)
    .catch(() => null)
  const [fxResult, ...symbolResults] = await Promise.allSettled([
    fxPromise,
    ...Object.entries(symbols).map(([key, sym]) => fetchYahooSymbol(sym).then(r => ({ key, ...r }))),
  ])
  const data = { _liveKeys: [], _errors: [] }
  if (fxResult.status === 'fulfilled' && fxResult.value) { data.usdeur = fxResult.value; data._liveKeys.push('usdeur') }
  symbolResults.forEach((r, i) => {
    const key = Object.keys(symbols)[i]
    if (r.status === 'fulfilled') {
      const { current, pct } = r.value
      data[key] = current; data._liveKeys.push(key)
      if (pct !== null) { data[`${key}_pct`] = pct; data._liveKeys.push(`${key}_pct`) }
    } else {
      data._errors.push(`${key}: ${r.reason?.message || 'failed'}`)
    }
  })
  res.json(data)
})

// ── GET /api/bdi ───────────────────────────────────────────────────────────────
// Fetches Baltic Dry Index from FRED (series BALDIY, annual average).
// Requires FRED_API_KEY in .env — free at https://fred.stlouisfed.org
// Falls back gracefully to baseline value if key is missing or API fails.
app.get('/api/bdi', async (req, res) => {
  const fredKey = process.env.FRED_API_KEY
  if (!fredKey) {
    return res.status(503).json({
      bdi: 2710, source: 'baseline_fallback',
      hint: 'Add FRED_API_KEY to .env — register free at https://fred.stlouisfed.org/docs/api/api_key.html'
    })
  }
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=BALDIY&api_key=${fredKey}&sort_order=desc&limit=5&file_type=json`
    const r   = await axios.get(url, { timeout: 8000 })
    const obs = r.data?.observations || []
    const latest = obs.find(o => o.value !== '.')
    if (!latest) throw new Error('No valid BALDIY observations')
    res.json({ bdi: parseFloat(latest.value), date: latest.date, source: 'FRED BALDIY', note: 'Annual average — use as trend, not spot' })
  } catch (e) {
    res.json({ bdi: 2710, date: null, source: 'baseline_fallback', error: e.message })
  }
})

// ── POST /api/news ────────────────────────────────────────────────────────────
app.post('/api/news', async (req, res) => {
  const today = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
  try {
    const response = await anthropic.messages.create({
      model: MODEL, max_tokens: 1000,
      system: 'Respond with ONLY a JSON array. Start with [ and end with ]. No markdown, no explanation.',
      messages: [{ role:'user', content: `Search for the 8 most significant developments today (${today}) across:
- US-Iran ceasefire status and Islamabad talks
- Strait of Hormuz shipping
- Energy prices and markets
- Lebanon conflict
- Diplomatic developments

Return ONLY this JSON array:
[{"time":"HH:MM","headline":"factual headline under 85 chars","source":"outlet name","category":"MILITARY|ENERGY|DIPLOMATIC|MARKETS|HUMANITARIAN","severity":"CRITICAL|HIGH|MEDIUM|LOW"}]` }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    })
    const textBlock = response.content.filter(b => b.type === 'text').pop()
    if (!textBlock) throw new Error('No text in Claude response')
    const raw   = textBlock.text.replace(/```[a-z]*\s*/gi, '').replace(/```/g, '').trim()
    const start = raw.indexOf('['), end = raw.lastIndexOf(']')
    if (start === -1 || end === -1) throw new Error(`No array found. Got: ${raw.slice(0,100)}`)
    res.json({ items: JSON.parse(raw.slice(start, end + 1)) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST /api/digest ──────────────────────────────────────────────────────────
app.post('/api/digest', async (req, res) => {
  const d = req.body?.marketData || {}
  try {
    const response = await anthropic.messages.create({
      model: MODEL, max_tokens: 1000,
      system: 'Senior geopolitical and financial intelligence analyst. Write structured markdown briefings. Direct and analytical — no filler.',
      messages: [{ role:'user', content: `Intelligence digest — US-Iran ceasefire, ${new Date().toLocaleDateString()}.

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
## Key Risks — Next 14 Days` }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    })
    const textBlock = response.content.filter(b => b.type === 'text').pop()
    if (!textBlock) throw new Error('No text in Claude response')
    res.json({ digest: textBlock.text })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/health', (req, res) => res.json({ ok: true, model: MODEL, ts: new Date().toISOString() }))

app.listen(PORT, () => {
  console.log(`\n🛢  Iran War Intel server → http://localhost:${PORT}`)
  console.log(`   Model: ${MODEL}`)
  console.log(`   Anthropic key: ${process.env.ANTHROPIC_API_KEY ? '✓ found' : '✗ MISSING'}`)
  console.log(`   FRED key: ${process.env.FRED_API_KEY ? '✓ found' : '○ not set (BDI fallback active)'}\n`)
})
