import express from 'express';
import crypto from 'node:crypto';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { aiOrchestrator } from './src/lib/ai/orchestrator';
import { checkPostgres } from './src/lib/db/postgres';
import { readAppState, upsertState, updateOffer, updateGrant, addTransaction, addTelemetry } from './src/lib/db/app-state';
import { runAIRole } from './src/lib/ai/roles-service';
import { AI_ROLE_DEFINITIONS } from './src/lib/ai/roles';
import { getRevenueSummary, initializeRevenueLedger, recordRevenueEvent, verifyRevenueWebhook } from './src/lib/revenue/engine';
import { captureCheckout, createCheckout, getSubscription, initializeMonetizationTables, MONETIZATION_PLANS } from './src/lib/revenue/monetization';
import { initializeBrandMonitorTables, listBrandTerms, addBrandTerm, listBrandObservations, listBrandAlerts, recordBrandObservation, classifyBrandMatch } from './src/lib/brand-monitor';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.use(express.json({
  limit: '2mb',
  verify: (req, _res, buf) => {
    (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
  },
}));

function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function now() {
  return new Date().toISOString();
}

// Firebase Admin verifies the Firebase ID token issued to the browser.
// The verified UID, never a browser-supplied userReference, becomes the Neon tenant key.
let firebaseAdmin: typeof import('firebase-admin') | null = null;
let firebaseAuth: import('firebase-admin/auth').Auth | null = null;

async function getFirebaseAuth() {
  if (firebaseAuth) return firebaseAuth;
  const admin = await import('firebase-admin');
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin authentication is not configured on Railway.');
  }
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
  firebaseAdmin = admin;
  firebaseAuth = admin.auth();
  return firebaseAuth;
}

async function requireFirebaseUser(req: express.Request, res: express.Response): Promise<string | null> {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }
  try {
    const auth = await getFirebaseAuth();
    const decoded = await auth.verifyIdToken(token, true);
    return decoded.uid;
  } catch (error) {
    console.warn('Firebase token verification failed:', error instanceof Error ? error.message : error);
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
    return null;
  }
}

// Public operational endpoints.
// Game Asset Intelligence. Returns public-source connector configuration and permitted reference metadata.
// Actual collection should be performed by source-compliant schedulers/connectors and submitted as evidence.
app.get('/api/game-assets', async (_req, res) => {
  return res.json({
    generatedAt: now(),
    connectorStatus: 'public-source connectors ready',
    policy: 'Store public references/metadata and permitted previews; do not redistribute restricted game files.',
    assetTypes: ['2D / UI', 'Sprites', 'Textures', '3D models', 'Animation', 'Audio', 'Music', 'Game metadata'],
    sources: [
      { name: 'OpenGameArt', url: 'https://opengameart.org/', scope: 'Open/community game assets' },
      { name: 'Kenney Assets', url: 'https://kenney.nl/assets', scope: 'Game development assets' },
    ],
    assets: [
      { id:'ga-1', title:'Open game UI icon set', game:'Open-source sample', assetType:'2D / UI', sourceName:'OpenGameArt', sourceUrl:'https://opengameart.org/', license:'Verify source license', status:'indexed', observedAt:now() },
      { id:'ga-2', title:'Community character model', game:'Open-source sample', assetType:'3D model', sourceName:'Kenney Assets', sourceUrl:'https://kenney.nl/assets', license:'Verify source license', status:'indexed', observedAt:now() },
    ],
  });
});

// Brand/Web monitoring. Scans only public evidence supplied by permitted connectors or the signed scheduler.
// Matching a term never establishes ownership; possible conflicts are routed to human/legal review.
app.get('/api/brand-monitor/terms', async (_req, res) => {
  try { return res.json(await listBrandTerms()); }
  catch (error) { return res.status(503).json({ error: error instanceof Error ? error.message : 'Brand terms unavailable' }); }
});

app.post('/api/brand-monitor/terms', async (req, res) => {
  const uid = await requireFirebaseUser(req, res);
  if (!uid) return;
  try {
    const term = String(req.body?.term || '').trim();
    if (!term || term.length > 160) return res.status(400).json({ error: 'A term between 1 and 160 characters is required.' });
    return res.status(201).json(await addBrandTerm({
      term, termType: req.body?.termType, jurisdictions: Array.isArray(req.body?.jurisdictions) ? req.body.jurisdictions : [],
      ownershipEvidence: Array.isArray(req.body?.ownershipEvidence) ? req.body.ownershipEvidence : [], notes: req.body?.notes || null
    }));
  } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Brand term creation failed' }); }
});

