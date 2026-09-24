import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';

export type BountyProgramType = 'bug-bounty' | 'vulnerability-disclosure' | 'research-grant' | 'security-challenge';
export type BountyProgramStatus = 'discovered' | 'verified' | 'authorized' | 'paused' | 'closed';
export type FindingSeverity = 'informational' | 'low' | 'medium' | 'high' | 'critical';

export interface BountyProgramRecord {
  id: string;
  platform: string;
  name: string;
  programType: BountyProgramType;
  status: BountyProgramStatus;
  scopeUrl: string | null;
  submissionUrl: string | null;
  rewardCurrency: string;
  rewardRange: string | null;
  capabilities: string[];
  authorizationRequired: boolean;
  requiresHumanApproval: boolean;
  metadata: Record<string, unknown>;
}

export interface BountyFindingRecord {
  id: string;
  programId: string;
  title: string;
  severity: FindingSeverity;
  target: string;
  evidenceRef: string | null;
  status: 'draft' | 'needs-human-review' | 'approved-for-submission' | 'submitted' | 'accepted' | 'rejected' | 'duplicate';
  bountyAmount: number | null;
  currency: string | null;
  discoveredBy: string;
  createdAt: string;
}

const seedPrograms: Omit<BountyProgramRecord, 'id'>[] = [
  {
    platform: 'HackerOne', name: 'HackerOne programs', programType: 'bug-bounty', status: 'discovered',
    scopeUrl: 'https://hackerone.com/directory', submissionUrl: 'https://hackerone.com/',
    rewardCurrency: 'USD', rewardRange: null,
    capabilities: ['program-discovery', 'scope-review', 'submission-workflow'],
    authorizationRequired: true, requiresHumanApproval: true,
    metadata: { catalogOnly: true, note: 'Only authorized program scopes may be tested.' }
  },
  {
    platform: 'Bugcrowd', name: 'Bugcrowd programs', programType: 'bug-bounty', status: 'discovered',
    scopeUrl: 'https://bugcrowd.com/engagements', submissionUrl: 'https://bugcrowd.com/',
    rewardCurrency: 'USD', rewardRange: null,
    capabilities: ['program-discovery', 'scope-review', 'submission-workflow'],
    authorizationRequired: true, requiresHumanApproval: true,
    metadata: { catalogOnly: true, note: 'Only authorized program scopes may be tested.' }
  },
  {
    platform: 'Intigriti', name: 'Intigriti programs', programType: 'bug-bounty', status: 'discovered',
    scopeUrl: 'https://app.intigriti.com/programs', submissionUrl: 'https://www.intigriti.com/',
    rewardCurrency: 'EUR', rewardRange: null,
    capabilities: ['program-discovery', 'scope-review', 'submission-workflow'],
    authorizationRequired: true, requiresHumanApproval: true,
    metadata: { catalogOnly: true, note: 'Only authorized program scopes may be tested.' }
  }
];

