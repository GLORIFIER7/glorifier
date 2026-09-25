import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';
import { recordRevenueEvent, initializeRevenueLedger } from './revenue/engine';

export type BountyStage =
  | 'DISCOVERED' | 'FUNDING_UNVERIFIED' | 'FUNDING_VERIFIED'
  | 'ELIGIBILITY_VERIFIED' | 'CLAIMED' | 'IN_PROGRESS'
  | 'PR_SUBMITTED' | 'ACCEPTED' | 'PAYMENT_PENDING' | 'SETTLED'
  | 'REJECTED' | 'EXPIRED';

export async function initializeGithubBountyPipeline() {
  await getPostgresPool().query(`
    CREATE TABLE IF NOT EXISTS github_bounty_opportunities (
      id TEXT PRIMARY KEY,
      source_url TEXT NOT NULL UNIQUE,
      repository TEXT NOT NULL,
      issue_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      advertised_amount NUMERIC,
      currency TEXT,
      funding_status TEXT NOT NULL DEFAULT 'unverified',
      eligibility_status TEXT NOT NULL DEFAULT 'unknown',
      stage TEXT NOT NULL DEFAULT 'DISCOVERED',
      canonical_source TEXT,
      acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
      evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
      discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_verified_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS github_bounty_stage_idx ON github_bounty_opportunities(stage, discovered_at DESC);
  `);
}