app.get('/api/brand-monitor/observations', async (_req, res) => {
  try { return res.json(await listBrandObservations(Number(_req.query.limit || 100))); }
  catch (error) { return res.status(503).json({ error: error instanceof Error ? error.message : 'Brand observations unavailable' }); }
});

app.get('/api/brand-monitor/alerts', async (_req, res) => {
  try { return res.json(await listBrandAlerts(Number(_req.query.limit || 100))); }
  catch (error) { return res.status(503).json({ error: error instanceof Error ? error.message : 'Brand alerts unavailable' }); }
});

app.post('/api/brand-monitor/scan', async (req, res) => {
  const secret = process.env.BRAND_MONITOR_WEBHOOK_SECRET;
  const supplied = req.header('x-brand-monitor-secret');
  const internal = secret && supplied === secret;
  const uid = internal ? null : await requireFirebaseUser(req, res);
  if (!internal && !uid) return;
  try {
    await initializeBrandMonitorTables();
    // Connector ingestion is intentionally conservative: the scheduler can submit public observations
    // through this endpoint after collecting them under the source's permitted API/terms.
    const submitted = Array.isArray(req.body?.observations) ? req.body.observations : [];
    const terms = await listBrandTerms();
    const termById = new Map(terms.map(t => [t.id, t]));
    const recorded = [];
    for (const item of submitted.slice(0, 100)) {
      const term = termById.get(String(item.termId || ''));
      const matchedText = String(item.matchedText || '').trim();
      const sourceUrl = String(item.sourceUrl || '').trim();
      if (!term || !matchedText || !sourceUrl) continue;
      const classification = classifyBrandMatch(term.term, matchedText, sourceUrl);
      recorded.push(await recordBrandObservation({
        termId: term.id, sourceType: String(item.sourceType || 'public_web'), sourceUrl,
        sourceName: String(item.sourceName || 'Public source'), observedAt: item.observedAt || now(),
        matchedText, context: String(item.context || ''), classification,
        confidence: Math.min(1, Math.max(0, Number(item.confidence ?? 0.5)))
      }));
    }
    return res.json({ status: 'ok', generatedAt: now(), submitted: submitted.length, recorded: recorded.length,
      connectorStatus: 'public-source connectors ready; only supplied permitted observations are persisted',
      ownershipRule: 'A phrase match is evidence of use, not proof of ownership.' });
  } catch (error) { return res.status(503).json({ error: error instanceof Error ? error.message : 'Brand scan failed' }); }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: now(),
    database: 'postgresql',
  });
});

app.get('/api/health/database', async (_req, res) => {
  const result = await checkPostgres();
  res.status(result.ok ? 200 : 503).json(result);
});

app.get('/api/ai/roles', (_req, res) => {
  res.json({ roles: Object.values(AI_ROLE_DEFINITIONS) });
});

app.post('/api/ai/role', async (req, res) => {
  try {
    const { role, task, context, provider } = req.body;
    if (role !== 'attorney' && role !== 'dataScientist') {
      return res.status(400).json({ error: 'role must be attorney or dataScientist' });
    }
    if (!task || typeof task !== 'string') {
      return res.status(400).json({ error: 'task is required' });
    }
    const result = await runAIRole(role, task, context ?? {}, provider);
    return res.json({
      role,
      output: result.text,
      modelUsed: result.model,
      provider: result.provider,
      disclaimer: AI_ROLE_DEFINITIONS[role].disclaimer,
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'AI role analysis failed',
    });
  }
});

function requireRevenueAdmin(req: express.Request, res: express.Response): boolean {
  const expected = process.env.REVENUE_ADMIN_KEY;
  const supplied = req.header('x-revenue-admin-key');
  if (!expected || !supplied || supplied !== expected) {
    res.status(401).json({ error: 'Revenue administration is not authorized.' });
    return false;
  }
  return true;
}


// Authoritative application state. Every protected request derives its tenant from Firebase.
app.get('/api/state', async (req, res) => {
  const uid = await requireFirebaseUser(req, res);
  if (!uid) return;
  try {
    return res.json(await readAppState(uid));
  } catch (error) {
    return res.status(503).json({ error: error instanceof Error ? error.message : 'Application state unavailable' });
  }
});

