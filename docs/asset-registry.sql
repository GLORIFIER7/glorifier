-- GLORIFIER unified asset integration registry.
-- No secrets, private keys, or broker credentials are stored here.
-- Asset accounts link to connection_registry for authorization and verification.
-- Holdings and evidence remain separate from verified revenue.

ALTER TABLE asset_account_registry
  ADD COLUMN IF NOT EXISTS connection_id TEXT REFERENCES connection_registry(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_asset_registry_connection
  ON asset_account_registry(connection_id);

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