function amountOf(text: string) {
  const m = text.match(/(?:\$|USD\s*)([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  if (!m) return { amount: null, currency: null };
  const amount = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(amount) ? { amount, currency: 'USD' } : { amount: null, currency: null };
}

function acceptance(body: string) {
  return body.split(/\r?\n/).map(x => x.trim())
    .filter(x => /^[-*]\s*\[[ xX]\]/.test(x)).slice(0, 40);
}

export async function discoverGithubBounties(limit = 30) {
  await initializeGithubBountyPipeline();
  const q = encodeURIComponent('is:issue is:open (bounty OR reward OR paid OR funded) -label:spam');
  const response = await fetch('https://api.github.com/search/issues?q=' + q + '&per_page=' + Math.min(Math.max(limit, 1), 100), {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'GLORIFIER-Bounty-Pipeline/1.0' }
  });
  if (!response.ok) throw new Error('GitHub bounty discovery failed: HTTP ' + response.status);
  const payload = await response.json() as any;
  const db = getPostgresPool();
  const rows = [];
  for (const issue of Array.isArray(payload.items) ? payload.items : []) {
    const sourceUrl = String(issue.html_url || '');
    const repository = String(issue.repository_url || '').split('/repos/')[1] || '';
    if (!sourceUrl || !repository) continue;
    const parsed = amountOf(String(issue.title || '') + '\n' + String(issue.body || ''));
    const body = String(issue.body || '');
    const evidence = [{
      type: 'issue-text',
      url: sourceUrl,
      note: /funded|escrow|payment|payout/i.test(body)
        ? 'Issue describes funding/payment terms; this is not independent proof of funds.'
        : 'Advertised work signal only.'
    }];
    const id = 'gh-bounty-' + crypto.createHash('sha256').update(sourceUrl).digest('hex').slice(0, 24);
    const result = await db.query(`
      INSERT INTO github_bounty_opportunities
      (id,source_url,repository,issue_number,title,advertised_amount,currency,funding_status,eligibility_status,stage,canonical_source,acceptance_criteria,evidence)
      VALUES($1,$2,$3,$4,$5,$6,$7,'unverified','unknown','FUNDING_UNVERIFIED',$8,$9::jsonb,$10::jsonb)
      ON CONFLICT(source_url) DO UPDATE SET title=EXCLUDED.title, advertised_amount=EXCLUDED.advertised_amount,
      currency=EXCLUDED.currency, acceptance_criteria=EXCLUDED.acceptance_criteria, evidence=EXCLUDED.evidence
      RETURNING *
    `, [id,sourceUrl,repository,Number(issue.number),String(issue.title || '').slice(0,500),
      parsed.amount,parsed.currency,sourceUrl,JSON.stringify(acceptance(body)),JSON.stringify(evidence)]);
    rows.push(result.rows[0]);
  }
  return rows;
}

export async function listGithubBountyOpportunities(stage?: BountyStage, limit = 100) {
  await initializeGithubBountyPipeline();
  const n = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const r = stage
    ? await getPostgresPool().query('SELECT * FROM github_bounty_opportunities WHERE stage=$1 ORDER BY discovered_at DESC LIMIT $2',[stage,n])
    : await getPostgresPool().query('SELECT * FROM github_bounty_opportunities ORDER BY discovered_at DESC LIMIT $1',[n]);
  return r.rows;
}

export async function advanceGithubBountyStage(input: { id: string; stage: BountyStage; actor: string; evidenceRefs: string[] }) {
  await initializeGithubBountyPipeline();
  const allowed: Record<BountyStage,BountyStage[]> = {
    DISCOVERED:['FUNDING_UNVERIFIED','REJECTED','EXPIRED'],
    FUNDING_UNVERIFIED:['FUNDING_VERIFIED','REJECTED','EXPIRED'],
    FUNDING_VERIFIED:['ELIGIBILITY_VERIFIED','REJECTED','EXPIRED'],
    ELIGIBILITY_VERIFIED:['CLAIMED','REJECTED','EXPIRED'],
    CLAIMED:['IN_PROGRESS','REJECTED','EXPIRED'],
    IN_PROGRESS:['PR_SUBMITTED','REJECTED'],
    PR_SUBMITTED:['ACCEPTED','REJECTED'],
    ACCEPTED:['PAYMENT_PENDING','SETTLED'],
    PAYMENT_PENDING:['SETTLED','REJECTED'],
    SETTLED:[], REJECTED:[], EXPIRED:[]
  };
  const db = getPostgresPool();
  const current = await db.query('SELECT * FROM github_bounty_opportunities WHERE id=$1',[input.id]);
  if (!current.rows[0]) throw new Error('Bounty opportunity not found');
  const from = current.rows[0].stage as BountyStage;
  if (!allowed[from].includes(input.stage)) throw new Error('Invalid bounty stage transition: ' + from + ' -> ' + input.stage);
  if ((input.stage === 'FUNDING_VERIFIED' || input.stage === 'ELIGIBILITY_VERIFIED') && !input.evidenceRefs.length) {
    throw new Error('Canonical evidence is required for verification.');
  }
  await db.query('UPDATE github_bounty_opportunities SET stage=$2,last_verified_at=NOW(),funding_status=CASE WHEN $2=\'FUNDING_VERIFIED\' THEN \'verified\' ELSE funding_status END WHERE id=$1',[input.id,input.stage]);
  return { id:input.id, previousStage:from, stage:input.stage, actor:input.actor, evidenceRefs:input.evidenceRefs, updatedAt:new Date().toISOString() };
}

export async function recordVerifiedBountyPayout(input: { id:string; userReference:string; amount:number; currency:string; paymentReference:string; evidenceUrl:string; actor:string }) {
  await initializeGithubBountyPipeline();
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Verified payout amount must be positive.');
  if (!input.userReference || !input.paymentReference || !input.evidenceUrl) throw new Error('User reference, canonical payment reference and evidence URL are required.');
  await initializeRevenueLedger();
  const db = getPostgresPool();
  const r = await db.query('SELECT * FROM github_bounty_opportunities WHERE id=$1',[input.id]);
  if (!r.rows[0] || !['ACCEPTED','PAYMENT_PENDING'].includes(r.rows[0].stage)) throw new Error('Payout requires accepted work.');
  const currency=input.currency.toUpperCase();
  const eventId='github-bounty-settlement-'+input.id+'-'+crypto.createHash('sha256').update(input.paymentReference+'|'+input.evidenceUrl).digest('hex').slice(0,24);
  const ledger=await recordRevenueEvent({
    eventId,
    provider:'github-bounty-settlement',
    providerTransactionId:input.paymentReference,
    customerReference:r.rows[0].repository+'#'+r.rows[0].issue_number,
    userReference:input.userReference,
    currency,
    amountMinor:Math.round(input.amount*100),
    status:'paid',
    metadata:{ opportunityId:input.id, sourceUrl:r.rows[0].source_url, acceptanceStage:r.rows[0].stage, settlementEvidenceUrl:input.evidenceUrl, evidenceClass:'canonical-payment-evidence' }
  });
  await db.query('UPDATE github_bounty_opportunities SET stage=\'SETTLED\',last_verified_at=NOW(),evidence=evidence || $2::jsonb WHERE id=$1',[input.id,JSON.stringify([{type:'settlement',paymentReference:input.paymentReference,evidenceUrl:input.evidenceUrl,ledgerEventId:eventId}])]);
  return { status:'SETTLED', economicTruth:'VERIFIED_REVENUE', amount:input.amount, currency, paymentReference:input.paymentReference, evidenceUrl:input.evidenceUrl, actor:input.actor, revenueLedgerEventId:eventId, ledgerInserted:ledger.inserted, settledAt:new Date().toISOString() };
}

export function getGithubBountyPipelinePolicy() {
  return {
    pipeline:'DISCOVER → VERIFY FUNDING → VERIFY ELIGIBILITY → CLAIM → SOLVE → PR/REPORT → ACCEPTANCE → VERIFY PAYOUT → SETTLE',
    antiFabricationRule:'Advertised rewards, estimates, labels, mirrors, wallet balances and promises are never verified revenue.',
    payoutRule:'Only canonical payment evidence after acceptance can become VERIFIED_REVENUE.',
    securityRule:'Security bounty work is restricted to explicitly authorized, in-scope targets and program rules.',
    externalExecution:'No automatic claims, external PRs, payment acceptance or irreversible actions without authorization.',
    humanAuthority:true
  };
}