app.put('/api/state', async (req, res) => {
  const uid = await requireFirebaseUser(req, res);
  if (!uid) return;
  try {
    const { userReference: _ignoredUserReference, ...payload } = req.body || {};
    return res.json(await upsertState(uid, payload));
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Application state update failed' });
  }
});

app.post('/api/marketplace/offers/:offerId/accept', async (req, res) => {
  const uid = await requireFirebaseUser(req, res);
  if (!uid) return;
  const db = (await import('./src/lib/db/postgres')).getPostgresPool();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const offerResult = await client.query('SELECT offer FROM app_offers WHERE user_reference=$1 AND offer_id=$2 FOR UPDATE', [uid, req.params.offerId]);
    const offer = offerResult.rows[0]?.offer;
    if (!offer) throw new Error('Offer not found');
    if (offer.status !== 'PENDING' && offer.status !== 'COUNTERED') throw new Error('Only pending or countered offers can be accepted');
    const amountUsd = Number(offer.counterOfferAmount ?? offer.offeredCompUsd);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) throw new Error('Offer has no valid compensation amount');
    const txResult = await client.query('INSERT INTO marketplace_transactions (id,user_reference,offer_id,amount_minor,currency,status) VALUES ($1,$2,$3,$4,\'USD\',\'accepted\') ON CONFLICT (user_reference,offer_id) DO UPDATE SET updated_at=NOW() RETURNING id', [crypto.randomUUID(), uid, req.params.offerId, Math.round(amountUsd * 100)]);
    await client.query('UPDATE app_offers SET offer=jsonb_set(offer,\'{status}\',\'"ACCEPTED"\'::jsonb),updated_at=NOW() WHERE user_reference=$1 AND offer_id=$2', [uid, req.params.offerId]);
    await client.query('COMMIT');
    return res.status(201).json({ transactionId: txResult.rows[0].id, status: 'accepted', offerId: req.params.offerId, verifiedEarningsUsd: 0, message: 'Offer accepted. Earnings remain zero until a verified revenue event is received.' });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Offer acceptance failed' });
  } finally { client.release(); }
});
app.post('/api/marketplace/offers/:offerId/reject', async (req, res) => {
  const uid = await requireFirebaseUser(req, res);
  if (!uid) return;
  try {
    return res.json(await updateOffer(uid, req.params.offerId, { status: 'REJECTED' }));
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Offer rejection failed' });
  }
});

app.post('/api/marketplace/offers/:offerId/counter', async (req, res) => {
  const uid = await requireFirebaseUser(req, res);
  if (!uid) return;
  try {
    const counterAmount = Number(req.body?.counterAmount);
    if (!Number.isFinite(counterAmount) || counterAmount < 0) return res.status(400).json({ error: 'counterAmount must be a valid non-negative number' });
    return res.json(await updateOffer(uid, req.params.offerId, { status: 'COUNTERED', counterOfferAmount: counterAmount }));
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Offer counter failed' });
  }
});

app.post('/api/grants/:grantId/revoke', async (req, res) => {
  const uid = await requireFirebaseUser(req, res);
  if (!uid) return;
  try {
    return res.json(await updateGrant(uid, req.params.grantId, { status: 'revoked', ttlHoursRemaining: 0 }));
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Grant revocation failed' });
  }
});

app.patch('/api/grants/:grantId', async (req, res) => {
  const uid = await requireFirebaseUser(req, res);
  if (!uid) return;
  try {
    const sharedFields = Array.isArray(req.body?.sharedFields) ? req.body.sharedFields : [];
    return res.json(await updateGrant(uid, req.params.grantId, { sharedFields }));
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Grant update failed' });
  }
});

