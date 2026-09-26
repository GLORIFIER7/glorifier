const BACKEND_HEALTH_URL =
  process.env.GLORIFIER_BACKEND_HEALTH_URL ||
  'https://glorifier-artificial-intelligence-production.up.railway.app/api/health';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const startedAt = Date.now();

  try {
    const response = await fetch(BACKEND_HEALTH_URL, {
      method: 'GET',
      headers: { 'accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    const raw = await response.text();
    let backend;

    try {
      backend = JSON.parse(raw);
    } catch {
      backend = { ok: false, status: 'invalid-backend-response', raw: raw.slice(0, 500) };
    }

    const ok = response.ok && backend?.ok === true;

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    return res.status(ok ? 200 : 503).json({
      ok,
      status: ok ? 'ok' : 'degraded',
      layer: 'vercel-edge-health-proxy',
      vercel: { reachable: true },
      railway: {
        reachable: response.ok,
        statusCode: response.status,
        health: backend,
      },
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(503).json({
      ok: false,
      status: 'degraded',
      layer: 'vercel-edge-health-proxy',
      vercel: { reachable: true },
      railway: {
        reachable: false,
        error: error instanceof Error ? error.message : String(error),
      },
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  }
}
