/**
 * Cloudflare Pages Function: /strategic-foresight-dashboard
 * Serves the Strategic Foresight Dashboard (standalone HTML)
 * Source: https://github.com/MalikJPalamar/strategic-foresight-dashboard
 */
export async function onRequest(context) {
  const RAW_URL = "https://raw.githubusercontent.com/MalikJPalamar/strategic-foresight-dashboard/main/public/strategic-foresight-dashboard/index.html";

  try {
    const response = await fetch(RAW_URL, {
      cf: { cacheTtl: 300, cacheEverything: true }
    });

    if (!response.ok) {
      return new Response("Dashboard not found", { status: 404 });
    }

    const html = await response.text();

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (err) {
    return new Response("Error loading dashboard: " + err.message, { status: 500 });
  }
}