app.post('/api/telemetry/usage', async (req, res) => {
  const uid = await requireFirebaseUser(req, res);
  if (!uid) return;
  try {
    const model = String(req.body?.model || '');
    const allowed = ['Per-Query','Data Shapley','Cohort Subscription','Proof Attestation'];
    if (!allowed.includes(model)) return res.status(400).json({ error: 'Unsupported usage model' });
    const event = {
      id: `telemetry-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      timestamp: new Date().toISOString(), grantId: 'user-triggered-test',
      recipientOrg: 'Glorifier AI test gateway', dataCategory: 'ecommerce', eventType: 'dp_query_laplace',
      queryUnits: 1, compensationUsd: 0, calculationModel: model, zkProofHash: 'not-issued',
      epsilonConsumed: 0, source: 'user_test',
    };
    return res.json(await addTelemetry(uid, event));
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Usage event failed' });
  }
});

app.post('/api/payouts/request', async (req, res) => {
  const uid = await requireFirebaseUser(req, res);
  if (!uid) return;
  try {
    const amount = Number(req.body?.amount);
    const method = String(req.body?.method || '');
    const destination = String(req.body?.destination || '');
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'amount must be positive' });
    if (!method || !destination) return res.status(400).json({ error: 'payout method and destination are required' });
    const state = await readAppState(uid);
    if (amount > Number(state.stats.totalEarnedUsd || 0)) return res.status(400).json({ error: 'Insufficient verified available balance' });
    const id = `payout-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const db = (await import('./src/lib/db/postgres')).getPostgresPool();
    await db.query('INSERT INTO payout_requests(id,user_reference,amount_minor,currency,method,destination,status) VALUES($1,$2,$3,$4,$5,$6,$7)', [id,uid,Math.round(amount*100),'USD',method,destination,'pending']);
    return res.status(202).json({ accepted: true, status: 'pending', payoutRequestId: id, message: 'Payout request recorded. No transfer is claimed until a connected payment provider confirms it.' });
  } catch (error) {
    return res.status(503).json({ error: error instanceof Error ? error.message : 'Payout request failed' });
  }
});

app.post('/api/settlements/clear', async (req, res) => {
  const uid = await requireFirebaseUser(req, res);
  if (!uid) return;
  try {
    const state = await readAppState(uid);
    return res.json({ stats: { ...state.stats, pendingSettlementUsd: 0 } });
  } catch (error) {
    return res.status(503).json({ error: error instanceof Error ? error.message : 'Settlement state unavailable' });
  }
});

app.get('/api/monetization/plans', (_req, res) => {
  res.json({ plans: Object.values(MONETIZATION_PLANS) });
});

app.post('/api/monetization/checkout', async (req, res) => {
  const uid = await requireFirebaseUser(req, res);
  if (!uid) return;
  try {
    const result = await createCheckout(uid, String(req.body?.planId || ''));
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Checkout creation failed' });
  }
});

app.post('/api/monetization/capture', async (req, res) => {
  const uid = await requireFirebaseUser(req, res);
  if (!uid) return;
  try {
    const result = await captureCheckout(uid, String(req.body?.orderId || ''));
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Payment capture failed' });
  }
});

app.get('/api/monetization/subscription', async (req, res) => {
  const uid = await requireFirebaseUser(req, res);
  if (!uid) return;
  try {
    return res.json({ subscription: await getSubscription(uid) });
  } catch (error) {
    return res.status(503).json({ error: error instanceof Error ? error.message : 'Subscription lookup failed' });
  }
});

app.get('/api/revenue/summary', async (req, res) => {
  if (!requireRevenueAdmin(req, res)) return;
  try {
    return res.json({
      currencies: await getRevenueSummary(),
      generatedAt: now(),
      source: 'PostgreSQL revenue ledger',
      verifiedMoneyOnly: true,
    });
  } catch (error) {
    return res.status(503).json({ error: error instanceof Error ? error.message : 'Revenue summary unavailable' });
  }
});

app.post('/api/revenue/webhook', async (req, res) => {
  const rawBody = (req as express.Request & { rawBody?: string }).rawBody ?? '';
  if (!verifyRevenueWebhook(rawBody, req.header('x-revenue-signature'))) {
    return res.status(401).json({ error: 'Invalid revenue webhook signature.' });
  }

  try {
    const event = req.body;
    const metadata = event.metadata && typeof event.metadata === 'object' ? event.metadata : {};
    const userReference = String(metadata.userReference || event.userReference || event.customerReference || '');
    if (!userReference) return res.status(400).json({ error: 'Verified revenue event must identify the Glorifier user.' });
    const transactionId = String(metadata.transactionId || event.transactionId || '');
    if (!transactionId) return res.status(400).json({ error: 'Verified revenue event must identify the marketplace transaction.' });
    const db = (await import('./src/lib/db/postgres')).getPostgresPool();
    const transactionCheck = await db.query('SELECT id, amount_minor, currency, status, user_reference FROM marketplace_transactions WHERE id=$1 AND user_reference=$2', [transactionId, userReference]);
    if (!transactionCheck.rows[0]) return res.status(400).json({ error: 'Marketplace transaction not found for this user.' });
    if (event.status === 'paid' && transactionCheck.rows[0].status !== 'accepted') return res.status(409).json({ error: 'Transaction is not awaiting payment.' });
    if (event.status === 'paid' && (Number(event.amountMinor) !== Number(transactionCheck.rows[0].amount_minor) || String(event.currency || '').toUpperCase() !== String(transactionCheck.rows[0].currency).trim())) return res.status(409).json({ error: 'Verified revenue amount does not match the accepted transaction.' });
    const result = await recordRevenueEvent({
      eventId: String(event.eventId || ''),
      provider: String(event.provider || ''),
      providerTransactionId: event.providerTransactionId ? String(event.providerTransactionId) : undefined,
      customerReference: event.customerReference ? String(event.customerReference) : undefined,
      userReference,
      currency: String(event.currency || '').toUpperCase(),
      amountMinor: Number(event.amountMinor),
      status: event.status,
      occurredAt: event.occurredAt ? String(event.occurredAt) : undefined,
      metadata: event.metadata && typeof event.metadata === 'object' ? event.metadata : {},
    });
    if (result.inserted) {
      const nextStatus = event.status === 'paid' ? 'paid' : event.status;
      await db.query('UPDATE marketplace_transactions SET status=$1,revenue_event_id=$2,updated_at=NOW() WHERE id=$3 AND user_reference=$4', [nextStatus, event.eventId, transactionId, userReference]);
    }
    return res.status(result.inserted ? 201 : 200).json({
      accepted: true,
      duplicate: !result.inserted,
      ledgerId: result.id ?? null,
    });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid revenue event' });
  }
});




// GLORIFIER Competitive Intelligence Engine (CIE)
app.get('/api/business-intelligence/competitive', async (_req, res) => {
  const generatedAt = now();
  const signals = [
    { id: 'dataiku-ai', competitor: 'Dataiku', dimension: 'AI features', status: 'connector_ready', summary: 'Monitor public releases, platform capabilities, pricing and governance positioning.', evidence: ['Public-company/product sources should be attached by the collector.'], opportunity: 'Track capability gaps that could inform GLORIFIER product experiments.' },
    { id: 'salesforce-ai', competitor: 'Salesforce', dimension: 'Products', status: 'connector_ready', summary: 'Monitor AI agents, automation, CRM data and enterprise product changes.', evidence: ['Public product sources should be attached by the collector.'], opportunity: 'Identify integration and workflow opportunities for smaller teams.' },
    { id: 'zapier-ai', competitor: 'Zapier', dimension: 'API capabilities', status: 'connector_ready', summary: 'Monitor automation, integrations, AI workflows and pricing changes.', evidence: ['Public product sources should be attached by the collector.'], opportunity: 'Track underserved automation workflows and connector demand.' },
    { id: 'hubspot-ai', competitor: 'HubSpot', dimension: 'Customer segments', status: 'connector_ready', summary: 'Monitor CRM, marketing intelligence, AI agents and customer-platform changes.', evidence: ['Public product sources should be attached by the collector.'], opportunity: 'Look for data-intelligence products that complement customer workflows.' },
    { id: 'market-wide', competitor: 'Market-wide', dimension: 'Technology changes', status: 'connector_ready', summary: 'Cross-competitor change detection is prepared for public-source connectors.', evidence: ['No private competitor data is collected.'], opportunity: 'Turn repeated market changes into evidence-backed product hypotheses.' },
  ];
  return res.json({
    generatedAt,
    executiveSummary: 'CIE organizes competitor products, pricing, AI features, funding/M&A, customer segments, APIs, data products, marketing and technology changes. Current profiles are configured; public-source collection is connector-ready and should attach evidence before an opportunity is treated as verified.',
    counts: { competitors: 7, observed: 0, connectorReady: 7, opportunities: signals.length },
    signals,
  });
});

// GLORIFIER Business Intelligence report endpoint
app.get('/api/business-intelligence/report', async (_req, res) => {
  try {
    const generatedAt = now();
    let recentCommits = 0;
    let latestCommit: string | null = null;
    try {
      const response = await fetch('https://api.github.com/repos/GLORIFIER7/glorifier-artificial-intelligence/commits?per_page=10', {
        headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'GLORIFIER-AI-BI' },
      });
      if (response.ok) {
        const commits = await response.json() as Array<{ sha?: string }>;
        recentCommits = commits.length;
        latestCommit = commits[0]?.sha?.slice(0, 7) ?? null;
      }
    } catch (error) {
      console.warn('GitHub BI collector unavailable:', error);
    }

    return res.json({
      generatedAt,
      executiveSummary: 'GLORIFIER Business Intelligence combines public web intelligence, project activity, market signals, governed first-party telemetry, verified financial metrics and data-product opportunities.',
      insights: [
        { id: 'web_mentions', title: 'GLORIFIER public-web mentions', status: 'connector', summary: 'Public pages, brand mentions and indexed footprint.', metrics: [{ label: 'Source', value: 'Public web' }, { label: 'Privacy', value: 'Public only' }], actions: ['Track new mentions', 'Detect brand changes', 'Add verified signals to reports'] },
        { id: 'github', title: 'GitHub / project activity', status: 'live', summary: 'Live public activity for the GLORIFIER AI repository.', metrics: [{ label: 'Recent commits', value: String(recentCommits) }, { label: 'Latest SHA', value: latestCommit ?? 'n/a' }], actions: ['Monitor engineering velocity', 'Track releases', 'Use activity as a development KPI'] },
        { id: 'competitors', title: 'Competitor intelligence', status: 'connector', summary: 'Comparable AI, software, data and digital-service businesses.', metrics: [{ label: 'Coverage', value: 'Connector-ready' }, { label: 'Output', value: 'Market signals' }], actions: ['Track public launches and pricing', 'Compare positioning', 'Identify market gaps'] },
        { id: 'trends', title: 'AI / software industry trends', status: 'connector', summary: 'AI, software, cybersecurity and data-product research and market signals.', metrics: [{ label: 'Coverage', value: 'AI + software' }, { label: 'Output', value: 'Trend signals' }], actions: ['Track emerging technologies', 'Surface relevant research', 'Create product hypotheses'] },
        { id: 'search', title: 'Traffic / search signals', status: 'connector', summary: 'Legally available aggregate search and traffic indicators.', metrics: [{ label: 'Privacy', value: 'Aggregate' }, { label: 'PII', value: 'Excluded' }], actions: ['Connect approved analytics providers', 'Track aggregate demand', 'Avoid individual profiling'] },
        { id: 'telemetry', title: 'First-party product telemetry', status: 'protected', summary: 'Authenticated GLORIFIER activity becomes a business signal after consent, purpose limitation, aggregation and privacy checks.', metrics: [{ label: 'Source', value: 'First-party' }, { label: 'Gate', value: 'Consent required' }], actions: ['Aggregate product usage', 'Apply cohort thresholds', 'Keep individual events governed'] },
        { id: 'revenue', title: 'Revenue and customer metrics', status: 'protected', summary: 'Verified revenue is read from the authoritative PostgreSQL ledger and shown as aggregated business metrics.', metrics: [{ label: 'Ledger', value: 'PostgreSQL' }, { label: 'Money', value: 'Verified only' }], actions: ['Track verified revenue', 'Measure subscriptions', 'Separate forecasts from realized revenue'] },
        { id: 'opportunities', title: 'Data-product opportunities', status: 'live', summary: 'Converts market signals and governed aggregates into potential APIs, reports and datasets.', metrics: [{ label: 'Decision', value: 'Governed' }, { label: 'Product', value: 'Privacy-safe' }], actions: ['Prioritize aggregate products', 'Document buyers and permitted use', 'Connect approved products to monetization'] },
      ],
    });
  } catch (error) {
    return res.status(503).json({ error: error instanceof Error ? error.message : 'Business intelligence report unavailable' });
  }
});

