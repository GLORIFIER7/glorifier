import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';

export type ClaimableType = 'voucher' | 'crypto_reward' | 'airdrop' | 'credit' | 'special_subscription' | 'gaming_reward' | 'other';
export type ClaimableStatus = 'discovered' | 'eligible' | 'claim_prepared' | 'awaiting_human_approval' | 'claimed' | 'expired' | 'rejected';
export type VerificationStatus = 'not_verified' | 'verified';

export interface ClaimableAsset {
  id: string;
  provider: string;
  type: ClaimableType;
  title: string;
  description?: string | null;
  status: ClaimableStatus;
  verificationStatus: VerificationStatus;
  estimatedValue?: number | null;
  currency?: string | null;
  expiresAt?: string | null;
  claimUrl?: string | null;
  source?: string | null;
  evidenceRef?: string | null;
  priority: number;
  requiresHumanApproval: boolean;
  metadata: Record<string, unknown>;
}

export async function initializeClaimableAssetRegistry() {
  const db = getPostgresPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS claimable_asset_registry (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      claimable_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'discovered',
      verification_status TEXT NOT NULL DEFAULT 'not_verified',
      estimated_value NUMERIC,
      currency TEXT,
      expires_at TIMESTAMPTZ,
      claim_url TEXT,
      source TEXT,
      evidence_ref TEXT,
      priority INTEGER NOT NULL DEFAULT 50,
      requires_human_approval BOOLEAN NOT NULL DEFAULT TRUE,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_claimable_status_priority ON claimable_asset_registry(status, priority DESC);
    CREATE INDEX IF NOT EXISTS idx_claimable_type ON claimable_asset_registry(claimable_type);
    CREATE INDEX IF NOT EXISTS idx_claimable_expiry ON claimable_asset_registry(expires_at);
    CREATE TABLE IF NOT EXISTS claimable_asset_evidence (
      id TEXT PRIMARY KEY,
      claimable_asset_id TEXT NOT NULL REFERENCES claimable_asset_registry(id) ON DELETE CASCADE,
      evidence_type TEXT NOT NULL,
      source TEXT NOT NULL,
      source_ref TEXT,
      observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      payload_hash TEXT,
      details JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_claimable_evidence_asset_time ON claimable_asset_evidence(claimable_asset_id, observed_at DESC);
    CREATE TABLE IF NOT EXISTS claim_requests (
      id TEXT PRIMARY KEY,
      claimable_asset_id TEXT NOT NULL REFERENCES claimable_asset_registry(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'awaiting_human_approval',
      requested_by TEXT NOT NULL,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      details JSONB NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_claim_requests_asset ON claim_requests(claimable_asset_id, requested_at DESC);
  `);
}

export async function registerClaimableAsset(input: Partial<ClaimableAsset> & { provider: string; title: string }) {
  await initializeClaimableAssetRegistry();
  const id = input.id || `claimable-${crypto.randomUUID()}`;
  const r = await getPostgresPool().query(
    `INSERT INTO claimable_asset_registry
      (id,provider,claimable_type,title,description,status,verification_status,estimated_value,currency,expires_at,claim_url,source,evidence_ref,priority,requires_human_approval,metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT(id) DO UPDATE SET
       provider=EXCLUDED.provider, claimable_type=EXCLUDED.claimable_type, title=EXCLUDED.title,
       description=EXCLUDED.description, status=EXCLUDED.status, verification_status=EXCLUDED.verification_status,
       estimated_value=EXCLUDED.estimated_value, currency=EXCLUDED.currency, expires_at=EXCLUDED.expires_at,
       claim_url=EXCLUDED.claim_url, source=EXCLUDED.source, evidence_ref=EXCLUDED.evidence_ref,
       priority=EXCLUDED.priority, requires_human_approval=EXCLUDED.requires_human_approval,
       metadata=EXCLUDED.metadata, updated_at=NOW()
     RETURNING *`,
    [
      id, input.provider, input.type || 'other', input.title, input.description || null,
      input.status || 'discovered', 'not_verified', input.estimatedValue ?? null, input.currency || null,
      input.expiresAt || null, input.claimUrl || null, input.source || null, input.evidenceRef || null,
      Math.max(0, Math.min(100, Math.round(Number(input.priority ?? 50)))),
      input.requiresHumanApproval !== false, JSON.stringify(input.metadata || {})
    ]
  );
  return mapClaimable(r.rows[0]);
}

export async function listClaimableAssets(status?: ClaimableStatus) {
  await initializeClaimableAssetRegistry();
  const r = status
    ? await getPostgresPool().query('SELECT * FROM claimable_asset_registry WHERE status=$1 ORDER BY priority DESC, expires_at NULLS LAST, created_at DESC',[status])
    : await getPostgresPool().query("SELECT * FROM claimable_asset_registry WHERE status NOT IN ('claimed','rejected') ORDER BY priority DESC, expires_at NULLS LAST, created_at DESC");
  return r.rows.map(mapClaimable);
}

export async function scanClaimableFocus() {
  await initializeClaimableAssetRegistry();
  const db = getPostgresPool();
  const r = await db.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status IN ('discovered','eligible','claim_prepared','awaiting_human_approval'))::int AS active,
      COUNT(*) FILTER (WHERE verification_status='verified')::int AS verified,
      COUNT(*) FILTER (WHERE verification_status='not_verified')::int AS not_verified,
      COALESCE(SUM(estimated_value) FILTER (WHERE verification_status='not_verified'),0)::numeric AS estimated_not_verified_value,
      COALESCE(SUM(estimated_value) FILTER (WHERE verification_status='verified'),0)::numeric AS verified_value
    FROM claimable_asset_registry
    WHERE status NOT IN ('rejected')
  `);
  const byType = await db.query(`SELECT claimable_type, COUNT(*)::int AS count FROM claimable_asset_registry WHERE status NOT IN ('claimed','rejected') GROUP BY claimable_type ORDER BY count DESC`);
  return {
    focus: ['voucher','crypto_reward','airdrop','credit','special_subscription','gaming_reward'],
    summary: {
      total: Number(r.rows[0]?.total || 0),
      active: Number(r.rows[0]?.active || 0),
      verified: Number(r.rows[0]?.verified || 0),
      notVerified: Number(r.rows[0]?.not_verified || 0),
      estimatedNotVerifiedValue: Number(r.rows[0]?.estimated_not_verified_value || 0),
      verifiedValue: Number(r.rows[0]?.verified_value || 0)
    },
    byType: byType.rows.map((x:any) => ({ type:x.claimable_type, count:Number(x.count) })),
    economicRule: 'Estimated claimable value is NOT VERIFIED until qualifying evidence is recorded. Claimable value is not automatically revenue.'
  };
}

export async function recordClaimableEvidence(id: string, input: any) {
  await initializeClaimableAssetRegistry();
  const exists = await getPostgresPool().query('SELECT id FROM claimable_asset_registry WHERE id=$1',[id]);
  if (!exists.rows[0]) throw new Error('Claimable asset not found');
  const evidenceId = `cae-${crypto.randomUUID()}`;
  await getPostgresPool().query(
    `INSERT INTO claimable_asset_evidence(id,claimable_asset_id,evidence_type,source,source_ref,observed_at,payload_hash,details)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [evidenceId,id,String(input?.evidenceType || 'source_observation'),String(input?.source || 'unknown'),input?.sourceRef || null,input?.observedAt || new Date().toISOString(),input?.payloadHash || null,JSON.stringify(input?.details || {})]
  );
  const verified = input?.qualifiesForVerification === true;
  await getPostgresPool().query(
    `UPDATE claimable_asset_registry SET verification_status=$2, status=CASE WHEN $2='verified' AND status='discovered' THEN 'eligible' ELSE status END, updated_at=NOW() WHERE id=$1`,
    [id, verified ? 'verified' : 'not_verified']
  );
  return { id:evidenceId, claimableAssetId:id, verificationStatus:verified ? 'verified' : 'not_verified' };
}

export async function requestClaim(id: string, requestedBy: string) {
  await initializeClaimableAssetRegistry();
  const asset = await getPostgresPool().query('SELECT * FROM claimable_asset_registry WHERE id=$1',[id]);
  if (!asset.rows[0]) throw new Error('Claimable asset not found');
  const a = asset.rows[0];
  if (a.status === 'expired' || a.status === 'rejected' || a.status === 'claimed') throw new Error(`Claim cannot be prepared from status: ${a.status}`);
  const requestId = `claim-request-${crypto.randomUUID()}`;
  await getPostgresPool().query(
    'INSERT INTO claim_requests(id,claimable_asset_id,status,requested_by,details) VALUES($1,$2,$3,$4,$5)',
    [requestId,id,'awaiting_human_approval',requestedBy,JSON.stringify({verificationStatus:a.verification_status,estimatedValue:a.estimated_value,currency:a.currency})]
  );
  await getPostgresPool().query("UPDATE claimable_asset_registry SET status='awaiting_human_approval', updated_at=NOW() WHERE id=$1",[id]);
  return { id:requestId, claimableAssetId:id, status:'awaiting_human_approval', humanApprovalRequired:true, executionEnabled:false };
}

function mapClaimable(x:any): ClaimableAsset {
  return {
    id:x.id, provider:x.provider, type:x.claimable_type, title:x.title, description:x.description || null,
    status:x.status, verificationStatus:x.verification_status, estimatedValue:x.estimated_value == null ? null : Number(x.estimated_value),
    currency:x.currency || null, expiresAt:x.expires_at ? new Date(x.expires_at).toISOString() : null,
    claimUrl:x.claim_url || null, source:x.source || null, evidenceRef:x.evidence_ref || null,
    priority:Number(x.priority || 0), requiresHumanApproval:Boolean(x.requires_human_approval), metadata:x.metadata || {}
  };
}
