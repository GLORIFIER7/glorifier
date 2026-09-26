export type AgentLifecycle = 'registered' | 'active' | 'paused' | 'quarantined' | 'revoked';
export type AgentActionRisk = 'low' | 'medium' | 'high' | 'critical';
export interface AgentIdentity {
  agentId: string; role: string; capabilities: string[]; allowedTools: string[];
  allowedDataScopes: string[]; riskLevel: AgentActionRisk; lifecycle: AgentLifecycle;
  humanApprovalRequired: boolean; registeredAt: string; updatedAt: string;
}
const agents = new Map<string, AgentIdentity>();
export function registerAgent(input: Omit<AgentIdentity, 'registeredAt' | 'updatedAt'>): AgentIdentity {
  const now = new Date().toISOString();
  const existing = agents.get(input.agentId);
  const value = { ...input, registeredAt: existing?.registeredAt || now, updatedAt: now };
  agents.set(input.agentId, value); return value;
}
export function getAgent(agentId: string) { return agents.get(agentId) || null; }
export function listControlledAgents() { return Array.from(agents.values()); }
export function authorizeAgentAction(agentId: string, action: {
  capability: string; tool?: string; dataScope?: string; risk?: AgentActionRisk;
  externallyIrreversible?: boolean; humanAuthorized?: boolean;
}) {
  const agent = agents.get(agentId);
  if (!agent) return { allowed: false, reason: 'agent_not_registered' as const };
  if (agent.lifecycle !== 'active') return { allowed: false, reason: 'agent_' + agent.lifecycle as const };
  if (!agent.capabilities.includes(action.capability)) return { allowed: false, reason: 'capability_denied' as const };
  if (action.tool && !agent.allowedTools.includes(action.tool)) return { allowed: false, reason: 'tool_denied' as const };
  if (action.dataScope && !agent.allowedDataScopes.includes(action.dataScope)) return { allowed: false, reason: 'data_scope_denied' as const };
  const highRisk = action.externallyIrreversible || action.risk === 'high' || action.risk === 'critical';
  if (highRisk && agent.humanApprovalRequired && !action.humanAuthorized) return { allowed: false, reason: 'human_authorization_required' as const };
  return { allowed: true as const, reason: 'authorized' as const };
}
export function quarantineAgent(agentId: string) {
  const agent = agents.get(agentId); if (!agent) return null;
  const next = { ...agent, lifecycle: 'quarantined' as const, updatedAt: new Date().toISOString() };
  agents.set(agentId, next); return next;
}