app.get('/api/ai/providers', (_req, res) => {
  res.json({ providers: aiOrchestrator.registry() });
});

app.get('/api/ai/ceo', (_req, res) => {
  res.json({
    executive: aiOrchestrator.executive(),
    generatedAt: now(),
    mode: 'automatic',
    note: 'The executive is selected from connected providers by configured model capability; reliability and latency break ties. If the executive fails, the orchestrator falls back to the next connected candidate.'
  });
});

app.get('/api/ai/metrics', (_req, res) => {
  res.json({
    providers: aiOrchestrator.metrics(),
    generatedAt: new Date().toISOString(),
    note: 'Cost values are estimates based on optional per-1K-token environment rates; latency and reliability are measured by this server process.',
  });
});

app.post('/api/ai/orchestrate', async (req, res) => {
  try {
    const { messages, provider = 'auto', model, temperature, maxTokens } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }
    const result = await aiOrchestrator.generate({
      messages,
      provider,
      model,
      temperature,
      maxTokens,
    });
    return res.json(result);
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'AI orchestration failed',
    });
  }
});

app.post('/api/ai/collaborate', async (req, res) => {
  try {
    const { messages, providerIds } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }
    const responses = await aiOrchestrator.collaborate(messages, providerIds);
    return res.json({ responses });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'AI collaboration failed',
    });
  }
});

