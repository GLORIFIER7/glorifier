import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';

export interface GeminiInteractionRecord {
  id: string;
  sessionId: string;
  interactionId: string;
  previousInteractionId: string | null;
  model: string;
  actor: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

let initialized = false;

export async function initializeGeminiInteractionStore() {
  if (initialized) return;
  await getPostgresPool().query(`
    CREATE TABLE IF NOT EXISTS gemini_interactions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      interaction_id TEXT NOT NULL UNIQUE,
      previous_interaction_id TEXT,
      model TEXT NOT NULL,
      actor TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_gemini_interactions_session_time
      ON gemini_interactions(session_id, created_at DESC);
  `);
  initialized = true;
}

export async function recordGeminiInteraction(input: {
  sessionId: string;
  interactionId: string;
  previousInteractionId?: string | null;
  model: string;
  actor?: string;
  status?: string;
}) {
  await initializeGeminiInteractionStore();
  const id = `gint-${crypto.randomUUID()}`;
  const result = await getPostgresPool().query(
    `INSERT INTO gemini_interactions
      (id, session_id, interaction_id, previous_interaction_id, model, actor, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      id,
      input.sessionId,
      input.interactionId,
      input.previousInteractionId || null,
      input.model,
      input.actor || 'gemini-runtime',
      input.status || 'completed'
    ]
  );
  return mapGeminiInteraction(result.rows[0]);
}

export async function getLatestGeminiInteraction(sessionId: string) {
  await initializeGeminiInteractionStore();
  const result = await getPostgresPool().query(
    `SELECT * FROM gemini_interactions
     WHERE session_id=$1
     ORDER BY created_at DESC
     LIMIT 1`,
    [sessionId]
  );
  return result.rows[0] ? mapGeminiInteraction(result.rows[0]) : null;
}

function mapGeminiInteraction(row: any): GeminiInteractionRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    interactionId: row.interaction_id,
    previousInteractionId: row.previous_interaction_id || null,
    model: row.model,
    actor: row.actor,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}
