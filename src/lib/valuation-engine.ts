import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';

/**
 * GLORIFIER Valuation Engine
 * GVE-1.0
 *
 * Purpose:
 * - calculate an evidence-backed valuation range from observed company evidence
 * - never convert estimates, market-value observations, or projections into verified revenue
 * - keep personal/user asset holdings out of enterprise value unless explicitly recorded
 *   as company-owned valuation evidence
 *
 * Methodology:
 * 1. Comparable/Scorecard: median comparable valuation adjusted by transparent factors.
 * 2. Revenue multiple: only when GLORIFIER has verified revenue AND comparable revenue data.
 * 3. Evidence floor: company-owned IP/assets/development evidence can be reported as an
 *    evidence floor, but is not automatically treated as fair market value.
 *
 * The output is an estimate, not an appraisal, financing offer, tax value, 409A value,
 * fairness opinion, or transaction price.
 */

export const GLORIFIER_VALUATION_ENGINE_VERSION = 'GVE-1.0';

export type ValuationEvidenceStatus = 'not_verified' | 'evidence_backed' | 'verified';
export type ValuationEvidenceCategory =
  | 'ip'
  | 'product'
  | 'deployment'
  | 'customer'
  | 'revenue'
  | 'asset'
  | 'traction'
  | 'team'
  | 'market'
  | 'comparable'
  | 'other';

