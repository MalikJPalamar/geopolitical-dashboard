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
          { label: 'Brent Crude',    v: loading ? null : `$${val(live,'brent')}`, sub: '▼ -13% on ceasefire',          col: C.green, k: 'brent'       },
          { label: 'Spain Diesel',   v: loading ? null : `€${val(live,'spain_diesel')}/L`, sub: 'Pump lags 3 weeks', col: C.amber, k: 'spain_diesel' },
          { label: 'Hormuz',         v: val(live,'hormuz_open') ? 'REOPENING' : 'CLOSED', sub: 'Ceasefire condition', col: val(live,'hormuz_open') ? C.green : C.red },
          { label: 'Total Killed',   v: '3,400+',                               sub: 'HRANA est. at ceasefire',      col: C.red   },
          { label: 'Displaced',      v: '800K+',                                sub: 'Lebanon + Iran combined',      col: C.red   },
          { label: 'VIX Fear Index', v: loading ? null : `${val(live,'vix')}`,  sub: '▼ Easing on ceasefire',        col: C.amber, k: 'vix'         },
          { label: 'Defense ETF',    v: loading ? null : `+${val(live,'ita_pct')}%`, sub: 'Pulling back on peace',   col: C.blue,  k: 'ita_pct'     },
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
          { label: 'USD/EUR',           v: loading ? null : `${val(live,"usdeur')}`,        k: 'usdeur',   col: C.amber, delta: 'Normalising'               },
          { label: 'S&P 500',           v: '+2.1%',                                         k: null,       col: C.green, delta: 'Ceasefire rally'           },
          { label: 'Defense ETF (ITA)', v: loading ? null : `+${val(live,'ita_pct')}%`,    k: 'ita_pct',  col: C.blue,  delta: 'Pulling back on peace'     },
          { label: 'Energy ETF (XLE)',  v: loading ? null : `+${val(live,'xle_pct')}%`,    k: 'xle_pct',  col: C.amber, delta: 'Down from +32% war peak'   },
          { label: 'Renewables (ICLN)', v: loading ? null : `+${val(live,'icln_pct')}%`,   k: 'icln_pct', col: C.green, delta: 'Structural gains holding'  },
          { label: 'Airlines (JETS)',   v: loading ? null : `${val(live,'jets_pct')}%`,     k: 'jets_pct', col: C.amber, delta: 'Recovering on ceasefire'   },
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

// ─── MAIN APP SHELL ─────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'OVERVIEW'  },
  { id: 'markets',  label: 'MARKETS'   },
  { id: 'news',     label: '⟳ NEWS'    },
  { id: 'digest',   label: '◆ DIGEST'  },
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
    overview: <OverviewTab live={live} loading={loadMkt} />,
    markets:  <MarketsTab  live={live} loading={loadMkt} />,
    news:     <NewsTab     news={news} onRefresh={refreshNews} loading={loadNews} error={newsErr} />,
    digest:   <DigestTab   live={live} />,
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
