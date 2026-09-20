import { Pool } from 'pg';

let pool: Pool | null = null;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  return url;
}

export function getPostgresPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      max: Number(process.env.DB_POOL_MAX || 5),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export async function checkPostgres(): Promise<{ ok: boolean; database?: string; latencyMs?: number; error?: string }> {
  const started = Date.now();
  try {
    const result = await getPostgresPool().query('SELECT current_database() AS database');
    return { ok: true, database: result.rows[0]?.database, latencyMs: Date.now() - started };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : 'PostgreSQL connection failed' };
  }
}
