/**
 * src/api/client.js
 *
 * All data fetching for the React frontend.
 * Every call goes to the local Express server (/api/*) — never directly to
 * external APIs — so no CORS issues and no API keys in the browser.
 */

const BASE = '/api'

/**
 * Fetch live market data from Yahoo Finance (via server proxy).
 * Returns an object with _liveKeys (array of field names that came back live)
 * and _errors (array of per-symbol failures). Failing symbols fall back to
 * BASELINE values in the UI — the call itself never throws.
 */
export async function fetchMarketData() {
  const res = await fetch(`${BASE}/market`)
  if (!res.ok) throw new Error(`Market API ${res.status}: ${await res.text()}`)
  return res.json()
}

/**
 * Fetch today's top conflict headlines via Claude + web search.
 * Returns array of { time, headline, source, category, severity }
 */
export async function fetchNews() {
  const res = await fetch(`${BASE}/news`, { method: 'POST' })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `News API ${res.status}`)
  return data.items
}

/**
 * Generate an AI intelligence digest using current market data.
 * @param {object} marketData - merged live+baseline values
 * @returns {string} markdown digest text
 */
export async function fetchDigest(marketData) {
  const res = await fetch(`${BASE}/digest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ marketData }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `Digest API ${res.status}`)
  return data.digest
}

/**
 * Simple health check — confirms server is up and API key is present.
 */
export async function healthCheck() {
  const res = await fetch(`${BASE}/health`)
  return res.json()
}