// Unified council: real connected providers only; no fabricated model output.
app.post('/api/ai/council', async (req, res) => {
  try {
    const { agenda, currentPolicy, footprints, activeModels } = req.body;
    const topic = String(agenda || 'Glorifier AI governance review');
    const policy = currentPolicy || {};
    const requestedProviders = Array.isArray(activeModels)
      ? activeModels.filter((id: unknown) => ['openai', 'gemini', 'meta'].includes(String(id)))
      : undefined;

    const providerIds = requestedProviders?.length ? requestedProviders : undefined;
    const messages = [
      {
        role: 'system' as const,
        content:
          'You are a specialist member of the Glorifier AI governance council. ' +
          'Analyze the agenda using only the supplied facts. Clearly distinguish evidence, assumptions, and recommendations. ' +
          'Do not claim legal authority, cryptographic guarantees, or model agreement unless actually established.',
      },
      {
        role: 'user' as const,
        content: JSON.stringify({
          agenda: topic,
          policy,
          footprints: Array.isArray(footprints) ? footprints : [],
        }),
      },
    ];

    const responses = await aiOrchestrator.collaborate(messages, providerIds);
    const participants = responses.map((result) => ({
      modelId: result.provider,
      name: result.model,
      provider: result.provider,
      role: 'Independent governance analysis',
      color: 'emerald',
      badge: 'Live Provider',
      status: 'completed' as const,
      output: result.text,
      perspective: 'Independent analysis from a connected provider',
      keyRecommendation: 'Review this provider output alongside the other live results before changing policy.',
    }));

    const successful = responses.length;
    const configured = aiOrchestrator.registry().filter((p) => p.status === 'connected').length;
    const coverage = configured > 0 ? Math.round((successful / configured) * 100) : 0;

    return res.json({
      agenda: topic,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      participants,
      unifiedConsensus:
        successful > 0
          ? `Live multi-provider review completed with ${successful} successful provider response(s). This is a review record, not proof of unanimous agreement; policy changes remain subject to the user's explicit action.`
          : 'No connected AI provider returned a result. No policy change was proposed.',
      consensusScore: coverage,
      recommendedEpsilon: Number(policy.globalEpsilon ?? 0.35),
      recommendedFloorUsd: Number(policy.minimumMonthlyFloorUsd ?? 35),
      actionDirectives: [
        'Review each live provider output and its supporting assumptions.',
        'Keep the current privacy epsilon unless the evidence supports a change.',
        'Keep the current compensation floor unless market evidence supports a change.',
        'Require explicit user approval before applying governance changes.',
      ],
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'AI council failed',
    });
  }
});

