import crypto from 'node:crypto';
import { getPostgresPool } from '../db/postgres';

export type ModelTrustStatus = 'unknown' | 'probation' | 'trusted' | 'degraded' | 'quarantined';
export type ModelThreatType = 'unsupported_claim' | 'policy_violation' | 'authorization_bypass' | 'fabricated_evidence' | 'malicious_instruction' | 'runtime_anomaly';

export interface ModelTrustRecord {
  id: string;
  provider: string;
  model: string;
  status: ModelTrustStatus;
  riskScore: number;
  capabilityScore: number;
  violationCount: number;
  lastSeenAt: string;
  metadata: Record<string, unknown>;
}

export async function initializeModelTrustRegistry() {
  const db = getPostgresPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS ai_model_trust_registry (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unknown',
      risk_score INTEGER NOT NULL DEFAULT 0,
      capability_score INTEGER NOT NULL DEFAULT 50,
      violation_count INTEGER NOT NULL DEFAULT 0,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, model)
    );
    CREATE INDEX IF NOT EXISTS idx_ai_model_trust_status ON ai_model_trust_registry(status);
    CREATE TABLE IF NOT EXISTS ai_model_security_events (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL REFERENCES ai_model_trust_registry(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      evidence_ref TEXT,
      details JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ai_model_security_events_model_time ON ai_model_security_events(model_id, created_at DESC);
  `);
}

export async function registerOrObserveModel(input: {
  provider: string;
  model: string;
  capabilityScore?: number;
  metadata?: Record<string, unknown>;
}) {
  await initializeModelTrustRegistry();
  const id = `model-${crypto.createHash('sha256').update(`${input.provider}:${input.model}`).digest('hex').slice(0, 24)}`;
  const r = await getPostgresPool().query(
    `INSERT INTO ai_model_trust_registry(id,provider,model,status,capability_score,metadata,last_seen_at)
     VALUES($1,$2,$3,'probation',$4,$5,NOW())
     ON CONFLICT(provider,model) DO UPDATE SET
       capability_score=EXCLUDED.capability_score,
       metadata=EXCLUDED.metadata,
       last_seen_at=NOW(),
       updated_at=NOW()
     RETURNING *`,
    [id, input.provider, input.model, input.capabilityScore ?? 50, JSON.stringify(input.metadata || {})]
  );
  return mapModel(r.rows[0]);
}

export async function getModelTrust(provider: string, model: string) {
  await initializeModelTrustRegistry();
  const r = await getPostgresPool().query(
    'SELECT * FROM ai_model_trust_registry WHERE provider=$1 AND model=$2',
    [provider, model]
  );
  return r.rows[0] ? mapModel(r.rows[0]) : null;
}

export async function listModelTrust(status?: ModelTrustStatus) {
  await initializeModelTrustRegistry();
  const r = status
    ? await getPostgresPool().query('SELECT * FROM ai_model_trust_registry WHERE status=$1 ORDER BY provider,model', [status])
    : await getPostgresPool().query('SELECT * FROM ai_model_trust_registry ORDER BY provider,model');
  return r.rows.map(mapModel);
}

export async function recordModelSecurityEvent(input: {
  provider: string;
  model: string;
  eventType: ModelThreatType;
  severity?: 'info' | 'warning' | 'critical';
  evidenceRef?: string | null;
  details?: Record<string, unknown>;
}) {
  const model = await registerOrObserveModel({ provider: input.provider, model: input.model });
  const db = getPostgresPool();
  const severity = input.severity || 'warning';
  const violationIncrement = severity === 'critical' || severity === 'warning' ? 1 : 0;
  const nextRisk = Math.min(100, model.riskScore + (severity === 'critical' ? 35 : severity === 'warning' ? 15 : 0));
  const nextViolations = model.violationCount + violationIncrement;
  const nextStatus: ModelTrustStatus =
    nextViolations >= 3 || nextRisk >= 80 ? 'quarantined' :
    nextRisk >= 50 ? 'degraded' : model.status === 'trusted' ? 'trusted' : 'probation';

  await db.query(
    'INSERT INTO ai_model_security_events(id,model_id,event_type,severity,evidence_ref,details) VALUES($1,$2,$3,$4,$5,$6)',
    [`mse-${crypto.randomUUID()}`, model.id, input.eventType, severity, input.evidenceRef || null, JSON.stringify(input.details || {})]
  );
  const r = await db.query(
    'UPDATE ai_model_trust_registry SET risk_score=$2,violation_count=$3,status=$4,updated_at=NOW() WHERE id=$1 RETURNING *',
    [model.id, nextRisk, nextViolations, nextStatus]
  );
  return mapModel(r.rows[0]);
}

export async function setModelTrustStatus(provider: string, model: string, status: ModelTrustStatus, actor = 'human-owner') {
  await initializeModelTrustRegistry();
  const current = await getModelTrust(provider, model);
  const observed = current || await registerOrObserveModel({ provider, model });
  const r = await getPostgresPool().query(
    'UPDATE ai_model_trust_registry SET status=$2,metadata=metadata || $3::jsonb,updated_at=NOW() WHERE id=$1 RETURNING *',
    [observed.id, status, JSON.stringify({ lastStatusChangeActor: actor, lastStatusChangeAt: new Date().toISOString() })]
  );
  await getPostgresPool().query(
    'INSERT INTO ai_model_security_events(id,model_id,event_type,severity,details) VALUES($1,$2,$3,$4,$5)',
    [`mse-${crypto.randomUUID()}`, observed.id, 'runtime_anomaly', 'info', JSON.stringify({ action: 'status_change', status, actor })]
  );
  return mapModel(r.rows[0]);
}

export function modelCanRun(model: ModelTrustRecord | null) {
  if (!model) return true;
  return model.status !== 'quarantined';
}

function mapModel(x: any): ModelTrustRecord {
  return {
    id: x.id,
    provider: x.provider,
    model: x.model,
    status: x.status,
    riskScore: Number(x.risk_score || 0),
    capabilityScore: Number(x.capability_score || 50),
    violationCount: Number(x.violation_count || 0),
    lastSeenAt: new Date(x.last_seen_at).toISOString(),
    metadata: x.metadata || {}
  };
}
