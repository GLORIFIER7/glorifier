import { getPostgresPool } from './db/postgres';
import { initializeAssetRegistry } from './asset-registry';
import { initializeBountyRevenueLedger } from './bounty-revenue';
import { initializeConnectionRegistry } from './connection-registry';

export type GlorifierEconomicTruthStatus = 'estimated' | 'sourced' | 'corroborated' | 'verified';

export interface GlorifierSummaryReport {
  generatedAt: string;
  live: boolean;
  economicTruthRules: string[];
  assets: { accountCount: number; holdingCount: number; byClass: Record<string, number>; marketValueByCurrency: Record<string, number>; marketValueKnownCount: number; sourceBackedHoldingCount: number };
  revenue: { estimated: number; contracted: number; invoiced: number; paid: number; verified: number; byCurrency: Record<string, { pending: number; confirmed: number; cancelled: number }>; note: string };
  claimable: { status: 'not_recorded' | 'recorded'; count: number; estimatedValueByCurrency: Record<string, number>; verifiedValueByCurrency: Record<string, number>; note: string };
  evidence: { count: number; latestObservedAt: string | null; sources: string[] };
  connections: { total: number; authorized: number; degraded: number; expired: number; revoked: number; disabled: number };
  verification: { verifiedRevenueRequiresSourceEvidence: true; marketValueIsNotRevenue: true; estimatesAreNotEarnings: true; autonomousTradingDisabled: true; autonomousFundMovementDisabled: true; humanApprovalForConsequentialActions: true };
}

function numeric(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function buildGlorifierSummaryReport(): Promise<GlorifierSummaryReport> {
  await initializeConnectionRegistry();
  await initializeAssetRegistry();
  await initializeBountyRevenueLedger();
  const db = getPostgresPool();

  const accounts = await db.query("SELECT COUNT(*)::int AS count FROM asset_account_registry");
  const accountClasses = await db.query("SELECT asset_class, COUNT(*)::int AS count FROM asset_account_registry GROUP BY asset_class ORDER BY asset_class");
  const holdings = await db.query("SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE market_value IS NOT NULL)::int AS known_value, COUNT(*) FILTER (WHERE source IS NOT NULL AND source <> '')::int AS source_backed FROM asset_holdings");
  const values = await db.query("SELECT COALESCE(currency,'UNKNOWN') AS currency, COALESCE(SUM(market_value) FILTER (WHERE market_value IS NOT NULL),0) AS total FROM asset_holdings GROUP BY COALESCE(currency,'UNKNOWN') ORDER BY currency");
  const evidence = await db.query("SELECT COUNT(*)::int AS count, MAX(observed_at) AS latest_observed_at FROM asset_evidence");
  const evidenceSources = await db.query("SELECT DISTINCT source FROM asset_evidence WHERE source IS NOT NULL AND source <> '' ORDER BY source");
  const connections = await db.query("SELECT status, COUNT(*)::int AS count FROM connection_registry GROUP BY status");
  const revenue = await db.query("SELECT currency, COALESCE(SUM(amount) FILTER (WHERE status='pending'),0) AS pending, COALESCE(SUM(amount) FILTER (WHERE status='confirmed' AND event_type IN ('reward-received','payout-recorded') AND external_ref IS NOT NULL AND external_ref <> ''),0) AS confirmed, COALESCE(SUM(amount) FILTER (WHERE status='cancelled'),0) AS cancelled FROM bounty_revenue_ledger GROUP BY currency ORDER BY currency");

  const byClass: Record<string, number> = {};
  for (const row of accountClasses.rows) byClass[String(row.asset_class)] = Number(row.count);
  const marketValueByCurrency: Record<string, number> = {};
  for (const row of values.rows) marketValueByCurrency[String(row.currency)] = numeric(row.total);
  const byRevenueCurrency: Record<string, { pending: number; confirmed: number; cancelled: number }> = {};
  let verifiedRevenue = 0;
  for (const row of revenue.rows) {
    const currency = String(row.currency);
    const item = { pending: numeric(row.pending), confirmed: numeric(row.confirmed), cancelled: numeric(row.cancelled) };
    byRevenueCurrency[currency] = item;
    verifiedRevenue += item.confirmed;
  }
  const connectionCounts: Record<string, number> = {};
  for (const row of connections.rows) connectionCounts[String(row.status)] = Number(row.count);

  return {
    generatedAt: new Date().toISOString(), live: true,
    economicTruthRules: [
      'No source evidence -> no verification.',
      'Market value is never automatically revenue.',
      'Estimated value is never automatically earnings.',
      'No autonomous trading or fund movement.',
      'Every financial claim preserves source and observation provenance.'
    ],
    assets: { accountCount: Number(accounts.rows[0]?.count || 0), holdingCount: Number(holdings.rows[0]?.count || 0), byClass, marketValueByCurrency, marketValueKnownCount: Number(holdings.rows[0]?.known_value || 0), sourceBackedHoldingCount: Number(holdings.rows[0]?.source_backed || 0) },
    revenue: { estimated: 0, contracted: 0, invoiced: 0, paid: 0, verified: verifiedRevenue, byCurrency: byRevenueCurrency, note: 'Only confirmed reward-received/payout-recorded events with an external evidence reference are included in verified revenue. Asset market value is excluded.' },
    claimable: { status: 'not_recorded', count: 0, estimatedValueByCurrency: {}, verifiedValueByCurrency: {}, note: 'No claimable amount is inferred from asset or market data.' },
    evidence: { count: Number(evidence.rows[0]?.count || 0), latestObservedAt: evidence.rows[0]?.latest_observed_at ? new Date(evidence.rows[0].latest_observed_at).toISOString() : null, sources: evidenceSources.rows.map((row: any) => String(row.source)) },
    connections: { total: Object.values(connectionCounts).reduce((a,b) => a+b, 0), authorized: connectionCounts.authorized || 0, degraded: connectionCounts.degraded || 0, expired: connectionCounts.expired || 0, revoked: connectionCounts.revoked || 0, disabled: connectionCounts.disabled || 0 },
    verification: { verifiedRevenueRequiresSourceEvidence: true, marketValueIsNotRevenue: true, estimatesAreNotEarnings: true, autonomousTradingDisabled: true, autonomousFundMovementDisabled: true, humanApprovalForConsequentialActions: true }
  };
}
