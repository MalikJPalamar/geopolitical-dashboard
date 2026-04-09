/**
 * src/data/baseline.js
 *
 * Snapshot values for April 9, 2026 (post-ceasefire).
 * Used as fallback when live API calls fail.
 * Update these weekly as the situation evolves.
 */

export const BASELINE = {
  // Crude oil (USD/barrel) — dropped ~13% on ceasefire news
  brent: 96.80,
  wti:   93.40,

  // Other commodities
  gold:    3095,    // USD/troy oz
  vix:     27.8,    // CBOE VIX

  // Shipping & gas
  bdi:     2710,    // Baltic Dry Index
  ttf:     56.40,   // TTF gas EUR/MWh

  // FX
  usdeur:  0.918,

  // Spain pump prices (EUR/liter) — lag wholesale by ~3 weeks
  spain_diesel:   1.89,
  spain_petrol95: 1.68,

  // Geopolitical status
  hormuz_open:   true,   // reopening per ceasefire terms
  war_risk_pct:  3.8,    // down from 6.8% war peak

  // % changes since Feb 27, 2026 (conflict start)
  brent_pct: 33,   // Brent crude — +33% at ceasefire day
  wti_pct:   35,   // WTI crude
  gold_pct:  10,   // Gold safe-haven bid
  vix_pct:   60,   // VIX spike (vs ~17 baseline)
  ita_pct:   19,   // iShares Aerospace & Defense
  xle_pct:   18,   // Energy Select Sector
  icln_pct:  11,   // iShares Global Clean Energy
  jets_pct: -18,   // US Global Jets (recovering)

  // Conflict metadata
  conflict_day: 40,
}

// ─────────────────────────────────────────────────────────
// Historical chart series — conflict arc Feb 27 → Apr 9
// Update by appending new data points as weeks pass.
// ─────────────────────────────────────────────────────────

export const OIL_HISTORY = [
  { d:'Feb 27', brent:73,  wti:69  },
  { d:'Mar 1',  brent:87,  wti:83  },
  { d:'Mar 5',  brent:99,  wti:95  },
  { d:'Mar 8',  brent:107, wti:103 },
  { d:'Mar 18', brent:111, wti:107 }, // peak — South Pars / Ras Laffan struck
  { d:'Apr 1',  brent:112, wti:108 },
  { d:'Apr 7',  brent:110, wti:106 },
  { d:'Apr 8',  brent:97,  wti:93  }, // ceasefire announced → -13%
  { d:'Apr 9',  brent:97,  wti:93  },
]

export const FUEL_HISTORY = [
  { d:'Feb 11', p95:1.46, diesel:1.48 },
  { d:'Feb 25', p95:1.46, diesel:1.48 },
  { d:'Mar 5',  p95:1.56, diesel:1.64 },
  { d:'Mar 9',  p95:1.60, diesel:1.79 },
  { d:'Mar 18', p95:1.68, diesel:1.89 },
  { d:'Mar 25', p95:1.72, diesel:1.93 }, // peak
  { d:'Apr 9',  p95:1.72, diesel:1.93 }, // still at peak — wholesale lag ~3 weeks
]

export const SHIPPING_HISTORY = [
  { d:'Feb 27', bdi:1820, wr:0.5 },
  { d:'Mar 3',  bdi:2180, wr:2.1 },
  { d:'Mar 8',  bdi:2540, wr:3.8 },
  { d:'Mar 18', bdi:3050, wr:6.8 }, // peak
  { d:'Apr 8',  bdi:2710, wr:3.8 }, // easing on ceasefire
]

export const STOCK_HISTORY = [
  { d:'Feb 27', def:100, energy:100, renew:100, air:100, ship:100 },
  { d:'Mar 8',  def:116, energy:128, renew:105, air:79,  ship:128 },
  { d:'Mar 18', def:123, energy:132, renew:109, air:71,  ship:142 }, // peak
  { d:'Apr 8',  def:119, energy:118, renew:113, air:82,  ship:131 }, // ceasefire reversal
]

export const HUMAN_HISTORY = [
  { d:'Mar 1',  k:95,   inj:980,   disp:120000 },
  { d:'Mar 10', k:890,  inj:11400, disp:580000 },
  { d:'Mar 18', k:1444, inj:18551, disp:700000 },
  { d:'Apr 8',  k:3400, inj:38000, disp:800000 }, // HRANA estimate at ceasefire
]

// ─────────────────────────────────────────────────────────
// Colour tokens — single source of truth used by all components
// ─────────────────────────────────────────────────────────
export const C = {
  bg:       '#03050c',
  surface:  '#070d1b',
  surfaceHi:'#0c1528',
  border:   '#142035',
  borderHi: '#1e3554',
  amber:    '#f59e0b',
  red:      '#fb3759',
  green:    '#00dba8',
  blue:     '#4db5ff',
  purple:   '#a78bfa',
  muted:    '#1e3050',
  textDim:  '#3d5570',
  text:     '#6b8ea8',
  bright:   '#adc8e0',
  white:    '#e2f0ff',
}
