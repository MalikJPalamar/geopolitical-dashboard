/**
 * src/components/ui.jsx
 * Shared primitive components used across all tabs.
 */

import React from 'react'
import { C } from '../data/baseline.js'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
} from 'recharts'

export const Card = ({ children, style = {} }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3, padding: 16, ...style }}>
    {children}
  </div>
)

export const Lbl = ({ children, color }) => (
  <div style={{ fontSize: 9, letterSpacing: '0.2em', color: color || C.textDim, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 6 }}>
    {children}
  </div>
)

export const Badge = ({ label, color = C.amber }) => (
  <span style={{ padding: '2px 7px', background: color + '18', border: `1px solid ${color}35`, color, borderRadius: 2, fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}>
    {label}
  </span>
)

/** Green dot = live from Yahoo, grey circle = baseline fallback */
export const Dot = ({ live }) => (
  <span
    title={live ? 'Live from Yahoo Finance' : 'Baseline snapshot — press ⟳ to refresh'}
    style={{ fontSize: 8, color: live ? C.green : C.textDim, marginLeft: 4, animation: live ? 'pulse 2s infinite' : 'none' }}
  >
    {live ? '●' : '○'}
  </span>
)

export const Skel = ({ w = '70%', h = 24 }) => (
  <div style={{ width: w, height: h, background: C.muted + '40', borderRadius: 2, animation: 'shimmer 1.5s infinite' }} />
)

export const MiniArea = ({ data, dataKey, color, height = 70 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
      <defs>
        <linearGradient id={`g_${dataKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
          <stop offset="95%" stopColor={color} stopOpacity={0}   />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} fill={`url(#g_${dataKey})`} dot={false} />
      <Tooltip
        contentStyle={{ background: C.surfaceHi, border: `1px solid ${C.borderHi}`, fontSize: 10, fontFamily: 'monospace' }}
        itemStyle={{ color }}
        labelStyle={{ color: C.text }}
      />
    </AreaChart>
  </ResponsiveContainer>
)

export const ProgBar = ({ pct, color }) => (
  <div style={{ height: 3, background: C.muted, borderRadius: 1, marginTop: 6 }}>
    <div style={{ height: 3, width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 1 }} />
  </div>
)

/** Render markdown-ish text from Claude digest responses */
export const MarkdownView = ({ text }) => (
  <div style={{ padding: 4 }}>
    {text.split('\n').map((line, i) => {
      if (line.startsWith('## '))
        return <div key={i} style={{ fontSize: 12, color: C.amber, fontFamily: 'monospace', fontWeight: 700, marginTop: 18, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{line.slice(3)}</div>
      if (/^\*\*.*\*\*$/.test(line))
        return <div key={i} style={{ fontSize: 11, color: C.bright, fontFamily: 'monospace', fontWeight: 700, marginBottom: 3 }}>{line.replace(/\*\*/g, '')}</div>
      if (line.startsWith('- '))
        return <div key={i} style={{ fontSize: 11, color: C.text, fontFamily: 'monospace', marginBottom: 4, paddingLeft: 10 }}>› {line.slice(2)}</div>
      if (!line.trim())
        return <div key={i} style={{ height: 5 }} />
      return <div key={i} style={{ fontSize: 11, color: C.text, fontFamily: 'monospace', lineHeight: 1.75, marginBottom: 3 }}>{line}</div>
    })}
  </div>
)
