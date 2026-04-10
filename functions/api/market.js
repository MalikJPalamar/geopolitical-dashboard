const FEB27_UNIX = Math.floor(new Date('2026-02-27T12:00:00Z').getTime() / 1000);

async function fetchYahooSymbol(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No result for ${symbol}`);

  const current = result.meta?.regularMarketPrice;
  if (!current) throw new Error(`No price for ${symbol}`);

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  let baseline = null;
  let minDiff = Infinity;
  timestamps.forEach((t, i) => {
    const diff = Math.abs(t - FEB27_UNIX);
    if (diff < minDiff && closes[i] != null) {
      minDiff = diff;
      baseline = closes[i];
    }
  });

  const pct = baseline && minDiff < 4 * 86400
    ? +((current - baseline) / baseline * 100).toFixed(1)
    : null;

  return { current: +current.toFixed(2), pct };
}

export async function onRequest(context) {
  const symbols = {
    brent: 'BZ=F',
    wti: 'CL=F',
    gold: 'GC=F',
    vix: '^VIX',
    ita: 'ITA',
    xle: 'XLE',
    icln: 'ICLN',
    jets: 'JETS'
  };

  const fxPromise = fetch('https://api.frankfurter.app/latest?from=USD&to=EUR')
    .then(r => r.json())
    .then(d => d?.rates?.EUR ? +d.rates.EUR.toFixed(4) : null)
    .catch(() => null);

  const results = await Promise.allSettled([
    fxPromise,
    ...Object.entries(symbols).map(([key, sym]) =>
      fetchYahooSymbol(sym).then(r => ({ key, ...r }))
    )
  ]);

  const data = { _liveKeys: [], _errors: [] };

  if (results[0].status === 'fulfilled' && results[0].value) {
    data.usdeur = results[0].value;
    data._liveKeys.push('usdeur');
  }

  results.slice(1).forEach((r, i) => {
    const key = Object.keys(symbols)[i];
    if (r.status === 'fulfilled') {
      const { current, pct } = r.value;
      data[key] = current;
      data._liveKeys.push(key);
      if (pct !== null) {
        data[`${key}_pct`] = pct;
        data._liveKeys.push(`${key}_pct`);
      }
    } else {
      data._errors.push(`${key}: ${r.reason?.message || 'failed'}`);
    }
  });

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}