app.post('/api/ai/broker-chat', async (req, res) => {
  try {
    const { message, currentPolicy, footprintsSummary, model } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const result = await aiOrchestrator.generate({
      provider: model && ['openai', 'gemini', 'meta'].includes(model) ? model : 'auto',
      model: typeof model === 'string' ? model : undefined,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You are the Glorifier AI governance assistant. Provide practical, evidence-based analysis of data governance, privacy, and compensation workflows. ' +
            'Do not invent market prices, legal rights, successful actions, cryptographic proofs, or completed external operations. ' +
            'State uncertainty when facts are unavailable. ' +
            `Current policy: ${JSON.stringify(currentPolicy || {})}. Data summary: ${String(footprintsSummary || 'not provided')}.`,
        },
        { role: 'user', content: message },
      ],
    });

    return res.json({
      reply: result.text,
      modelUsed: result.model,
      provider: result.provider,
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'AI broker chat failed',
    });
  }
});

app.post('/api/ai/evaluate-offer', async (req, res) => {
  try {
    const { offer, userPolicy, model } = req.body;
    if (!offer || typeof offer !== 'object') {
      return res.status(400).json({ error: 'offer is required' });
    }

    const result = await aiOrchestrator.generate({
      provider: model && ['openai', 'gemini', 'meta'].includes(model) ? model : 'auto',
      model: typeof model === 'string' ? model : undefined,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Evaluate the supplied data acquisition offer. Return JSON only with score (0-100), verdict (RECOMMEND|CAUTION|REJECT), reasoning, and optional suggestedCounterUsd. ' +
            'Do not invent facts about the buyer. Base the analysis only on supplied fields.',
        },
        {
          role: 'user',
          content: JSON.stringify({ offer, userPolicy }),
        },
      ],
    });

    const parsed = parseJson(result.text);
    if (parsed && typeof parsed === 'object') {
      return res.json({
        ...(parsed as Record<string, unknown>),
        modelUsed: result.model,
        provider: result.provider,
      });
    }
    return res.json({
      reasoning: result.text,
      modelUsed: result.model,
      provider: result.provider,
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Offer evaluation failed',
    });
  }
});

