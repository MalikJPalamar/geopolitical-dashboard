export async function onRequest(context) {
  const { env } = context
  const fredKey = env.FRED_API_KEY

  if (!fredKey) {
    return new Response(JSON.stringify({
      bdi: 2710, source: 'baseline_fallback',
      hint: 'Add FRED_API_KEY to environment — register free at https://fred.stlouisfed.org/docs/api/api_key.html'
    }), { headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=BALDIY&api_key=${fredKey}&sort_order=desc&limit=5&file_type=json`
    const r = await fetch(url)
    const data = await r.json()
    const obs = data?.observations || []
    const latest = obs.find(o => o.value !== '.')
    if (!latest) throw new Error('No valid BALDIY observations')
    return new Response(JSON.stringify({
      bdi: parseFloat(latest.value), date: latest.date,
      source: 'FRED BALDIY', note: 'Annual average — use as trend, not spot'
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({
      bdi: 2710, date: null, source: 'baseline_fallback', error: e.message
    }), { headers: { 'Content-Type': 'application/json' } })
  }
}
