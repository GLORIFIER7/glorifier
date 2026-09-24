-- GLORIFIER Connection Registry schema reference.
-- The application auto-initializes these tables when DATABASE_URL is configured.
-- Secrets/tokens MUST NOT be stored in these tables.

CREATE TABLE IF NOT EXISTS connection_registry (
  id TEXT PRIMARY KEY, provider TEXT NOT NULL, display_name TEXT NOT NULL, auth_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'discovered', scopes JSONB NOT NULL DEFAULT '[]', risk TEXT NOT NULL DEFAULT 'medium',
  account_ref TEXT, expires_at TIMESTAMPTZ, last_verified_at TIMESTAMPTZ,
  requires_human_approval BOOLEAN NOT NULL DEFAULT TRUE, metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connection_events (
  id TEXT PRIMARY KEY, connection_id TEXT NOT NULL REFERENCES connection_registry(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, actor TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connection_approvals (
  id TEXT PRIMARY KEY, connection_id TEXT NOT NULL REFERENCES connection_registry(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL, scope JSONB NOT NULL DEFAULT '[]', action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', decided_by TEXT, decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);