app.post('/api/ai/audit-footprint', async (req, res) => {
  try {
    const { category, sourceName, sampleData, model } = req.body;
    const result = await aiOrchestrator.generate({
      provider: model && ['openai', 'gemini', 'meta'].includes(model) ? model : 'auto',
      model: typeof model === 'string' ? model : undefined,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Perform a privacy engineering review of the supplied data sample. Return JSON only with reidentificationRisk, recommendedEpsilon, kAnonymityMin, fairMarketMonthlyUsd, and sanitizationReport. ' +
            'Treat numerical estimates as estimates, not measured facts.',
        },
        {
          role: 'user',
          content: JSON.stringify({ category, sourceName, sampleData }),
        },
      ],
    });

    const parsed = parseJson(result.text);
    if (parsed && typeof parsed === 'object') {
      return res.json({
        ...(parsed as Record<string, unknown>),
        modelUsed: result.model,
        provider: result.provider,
      });
    }
    return res.json({
      sanitizationReport: result.text,
      modelUsed: result.model,
      provider: result.provider,
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Footprint audit failed',
    });
  }
});

app.post('/api/ai/generate-clawback', async (req, res) => {
  try {
    const { brokerName, complianceStatute, recordCount, model } = req.body;
    const result = await aiOrchestrator.generate({
      provider: model && ['openai', 'gemini', 'meta'].includes(model) ? model : 'auto',
      model: typeof model === 'string' ? model : undefined,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            'Draft a privacy/data-deletion request based only on the supplied facts. Return JSON with documentTitle and legalNotice. ' +
            'Do not state that the request is legally binding or guarantee statutory penalties. Encourage verification of the applicable law before sending.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            brokerName,
            complianceStatute,
            recordCount,
          }),
        },
      ],
    });

    const parsed = parseJson(result.text);
    if (parsed && typeof parsed === 'object') {
      return res.json({
        ...(parsed as Record<string, unknown>),
        modelUsed: result.model,
        provider: result.provider,
      });
    }
    return res.json({
      documentTitle: 'Privacy / Data Deletion Request',
      legalNotice: result.text,
      modelUsed: result.model,
      provider: result.provider,
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Clawback generation failed',
    });
  }
});

async function startServer() {
  try {
    await initializeRevenueLedger();
    await initializeMonetizationTables();
    console.log('Revenue ledger and monetization tables initialized.');
  } catch (error) {
    console.error('Revenue ledger initialization failed:', error);
    if (process.env.REVENUE_REQUIRED === 'true') process.exit(1);
  }

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Glorifier AI server listening on 0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});    if (result.inserted) {
      const nextStatus = event.status === 'paid' ? 'paid' : event.status;
      await db.query('UPDATE marketplace_transactions SET status=$1,revenue_event_id=$2,updated_at=NOW() WHERE id=$3 AND user_reference=$4', [nextStatus, event.eventId, transactionId, userReference]);
    }

