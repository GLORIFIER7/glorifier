import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';
import { listAssetAccounts, listAssetHoldings, recordAssetEvidence } from './asset-registry';
import { getCryptographicTrustPolicy, requestCryptographicOperation } from './cryptographic-trust-gateway';

export const GLORIFIER_UNIVERSAL_ASSET_INTELLIGENCE_VERSION = 'GUAI-1.0';

export function getUniversalAssetIntelligencePolicy() {
  return {
    version: GLORIFIER_UNIVERSAL_ASSET_INTELLIGENCE_VERSION,
    objective: 'INVENTORY → VERIFY → VALUE → MONETIZE → INVEST-PLAN → REINVEST → MEASURE → IMPROVE',
    providerNeutral: true,
    assetTruthBoundary: {
      ownership: 'Requires connection or ownership evidence.',
      valuation: 'Market value is an observation/estimate, not revenue.',
      revenue: 'Revenue requires qualifying economic evidence.',
      settlement: 'Settlement requires provider or network confirmation.',
      walletBalanceIsRevenue: false
    },
    execution: {
      autonomousDiscovery: true,
      autonomousAnalysis: true,
      autonomousMonetizationPlanning: true,
      autonomousInvestmentPlanning: true,
      autonomousIrreversibleTransfer: false,
      autonomousTrading: false,
      privateKeyAccessByAI: false
    },
    supportedAssetClasses: ['crypto','fiat','gaming','stock','bond','etf','data','ip','saas','iot','nft','other'],
    cryptographicTrust: getCryptographicTrustPolicy()
  };
}

export async function initializeUniversalAssetIntelligence() {
  await getPostgresPool().query(`
    CREATE TABLE IF NOT EXISTS universal_asset_intelligence_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL,
      asset_account_id TEXT,
      holding_id TEXT,
      status TEXT NOT NULL,
      economic_truth TEXT NOT NULL,
      amount_usd NUMERIC,
      evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS universal_asset_intel_events_created_idx
      ON universal_asset_intelligence_events(created_at DESC);
    CREATE INDEX IF NOT EXISTS universal_asset_intel_events_asset_idx
      ON universal_asset_intelligence_events(asset_account_id, created_at DESC);
  `);
}

async function recordEvent(input: {
  eventType: string; actor: string; assetAccountId?: string | null; holdingId?: string | null;
  status: string; economicTruth: string; amountUsd?: number | null;
  evidenceRefs?: string[]; details?: Record<string, unknown>;
}) {
  const id = `uai-${crypto.randomUUID()}`;
  await getPostgresPool().query(
    `INSERT INTO universal_asset_intelligence_events
      (id,event_type,actor,asset_account_id,holding_id,status,economic_truth,amount_usd,evidence_refs,details)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb)`,
    [id,input.eventType,input.actor,input.assetAccountId||null,input.holdingId||null,input.status,
      input.economicTruth,input.amountUsd??null,JSON.stringify(input.evidenceRefs||[]),JSON.stringify(input.details||{})]
  );
  return id;
}

export async function getUniversalAssetIntelligenceSnapshot() {
  await initializeUniversalAssetIntelligence();
  const [accounts, holdings] = await Promise.all([listAssetAccounts(), listAssetHoldings()]);
  const byClass: Record<string, number> = {};
  for (const a of accounts) byClass[a.assetClass] = (byClass[a.assetClass] || 0) + 1;
  const verifiedHoldings = holdings.filter((h: any) => h.verification_status === 'verified');
  const estimatedValueUsd = holdings.reduce((sum: number, h: any) => sum + (Number(h.market_value) || 0), 0);
  return {
    generatedAt: new Date().toISOString(),
    policy: getUniversalAssetIntelligencePolicy(),
    accountCount: accounts.length,
    holdingCount: holdings.length,
    verifiedHoldingCount: verifiedHoldings.length,
    assetClasses: byClass,
    estimatedMarketValueUsd: Math.round(estimatedValueUsd * 100) / 100,
    estimatedMarketValueIsNotRevenue: true,
    accounts,
    holdings
  };
}

export async function planUniversalAssetActions(input: {
  actor?: string;
  objective?: 'monetize' | 'invest' | 'grow' | 'verify';
  assetAccountId?: string;
  holdingId?: string;
}) {
  await initializeUniversalAssetIntelligence();
  const actor = input.actor || 'ai-ceo';
  const objective = input.objective || 'grow';
  const snapshot = await getUniversalAssetIntelligenceSnapshot();
  const selected = snapshot.holdings.filter((h: any) =>
    (!input.assetAccountId || h.asset_account_id === input.assetAccountId) &&
    (!input.holdingId || h.id === input.holdingId)
  );
  const candidates = selected.length ? selected : snapshot.holdings;
  const plans = candidates.slice(0, 100).map((h: any) => ({
    holdingId: h.id,
    assetAccountId: h.asset_account_id,
    symbol: h.symbol,
    objective,
    action: objective === 'verify'
      ? 'collect-ownership-and-market-evidence'
      : objective === 'monetize'
        ? 'identify-evidence-backed-revenue-opportunity'
        : objective === 'invest'
          ? 'model-investment-scenarios-without-execution'
          : 'identify-reinvestment-and-utilization-options',
    estimatedMarketValueUsd: Number(h.market_value) || 0,
    economicTruth: 'PLANNING — NOT EXECUTED',
    executionEnabled: false,
    humanApprovalRequiredForIrreversibleAction: true
  }));
  const eventId = await recordEvent({
    eventType: `plan_${objective}`, actor, status: 'planned',
    economicTruth: 'PLANNING — NOT EXECUTED',
    evidenceRefs: ['asset-registry','cryptographic-trust-gateway'],
    details: { candidateCount: plans.length }
  });
  return { eventId, objective, plans, executionEnabled: false };
}

export async function requestUniversalAssetCryptoOperation(input: {
  operation: Parameters<typeof requestCryptographicOperation>[0]['operation'];
  requester?: string; connectionId?: string | null; walletRef?: string | null;
  network?: Parameters<typeof requestCryptographicOperation>[0]['network'];
  payload?: string | null; humanApproved?: boolean; evidenceRefs?: string[];
}) {
  return requestCryptographicOperation({
    operation: input.operation,
    requester: input.requester || 'ai-ceo',
    connectionId: input.connectionId || null,
    walletRef: input.walletRef || null,
    network: input.network || null,
    payload: input.payload || null,
    humanApproved: input.humanApproved === true,
    evidenceRefs: input.evidenceRefs || []
  });
}