export interface ValuationEvidenceInput {
  category: ValuationEvidenceCategory;
  metric: string;
  value: number;
  currency?: string | null;
  evidenceStatus?: ValuationEvidenceStatus;
  sourceRef?: string | null;
  observedAt?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ValuationComparableInput {
  name: string;
  sector: string;
  stage?: string | null;
  geography?: string | null;
  valuation: number;
  currency?: string;
  revenue?: number | null;
  revenuePeriod?: string | null;
  evidenceStatus?: ValuationEvidenceStatus;
  sourceRef: string;
  observedAt?: string | null;
  notes?: string | null;
}

const SCORECARD_WEIGHTS = {
  management: 0.30,
  opportunity: 0.25,
  productTechnology: 0.15,
  competitiveEnvironment: 0.10,
  salesMarketing: 0.10,
  financingNeed: 0.05,
  other: 0.05
} as const;

export async function initializeValuationEngine() {
  const db = getPostgresPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS glorifier_valuation_evidence (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      metric TEXT NOT NULL,
      value NUMERIC NOT NULL,
      currency TEXT DEFAULT 'USD',
      evidence_status TEXT NOT NULL DEFAULT 'not_verified',
      source_ref TEXT,
      observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_gve_evidence_category ON glorifier_valuation_evidence(category, observed_at DESC);

    CREATE TABLE IF NOT EXISTS glorifier_valuation_comparables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sector TEXT NOT NULL,
      stage TEXT,
      geography TEXT,
      valuation NUMERIC NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      revenue NUMERIC,
      revenue_period TEXT,
      evidence_status TEXT NOT NULL DEFAULT 'not_verified',
      source_ref TEXT NOT NULL,
      observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_gve_comparables_sector ON glorifier_valuation_comparables(sector, observed_at DESC);

    CREATE TABLE IF NOT EXISTS glorifier_valuation_runs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      low_value NUMERIC,
      high_value NUMERIC,
      midpoint NUMERIC,
      confidence NUMERIC,
      methods JSONB NOT NULL DEFAULT '{}',
      inputs JSONB NOT NULL DEFAULT '{}',
      limitations JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_gve_runs_created ON glorifier_valuation_runs(created_at DESC);
  `);
}

export async function recordValuationEvidence(input: ValuationEvidenceInput) {
  await initializeValuationEngine();
  const id = `gve-${crypto.randomUUID()}`;
  const r = await getPostgresPool().query(
    `INSERT INTO glorifier_valuation_evidence
      (id,category,metric,value,currency,evidence_status,source_ref,observed_at,notes,metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7,COALESCE($8,NOW()),$9,$10) RETURNING *`,
    [
      id, input.category, input.metric, Number(input.value), input.currency || 'USD',
      input.evidenceStatus || 'not_verified', input.sourceRef || null,
      input.observedAt || null, input.notes || null, JSON.stringify(input.metadata || {})
    ]
  );
  return mapEvidence(r.rows[0]);
}

export async function listValuationEvidence(category?: string) {
  await initializeValuationEngine();
  const r = await getPostgresPool().query(
    `SELECT * FROM glorifier_valuation_evidence
     ${category ? 'WHERE category=$1' : ''}
     ORDER BY observed_at DESC LIMIT 1000`,
    category ? [category] : []
  );
  return r.rows.map(mapEvidence);
}

export async function recordValuationComparable(input: ValuationComparableInput) {
  await initializeValuationEngine();
  if (!input.sourceRef?.trim()) throw new Error('Comparable requires a sourceRef.');
  const id = `gvc-${crypto.randomUUID()}`;
  const r = await getPostgresPool().query(
    `INSERT INTO glorifier_valuation_comparables
      (id,name,sector,stage,geography,valuation,currency,revenue,revenue_period,evidence_status,source_ref,observed_at,notes,metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12,NOW()),$13,$14) RETURNING *`,
    [
      id, input.name, input.sector, input.stage || null, input.geography || null,
      Number(input.valuation), input.currency || 'USD',
      input.revenue == null ? null : Number(input.revenue),
      input.revenuePeriod || null, input.evidenceStatus || 'not_verified',
      input.sourceRef, input.observedAt || null, input.notes || null, JSON.stringify({})
    ]
  );
  return mapComparable(r.rows[0]);
}

export async function listValuationComparables() {
  await initializeValuationEngine();
  const r = await getPostgresPool().query(
    'SELECT * FROM glorifier_valuation_comparables ORDER BY observed_at DESC LIMIT 500'
  );
  return r.rows.map(mapComparable);
}

function median(values: number[]) {
  const sorted = [...values].filter(Number.isFinite).sort((a,b)=>a-b);
  if (!sorted.length) return null;
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m-1] + sorted[m]) / 2;
}

function percentile(values: number[], p: number) {
  const sorted = [...values].filter(Number.isFinite).sort((a,b)=>a-b);
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
}

async function collectObservedInputs() {
  const db = getPostgresPool();

  const [
    activeCustomers,
    verifiedRevenue,
    workUnits,
    connections,
    ipRuns,
    inventions,
    iotDevices,
    opportunities,
    claimables,
    companyEvidence,
    comparables
  ] = await Promise.all([
    db.query(`SELECT COUNT(DISTINCT tenant_id)::int AS count FROM saas_subscriptions WHERE status IN ('active','trialing') AND tenant_id IS NOT NULL`),
    db.query(`
      SELECT COALESCE(SUM(amount),0) AS total
      FROM bounty_revenue_ledger
      WHERE status='confirmed'
        AND event_type IN ('reward-received','payout-recorded')
        AND external_ref IS NOT NULL AND external_ref <> ''
    `),
    db.query(`SELECT COUNT(*)::int AS executions, COALESCE(SUM(units),0) AS units FROM glorifier_work_units`),
    db.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='authorized')::int AS authorized FROM connection_registry`),
    db.query(`SELECT COUNT(*)::int AS count FROM glorifier_ip_research_runs`),
    db.query(`SELECT COUNT(*)::int AS count FROM glorifier_inventions`),
    db.query(`SELECT COUNT(*)::int AS count FROM iot_devices WHERE status <> 'disabled'`),
    db.query(`SELECT COUNT(*)::int AS count FROM monetization_opportunities WHERE status NOT IN ('lost','rejected')`),
    db.query(`SELECT COUNT(*)::int AS count FROM claimable_asset_registry WHERE status NOT IN ('expired','rejected')`),
    db.query(`SELECT COALESCE(SUM(value),0) AS company_asset_value FROM glorifier_valuation_evidence WHERE category='asset' AND evidence_status IN ('evidence_backed','verified') AND currency='USD'`),
    db.query(`SELECT * FROM glorifier_valuation_comparables ORDER BY observed_at DESC`)
  ]);

  const comparableRows = comparables.rows as any[];

  const productSignals =
    Number(workUnits.rows[0]?.executions || 0) > 0 ? 25 : 0;
  const integrationSignals = Number(connections.rows[0]?.authorized || 0) > 0 ? 20 : 0;
  const specialistSignals = (Number(ipRuns.rows[0]?.count || 0) + Number(inventions.rows[0]?.count || 0)) > 0 ? 15 : 0;
  const monetizationSignals =
    (Number(opportunities.rows[0]?.count || 0) + Number(claimables.rows[0]?.count || 0)) > 0 ? 15 : 0;
  const iotSignals = Number(iotDevices.rows[0]?.count || 0) > 0 ? 10 : 0;
  const customerSignals = Number(activeCustomers.rows[0]?.count || 0) > 0 ? 15 : 0;

  const maturityScore = Math.min(100, productSignals + integrationSignals + specialistSignals + monetizationSignals + iotSignals + customerSignals);

  return {
    customers: Number(activeCustomers.rows[0]?.count || 0),
    verifiedRevenue: Number(verifiedRevenue.rows[0]?.total || 0),
    workUnits: Number(workUnits.rows[0]?.units || 0),
    workUnitExecutions: Number(workUnits.rows[0]?.executions || 0),
    connections: Number(connections.rows[0]?.total || 0),
    authorizedConnections: Number(connections.rows[0]?.authorized || 0),
    ipResearchRuns: Number(ipRuns.rows[0]?.count || 0),
    inventions: Number(inventions.rows[0]?.count || 0),
    iotDevices: Number(iotDevices.rows[0]?.count || 0),
    monetizationOpportunities: Number(opportunities.rows[0]?.count || 0),
    claimableAssets: Number(claimables.rows[0]?.count || 0),
    companyAssetValue: Number(companyEvidence.rows[0]?.company_asset_value || 0),
    productMaturityScore: maturityScore,
    comparables: comparableRows.map((c: any) => mapComparable(c))
  };
}

