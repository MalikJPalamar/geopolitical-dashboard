/**
 * src/App.jsx — Iran War Intelligence Dashboard
 *
 * Architecture:
 * - All API calls go through Express server (server/index.js)
 * - Yahoo Finance data fetched server-side (no CORS issues)
 * - Claude API calls server-side (API key never in browser)
 * - React frontend only talks to /api/* endpoints
 */

import React, { useState, useCallback } from 'react'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import { fetchMarketData, fetchNews, fetchDigest } from './api/client.js'
import { BASELINE as B, OIL_HISTORY, FUEL_HISTORY, SHIPPING_HISTORY, STOCK_HISTORY, HUMAN_HISTORY, C } from './data/baseline.js'
import { Card, Lbl, Badge, Dot, Skel, MiniArea, ProgBar, MarkdownView } from './components/ui.jsx'

// ─── helpers ────────────────────────────────────────────────
const val  = (live, key) => live?.[key]             ?? B[key]
const isLv = (live, key) => !!(live?._liveKeys?.includes(key))
// Format a signed percent: +19%, -5%, 0%
const pctStr = (n) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return `${v > 0 ? '+' : ''}${v}%`
}

// ─── OVERVIEW TAB ───────────────────────────────────────────
function OverviewTab({ live, loading }) {
  return (
    <div>
      <div style={{ background: C.green + '10', border: `1px solid ${C.green}30`, borderRadius: 3, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ color: C.green, fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.15em' }}>◉ CEASEFIRE IN EFFECT</span>
        <span style={{ color: C.bright, fontSize: 10, fontFamily: 'monospace' }}>2-week truce signed Apr 8 · Hormuz reopening · Islamabad talks Apr 10 · Lebanon still active</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Conflict Day',   v: `DAY ${val(live,'conflict_day')}`,      sub: 'Ceasefire since Apr 8',        col: C.amber },
          { label: 'Brent Crude',    v: loading ? null : `$${val(live,'brent')}`, sub: `${pctStr(val(live,'brent_pct'))} vs Feb 27`, col: C.green, k: 'brent' },
          { label: 'Spain Diesel',   v: loading ? null : `€${val(live,'spain_diesel')}/L`, sub: 'Pump lags 3 weeks', col: C.amber, k: 'spain_diesel' },
          { label: 'Hormuz',         v: val(live,'hormuz_open') ? 'REOPENING' : 'CLOSED', sub: 'Ceasefire condition', col: val(live,'hormuz_open') ? C.green : C.red },
          { label: 'Total Killed',   v: '3,400+',                               sub: 'HRANA est. at ceasefire',      col: C.red   },
          { label: 'Displaced',      v: '800K+',                                sub: 'Lebanon + Iran combined',      col: C.red   },
          { label: 'VIX Fear Index', v: loading ? null : `${val(live,'vix')}`,  sub: '▼ Easing on ceasefire',        col: C.amber, k: 'vix'         },
          { label: 'Defense ETF',    v: loading ? null : pctStr(val(live,'ita_pct')), sub: 'Pulling back on peace',  col: C.blue,  k: 'ita_pct'     },
        ].map((m, i) => (
          <Card key={i} style={{ padding: '12px 14px' }}>
            <Lbl>{m.label}</Lbl>
            {m.v === null ? <Skel h={26} /> : (
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: m.col, fontFamily: 'monospace' }}>{m.v}</span>
                {m.k && <Dot live={isLv(live, m.k)} />}
              </div>
            )}
            <div style={{ fontSize: 10, color: C.text, marginTop: 5, fontFamily: 'monospace' }}>{m.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <Lbl>Brent Crude — Conflict Arc + Ceasefire Drop Apr 8</Lbl>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.green, fontFamily: 'monospace' }}>
            {loading ? <Skel w={130} h={28} /> : <>${val(live,'brent')} <span style={{ fontSize: 12, color: C.green }}>▼ ceasefire</span></>}
          </div>
          <div style={{ marginTop: 10 }}><MiniArea data={OIL_HISTORY} dataKey="brent" color={C.amber} height={90} /></div>
        </Card>
        <Card>
          <Lbl>Spain Pump Prices €/L — Still at Peak (Wholesale Lag)</Lbl>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.amber, fontFamily: 'monospace' }}>
            {loading ? <Skel w={150} h={28} /> : <>€{val(live,'spain_diesel')} <span style={{ fontSize: 12, color: C.text }}>easing in ~3 weeks</span></>}
          </div>
          <div style={{ marginTop: 10 }}>
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={FUEL_HISTORY} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <Line type="monotone" dataKey="diesel" stroke={C.amber} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p95"    stroke={C.blue}  strokeWidth={2} dot={false} />
                <XAxis dataKey="d" tick={{ fill: C.textDim, fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: C.surfaceHi, border: `1px solid ${C.borderHi}`, fontSize: 10, fontFamily: 'monospace' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── MARKETS TAB ────────────────────────────────────────────
function MarketsTab({ live, loading }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
        {[
          { label: 'VIX Fear Index',    v: loading ? null : `${val(live,'vix')}`,          k: 'vix',      col: C.amber, delta: '▼ Easing on ceasefire'   },
          { label: 'Gold Spot',         v: loading ? null : `$${val(live,'gold')}`,         k: 'gold',     col: C.amber, delta: 'Safe haven easing'        },
          { label: 'USD/EUR',           v: loading ? null : `${val(live,'usdeur')}`,       k: 'usdeur',   col: C.amber, delta: 'Normalising'               },
          { label: 'S&P 500',           v: '+2.1%',                                         k: null,       col: C.green, delta: 'Ceasefire rally'           },
          { label: 'Defense ETF (ITA)', v: loading ? null : pctStr(val(live,'ita_pct')),  k: 'ita_pct',  col: C.blue,  delta: 'Pulling back on peace'     },
          { label: 'Energy ETF (XLE)',  v: loading ? null : pctStr(val(live,'xle_pct')),  k: 'xle_pct',  col: C.amber, delta: 'Down from +32% war peak'   },
          { label: 'Renewables (ICLN)', v: loading ? null : pctStr(val(live,'icln_pct')), k: 'icln_pct', col: C.green, delta: 'Structural gains holding'  },
          { label: 'Airlines (JETS)',   v: loading ? null : pctStr(val(live,'jets_pct')), k: 'jets_pct', col: C.amber, delta: 'Recovering on ceasefire'   },
        ].map((m, i) => (
          <Card key={i} style={{ padding: '12px 14px' }}>
            <Lbl>{m.label}</Lbl>
            {m.v === null ? <Skel h={26} /> : (
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: m.col, fontFamily: 'monospace' }}>{m.v}</span>
                {m.k && <Dot live={isLv(live, m.k)} />}
              </div>
            )}
            <div style={{ fontSize: 10, color: C.text, fontFamily: 'monospace', marginTop: 5 }}>{m.delta}</div>
          </Card>
        ))}
      </div>

      <Card>
        <Lbl>Sector Performance (Feb 27 = 100) — Ceasefire reversal visible Apr 8</Lbl>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={STOCK_HISTORY} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="d" tick={{ fill: C.textDim, fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.textDim, fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} domain={[60, 150]} />
            <Tooltip contentStyle={{ background: C.surfaceHi, border: `1px solid ${C.borderHi}`, fontSize: 10, fontFamily: 'monospace' }} />
            <Line type="monotone" dataKey="def"    stroke={C.blue}   strokeWidth={2} dot={false} name="Defense"    />
            <Line type="monotone" dataKey="energy" stroke={C.amber}  strokeWidth={2} dot={false} name="Energy"     />
            <Line type="monotone" dataKey="renew"  stroke={C.green}  strokeWidth={2} dot={false} name="Renewables" />
            <Line type="monotone" dataKey="air"    stroke={C.red}    strokeWidth={2} dot={false} name="Airlines"   />
            <Line type="monotone" dataKey="ship"   stroke={C.purple} strokeWidth={2} dot={false} name="Shipping"   />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
          {[['Defense', C.blue], ['Energy', C.amber], ['Renewables', C.green], ['Airlines', C.red], ['Shipping', C.purple]].map(([n, c]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 16, height: 2, background: c }} />
              <span style={{ fontSize: 9, color: C.text, fontFamily: 'monospace' }}>{n}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── NEWS TAB ───────────────────────────────────────────────
const SEV_COL = { CRITICAL: C.red, HIGH: C.amber, MEDIUM: C.blue, LOW: C.text }
const CAT_COL = { MILITARY: C.red, ENERGY: C.amber, DIPLOMATIC: C.green, MARKETS: C.blue, HUMANITARIAN: C.purple, CYBER: '#06b6d4' }

function NewsTab({ news, onRefresh, loading, error }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: C.bright, fontFamily: 'monospace', fontWeight: 700 }}>Live Intelligence Feed</div>
          <div style={{ fontSize: 10, color: C.textDim, fontFamily: 'monospace', marginTop: 3 }}>Claude + web search · routed via local server · ~15s</div>
        </div>
        <button onClick={onRefresh} disabled={loading} style={{ padding: '9px 18px', background: loading ? C.muted : C.blue, color: loading ? C.text : '#000', border: 'none', borderRadius: 2, fontFamily: 'monospace', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'SCANNING...' : '⟳ REFRESH FEED'}
        </button>
      </div>

      {error && <div style={{ color: C.red, fontFamily: 'monospace', fontSize: 10, marginBottom: 12, padding: '8px 12px', background: C.red + '10', borderRadius: 2 }}>⚠ {error}</div>}

      {loading && (
        <Card style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: C.amber, fontFamily: 'monospace', letterSpacing: '0.2em', animation: 'pulse 1.5s infinite' }}>SCANNING SOURCES...</div>
        </Card>
      )}

      {!loading && !error && news.length === 0 && (
        <Card style={{ padding: 56, textAlign: 'center' }}>
          <div style={{ fontSize: 32, color: C.muted, marginBottom: 12 }}>⟳</div>
          <div style={{ fontSize: 11, color: C.textDim, fontFamily: 'monospace' }}>Press REFRESH FEED to pull live headlines</div>
        </Card>
      )}

      {!loading && news.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {news.map((item, i) => (
            <Card key={i} style={{ padding: '12px 16px', borderLeft: `3px solid ${SEV_COL[item.severity] || C.text}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: C.white, fontFamily: 'monospace', lineHeight: 1.5, marginBottom: 5 }}>{item.headline}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {item.time   && <span style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace' }}>{item.time} UTC</span>}
                    {item.source && <span style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace' }}>· {item.source}</span>}
                    {item.category && <Badge label={item.category} color={CAT_COL[item.category] || C.text} />}
                  </div>
                </div>
                {item.severity && <Badge label={item.severity} color={SEV_COL[item.severity] || C.text} />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── DIGEST TAB ─────────────────────────────────────────────
function DigestTab({ live }) {
  const [digest, setDigest] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const d = live ? { ...B, ...live } : B

  const generate = async () => {
    setLoading(true); setDigest(''); setErr('')
    try { setDigest(await fetchDigest(d)) }
    catch (e) { setErr(e.message) }
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: C.bright, fontFamily: 'monospace', fontWeight: 700 }}>◆ AI Intelligence Digest</div>
          <div style={{ fontSize: 10, color: C.textDim, fontFamily: 'monospace', marginTop: 3 }}>
            {live ? '● Using live market data' : '○ Using Apr 9 baseline — press ⟳ REFRESH ALL first'}
          </div>
        </div>
        <button onClick={generate} disabled={loading} style={{ padding: '10px 22px', background: loading ? C.muted : C.amber, color: loading ? C.text : '#000', border: 'none', borderRadius: 2, fontFamily: 'monospace', fontWeight: 700, fontSize: 11, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'GENERATING...' : '◆ GENERATE DIGEST'}
        </button>
      </div>

      <Card style={{ minHeight: 320 }}>
        {!digest && !loading && !err && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 36, color: C.muted }}>◆</div>
            <div style={{ fontSize: 11, color: C.textDim, fontFamily: 'monospace' }}>Generate a real-time ceasefire intelligence briefing</div>
          </div>
        )}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, color: C.amber, fontFamily: 'monospace', letterSpacing: '0.2em', animation: 'pulse 1.5s infinite' }}>GENERATING...</div>
          </div>
        )}
        {err && <div style={{ color: C.red, fontFamily: 'monospace', fontSize: 11, padding: 16 }}>Error: {err}</div>}
        {digest && <MarkdownView text={digest} />}
      </Card>
    </div>
  )
}

// ─── SUPPLY CHAIN TAB ───────────────────────────────────────
function SupplyChainTab({ live, loading }) {
  const bdi      = val(live, 'bdi')
  const wr       = val(live, 'war_risk_pct')
  const hormuz   = val(live, 'hormuz_open')
  const ttf      = val(live, 'ttf')

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Baltic Dry Index',      v: loading ? null : bdi.toLocaleString(),    col: C.amber,  sub: '+49% vs pre-conflict',          k: 'bdi'          },
          { label: 'War Risk Insurance',    v: loading ? null : `${wr}%`,                col: C.red,    sub: 'Down from 6.8% peak',            k: 'war_risk_pct' },
          { label: 'TTF Gas (EUR/MWh)',     v: loading ? null : `€${ttf}`,              col: C.amber,  sub: '+38% since Feb 27',              k: 'ttf'          },
          { label: 'Hormuz Status',         v: hormuz ? 'REOPENING' : 'CLOSED',          col: hormuz ? C.green : C.red, sub: hormuz ? 'Ceasefire condition' : 'Blockaded', k: 'hormuz_open' },
          { label: 'VLCC Tanker Rates',     v: '+62%',    col: C.amber,  sub: 'vs Feb 27 — easing from peak'  },
          { label: 'Hormuz Transits/Day',   v: hormuz ? '~17' : '0',  col: hormuz ? C.green : C.red, sub: 'Pre-war: ~21 vessels/day'  },
          { label: 'Ras Laffan LNG',        v: 'PARTIAL', col: C.amber,  sub: 'Qatar output at ~70% capacity'  },
          { label: 'South Pars Gas Field',  v: 'IMPAIRED',col: C.red,    sub: 'Struck Mar 18 · partially restored'},
        ].map((m, i) => (
          <Card key={i} style={{ padding: '12px 14px' }}>
            <Lbl>{m.label}</Lbl>
            {m.v === null ? <Skel h={26} /> : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: m.col, fontFamily: 'monospace' }}>{m.v}</span>
                {m.k && <Dot live={isLv(live, m.k)} />}
              </div>
            )}
            <div style={{ fontSize: 10, color: C.text, marginTop: 5, fontFamily: 'monospace' }}>{m.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <Lbl>Baltic Dry Index — Conflict Arc</Lbl>
          <div style={{ fontSize: 11, color: C.textDim, fontFamily: 'monospace', marginBottom: 8 }}>Global dry bulk shipping demand proxy</div>
          <MiniArea data={SHIPPING_HISTORY} dataKey="bdi" color={C.amber} height={110} />
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            {[['Pre-conflict', '1,820', C.textDim], ['Peak (Mar 18)', '3,050', C.red], ['Now', bdi.toLocaleString(), C.amber]].map(([l,v,c]) => (
              <div key={l}>
                <div style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace' }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c, fontFamily: 'monospace' }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <Lbl>War Risk Insurance Premium %</Lbl>
          <div style={{ fontSize: 11, color: C.textDim, fontFamily: 'monospace', marginBottom: 8 }}>Hull & cargo surcharge for Hormuz/Gulf transits</div>
          <MiniArea data={SHIPPING_HISTORY} dataKey="wr" color={C.red} height={110} />
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            {[['Pre-conflict', '0.5%', C.textDim], ['Peak (Mar 18)', '6.8%', C.red], ['Now', `${wr}%`, C.amber]].map(([l,v,c]) => (
              <div key={l}>
                <div style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace' }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c, fontFamily: 'monospace' }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── AI & DATA CENTERS TAB ──────────────────────────────────
function AIDataCentersTab() {
  const regions = [
    { name: 'UAE (Dubai / Abu Dhabi)', risk: 82, status: 'HIGH RISK', col: C.red,    detail: 'Microsoft, G42, Nvidia cluster — within missile range; partial evacuations' },
    { name: 'Saudi Arabia (Riyadh)',   risk: 61, status: 'ELEVATED',  col: C.amber,  detail: 'AWS Riyadh, Aramco DC — air-defence active, no direct strikes' },
    { name: 'Qatar (Doha)',            risk: 55, status: 'ELEVATED',  col: C.amber,  detail: 'Ooredoo / Microsoft — Ras Laffan power disruption risk' },
    { name: 'Bahrain (AWS me-south-1)',risk: 48, status: 'MODERATE',  col: C.amber,  detail: 'Redundant routing active; US 5th Fleet presence provides deterrence' },
    { name: 'Israel (Tel Aviv)',        risk: 38, status: 'MODERATE',  col: C.blue,   detail: 'AWS & Google nodes; Iron Dome operational, cyber incidents elevated' },
    { name: 'Jordan (Aqaba)',           risk: 22, status: 'LOW',       col: C.green,  detail: 'Edge nodes only; out of primary conflict zone' },
  ]

  const incidents = [
    { date: 'Mar 4',  type: 'CYBER',    desc: 'Iran-linked actors breach Israeli IDF logistics portal; data exfiltrated' },
    { date: 'Mar 9',  type: 'PHYSICAL', desc: 'Ballistic missile damages power grid 12km from AWS Bahrain zone' },
    { date: 'Mar 12', type: 'CYBER',    desc: 'DDoS against UAE banking infra; attributed to Hezbollah cyber unit' },
    { date: 'Mar 18', type: 'PHYSICAL', desc: 'South Pars strike disrupts power; Qatar DCs switch to diesel backup' },
    { date: 'Mar 25', type: 'CYBER',    desc: 'Attempted intrusion into Saudi Aramco SCADA — blocked by Claroty sensors' },
    { date: 'Apr 2',  type: 'CYBER',    desc: 'Israeli AI firm Mobileye suffers breach; autonomous vehicle data targeted' },
    { date: 'Apr 8',  type: 'PHYSICAL', desc: 'Ceasefire — evacuation orders lifted for UAE; DCs return to normal ops' },
  ]

  const hyperscalers = [
    { name: 'Microsoft Azure', exposure: 'HIGH',   detail: 'UAE (G42 partnership), Qatar, Israel nodes — partial workload migration to EU' },
    { name: 'AWS',             exposure: 'HIGH',   detail: 'me-south-1 (Bahrain), Saudi — maintained ops with degraded latency' },
    { name: 'Google Cloud',    exposure: 'MEDIUM', detail: 'Tel Aviv, Saudi — traffic rerouted via europe-west during peak' },
    { name: 'Oracle',          exposure: 'MEDIUM', detail: 'Abu Dhabi sovereign cloud — UAE government customer at risk' },
    { name: 'Nvidia',          exposure: 'HIGH',   detail: 'H100 cluster (G42/UAE) — export licence review triggered by conflict' },
  ]

  const expCol = { HIGH: C.red, MEDIUM: C.amber, LOW: C.green }
  const incCol = { CYBER: C.purple, PHYSICAL: C.red }

  return (
    <div>
      <div style={{ background: C.purple + '10', border: `1px solid ${C.purple}30`, borderRadius: 3, padding: '10px 16px', marginBottom: 14, fontFamily: 'monospace', fontSize: 10, color: C.bright }}>
        ◈ Gulf AI infrastructure at acute risk — 6 hyperscaler regions within 800km of conflict zone · 7 documented incidents since Feb 27
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Card>
          <Lbl>At-Risk DC Regions — Threat Level</Lbl>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {regions.map(r => (
              <div key={r.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: C.bright, fontFamily: 'monospace' }}>{r.name}</span>
                  <Badge label={r.status} color={r.col} />
                </div>
                <ProgBar pct={r.risk} color={r.col} />
                <div style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace', marginTop: 3 }}>{r.detail}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Lbl>Hyperscaler Exposure</Lbl>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {hyperscalers.map(h => (
              <div key={h.name} style={{ padding: '8px 10px', background: C.surfaceHi, borderRadius: 2, borderLeft: `2px solid ${expCol[h.exposure] || C.text}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: C.white, fontFamily: 'monospace', fontWeight: 700 }}>{h.name}</span>
                  <Badge label={h.exposure} color={expCol[h.exposure]} />
                </div>
                <div style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace' }}>{h.detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <Lbl>AI Warfare & Cyber Incidents — Chronological Log</Lbl>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {incidents.map((inc, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: i < incidents.length - 1 ? `1px solid ${C.border}` : 'none', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace', minWidth: 40, paddingTop: 2 }}>{inc.date}</span>
              <Badge label={inc.type} color={incCol[inc.type] || C.text} />
              <span style={{ fontSize: 10, color: C.bright, fontFamily: 'monospace', flex: 1, lineHeight: 1.5 }}>{inc.desc}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── BUSINESS IMPACT TAB ────────────────────────────────────
function BusinessImpactTab({ live, loading }) {
  const losers = [
    { sector: 'Commercial Aviation',  impact: -24, detail: 'Gulf airspace closures add 2–4h to Asia-Europe routes; fuel surcharges +35%' },
    { sector: 'Road Haulage (EU)',     impact: -18, detail: 'Diesel €1.89/L; long-haul operators squeezed; some routes suspended' },
    { sector: 'Food & Agri (importers)',impact: -16, detail: 'Fertiliser (gas-linked) +38%; Middle East wheat import costs surge' },
    { sector: 'Tourism (Gulf)',        impact: -41, detail: 'Dubai hotel occupancy -41% YoY; cruise cancellations through Hormuz' },
    { sector: 'Petrochemical Buyers', impact: -22, detail: 'Naphtha, LPG supply disrupted; EU plastic feedstock shortages' },
    { sector: 'Container Shipping',   impact: -14, detail: 'Rerouting via Cape of Good Hope adds 12 days; capacity crunch' },
  ]

  const winners = [
    { sector: 'Defence & Aerospace',   impact: +19, detail: 'ITA ETF +19%; Raytheon, Lockheed, Thales order books surge' },
    { sector: 'Energy Producers',      impact: +18, detail: 'XLE +18%; North Sea, US shale, Norwegian majors benefit from $97 Brent' },
    { sector: 'Solar & Renewables',    impact: +11, detail: 'ICLN +11%; EU fast-tracks energy independence agenda' },
    { sector: 'Cybersecurity',         impact: +28, detail: 'CrowdStrike, Palo Alto revenue uplift; government contracts surge' },
    { sector: 'Gold & Safe Havens',    impact: +10, detail: 'Gold +10%; CHF, JPY appreciate; capital flight from EM' },
    { sector: 'LNG Exporters (US/AUS)',impact: +32, detail: 'Spot LNG $56/MWh; Cheniere, Woodside record revenues' },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Est. Global Trade Loss', v: '$420B',  sub: 'Cumulative 40-day impact', col: C.red   },
          { label: 'EU GDP Impact',          v: '-0.8%',  sub: 'IMF flash estimate',       col: C.red   },
          { label: 'Sectors in Distress',    v: '6',      sub: 'vs 6 structural winners',  col: C.amber },
          { label: 'Defense Contracts',      v: '+$180B', sub: 'New orders since Feb 27',  col: C.green },
          { label: 'Renewables Capex',       v: '+22%',   sub: 'EU accelerated spend',     col: C.green },
          { label: 'LNG Spot Price',         v: `€${val(live,'ttf')}/MWh`, sub: '+38% vs pre-conflict', col: C.amber },
        ].map((m, i) => (
          <Card key={i} style={{ padding: '12px 14px' }}>
            <Lbl>{m.label}</Lbl>
            <span style={{ fontSize: 22, fontWeight: 700, color: m.col, fontFamily: 'monospace' }}>{m.v}</span>
            <div style={{ fontSize: 10, color: C.text, marginTop: 5, fontFamily: 'monospace' }}>{m.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <Lbl style={{ color: C.red }}>▼ Structural Losers — Sector Impact vs Feb 27</Lbl>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            {losers.map(s => (
              <div key={s.sector}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: C.bright, fontFamily: 'monospace' }}>{s.sector}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.red, fontFamily: 'monospace' }}>{s.impact}%</span>
                </div>
                <ProgBar pct={Math.abs(s.impact)} color={C.red} />
                <div style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace', marginTop: 3 }}>{s.detail}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Lbl style={{ color: C.green }}>▲ Structural Winners — Sector Impact vs Feb 27</Lbl>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            {winners.map(s => (
              <div key={s.sector}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: C.bright, fontFamily: 'monospace' }}>{s.sector}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.green, fontFamily: 'monospace' }}>+{s.impact}%</span>
                </div>
                <ProgBar pct={s.impact} color={C.green} />
                <div style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace', marginTop: 3 }}>{s.detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── HUMAN COST TAB ─────────────────────────────────────────
function HumanCostTab() {
  const countries = [
    { name: 'Iran',    killed: '3,400+', injured: '38,000+', displaced: '750,000+', source: 'HRANA / UN OCHA', col: C.red    },
    { name: 'Lebanon', killed: '1,500+', injured: '12,000+', displaced: '620,000+', source: 'LCRP / UNDP',     col: C.amber  },
    { name: 'Iraq',    killed: '340+',   injured: '2,100+',  displaced: '85,000+',  source: 'IOM Iraq',        col: C.blue   },
    { name: 'Syria',   killed: '120+',   injured: '480+',    displaced: '95,000+',  source: 'SNHR',            col: C.text   },
  ]

  const timeline = [
    { date: 'Feb 27', event: 'Conflict begins — US strikes IRGC command nodes in western Iran' },
    { date: 'Mar 1',  event: 'Hezbollah opens northern Israel front; 950K Lebanese civilians displaced in week 1' },
    { date: 'Mar 4',  event: 'Iran retaliates — Haifa port struck; 42 Israeli civilians killed' },
    { date: 'Mar 10', event: 'Humanitarian corridor proposed — rejected by Iran pending US withdrawal demand' },
    { date: 'Mar 18', event: 'Peak escalation — South Pars strike; 1,444 killed to date (HRANA estimate)' },
    { date: 'Mar 25', event: 'UNRWA reports 580,000 displaced in Lebanon; Jordan border overwhelmed' },
    { date: 'Apr 1',  event: 'US agrees to partial ceasefire talks via Pakistan; fighting continues' },
    { date: 'Apr 7',  event: 'Trump ultimatum expires — Pakistan brokered deal framework agreed' },
    { date: 'Apr 8',  event: 'Ceasefire effective 06:00 UTC — 3,400 killed (HRANA), 800K+ displaced total' },
    { date: 'Apr 10', event: 'Islamabad talks begin — US, Iran, Pakistan · 2-week ceasefire framework' },
  ]

  return (
    <div>
      <div style={{ background: C.red + '08', border: `1px solid ${C.red}25`, borderRadius: 3, padding: '10px 16px', marginBottom: 14, fontFamily: 'monospace', fontSize: 10, color: C.bright }}>
        ⚠ All casualty figures are estimates from independent monitors. Iranian government figures are lower. HRANA is Iran's human rights news agency.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Total Killed (est.)',    v: '5,360+',   col: C.red,    sub: 'All parties, Apr 10 est.'   },
          { label: 'Total Injured (est.)',   v: '52,000+',  col: C.red,    sub: 'Incl. indirect casualties'  },
          { label: 'Total Displaced',        v: '1.55M+',   col: C.amber,  sub: 'IDP + cross-border refugees' },
          { label: 'Conflict Duration',      v: '40 days',  col: C.text,   sub: 'Feb 27 → Apr 8 ceasefire'   },
        ].map((m, i) => (
          <Card key={i} style={{ padding: '12px 14px' }}>
            <Lbl>{m.label}</Lbl>
            <span style={{ fontSize: 22, fontWeight: 700, color: m.col, fontFamily: 'monospace' }}>{m.v}</span>
            <div style={{ fontSize: 10, color: C.text, marginTop: 5, fontFamily: 'monospace' }}>{m.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Card>
          <Lbl>Casualties by Country</Lbl>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
            {countries.map(c => (
              <div key={c.name} style={{ padding: '10px 12px', background: C.surfaceHi, borderRadius: 2, borderLeft: `3px solid ${c.col}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.white, fontFamily: 'monospace' }}>{c.name}</span>
                  <span style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace' }}>{c.source}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[['Killed', c.killed, C.red], ['Injured', c.injured, C.amber], ['Displaced', c.displaced, C.blue]].map(([l,v,col]) => (
                    <div key={l}>
                      <div style={{ fontSize: 8, color: C.textDim, fontFamily: 'monospace' }}>{l}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: col, fontFamily: 'monospace' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Lbl>Casualties Over Time — HRANA Estimates</Lbl>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={HUMAN_HISTORY} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradK" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.red} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" tick={{ fill: C.textDim, fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDim, fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: C.surfaceHi, border: `1px solid ${C.borderHi}`, fontSize: 10, fontFamily: 'monospace' }} formatter={(v, n) => [v.toLocaleString(), n === 'k' ? 'Killed' : n === 'inj' ? 'Injured' : 'Displaced']} />
              <Area type="monotone" dataKey="k" stroke={C.red} fill="url(#gradK)" strokeWidth={2} name="k" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <Lbl>Conflict Timeline — Key Humanitarian Events</Lbl>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 8 }}>
          {timeline.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: i < timeline.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ fontSize: 9, color: C.amber, fontFamily: 'monospace', minWidth: 42, paddingTop: 2, fontWeight: 700 }}>{t.date}</span>
              <span style={{ fontSize: 10, color: C.bright, fontFamily: 'monospace', lineHeight: 1.5 }}>{t.event}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── GEOPOLITICAL TAB ───────────────────────────────────────
function GeopoliticalTab() {
  const alliances = [
    { actor: 'United States',      side: 'US-LED',   role: 'Primary belligerent — air & naval strikes on IRGC; 5th Fleet + B-2 missions', col: C.blue   },
    { actor: 'Israel',             side: 'US-LED',   role: 'Ground + air operations Lebanon front; Iron Dome; intel sharing with US',     col: C.blue   },
    { actor: 'UK',                 side: 'US-LED',   role: 'Diplomatic support; HMS Queen Elizabeth in Arabian Sea; no direct strikes',   col: C.blue   },
    { actor: 'Saudi Arabia',       side: 'NEUTRAL',  role: 'Refused basing rights; quiet intel cooperation with US; oil output steady',   col: C.amber  },
    { actor: 'UAE',                side: 'NEUTRAL',  role: 'Airspace closed to combat ops; G42 AI assets at risk; evacuations ordered',   col: C.amber  },
    { actor: 'Iran',               side: 'IRAN-LED', role: 'Primary target; IRGC + regular army; Hormuz blockade; proxy activation',     col: C.red    },
    { actor: 'Hezbollah',          side: 'IRAN-LED', role: 'Lebanon front; 150+ rocket salvos/day at peak; ceasefire holding tenuously', col: C.red    },
    { actor: 'Iraq (Shia militia)','side': 'IRAN-LED', role: 'Kataib Hezbollah strikes US bases; Iraq govt formally neutral',              col: C.red    },
    { actor: 'Russia',             side: 'NEUTRAL',  role: 'Veto UN resolutions; arms supply to Iran continues; no military involvement', col: C.textDim},
    { actor: 'China',              side: 'NEUTRAL',  role: 'Calls for restraint; continues Iran oil purchases; no military role',        col: C.textDim},
    { actor: 'Pakistan',           side: 'MEDIATOR', role: 'Key broker — Islamabad talks host; trusted by both Tehran and Washington',   col: C.green  },
    { actor: 'Turkey',             side: 'MEDIATOR', role: 'Humanitarian corridor offers; Erdogan shuttle diplomacy',                    col: C.green  },
  ]

  const sideCol  = { 'US-LED': C.blue, 'IRAN-LED': C.red, 'NEUTRAL': C.textDim, 'MEDIATOR': C.green }
  const diplo = [
    { date: 'Mar 10', event: 'UN Security Council ceasefire resolution — vetoed by US & Russia simultaneously' },
    { date: 'Mar 22', event: 'Pakistan PM flies to Tehran — first high-level contact; framework proposed' },
    { date: 'Mar 28', event: 'Qatar mediation attempt stalls — Hormuz reopening precondition rejected' },
    { date: 'Apr 1',  event: 'Back-channel via Oman — US offers sanctions partial rollback; Iran demands full exit' },
    { date: 'Apr 5',  event: 'Pakistan presents bridging proposal — phased ceasefire + nuclear talks framework' },
    { date: 'Apr 7',  event: 'Trump 48hr ultimatum expires — Pakistan deal accepted hours before deadline' },
    { date: 'Apr 8',  event: '✓ Ceasefire effective 06:00 UTC — 2-week renewable truce signed in Islamabad' },
    { date: 'Apr 10', event: '✓ Islamabad talks begin — US (Rubio), Iran (Araghchi), Pakistan (Dar) delegations' },
  ]

  return (
    <div>
      <div style={{ background: C.blue + '10', border: `1px solid ${C.blue}30`, borderRadius: 3, padding: '10px 16px', marginBottom: 14, fontFamily: 'monospace', fontSize: 10, color: C.bright }}>
        ◈ Islamabad talks Day 1 underway · 2-week ceasefire renewable · Nuclear framework on table · Lebanon front tenuous
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Ceasefire Status',    v: 'ACTIVE',          col: C.green,  sub: 'Since Apr 8, 06:00 UTC'     },
          { label: 'Islamabad Talks',     v: 'DAY 1',           col: C.blue,   sub: 'US · Iran · Pakistan'        },
          { label: 'Ceasefire Duration',  v: '14 DAYS',         col: C.amber,  sub: 'Renewable · expires Apr 22'  },
          { label: 'Lebanon Front',       v: 'FRAGILE',         col: C.amber,  sub: 'Hezbollah not bound by deal'  },
        ].map((m, i) => (
          <Card key={i} style={{ padding: '12px 14px' }}>
            <Lbl>{m.label}</Lbl>
            <span style={{ fontSize: 20, fontWeight: 700, color: m.col, fontFamily: 'monospace' }}>{m.v}</span>
            <div style={{ fontSize: 10, color: C.text, marginTop: 5, fontFamily: 'monospace' }}>{m.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Card>
          <Lbl>Alliance Map</Lbl>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {['US-LED', 'IRAN-LED', 'MEDIATOR', 'NEUTRAL'].map(side => (
              <div key={side}>
                <div style={{ fontSize: 9, color: sideCol[side], fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, marginTop: 6 }}>{side}</div>
                {alliances.filter(a => a.side === side).map(a => (
                  <div key={a.actor} style={{ padding: '7px 10px', background: C.surfaceHi, borderRadius: 2, marginBottom: 4, borderLeft: `2px solid ${sideCol[side]}` }}>
                    <div style={{ fontSize: 11, color: C.white, fontFamily: 'monospace', fontWeight: 700, marginBottom: 2 }}>{a.actor}</div>
                    <div style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace', lineHeight: 1.4 }}>{a.role}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Lbl>Diplomatic Timeline</Lbl>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
            {diplo.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < diplo.length - 1 ? `1px solid ${C.border}` : 'none', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 9, color: C.amber, fontFamily: 'monospace', minWidth: 42, fontWeight: 700, paddingTop: 2 }}>{d.date}</span>
                <span style={{ fontSize: 10, color: d.event.startsWith('✓') ? C.green : C.bright, fontFamily: 'monospace', lineHeight: 1.5 }}>{d.event}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── MAIN APP SHELL ─────────────────────────────────────────
const TABS = [
  { id: 'overview',     label: 'OVERVIEW'      },
  { id: 'markets',      label: 'MARKETS'       },
  { id: 'supply',       label: 'SUPPLY CHAIN'  },
  { id: 'ai',           label: 'AI & DATA CTR' },
  { id: 'business',     label: 'BIZ IMPACT'    },
  { id: 'human',        label: 'HUMAN COST'    },
  { id: 'geopolitical', label: 'GEOPOLITICAL'  },
  { id: 'news',         label: '⟳ NEWS'        },
  { id: 'digest',       label: '◆ DIGEST'      },
]

export default function App() {
  const [tab,      setTab]      = useState('overview')
  const [live,     setLive]     = useState(null)
  const [news,     setNews]     = useState([])
  const [loadMkt,  setLoadMkt]  = useState(false)
  const [loadNews, setLoadNews] = useState(false)
  const [mktErr,   setMktErr]   = useState('')
  const [newsErr,  setNewsErr]  = useState('')
  const [updatedAt,setUpdated]  = useState(null)

  const liveCount = live?._liveKeys?.length ?? 0
  const errors    = live?._errors ?? []

  const refreshMarkets = useCallback(async () => {
    setLoadMkt(true); setMktErr('')
    try {
      const data = await fetchMarketData()
      setLive(data)
      setUpdated(new Date())
      if (data._errors?.length) setMktErr(`Partial: ${data._errors.join(' | ')}`)
    } catch (e) { setMktErr(e.message) }
    setLoadMkt(false)
  }, [])

  const refreshNews = useCallback(async () => {
    setLoadNews(true); setNewsErr('')
    try { setNews(await fetchNews()) }
    catch (e) { setNewsErr(e.message) }
    setLoadNews(false)
  }, [])

  const refreshAll = () => { refreshMarkets(); refreshNews() }

  const content = {
    overview:     <OverviewTab        live={live} loading={loadMkt} />,
    markets:      <MarketsTab         live={live} loading={loadMkt} />,
    supply:       <SupplyChainTab     live={live} loading={loadMkt} />,
    ai:           <AIDataCentersTab   />,
    business:     <BusinessImpactTab  live={live} loading={loadMkt} />,
    human:        <HumanCostTab       />,
    geopolitical: <GeopoliticalTab    />,
    news:         <NewsTab            news={news} onRefresh={refreshNews} loading={loadNews} error={newsErr} />,
    digest:       <DigestTab          live={live} />,
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: #1e3050; border-radius: 2px; }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        button:not(:disabled):hover { filter: brightness(1.15); }
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '11px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.white, letterSpacing: '0.25em', fontFamily: 'monospace' }}>IRAN WAR INTEL</span>
          <span style={{ fontSize: 10, padding: '2px 8px', background: C.green + '20', border: `1px solid ${C.green}40`, color: C.green, borderRadius: 2, fontFamily: 'monospace', fontWeight: 700 }}>DAY 40 · CEASEFIRE</span>
          <span style={{ fontSize: 9, color: C.textDim, fontFamily: 'monospace' }}>
            {updatedAt ? `${liveCount} fields live · ${updatedAt.toLocaleTimeString()}` : 'APR 9 BASELINE · press ⟳ for live data'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 18, fontSize: 11, fontFamily: 'monospace' }}>
            <span>BRENT <span style={{ color: loadMkt ? C.textDim : C.green }}>{loadMkt ? '···' : `$${val(live,'brent')}`}</span></span>
            <span>DIESEL <span style={{ color: C.amber }}>{loadMkt ? '···' : `€${val(live,'spain_diesel')}`}</span></span>
            <span>HORMUZ <span style={{ color: val(live,'hormuz_open') ? C.green : C.red }}>{val(live,'hormuz_open') ? 'REOPENING' : 'CLOSED'}</span></span>
            <span>VIX <span style={{ color: C.amber }}>{loadMkt ? '···' : val(live,'vix')}</span></span>
          </div>
          <button onClick={refreshAll} disabled={loadMkt || loadNews} style={{ padding: '7px 16px', background: 'none', border: `1px solid ${(loadMkt||loadNews) ? C.muted : C.green}`, color: (loadMkt||loadNews) ? C.textDim : C.green, borderRadius: 2, fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', cursor: (loadMkt||loadNews) ? 'not-allowed' : 'pointer' }}>
            {(loadMkt || loadNews) ? 'REFRESHING...' : '⟳ REFRESH ALL'}
          </button>
        </div>
      </div>

      {mktErr && (
        <div style={{ background: C.amber + '10', borderBottom: `1px solid ${C.amber}25`, padding: '7px 24px', fontSize: 10, color: C.amber, fontFamily: 'monospace' }}>
          ⚠ {mktErr}
        </div>
      )}

      {/* TABS */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '0 24px', display: 'flex', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '10px 14px', background: 'none', border: 'none', borderBottom: tab === t.id ? `2px solid ${C.amber}` : '2px solid transparent', color: tab === t.id ? C.amber : C.textDim, fontFamily: 'monospace', fontSize: 10, fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
        {content[tab]}
      </div>
    </div>
  )
}
