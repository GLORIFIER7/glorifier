import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';

export type RevenueEventType =
  | 'finding-accepted'
  | 'reward-promised'
  | 'reward-received'
  | 'payout-recorded'
  | 'expense-recorded'
  | 'refund-recorded';

export interface BountyRevenueEvent {
  id: string;
  programId: string;
  findingId: string | null;
  eventType: RevenueEventType;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  externalRef: string | null;
  actor: string;
  createdAt: string;
}

export interface BountyRevenueSummary {
  currency: string;
  pending: number;
  confirmed: number;
  cancelled: number;
  netConfirmed: number;
  eventCount: number;
}

export async function initializeBountyRevenueLedger() {
  const db = getPostgresPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS bounty_revenue_ledger (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL,
      finding_id TEXT,
      event_type TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      external_ref TEXT,
      actor TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_bounty_revenue_program ON bounty_revenue_ledger(program_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bounty_revenue_status ON bounty_revenue_ledger(status, currency);
  `);
}

export async function recordBountyRevenueEvent(input: Omit<BountyRevenueEvent, 'id' | 'createdAt'>) {
  await initializeBountyRevenueLedger();
  if (!Number.isFinite(input.amount) || input.amount < 0) throw new Error('Revenue amount must be a non-negative finite number');
  if (!input.currency || input.currency.length > 16) throw new Error('A valid currency code is required');
  const id = `rev-${crypto.randomUUID()}`;
  const r = await getPostgresPool().query(
    `INSERT INTO bounty_revenue_ledger
      (id,program_id,finding_id,event_type,amount,currency,status,external_ref,actor)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [id, input.programId, input.findingId ?? null, input.eventType, input.amount, input.currency.toUpperCase(),
      input.status, input.externalRef ?? null, input.actor]
  );
  return mapRevenue(r.rows[0]);
}

export async function listBountyRevenueEvents(limit = 100) {
  await initializeBountyRevenueLedger();
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const r = await getPostgresPool().query(
    `SELECT * FROM bounty_revenue_ledger ORDER BY created_at DESC LIMIT $1`, [safeLimit]
  );
  return r.rows.map(mapRevenue);
}

export async function getBountyRevenueSummary() {
  await initializeBountyRevenueLedger();
  const r = await getPostgresPool().query(
    `SELECT currency,
      COALESCE(SUM(amount) FILTER (WHERE status='pending'),0) AS pending,
      COALESCE(SUM(amount) FILTER (WHERE status='confirmed' AND event_type IN ('reward-received','payout-recorded')),0) AS confirmed,
      COALESCE(SUM(amount) FILTER (WHERE status='cancelled'),0) AS cancelled,
      COUNT(*) AS event_count
     FROM bounty_revenue_ledger
     GROUP BY currency
     ORDER BY currency`
  );
  return r.rows.map((x: any) => ({
    currency: x.currency,
    pending: Number(x.pending),
    confirmed: Number(x.confirmed),
    cancelled: Number(x.cancelled),
    netConfirmed: Number(x.confirmed) - Number(x.cancelled),
    eventCount: Number(x.event_count)
  } satisfies BountyRevenueSummary));
}

function mapRevenue(x: any): BountyRevenueEvent {
  return {
    id: x.id,
    programId: x.program_id,
    findingId: x.finding_id,
    eventType: x.event_type,
    amount: Number(x.amount),
    currency: x.currency,
    status: x.status,
    externalRef: x.external_ref,
    actor: x.actor,
    createdAt: new Date(x.created_at).toISOString()
  };
}
