import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';
import { aiOrchestrator } from './ai/orchestrator';
import { runSpecialistCouncil } from './ai/specialist-council';
import { routeAgentCapability, createAgentTask, updateAgentTask } from './agent-runtime';
import { getGlorifierAiTrustStandard, evaluateGlorifierAiTrustConformance } from './ai/trust-standard';
import { getWindsorSocialGatewayStatus, getWindsorSocialData } from './windsor-social-gateway';
import { buildComplianceAssessment } from './compliance-policy';

const query = (text: string, values?: unknown[]) => getPostgresPool().query(text, values);

export type GovernanceStage = 'ceo' | 'specialists' | 'trust' | 'evidence' | 'governed-action' | 'completed' | 'blocked';

export interface GovernanceCycle {
  id: string;
  taskId: string;
  objective: string;
  capability: string;
  stage: GovernanceStage;
  executive: unknown;
  routing: unknown;
  council: unknown;
  trust: unknown;
  compliance: unknown;
  evidence: { id: string; status: 'recorded' | 'missing'; references: string[] };
  action: {
    status: 'approval-required' | 'blocked';
    reversible: boolean;
    executionEnabled: false;
    humanApprovalRequired: true;
  };
  createdAt: string;
}

let initialized = false;

export async function initializeGovernanceLoop() {
  if (initialized) return;
  await query(`
    CREATE TABLE IF NOT EXISTS glorifier_governance_cycles (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      objective TEXT NOT NULL,
      capability TEXT NOT NULL,
      stage TEXT NOT NULL,
      executive JSONB NOT NULL DEFAULT '{}'::jsonb,
      routing JSONB NOT NULL DEFAULT '{}'::jsonb,
      council JSONB NOT NULL DEFAULT '{}'::jsonb,
      trust JSONB NOT NULL DEFAULT '{}'::jsonb,
      evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
      action JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_glorifier_governance_cycles_created ON glorifier_governance_cycles(created_at DESC);
  `);
  initialized = true;
}

export async function runGovernanceCycle(input: {
  objective: string;
  capability?: string;
  roles?: string[];
  evidenceRefs?: string[];
  reversible?: boolean;
  requester?: string;
}) {
  await initializeGovernanceLoop();
  const objective = String(input.objective || '').trim();
  if (!objective) throw new Error('objective is required');
  const capability = String(input.capability || 'research').trim().toLowerCase();
  const evidenceRefs = Array.isArray(input.evidenceRefs) ? input.evidenceRefs.map(String).filter(Boolean) : [];
  const windsorEnabled = capability === 'social-intelligence' || capability === 'social-monitoring' || objective.toLowerCase().includes('windsor');
  const windsor = windsorEnabled ? getWindsorSocialGatewayStatus() : null;
  const reversible = input.reversible === true;

  const task = createAgentTask({
    capability,
    objective,
    input: { evidenceRefs, reversible },
    requester: input.requester || 'human-owner',
    approvalRequired: true
  });
  updateAgentTask(task.id, { status: 'running' });

  // 1. AI CEO selects the executive/provider context.
  const executive = aiOrchestrator.executive();

  // 2. Capability-first delegation to the specialist council.
  const routing = routeAgentCapability(capability);
  const selectedRoles = input.roles?.length ? input.roles : routing.specialists.length ? routing.specialists : undefined;
  const council = await runSpecialistCouncil({
    objective,
    roles: selectedRoles,
    standingMission: false
  });

  // 3. GATS trust gate evaluates the governance state before any action proposal.
  const trust = evaluateGlorifierAiTrustConformance();
  const trustGatePassed = trust.status === 'conformant-self-attestation' && trust.controls.every((c) => c.status === 'implemented');

  // 4. Compliance Scientist collaborates with Policy Scientist before evidence/action gating.\n  const compliance = buildComplianceAssessment({ objective, evidenceRefs, applicableRequirements: ['GATS governance policy', 'applicable AI/data/security requirements'] });\n\n  // 5. Evidence is explicit. References are recorded, never inferred. Windsor observations are source evidence only.
  let windsorEvidence: unknown = null;
  if (windsorEnabled && windsor?.configured) {
    try {
      const platforms = ['facebook','linkedin','tiktok'] as const;
      const observations = [];
      for (const platform of platforms) {
        try { observations.push(await getWindsorSocialData(platform, ['date','source'], 'last_30d')); }
        catch (error: any) { observations.push({ platform, status: 'unavailable', error: error?.message || String(error) }); }
      }
      windsorEvidence = { source: 'windsor.ai', observations, economicTruth: 'NOT VERIFIED; source observations are not revenue evidence' };
    } catch (error: any) { windsorEvidence = { source: 'windsor.ai', status: 'error', error: error?.message || String(error) }; }
  }
  const evidenceId = `gev-${crypto.randomUUID()}`;
  const evidence = {
    id: evidenceId,
    status: (evidenceRefs.length || windsorEvidence) ? 'recorded' as const : 'missing' as const,
    references: [...evidenceRefs, ...(windsorEvidence ? ['windsor.ai:social-observations'] : [])],
    windsor: windsorEvidence
  };

  // 6. Governed action is a proposal only. No irreversible execution is performed here.
  const actionStatus = trustGatePassed && evidence.references.length ? 'approval-required' as const : 'blocked' as const;
  const action = {
    status: actionStatus,
    reversible,
    executionEnabled: false as const,
    humanApprovalRequired: true as const
  };

  const stage: GovernanceStage = actionStatus === 'approval-required' ? 'governed-action' : 'blocked';
  const cycle: GovernanceCycle = {
    id: `gcycle-${crypto.randomUUID()}`,
    taskId: task.id,
    objective,
    capability,
    stage,
    executive,
    routing,
    council,
    trust: {
      ...trust,
      gatePassed: trustGatePassed,
      rule: 'GATS trust controls gate consequential actions.'
    },
    compliance,
    evidence,
    action,
    createdAt: new Date().toISOString()
  };

  await query(
    `INSERT INTO glorifier_governance_cycles
      (id,task_id,objective,capability,stage,executive,routing,council,trust,evidence,action)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb)`,
    [cycle.id, cycle.taskId, cycle.objective, cycle.capability, cycle.stage,
      JSON.stringify(cycle.executive), JSON.stringify(cycle.routing), JSON.stringify(cycle.council),
      JSON.stringify({ ...cycle.trust, compliance: cycle.compliance }), JSON.stringify({ ...cycle.evidence, windsor: windsorEvidence }), JSON.stringify(cycle.action)]
  );

  updateAgentTask(task.id, {
    status: actionStatus === 'blocked' ? 'failed' : 'completed',
    result: cycle
  });

  return cycle;
}

export async function listGovernanceCycles(limit = 50) {
  const result = await query(
    `SELECT id,task_id AS "taskId",objective,capability,stage,executive,routing,council,trust,evidence,action,created_at AS "createdAt"
     FROM glorifier_governance_cycles ORDER BY created_at DESC LIMIT $1`,
    [Math.max(1, Math.min(100, limit))]
  );
  return result.rows;
}

export function getGovernanceLoopPolicy() {
  return {
    name: 'GLORIFIER Continuous Governance Orchestration Loop',
    flow: ['AI CEO', 'Specialist Council', 'GATS Trust Layer', 'Evidence Layer', 'Governed Action Layer'],
    humanAuthority: true,
    evidenceRequiredBeforeVerification: true,
    missingEvidenceIsNotZero: true,
    consequentialActionsRequireHumanApproval: true,
    autonomousIrreversibleExecution: false,
    executionEnabled: false,
    trustStandard: getGlorifierAiTrustStandard().version
  };
}
