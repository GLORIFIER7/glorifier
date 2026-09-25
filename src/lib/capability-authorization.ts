export type CapabilityRisk = 'low' | 'medium' | 'high' | 'critical';

export type CapabilityPolicy = {
  id: string;
  risk: CapabilityRisk;
  requiresHumanApproval: boolean;
  reversible: boolean;
};

const POLICIES: Record<string, CapabilityPolicy> = {
  'read.repository': { id: 'read.repository', risk: 'low', requiresHumanApproval: false, reversible: true },
  'analyze.code': { id: 'analyze.code', risk: 'low', requiresHumanApproval: false, reversible: true },
  'create.branch': { id: 'create.branch', risk: 'medium', requiresHumanApproval: false, reversible: true },
  'create.pull_request': { id: 'create.pull_request', risk: 'medium', requiresHumanApproval: false, reversible: true },
  'run.ci': { id: 'run.ci', risk: 'medium', requiresHumanApproval: false, reversible: true },
  'deploy.staging': { id: 'deploy.staging', risk: 'high', requiresHumanApproval: true, reversible: true },
  'deploy.production': { id: 'deploy.production', risk: 'critical', requiresHumanApproval: true, reversible: false },
  'change.credentials': { id: 'change.credentials', risk: 'critical', requiresHumanApproval: true, reversible: false },
  'move.funds': { id: 'move.funds', risk: 'critical', requiresHumanApproval: true, reversible: false },
  'change.ownership': { id: 'change.ownership', risk: 'critical', requiresHumanApproval: true, reversible: false },
  'delete.resource': { id: 'delete.resource', risk: 'critical', requiresHumanApproval: true, reversible: false }
};

export function getCapabilityPolicy(capability: string): CapabilityPolicy | null {
  return POLICIES[capability.trim().toLowerCase()] || null;
}

export function authorizeCapability(input: { capability: string; requestedBy?: string; humanApproved?: boolean }) {
  const policy = getCapabilityPolicy(input.capability);
  if (!policy) return { allowed: false, reason: 'unknown_capability', requiresHumanApproval: true };
  if (policy.requiresHumanApproval && input.humanApproved !== true) {
    return { allowed: false, reason: 'human_approval_required', requiresHumanApproval: true, policy };
  }
  return { allowed: true, reason: 'policy_allowed', requiresHumanApproval: policy.requiresHumanApproval, policy };
}

export function listCapabilityPolicies() { return Object.values(POLICIES); }
