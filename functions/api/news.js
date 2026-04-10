function joinText(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter(b => b && b.type === 'text' && typeof b.text === 'string')
    .map(b => b.text)
    .join('\n')
    .trim();
}

function extractJsonArray(raw) {
  if (!raw) return null;
  const clean = raw.replace(/```(?:json|javascript|js)?\s*/gi, '').replace(/```/g, '').trim();
  const aStart = clean.indexOf('[');
  const aEnd = clean.lastIndexOf(']');
  if (aStart !== -1 && aEnd !== -1 && aEnd > aStart) {
    try { return JSON.parse(clean.slice(aStart, aEnd + 1)); } catch {}
  }
  const oStart = clean.indexOf('{');
  const oEnd = clean.lastIndexOf('}');
  if (oStart !== -1 && oEnd !== -1 && oEnd > oStart) {
    try {
      const obj = JSON.parse(clean.slice(oStart, oEnd + 1));
      for (const k of ['items', 'data', 'results', 'headlines', 'news']) {
        if (Array.isArray(obj?.[k])) return obj[k];
      }
      if (Array.isArray(obj)) return obj;
    } catch {}
  }
  return null;
}

export async function onRequest(context) {
  const { env } = context;
  const apiKey = env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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
        system: 'You are a geopolitical news aggregator. Use web_search to find today\'s headlines, then respond with ONLY a JSON array. Start your final message with [ and end with ]. No markdown code fences, no explanation, no preamble.',
        messages: [{
          role: 'user',
          content: `Search the web for the 8 most significant developments today (${today}) across:
- US-Iran ceasefire status and Islamabad talks
- Strait of Hormuz shipping
- Energy prices and markets
- Lebanon conflict
- Diplomatic developments

After searching, respond with ONLY this JSON array (no other text):
[{"time":"HH:MM","headline":"factual headline under 85 chars","source":"outlet name","category":"MILITARY|ENERGY|DIPLOMATIC|MARKETS|HUMANITARIAN","severity":"CRITICAL|HIGH|MEDIUM|LOW"}]`
        }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    const data = await response.json();
    const raw = joinText(data.content);
    
    if (!raw) {
      throw new Error(`Claude returned no text (stop_reason=${data.stop_reason})`);
    }

    const items = extractJsonArray(raw);
    if (!items) {
      throw new Error(`Could not extract JSON array from response`);
    }

    return new Response(JSON.stringify({ items }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