export async function calculateGlorifierValuation() {
  await initializeValuationEngine();
  const inputs = await collectObservedInputs();
  const comps = inputs.comparables.filter((c: any) => c.currency === 'USD' && c.evidenceStatus !== 'not_verified' && Number(c.valuation) > 0);
  const comparableValues = comps.map((c: any) => Number(c.valuation));
  const benchmarkMedian = median(comparableValues);
  const benchmarkLow = percentile(comparableValues, 0.25);
  const benchmarkHigh = percentile(comparableValues, 0.75);

  const methods: Record<string, any> = {};
  const limitations: string[] = [];

  if (benchmarkMedian != null) {
    const productFactor = 0.75 + (inputs.productMaturityScore / 100) * 0.75;
    const tractionFactor = inputs.customers > 0 ? Math.min(1.35, 1 + Math.log10(inputs.customers + 1) * 0.15) : 0.75;
    const evidenceFactor = inputs.authorizedConnections > 0 || inputs.ipResearchRuns > 0 || inputs.inventions > 0 ? 1.05 : 0.85;
    const scorecardFactor = Math.max(0.50, Math.min(1.75, productFactor * tractionFactor * evidenceFactor));
    methods.scorecard = {
      benchmarkMedian,
      benchmarkRange: { low: benchmarkLow, high: benchmarkHigh },
      factor: Number(scorecardFactor.toFixed(4)),
      estimate: Number((benchmarkMedian * scorecardFactor).toFixed(2)),
      label: 'NOT VERIFIED',
      methodology: 'Comparable benchmark adjusted by observed product, traction and evidence signals; not a transaction price.'
    };
  } else {
    limitations.push('No qualifying USD comparable valuations have been recorded.');
  }

  const revenueComps = comps.filter((c: any) => c.revenue != null && Number(c.revenue) > 0);
  const multiples = revenueComps.map((c: any) => Number(c.valuation) / Number(c.revenue)).filter((x: number) => Number.isFinite(x) && x > 0);
  if (inputs.verifiedRevenue > 0 && multiples.length) {
    const revenueMultiple = median(multiples);
    methods.revenueMultiple = {
      verifiedRevenue: inputs.verifiedRevenue,
      comparableRevenueMultiple: revenueMultiple,
      estimate: Number((inputs.verifiedRevenue * (revenueMultiple || 0)).toFixed(2)),
      label: 'NOT VERIFIED',
      methodology: 'Verified revenue multiplied by the median revenue multiple of recorded, evidence-backed comparables.'
    };
  } else {
    limitations.push(inputs.verifiedRevenue <= 0
      ? 'No verified revenue is available for a revenue-multiple valuation.'
      : 'No qualifying comparable with both valuation and revenue has been recorded.');
  }

  if (inputs.companyAssetValue > 0) {
    methods.companyAssetEvidence = {
      evidenceValue: inputs.companyAssetValue,
      label: 'EVIDENCE-BACKED',
      note: 'Company-owned asset evidence only; this is an evidence floor/input, not an independent fair-market appraisal.'
    };
  } else {
    limitations.push('No company-owned asset value has been explicitly recorded in the valuation evidence registry.');
  }

  const methodEstimates = [methods.scorecard?.estimate, methods.revenueMultiple?.estimate].filter((x): x is number => Number.isFinite(x) && x > 0);
  let status: 'calculated' | 'insufficient-evidence' = methodEstimates.length ? 'calculated' : 'insufficient-evidence';
  let lowValue: number | null = null;
  let highValue: number | null = null;
  let midpoint: number | null = null;

  if (methodEstimates.length === 1) {
    midpoint = methodEstimates[0];
    lowValue = Number((midpoint * 0.70).toFixed(2));
    highValue = Number((midpoint * 1.30).toFixed(2));
    limitations.push('Only one monetary valuation method is currently available; the displayed range is a model uncertainty band, not a market quote.');
  } else if (methodEstimates.length >= 2) {
    lowValue = Number(Math.min(...methodEstimates).toFixed(2));
    highValue = Number(Math.max(...methodEstimates).toFixed(2));
    midpoint = Number((methodEstimates.reduce((a,b)=>a+b,0) / methodEstimates.length).toFixed(2));
  }

  const evidenceCount = comps.length + (inputs.companyAssetValue > 0 ? 1 : 0) + inputs.customers + inputs.workUnitExecutions;
  const confidence = status === 'calculated'
    ? Math.min(0.95, 0.25 + Math.min(0.50, evidenceCount / 100) + (methodEstimates.length >= 2 ? 0.20 : 0))
    : 0;

  const id = `gvr-${crypto.randomUUID()}`;
  await getPostgresPool().query(
    `INSERT INTO glorifier_valuation_runs
      (id,status,currency,low_value,high_value,midpoint,confidence,methods,inputs,limitations)
     VALUES($1,$2,'USD',$3,$4,$5,$6,$7,$8,$9)`,
    [
      id, status, lowValue, highValue, midpoint, confidence,
      JSON.stringify(methods), JSON.stringify(inputs), JSON.stringify(limitations)
    ]
  );

  return {
    id,
    version: GLORIFIER_VALUATION_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    status,
    valuation: {
      low: lowValue,
      high: highValue,
      midpoint,
      currency: 'USD',
      label: status === 'calculated' ? 'NOT VERIFIED' : 'NOT AVAILABLE — INSUFFICIENT EVIDENCE',
      confidence: Number(confidence.toFixed(2))
    },
    observedInputs: {
      customers: inputs.customers,
      verifiedRevenue: inputs.verifiedRevenue,
      productMaturityScore: inputs.productMaturityScore,
      workUnits: inputs.workUnits,
      workUnitExecutions: inputs.workUnitExecutions,
      connections: inputs.connections,
      authorizedConnections: inputs.authorizedConnections,
      ipResearchRuns: inputs.ipResearchRuns,
      inventions: inputs.inventions,
      iotDevices: inputs.iotDevices,
      monetizationOpportunities: inputs.monetizationOpportunities,
      claimableAssets: inputs.claimableAssets,
      companyAssetValue: inputs.companyAssetValue
    },
    methods,
    limitations,
    economicTruth: {
      marketValueIsNotRevenue: true,
      estimatedValuationIsNotVerified: true,
      personalAssetHoldingsExcludedUnlessExplicitlyRecordedAsCompanyOwned: true,
      projectionsExcludedFromVerifiedRevenue: true,
      missingEvidenceIsNotZero: true,
      externalTransactionPriceRequiresIndependentEvidence: true
    },
    methodology: {
      scorecard: 'Comparable benchmark adjusted by observed evidence signals. Inspired by the Angel Capital Association / Bill Payne Scorecard methodology.',
      revenueMultiple: 'Verified revenue × median evidence-backed comparable revenue multiple.',
      assetEvidence: 'Company-owned evidence can inform a floor/input but is not an appraisal.',
      noSingleMethodIsAuthoritative: true
    }
  };
}

