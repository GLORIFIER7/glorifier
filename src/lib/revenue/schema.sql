CREATE TABLE IF NOT EXISTS revenue_ledger (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  customer_reference TEXT,
  currency CHAR(3) NOT NULL,
  amount_minor BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid','refunded','disputed','voided')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS revenue_ledger_occurred_at_idx
  ON revenue_ledger (occurred_at DESC);

CREATE INDEX IF NOT EXISTS revenue_ledger_provider_tx_idx
  ON revenue_ledger (provider, provider_transaction_id);
