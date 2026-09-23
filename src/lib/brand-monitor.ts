import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';

export type BrandTermType = 'brand' | 'phrase' | 'slogan' | 'product' | 'domain' | 'social_handle';
export type BrandObservationClassification = 'owned_or_authorized' | 'likely_unrelated' | 'possible_confusion_or_infringement' | 'needs_review';
export type BrandReviewStatus = 'new' | 'reviewed' | 'dismissed' | 'escalated';

export interface BrandTerm {
  id: string; term: string; termType: BrandTermType; status: 'monitored' | 'archived';
  jurisdictions: string[]; ownershipEvidence: string[]; notes: string | null;
}
export interface BrandObservation {
  id: string; termId: string; sourceType: string; sourceUrl: string; sourceName: string;
  observedAt: string; matchedText: string; context: string; classification: BrandObservationClassification;
  confidence: number; evidenceHash: string; reviewStatus: BrandReviewStatus;
}

export const DEFAULT_BRAND_TERMS: BrandTerm[] = [
  { id:'glorifier', term:'GLORIFIER', termType:'brand', status:'monitored', jurisdictions:[], ownershipEvidence:[], notes:'Primary brand term; legal status must be verified per jurisdiction.' },
  { id:'glorifier-services', term:'Glorifier Services', termType:'brand', status:'monitored', jurisdictions:[], ownershipEvidence:[], notes:null },
  { id:'glorifier-services-advertising', term:'Glorifier Services Advertising', termType:'brand', status:'monitored', jurisdictions:[], ownershipEvidence:[], notes:null },
  { id:'glorifier-ai', term:'GLORIFIER AI', termType:'product', status:'monitored', jurisdictions:[], ownershipEvidence:[], notes:null },
];

export async function initializeBrandMonitorTables() {
  const db = getPostgresPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS brand_terms (
      id TEXT PRIMARY KEY, term TEXT NOT NULL UNIQUE, term_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'monitored', jurisdictions JSONB NOT NULL DEFAULT '[]',
      ownership_evidence JSONB NOT NULL DEFAULT '[]', notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS brand_observations (
      id TEXT PRIMARY KEY, term_id TEXT NOT NULL REFERENCES brand_terms(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL, source_url TEXT NOT NULL, source_name TEXT NOT NULL,
      observed_at TIMESTAMPTZ NOT NULL, matched_text TEXT NOT NULL, context TEXT NOT NULL DEFAULT '',
      classification TEXT NOT NULL, confidence NUMERIC(5,4) NOT NULL DEFAULT 0,
      evidence_hash TEXT NOT NULL, review_status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_brand_observations_term_time ON brand_observations(term_id, observed_at DESC);
    CREATE TABLE IF NOT EXISTS brand_alerts (
      id TEXT PRIMARY KEY, observation_id TEXT NOT NULL REFERENCES brand_observations(id) ON DELETE CASCADE,
      severity TEXT NOT NULL, reason TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      acknowledged_at TIMESTAMPTZ, action_status TEXT NOT NULL DEFAULT 'pending'
    );
  `);
  for (const term of DEFAULT_BRAND_TERMS) {
    await db.query(`INSERT INTO brand_terms(id,term,term_type,status,jurisdictions,ownership_evidence,notes)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(term) DO NOTHING`,
      [term.id, term.term, term.termType, term.status, JSON.stringify(term.jurisdictions), JSON.stringify(term.ownershipEvidence), term.notes]);
  }
}

export async function listBrandTerms(): Promise<BrandTerm[]> {
  await initializeBrandMonitorTables();
  const r = await getPostgresPool().query('SELECT id,term,term_type,status,jurisdictions,ownership_evidence,notes FROM brand_terms ORDER BY term');
  return r.rows.map(x=>({id:x.id,term:x.term,termType:x.term_type,status:x.status,jurisdictions:x.jurisdictions||[],ownershipEvidence:x.ownership_evidence||[],notes:x.notes}));
}

export async function addBrandTerm(input: Partial<BrandTerm> & { term: string }) {
  await initializeBrandMonitorTables();
  const id = input.id || `term-${crypto.randomUUID()}`;
  const r = await getPostgresPool().query(`INSERT INTO brand_terms(id,term,term_type,status,jurisdictions,ownership_evidence,notes)
    VALUES($1,$2,$3,'monitored',$4,$5,$6) RETURNING id,term,term_type,status,jurisdictions,ownership_evidence,notes`,
    [id,input.term.trim(),input.termType||'phrase',JSON.stringify(input.jurisdictions||[]),JSON.stringify(input.ownershipEvidence||[]),input.notes||null]);
  const x=r.rows[0]; return {id:x.id,term:x.term,termType:x.term_type,status:x.status,jurisdictions:x.jurisdictions||[],ownershipEvidence:x.ownership_evidence||[],notes:x.notes};
}

export async function recordBrandObservation(input: Omit<BrandObservation,'id'|'evidenceHash'|'reviewStatus'>) {
  await initializeBrandMonitorTables();
  const evidenceHash = crypto.createHash('sha256').update(JSON.stringify({
    termId:input.termId, sourceUrl:input.sourceUrl, observedAt:input.observedAt, matchedText:input.matchedText, context:input.context
  })).digest('hex');
  const id = `obs-${crypto.randomUUID()}`;
  const r = await getPostgresPool().query(`INSERT INTO brand_observations
    (id,term_id,source_type,source_url,source_name,observed_at,matched_text,context,classification,confidence,evidence_hash,review_status)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'new') RETURNING *`,
    [id,input.termId,input.sourceType,input.sourceUrl,input.sourceName,input.observedAt,input.matchedText,input.context,input.classification,input.confidence,evidenceHash]);
  if (input.classification==='possible_confusion_or_infringement') {
    await getPostgresPool().query(`INSERT INTO brand_alerts(id,observation_id,severity,reason) VALUES($1,$2,'high',$3)`,
      [`alert-${crypto.randomUUID()}`,id,'Possible brand confusion or infringement requires human/legal review.']);
  }
  return r.rows[0];
}

export async function listBrandObservations(limit=100): Promise<BrandObservation[]> {
  await initializeBrandMonitorTables();
  const r=await getPostgresPool().query(`SELECT id,term_id,source_type,source_url,source_name,observed_at,matched_text,context,classification,confidence,evidence_hash,review_status
    FROM brand_observations ORDER BY observed_at DESC LIMIT $1`,[Math.min(Math.max(limit,1),500)]);
  return r.rows.map(x=>({...x,observedAt:new Date(x.observed_at).toISOString(),confidence:Number(x.confidence)}));
}

export async function listBrandAlerts(limit=100) {
  await initializeBrandMonitorTables();
  const r=await getPostgresPool().query(`SELECT id,observation_id,severity,reason,created_at,acknowledged_at,action_status
    FROM brand_alerts ORDER BY created_at DESC LIMIT $1`,[Math.min(Math.max(limit,1),500)]);
  return r.rows.map(x=>({...x,createdAt:new Date(x.created_at).toISOString(),acknowledgedAt:x.acknowledged_at?new Date(x.acknowledged_at).toISOString():null}));
}

export function classifyBrandMatch(term:string, matchedText:string, sourceUrl:string): BrandObservationClassification {
  const lower=matchedText.toLowerCase();
  if (lower === term.toLowerCase()) return 'needs_review';
  if (/official|authorized|partner|owned by glorifier/i.test(lower)) return 'owned_or_authorized';
  if (/github\.com\/glorifier7/i.test(sourceUrl) || /glorifier/i.test(sourceUrl)) return 'needs_review';
  return 'likely_unrelated';
}
