# Geopolitical Intelligence Dashboard

Real-time market and conflict intelligence dashboard tracking the US-Iran war (Feb–Apr 2026) and its global economic cascade — energy markets, supply chains, AI infrastructure, sector winners/losers, humanitarian costs, and diplomatic developments.

**Current status: Day 40 — Ceasefire in effect since April 8, 2026. Islamabad talks underway.**

---

## What This Is

Built during the conflict as a live intelligence tool. Tracks:

- **Energy** — Brent, WTI, TTF gas, LNG, Hormuz status, Ras Laffan, South Pars
- **Markets** — Defense/Energy/Renewables/Airlines ETFs, VIX, Gold, FX
- **Supply chain** — Baltic Dry Index, VLCC tanker rates, war risk insurance, Hormuz transits
- **AI & data centers** — At-risk Gulf DC regions, AI warfare incidents, hyperscaler exposure
- **Business impact** — Negative sectors (aviation, haulage, food) vs structural winners (solar, defense, cybersecurity)
- **Human cost** — Casualty and displacement tracking across Iran, Lebanon, Iraq
- **Geopolitical** — Alliance map, ceasefire timeline, Islamabad talks
- **Live news feed** — Claude + web search, pulled on demand
- **AI digest** — Structured intelligence briefing generated from live market data

---

## Architecture

```
browser  (React 18 + Recharts + Vite)
    │
    └── /api/*  ──►  Express server  (Node 18, port 3001)
                          ├── Yahoo Finance      market data, no key
                          ├── Frankfurter.app    USD/EUR FX, no key
                          └── Anthropic API      news + digest, key required
```

**Why a backend server?**

| Problem | Cause | Fix |
|---------|-------|-----|
| Yahoo Finance CORS | Browser requests blocked | Proxy through Express |
| API key exposure | Can't put keys in browser | Server-side only |
| `web_search` tool | Not available in browser-side Claude calls | Server uses `@anthropic-ai/sdk` directly |

All external calls live in `server/index.js`. The React app never touches an external API.

---

## Quick Start

### Prerequisites

- Node.js 18+
- An Anthropic API key with `claude-sonnet-4-6` access

### Install

```bash
git clone https://github.com/MalikJPalamar/geopolitical-dashboard.git
cd geopolitical-dashboard
npm install
```

### Configure

```bash
cp .env.example .env
```

Edit `.env`:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3001
```

### Run

```bash
npm run dev
```

Starts:
- Express server → `http://localhost:3001`
- Vite dev server → `http://localhost:5173`

Vite proxies all `/api/*` requests to Express. Open `http://localhost:5173`.

---

## Project Structure

```
geopolitical-dashboard/
│
├── server/
│   └── index.js          # All external API calls live here
│                         # Yahoo Finance, Frankfurter FX, Anthropic
│
├── src/
│   ├── api/
│   │   └── client.js     # Frontend fetch — talks to /api/* only
│   │
│   ├── components/
│   │   └── ui.jsx        # Card, Badge, Dot, MiniArea, ProgBar, MarkdownView
│   │
│   ├── data/
│   │   └── baseline.js   # Fallback values, chart history, colour tokens
│   │                     # UPDATE THIS WEEKLY as situation evolves
│   │
│   ├── App.jsx           # Dashboard shell + all tab components
│   └── main.jsx          # React entry
│
├── index.html
├── vite.config.js
├── package.json
└── .env.example
```

---

## API Reference

### `GET /api/health`
Confirms server is running and API key is present.

```json
{ "ok": true, "model": "claude-sonnet-4-6", "ts": "2026-04-09T..." }
```

### `GET /api/market`
Fetches live prices from Yahoo Finance for: Brent (`BZ=F`), WTI (`CL=F`), Gold (`GC=F`), VIX (`^VIX`), ITA, XLE, ICLN, JETS. Calculates % change vs Feb 27, 2026 baseline (conflict start). Uses `Promise.allSettled` — partial failures return what succeeded.

```json
{
  "brent": 96.80,
  "wti": 93.40,
  "gold": 3095,
  "vix": 27.8,
  "ita": 183.40,
  "ita_pct": 19.2,
  "xle_pct": 18.1,
  "icln_pct": 11.0,
  "jets_pct": -18.3,
  "usdeur": 0.918,
  "_liveKeys": ["brent", "wti", "gold", "vix", "ita", "ita_pct", "usdeur"],
  "_errors": ["icln: No price returned"]
}
```

### `POST /api/news`
Calls `claude-sonnet-4-6` with `web_search` tool. Returns today's top 8 conflict/market headlines.

```json
{
  "items": [
    {
      "time": "08:42",
      "headline": "Islamabad talks resume as Iran presents nuclear framework",
      "source": "Reuters",
      "category": "DIPLOMATIC",
      "severity": "HIGH"
    }
  ]
}
```

### `POST /api/digest`
Generates a structured markdown intelligence briefing using live market data + web search.

**Request body:**
```json
{ "marketData": { "brent": 96.80, "vix": 27.8, ... } }
```

**Response:**
```json
{ "digest": "## Ceasefire Status\n..." }
```

---

## Data Sources