export async function initializeBountyRegistry() {
  const db = getPostgresPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS bounty_program_registry (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      name TEXT NOT NULL,
      program_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'discovered',
      scope_url TEXT,
      submission_url TEXT,
      reward_currency TEXT NOT NULL DEFAULT 'USD',
      reward_range TEXT,
      capabilities JSONB NOT NULL DEFAULT '[]',
      authorization_required BOOLEAN NOT NULL DEFAULT TRUE,
      requires_human_approval BOOLEAN NOT NULL DEFAULT TRUE,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS bounty_finding_registry (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL REFERENCES bounty_program_registry(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      target TEXT NOT NULL,
      evidence_ref TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      bounty_amount NUMERIC,
      currency TEXT,
      discovered_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS bounty_events (
      id TEXT PRIMARY KEY,
      program_id TEXT,
      finding_id TEXT,
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_bounty_program_status ON bounty_program_registry(status);
    CREATE INDEX IF NOT EXISTS idx_bounty_finding_status ON bounty_finding_registry(status);
  `);
  for (const program of seedPrograms) {
    const id = `bounty-program-${program.platform.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await db.query(
      `INSERT INTO bounty_program_registry
        (id,platform,name,program_type,status,scope_url,submission_url,reward_currency,reward_range,capabilities,authorization_required,requires_human_approval,metadata)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT(id) DO NOTHING`,
      [id, program.platform, program.name, program.programType, program.status, program.scopeUrl, program.submissionUrl,
       program.rewardCurrency, program.rewardRange, JSON.stringify(program.capabilities), program.authorizationRequired,
       program.requiresHumanApproval, JSON.stringify(program.metadata)]
    );
  }
}

export async function listBountyPrograms() {
  await initializeBountyRegistry();
  const r = await getPostgresPool().query('SELECT * FROM bounty_program_registry ORDER BY status, platform');
  return r.rows.map(mapProgram);
}

export async function registerBountyProgram(input: Omit<BountyProgramRecord, 'id'> & { id?: string }) {
  await initializeBountyRegistry();
  const id = input.id || `bounty-program-${crypto.randomUUID()}`;
  const r = await getPostgresPool().query(
    `INSERT INTO bounty_program_registry
      (id,platform,name,program_type,status,scope_url,submission_url,reward_currency,reward_range,capabilities,authorization_required,requires_human_approval,metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT(id) DO UPDATE SET platform=EXCLUDED.platform,name=EXCLUDED.name,program_type=EXCLUDED.program_type,
       status=EXCLUDED.status,scope_url=EXCLUDED.scope_url,submission_url=EXCLUDED.submission_url,reward_currency=EXCLUDED.reward_currency,
       reward_range=EXCLUDED.reward_range,capabilities=EXCLUDED.capabilities,authorization_required=EXCLUDED.authorization_required,
       requires_human_approval=EXCLUDED.requires_human_approval,metadata=EXCLUDED.metadata,updated_at=NOW()
     RETURNING *`,
    [id,input.platform,input.name,input.programType,input.status,input.scopeUrl,input.submissionUrl,input.rewardCurrency,input.rewardRange,
     JSON.stringify(input.capabilities),input.authorizationRequired,input.requiresHumanApproval,JSON.stringify(input.metadata || {})]
  );
  return mapProgram(r.rows[0]);
}

export async function createBountyFinding(input: Omit<BountyFindingRecord, 'id' | 'createdAt' | 'status'>) {
  await initializeBountyRegistry();
  const id = `finding-${crypto.randomUUID()}`;
  const r = await getPostgresPool().query(
    `INSERT INTO bounty_finding_registry
      (id,program_id,title,severity,target,evidence_ref,status,bounty_amount,currency,discovered_by)
     VALUES($1,$2,$3,$4,$5,$6,'needs-human-review',$7,$8,$9) RETURNING *`,
    [id,input.programId,input.title,input.severity,input.target,input.evidenceRef || null,input.bountyAmount ?? null,input.currency ?? null,input.discoveredBy]
  );
  await recordBountyEvent(input.programId, id, 'finding_created', input.discoveredBy, { severity: input.severity, target: input.target });
  return mapFinding(r.rows[0]);
}

export async function listBountyFindings(status?: BountyFindingRecord['status']) {
  await initializeBountyRegistry();
  const r = status
    ? await getPostgresPool().query('SELECT * FROM bounty_finding_registry WHERE status=$1 ORDER BY created_at DESC',[status])
    : await getPostgresPool().query('SELECT * FROM bounty_finding_registry ORDER BY created_at DESC');
  return r.rows.map(mapFinding);
}

export async function updateBountyFindingStatus(id: string, status: BountyFindingRecord['status'], actor: string) {
  await initializeBountyRegistry();
  const r = await getPostgresPool().query('UPDATE bounty_finding_registry SET status=$2 WHERE id=$1 RETURNING *',[id,status]);
  if (!r.rows[0]) throw new Error('Bounty finding not found');
  await recordBountyEvent(r.rows[0].program_id, id, 'finding_status_changed', actor, { status });
  return mapFinding(r.rows[0]);
}

export async function recordBountyEvent(programId: string, findingId: string | null, eventType: string, actor: string, details: Record<string, unknown> = {}) {
  await initializeBountyRegistry();
  const id = `be-${crypto.randomUUID()}`;
  await getPostgresPool().query(
    'INSERT INTO bounty_events(id,program_id,finding_id,event_type,actor,details) VALUES($1,$2,$3,$4,$5,$6)',
    [id,programId,findingId,eventType,actor,JSON.stringify(details)]
  );
  return { id, programId, findingId, eventType, actor, details };
}

function mapProgram(x: any): BountyProgramRecord {
  return {
    id:x.id, platform:x.platform, name:x.name, programType:x.program_type, status:x.status,
    scopeUrl:x.scope_url, submissionUrl:x.submission_url, rewardCurrency:x.reward_currency, rewardRange:x.reward_range,
    capabilities:x.capabilities || [], authorizationRequired:Boolean(x.authorization_required),
    requiresHumanApproval:Boolean(x.requires_human_approval), metadata:x.metadata || {}
  };
}

function mapFinding(x: any): BountyFindingRecord {
  return {
    id:x.id, programId:x.program_id, title:x.title, severity:x.severity, target:x.target,
    evidenceRef:x.evidence_ref, status:x.status, bountyAmount:x.bounty_amount == null ? null : Number(x.bounty_amount),
    currency:x.currency, discoveredBy:x.discovered_by, createdAt:new Date(x.created_at).toISOString()
  };
}
