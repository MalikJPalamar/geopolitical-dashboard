function joinText(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter(b => b && b.type === 'text' && typeof b.text === 'string')
    .map(b => b.text)
    .join('\n')
    .trim();
}

const sign = (n, fallback) => {
  const v = Number(n ?? fallback);
  return `${v > 0 ? '+' : ''}${v}`;
};

export async function onRequest(context) {
  const { env, request } = context;
  const apiKey = env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json();
  const d = body?.marketData || {};
  const hormuzOpen = d.hormuz_open !== undefined ? !!d.hormuz_open : true;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: 'Senior geopolitical and financial intelligence analyst. Write structured markdown briefings using ## headers. Direct and analytical — no filler, no preamble.',
        messages: [{
          role: 'user',
          content: `Intelligence digest — US-Iran ceasefire, ${new Date().toLocaleDateString()}.

CURRENT DATA:
- Brent: $${d.brent ?? 96.80}/bbl | WTI: $${d.wti ?? 93.40}/bbl
- Hormuz: ${hormuzOpen ? 'REOPENING (ceasefire)' : 'CLOSED'}
- VIX: ${d.vix ?? 27.8} | Gold: $${d.gold ?? 3095}
- Defense ETF: ${sign(d.ita_pct, 19)}% | Energy ETF: ${sign(d.xle_pct, 18)}% | Airlines: ${sign(d.jets_pct, -18)}%
- Iran killed: ~3,400 (HRANA) | Lebanon: 1,500+
- Islamabad talks underway

Write a briefing using these exact ## headers, in this order:
## Ceasefire Status
## Energy & Markets
## Business Impact
## Key Risks — Next 14 Days`
        }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    const data = await response.json();
    const digest = joinText(data.content);
    
    if (!digest) {
      throw new Error(`Claude returned no text (stop_reason=${data.stop_reason})`);
    }

    return new Response(JSON.stringify({ digest }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
