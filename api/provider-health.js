const BACKEND_URL =
  process.env.GLORIFIER_BACKEND_URL ||
  'https://glorifier-artificial-intelligence-production.up.railway.app';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const startedAt = Date.now();

  try {
    const response = await fetch(
      `${BACKEND_URL.replace(/\/$/, '')}/api/runtime-verification?probeAi=true`,
      {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(45_000),
      }
    );

    const raw = await response.text();
    let backend;
    try {
      backend = JSON.parse(raw);
    } catch {
      backend = { ok: false, error: 'Invalid backend JSON response', raw: raw.slice(0, 500) };
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const ai = backend?.checks?.ai || null;
    const executed = ai?.executed === true;
    const provider = ai?.provider || null;

    return res.status(response.ok && backend?.ok === true ? 200 : 503).json({
      ok: response.ok && backend?.ok === true,
      status: executed ? 'provider-executed' : 'provider-unavailable',
      provider,
      executed,
      backendStatusCode: response.status,
      backend,
      responseTimeMs: Date.now() - startedAt,
      policy: {
        noSyntheticSuccess: true,
        quotaExhaustionIsNotHidden: true,
        providerNeutralFallbackRemainsEnabled: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(503).json({
      ok: false,
      status: 'probe-failed',
      provider: null,
      executed: false,
      error: error instanceof Error ? error.message : String(error),
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  }
}