| Field | Source | Refresh | Key |
|-------|--------|---------|-----|
| Brent, WTI, Gold, VIX | Yahoo Finance | Real-time | None |
| ITA, XLE, ICLN, JETS ETFs | Yahoo Finance | Real-time | None |
| USD/EUR | Frankfurter.app | Daily | None |
| News headlines | Claude + web search | On demand | Anthropic |
| AI digest | Claude + web search | On demand | Anthropic |
| Spain fuel prices | Manual — EU Commission Oil Bulletin | Weekly | None |
| Baltic Dry Index | Manual — update `baseline.js` | Weekly | None |
| Hormuz status | Manual — hardcoded in `baseline.js` | As needed | None |

---

## Agent Handoff — Open TODOs

These are scoped and ready to implement. Prioritised by impact:

### High priority

**Auto-refresh market data**
Add a `useEffect` with `setInterval` in `App.jsx` calling `refreshMarkets()` every 5 minutes during NYSE hours (14:30–21:00 UTC). Skip weekends.

```js
useEffect(() => {
  const id = setInterval(() => {
    const h = new Date().getUTCHours()
    const day = new Date().getUTCDay()
    if (day > 0 && day < 6 && h >= 14 && h < 21) refreshMarkets()
  }, 5 * 60 * 1000)
  return () => clearInterval(id)
}, [])
```

**Baltic Dry Index via FRED API**
FRED (Federal Reserve) publishes BDI with a free key. Add to `server/index.js`:

```js
// GET /api/bdi
app.get('/api/bdi', async (req, res) => {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=BALDIY&api_key=${process.env.FRED_API_KEY}&sort_order=desc&limit=1&file_type=json`
  const r = await axios.get(url)
  res.json({ bdi: parseFloat(r.data.observations[0].value) })
})
```

Add `FRED_API_KEY=` to `.env.example`. Register free at https://fred.stlouisfed.org/docs/api/api_key.html

**Spain fuel prices — weekly EU Commission CSV**
EU publishes weekly Oil Bulletin as CSV. Add a cron or route:

```js
// GET /api/fuel/spain
// Fetch and parse: https://energy.ec.europa.eu/document/download/.../oil_bulletin_prices_history.csv
```

Parse for Spain rows, return latest diesel and petrol 95 averages.

### Medium priority

**Historical snapshot persistence**
Currently chart history is hardcoded in `baseline.js`. Add SQLite via `better-sqlite3` to append daily closes:

```js
// server/db.js — store { date, brent, wti, gold, spain_diesel, bdi } daily
// Expose via GET /api/history
// Frontend fetches and replaces OIL_HISTORY, FUEL_HISTORY etc. dynamically
```

**Hormuz status detection**
Currently hardcoded `true`. Options:
- Parse Dryad Global or Lloyd's of London news for "Hormuz" + "closed/restricted"
- Add a manual admin toggle: `POST /api/admin/hormuz { open: true/false }`

**War risk insurance premium**
Not on Yahoo. Sources:
- Baltic Exchange (paid)
- Dryad Global daily maritime risk brief (free tier)
- Fallback: use war risk as a derived metric from BDI deviation from 12-month average

**Scenario modeller tab**
Three conflict scenarios (ceasefire holds / collapses / Islamabad deal) with impact sliders per domain. Each scenario adjusts all market metrics by a % multiplier. Good for business planning.

### Low priority / Nice to have

- **Dark/light theme toggle**
- **Export to PDF** — use `html2canvas` + `jsPDF` on the Overview tab
- **Telegram/Slack webhook** — POST digest to a channel on each refresh
- **UNHCR displacement API** — replace hardcoded human cost figures with live UNHCR data

---

## Context for the Coding Agent

This dashboard was built in real-time during the conflict, updated daily. The data in `baseline.js` reflects April 9, 2026 — the day after the ceasefire was signed. Key context:

- **Feb 27, 2026** — conflict start baseline for all % calculations
- **Mar 18** — peak escalation (South Pars + Ras Laffan struck, oil at $111)
- **Apr 7** — Trump ultimatum deadline, Pakistan-brokered deal announced
- **Apr 8** — ceasefire effective, Hormuz begins reopening, oil -13% in one session
- **Apr 10** — Islamabad talks begin (US, Iran, Pakistan)
- **Spain pump prices** still at war peak (€1.89/L diesel) — lag wholesale by ~3 weeks

The `_liveKeys` and `_errors` fields on market data responses are the canonical way to know which values came from live Yahoo Finance vs fallback baseline. The UI renders a green `●` dot for live fields and grey `○` for baseline.

---

## Why the Browser/Artifact Version Failed

For documentation purposes: an earlier version tried to run all API calls from a claude.ai React artifact. Three things blocked it:

1. **Yahoo Finance CORS** — the endpoint rejects browser `fetch` calls without a server proxy
2. **API key in browser** — Anthropic keys can't safely live in client-side code
3. **`web_search` tool unavailable** — the tool only works when Anthropic's own infrastructure calls the API, not when an artifact calls it programmatically. Every call returned an empty `content` array, causing JSON extraction to fail with "Invalid response format"

This repo is the correct architecture — all external calls server-side.

---

## License

MIT — build on it, adapt it, use it for your own conflict/market tracking.
