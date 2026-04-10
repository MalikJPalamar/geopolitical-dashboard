export async function onRequest(context) {
  return new Response(JSON.stringify({
    ok: true,
    model: 'claude-sonnet-4-6',
    ts: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
