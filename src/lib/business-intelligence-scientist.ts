import { getPostgresPool } from './db/postgres';
import crypto from 'node:crypto';

export const GLORIFIER_BI_SCIENTIST_VERSION = 'GBIS-2.0';

export const BI_DOMAINS = [
  'market-intelligence','competitive-intelligence','customer-intelligence','product-intelligence',
  'sales-intelligence','marketing-intelligence','operations-intelligence','financial-intelligence',
  'pricing-intelligence','supply-chain-intelligence','risk-intelligence','workforce-intelligence',
  'technology-intelligence','cloud-intelligence','cybersecurity-intelligence','data-intelligence',
  'regulatory-intelligence','ip-intelligence','asset-intelligence','iot-intelligence',
  'ecosystem-intelligence','partner-intelligence','marketplace-intelligence','revenue-intelligence',
  'scenario-intelligence','early-warning','opportunity-intelligence'
] as const;

export const BI_WORK_CYCLE = [
  'Discover','Ingest','Normalize','Validate','Catalog','Model','Observe','Explain',
  'Predict','Simulate','Prioritize','Recommend','Govern','Measure','Learn','Improve'
] as const;

export async function initializeBusinessIntelligenceScientist() {
  const db=getPostgresPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS glorifier_bi_observations (
      id TEXT PRIMARY KEY, domain TEXT NOT NULL, source TEXT NOT NULL, source_ref TEXT,
      subject TEXT NOT NULL, metric TEXT, value NUMERIC, unit TEXT, observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      evidence_status TEXT NOT NULL DEFAULT 'not_verified', confidence NUMERIC, metadata JSONB NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_gbis_obs_domain_time ON glorifier_bi_observations(domain,observed_at DESC);
    CREATE TABLE IF NOT EXISTS glorifier_bi_signals (
      id TEXT PRIMARY KEY, domain TEXT NOT NULL, signal_type TEXT NOT NULL, title TEXT NOT NULL,
      description TEXT NOT NULL, evidence_refs JSONB NOT NULL DEFAULT '[]', confidence NUMERIC,
      impact_estimate NUMERIC, status TEXT NOT NULL DEFAULT 'observed',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS glorifier_bi_entities (
      id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_ref TEXT NOT NULL,
      name TEXT NOT NULL, source_refs JSONB NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'observed',
      metadata JSONB NOT NULL DEFAULT '{}', UNIQUE(entity_type,entity_ref)
    );
    CREATE TABLE IF NOT EXISTS glorifier_bi_metric_definitions (
      id TEXT PRIMARY KEY, metric_key TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      definition TEXT NOT NULL, formula TEXT, unit TEXT, source_requirements JSONB NOT NULL DEFAULT '[]',
      economic_truth_label TEXT NOT NULL DEFAULT 'NOT VERIFIED', metadata JSONB NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS glorifier_bi_watchlist (
      id TEXT PRIMARY KEY, domain TEXT NOT NULL, subject TEXT NOT NULL, watch_type TEXT NOT NULL,
      cadence_minutes INTEGER NOT NULL DEFAULT 60, enabled BOOLEAN NOT NULL DEFAULT TRUE,
      last_run_at TIMESTAMPTZ, next_run_at TIMESTAMPTZ, metadata JSONB NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS glorifier_bi_decision_records (
      id TEXT PRIMARY KEY, objective TEXT NOT NULL, recommendation TEXT NOT NULL,
      evidence_refs JSONB NOT NULL DEFAULT '[]', alternatives JSONB NOT NULL DEFAULT '[]',
      uncertainty JSONB NOT NULL DEFAULT '{}', governance_event_id TEXT, human_decision TEXT,
      status TEXT NOT NULL DEFAULT 'prepared', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS glorifier_bi_data_products (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, domain TEXT NOT NULL, version TEXT,
      provenance JSONB NOT NULL DEFAULT '{}', quality JSONB NOT NULL DEFAULT '{}',
      access_policy JSONB NOT NULL DEFAULT '{}', monetization_ref TEXT,
      evidence_status TEXT NOT NULL DEFAULT 'not_verified', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export function getBusinessIntelligenceScientistPolicy() {
  return {
    version:GLORIFIER_BI_SCIENTIST_VERSION,
    mission:'Continuously turn governed multi-source data into evidence-backed business intelligence, decisions, scenarios and opportunities.',
    domains:[...BI_DOMAINS],
    cycle:[...BI_WORK_CYCLE],
    architecture:[
      'Sources & Connections','Evidence & Provenance','Data Quality','Catalog & Lineage',
      'Semantic Layer','Metrics & KPIs','BI & Analytics','Forecasting & Scenarios',
      'Competitive/Market Intelligence','Opportunity Detection','Decision Intelligence',
      'Data Products','Revenue Control Plane','Human Authority'
    ],
    principles:{
      evidenceFirst:true, sourceProvenance:true, lineageRequired:true, semanticConsistency:true,
      conflictingSourcesMustBeSurfaced:true, uncertaintyMustBeDisplayed:true,
      estimatesAreNotFacts:true, missingEvidenceIsNotZero:true,
      marketValueIsNotRevenue:true, expectedValueIsNotRevenue:true,
      autonomousContracting:false, autonomousPaymentMovement:false
    },
    continuousOperation:{
      enabled:true,
      cadence:'continuous/event-driven plus scheduled watchlists',
      autonomousObservation:true,
      autonomousAnalysis:true,
      autonomousRecommendation:true,
      autonomousIrreversibleAction:false,
      humanApprovalForConsequentialActions:true
    }
  };
}

export async function recordBusinessIntelligenceObservation(input:{
  domain:string; source:string; sourceRef?:string; subject:string; metric?:string;
  value?:number|null; unit?:string|null; observedAt?:string; evidenceStatus?:string;
  confidence?:number|null; metadata?:Record<string,unknown>;
}) {
  await initializeBusinessIntelligenceScientist();
  const r=await getPostgresPool().query(`
    INSERT INTO glorifier_bi_observations(id,domain,source,source_ref,subject,metric,value,unit,observed_at,evidence_status,confidence,metadata)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [`bi-obs-${crypto.randomUUID()}`,input.domain,input.source,input.sourceRef||null,input.subject,input.metric||null,
      input.value??null,input.unit||null,input.observedAt||new Date().toISOString(),input.evidenceStatus||'not_verified',
      input.confidence??null,JSON.stringify(input.metadata||{})]);
  return r.rows[0];
}

export async function recordBusinessIntelligenceSignal(input:{
  domain:string; signalType:string; title:string; description:string; evidenceRefs?:string[];
  confidence?:number|null; impactEstimate?:number|null; metadata?:Record<string,unknown>;
}) {
  await initializeBusinessIntelligenceScientist();
  const r=await getPostgresPool().query(`
    INSERT INTO glorifier_bi_signals(id,domain,signal_type,title,description,evidence_refs,confidence,impact_estimate)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [`bi-signal-${crypto.randomUUID()}`,input.domain,input.signalType,input.title,input.description,
      JSON.stringify(input.evidenceRefs||[]),input.confidence??null,input.impactEstimate??null]);
  return r.rows[0];
}

export async function registerBusinessIntelligenceWatch(input:{
  domain:string; subject:string; watchType:string; cadenceMinutes?:number; metadata?:Record<string,unknown>;
}) {
  await initializeBusinessIntelligenceScientist();
  const id=`bi-watch-${crypto.randomUUID()}`;
  const cadence=Math.max(5,Math.floor(input.cadenceMinutes||60));
  const next=new Date(Date.now()+cadence*60000).toISOString();
  const r=await getPostgresPool().query(`
    INSERT INTO glorifier_bi_watchlist(id,domain,subject,watch_type,cadence_minutes,next_run_at,metadata)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [id,input.domain,input.subject,input.watchType,cadence,next,JSON.stringify(input.metadata||{})]);
  return r.rows[0];
}

export async function getBusinessIntelligenceSnapshot() {
  await initializeBusinessIntelligenceScientist();
  const db=getPostgresPool();
  const [obs,signals,watches,entities,products,decisions]=await Promise.all([
    db.query('SELECT COUNT(*)::int count FROM glorifier_bi_observations'),
    db.query("SELECT signal_type,COUNT(*)::int count FROM glorifier_bi_signals WHERE status='observed' GROUP BY signal_type ORDER BY count DESC"),
    db.query('SELECT COUNT(*)::int count FROM glorifier_bi_watchlist WHERE enabled=true'),
    db.query('SELECT COUNT(*)::int count FROM glorifier_bi_entities'),
    db.query('SELECT COUNT(*)::int count FROM glorifier_bi_data_products'),
    db.query("SELECT COUNT(*)::int count FROM glorifier_bi_decision_records WHERE status='prepared'")
  ]);
  return {
    version:GLORIFIER_BI_SCIENTIST_VERSION,
    policy:getBusinessIntelligenceScientistPolicy(),
    counts:{observations:Number(obs.rows[0].count),signals:Number(signals.rows.reduce((n:any,x:any)=>n+Number(x.count),0)),activeWatchlists:Number(watches.rows[0].count),entities:Number(entities.rows[0].count),dataProducts:Number(products.rows[0].count),preparedDecisions:Number(decisions.rows[0].count)},
    signalTypes:signals.rows
  };
}