export async function getLatestGlorifierValuation() {
  await initializeValuationEngine();
  const r = await getPostgresPool().query('SELECT * FROM glorifier_valuation_runs ORDER BY created_at DESC LIMIT 1');
  return r.rows[0] ? mapRun(r.rows[0]) : null;
}

function mapEvidence(x:any) {
  return { id:x.id, category:x.category, metric:x.metric, value:Number(x.value), currency:x.currency || 'USD', evidenceStatus:x.evidence_status, sourceRef:x.source_ref || null, observedAt:x.observed_at, notes:x.notes || null, metadata:x.metadata || {} };
}
function mapComparable(x:any) {
  return { id:x.id, name:x.name, sector:x.sector, stage:x.stage || null, geography:x.geography || null, valuation:Number(x.valuation), currency:x.currency || 'USD', revenue:x.revenue == null ? null : Number(x.revenue), revenuePeriod:x.revenue_period || null, evidenceStatus:x.evidence_status, sourceRef:x.source_ref, observedAt:x.observed_at, notes:x.notes || null };
}
function mapRun(x:any) {
  return { id:x.id, status:x.status, currency:x.currency, low:Number(x.low_value), high:Number(x.high_value), midpoint:Number(x.midpoint), confidence:Number(x.confidence), methods:x.methods || {}, inputs:x.inputs || {}, limitations:x.limitations || [], createdAt:x.created_at };
}
