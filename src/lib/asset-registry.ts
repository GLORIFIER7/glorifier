import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';

export type AssetClass = 'crypto' | 'fiat' | 'gaming' | 'stock' | 'bond' | 'etf' | 'other';
export type AssetStatus = 'discovered' | 'connected' | 'authorized' | 'degraded' | 'revoked' | 'disabled';

export interface AssetAccountRecord {
  id: string;
  provider: string;
  displayName: string;
  assetClass: AssetClass;
  status: AssetStatus;
  accountRef?: string | null;
  connectionId?: string | null;
  custody: 'self_custody' | 'custodial' | 'bank' | 'platform' | 'unknown';
  capabilities: string[];
  scopes: string[];
  priority: number;
  risk: 'low' | 'medium' | 'high' | 'critical';
  requiresHumanApproval: boolean;
  lastVerifiedAt?: string | null;
  metadata: Record<string, unknown>;
}

export async function initializeAssetRegistry() {
  const db = getPostgresPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS asset_account_registry (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      display_name TEXT NOT NULL,
      asset_class TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'discovered',
      account_ref TEXT,
      connection_id TEXT REFERENCES connection_registry(id) ON DELETE SET NULL,
      custody TEXT NOT NULL DEFAULT 'unknown',
      capabilities JSONB NOT NULL DEFAULT '[]',
      scopes JSONB NOT NULL DEFAULT '[]',
      priority INTEGER NOT NULL DEFAULT 50,
      risk TEXT NOT NULL DEFAULT 'medium',
      requires_human_approval BOOLEAN NOT NULL DEFAULT TRUE,
      last_verified_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE asset_account_registry ADD COLUMN IF NOT EXISTS connection_id TEXT REFERENCES connection_registry(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_asset_registry_class_priority ON asset_account_registry(asset_class, priority DESC);
    CREATE INDEX IF NOT EXISTS idx_asset_registry_provider ON asset_account_registry(provider);
    CREATE INDEX IF NOT EXISTS idx_asset_registry_connection ON asset_account_registry(connection_id);
    CREATE TABLE IF NOT EXISTS asset_holdings (
      id TEXT PRIMARY KEY,
      asset_account_id TEXT NOT NULL REFERENCES asset_account_registry(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      instrument_type TEXT NOT NULL,
      name TEXT,
      quantity NUMERIC,
      currency TEXT,
      cost_basis NUMERIC,
      market_price NUMERIC,
      market_value NUMERIC,
      valuation_time TIMESTAMPTZ,
      source TEXT NOT NULL,
      evidence_ref TEXT,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(asset_account_id, symbol, instrument_type)
    );
    CREATE INDEX IF NOT EXISTS idx_asset_holdings_account ON asset_holdings(asset_account_id);
    CREATE INDEX IF NOT EXISTS idx_asset_holdings_symbol ON asset_holdings(symbol);
    CREATE TABLE IF NOT EXISTS asset_evidence (
      id TEXT PRIMARY KEY,
      asset_account_id TEXT REFERENCES asset_account_registry(id) ON DELETE CASCADE,
      holding_id TEXT REFERENCES asset_holdings(id) ON DELETE CASCADE,
      evidence_type TEXT NOT NULL,
      source TEXT NOT NULL,
      source_ref TEXT,
      observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      payload_hash TEXT,
      details JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_asset_evidence_account_time ON asset_evidence(asset_account_id, observed_at DESC);
    CREATE TABLE IF NOT EXISTS asset_account_events (
      id TEXT PRIMARY KEY,
      asset_account_id TEXT NOT NULL REFERENCES asset_account_registry(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_asset_account_events_time ON asset_account_events(asset_account_id, created_at DESC);
  `);
}

export async function ensureCoreAssetIntegrations() {
  const seeds: Array<Omit<AssetAccountRecord, 'id' | 'lastVerifiedAt' | 'accountRef'>> = [
    { provider: 'binance', displayName: 'Binance Crypto', assetClass: 'crypto', status: 'discovered', custody: 'custodial', capabilities: ['balances','portfolio-metadata','market-data'], scopes: ['read:balances','read:portfolio'], priority: 100, risk: 'high', requiresHumanApproval: true, metadata: { integrationType: 'exchange', credentialsStoredOutsideRegistry: true } },
    { provider: 'fiat', displayName: 'Fiat / Bank Accounts', assetClass: 'fiat', status: 'discovered', custody: 'bank', capabilities: ['account-inventory','balance-read','transaction-history'], scopes: ['read:accounts','read:balances','read:transactions'], priority: 95, risk: 'critical', requiresHumanApproval: true, metadata: { integrationType: 'banking-connector', transfersDisabledByDefault: true } },
    { provider: 'steam', displayName: 'Steam Gaming', assetClass: 'gaming', status: 'discovered', custody: 'platform', capabilities: ['account-inventory','game-library','digital-assets'], scopes: ['read:profile','read:library','read:inventory'], priority: 85, risk: 'medium', requiresHumanApproval: true, metadata: { integrationType: 'gaming-platform' } },
    { provider: 'epic-games', displayName: 'Epic Games', assetClass: 'gaming', status: 'discovered', custody: 'platform', capabilities: ['account-inventory','game-library'], scopes: ['read:profile','read:library'], priority: 80, risk: 'medium', requiresHumanApproval: true, metadata: { integrationType: 'gaming-platform' } },
    { provider: 'playstation', displayName: 'PlayStation Network', assetClass: 'gaming', status: 'discovered', custody: 'platform', capabilities: ['account-inventory','game-library','digital-assets'], scopes: ['read:profile','read:library'], priority: 75, risk: 'medium', requiresHumanApproval: true, metadata: { integrationType: 'gaming-platform' } },
    { provider: 'xbox', displayName: 'Xbox / Microsoft Gaming', assetClass: 'gaming', status: 'discovered', custody: 'platform', capabilities: ['account-inventory','game-library','digital-assets'], scopes: ['read:profile','read:library'], priority: 75, risk: 'medium', requiresHumanApproval: true, metadata: { integrationType: 'gaming-platform' } },
    { provider: 'nintendo', displayName: 'Nintendo', assetClass: 'gaming', status: 'discovered', custody: 'platform', capabilities: ['account-inventory','game-library'], scopes: ['read:profile','read:library'], priority: 70, risk: 'medium', requiresHumanApproval: true, metadata: { integrationType: 'gaming-platform' } }
  ];
  for (const seed of seeds) {
    await registerAssetAccount(seed);
  }
  return listAssetAccounts();
}

export async function registerAssetAccount(input: Omit<AssetAccountRecord, 'id'> & { id?: string }) {
  await initializeAssetRegistry();
  const id = input.id || `asset-account-${crypto.randomUUID()}`;
  const r = await getPostgresPool().query(
    `INSERT INTO asset_account_registry
      (id,provider,display_name,asset_class,status,account_ref,connection_id,custody,capabilities,scopes,priority,risk,requires_human_approval,last_verified_at,metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT(id) DO UPDATE SET
       provider=EXCLUDED.provider, display_name=EXCLUDED.display_name, asset_class=EXCLUDED.asset_class,
       status=EXCLUDED.status, account_ref=EXCLUDED.account_ref, connection_id=EXCLUDED.connection_id, custody=EXCLUDED.custody,
       capabilities=EXCLUDED.capabilities, scopes=EXCLUDED.scopes, priority=EXCLUDED.priority,
       risk=EXCLUDED.risk, requires_human_approval=EXCLUDED.requires_human_approval,
       last_verified_at=EXCLUDED.last_verified_at, metadata=EXCLUDED.metadata, updated_at=NOW()
     RETURNING *`,
    [id,input.provider,input.displayName,input.assetClass,input.status,input.accountRef||null,input.connectionId||null,input.custody,
      JSON.stringify(input.capabilities),JSON.stringify(input.scopes),input.priority,input.risk,input.requiresHumanApproval,
      input.lastVerifiedAt||null,JSON.stringify(input.metadata||{})]
  );
  return mapAsset(r.rows[0]);
}

export async function listAssetAccounts(assetClass?: AssetClass) {
  await initializeAssetRegistry();
  const r = assetClass
    ? await getPostgresPool().query('SELECT * FROM asset_account_registry WHERE asset_class=$1 ORDER BY priority DESC, provider, display_name',[assetClass])
    : await getPostgresPool().query('SELECT * FROM asset_account_registry ORDER BY priority DESC, asset_class, provider, display_name');
  return r.rows.map(mapAsset);
}

export async function getAssetAccount(id: string) {
  await initializeAssetRegistry();
  const r = await getPostgresPool().query('SELECT * FROM asset_account_registry WHERE id=$1',[id]);
  return r.rows[0] ? mapAsset(r.rows[0]) : null;
}

export async function recordAssetAccountEvent(assetAccountId: string, eventType: string, actor: string, details: Record<string, unknown> = {}) {
  await initializeAssetRegistry();
  const id = `aae-${crypto.randomUUID()}`;
  await getPostgresPool().query(
    'INSERT INTO asset_account_events(id,asset_account_id,event_type,actor,details) VALUES($1,$2,$3,$4,$5)',
    [id,assetAccountId,eventType,actor,JSON.stringify(details)]
  );
  return { id, assetAccountId, eventType, actor, details };
}

export async function prioritizeAssetAccount(id: string, priority: number, actor = 'human-owner') {
  await initializeAssetRegistry();
  const bounded = Math.max(0, Math.min(100, Math.round(priority)));
  const r = await getPostgresPool().query(
    'UPDATE asset_account_registry SET priority=$2,updated_at=NOW() WHERE id=$1 RETURNING *',
    [id,bounded]
  );
  if (!r.rows[0]) return null;
  await recordAssetAccountEvent(id,'priority_changed',actor,{priority:bounded});
  return mapAsset(r.rows[0]);
}

function mapAsset(x: any): AssetAccountRecord {
  return {
    id:x.id, provider:x.provider, displayName:x.display_name, assetClass:x.asset_class,
    status:x.status, accountRef:x.account_ref||null, custody:x.custody,
    capabilities:x.capabilities||[], scopes:x.scopes||[], priority:Number(x.priority||0),
    risk:x.risk, requiresHumanApproval:Boolean(x.requires_human_approval),
    lastVerifiedAt:x.last_verified_at ? new Date(x.last_verified_at).toISOString() : null,
    metadata:x.metadata||{}
  };
}


export async function recordAssetHolding(input: {
  id?: string;
  assetAccountId: string;
  symbol: string;
  instrumentType: 'stock' | 'bond' | 'etf' | 'crypto' | 'other';
  name?: string;
  quantity?: number | null;
  currency?: string | null;
  costBasis?: number | null;
  marketPrice?: number | null;
  marketValue?: number | null;
  valuationTime?: string | null;
  source: string;
  evidenceRef?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await initializeAssetRegistry();
  const id = input.id || `holding-${crypto.randomUUID()}`;
  const r = await getPostgresPool().query(
    `INSERT INTO asset_holdings
      (id,asset_account_id,symbol,instrument_type,name,quantity,currency,cost_basis,market_price,market_value,valuation_time,source,evidence_ref,metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT(asset_account_id,symbol,instrument_type) DO UPDATE SET
       name=EXCLUDED.name, quantity=EXCLUDED.quantity, currency=EXCLUDED.currency,
       cost_basis=EXCLUDED.cost_basis, market_price=EXCLUDED.market_price, market_value=EXCLUDED.market_value,
       valuation_time=EXCLUDED.valuation_time, source=EXCLUDED.source, evidence_ref=EXCLUDED.evidence_ref,
       metadata=EXCLUDED.metadata, updated_at=NOW()
     RETURNING *`,
    [id,input.assetAccountId,input.symbol,input.instrumentType,input.name||null,input.quantity??null,input.currency||null,
      input.costBasis??null,input.marketPrice??null,input.marketValue??null,input.valuationTime||null,input.source,
      input.evidenceRef||null,JSON.stringify(input.metadata||{})]
  );
  return r.rows[0];
}

export async function listAssetHoldings(assetAccountId?: string) {
  await initializeAssetRegistry();
  const r = assetAccountId
    ? await getPostgresPool().query('SELECT * FROM asset_holdings WHERE asset_account_id=$1 ORDER BY symbol',[assetAccountId])
    : await getPostgresPool().query('SELECT * FROM asset_holdings ORDER BY asset_account_id, symbol');
  return r.rows;
}

export async function recordAssetEvidence(input: {
  assetAccountId?: string | null;
  holdingId?: string | null;
  evidenceType: string;
  source: string;
  sourceRef?: string | null;
  observedAt?: string | null;
  payloadHash?: string | null;
  details?: Record<string, unknown>;
}) {
  await initializeAssetRegistry();
  const id = `ae-${crypto.randomUUID()}`;
  const r = await getPostgresPool().query(
    'INSERT INTO asset_evidence(id,asset_account_id,holding_id,evidence_type,source,source_ref,observed_at,payload_hash,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [id,input.assetAccountId||null,input.holdingId||null,input.evidenceType,input.source,input.sourceRef||null,
      input.observedAt||new Date().toISOString(),input.payloadHash||null,JSON.stringify(input.details||{})]
  );
  return r.rows[0];
}
