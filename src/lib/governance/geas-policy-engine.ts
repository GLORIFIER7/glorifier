export type PolicyDecision = 'allow' | 'deny' | 'require_approval';
export interface PolicyContext {
  actorType: 'human' | 'agent' | 'system'; action: string;
  risk: 'low' | 'medium' | 'high' | 'critical'; hasEvidence?: boolean;
  evidenceVerified?: boolean; externallyIrreversible?: boolean;
  estimatedRevenue?: boolean; verifiedRevenue?: boolean;
}
export interface PolicyResult { decision: PolicyDecision; reasons: string[]; }
export function evaluateGeasPolicy(ctx: PolicyContext): PolicyResult {
  const reasons: string[] = [];
  if (ctx.verifiedRevenue && !ctx.evidenceVerified) return { decision: 'deny', reasons: ['verified revenue requires verified evidence'] };
  if (ctx.estimatedRevenue && !ctx.verifiedRevenue) reasons.push('estimated value cannot be treated as verified revenue');
  if (ctx.externallyIrreversible) {
    reasons.push('irreversible external actions require explicit authorization');
    return { decision: 'require_approval', reasons };
  }
  if (ctx.actorType === 'agent' && (ctx.risk === 'high' || ctx.risk === 'critical')) {
    reasons.push('high-risk agent actions require human authorization');
    return { decision: 'require_approval', reasons };
  }
  if (ctx.action.includes('payment') && !ctx.evidenceVerified) {
    reasons.push('payment actions require qualifying external evidence');
    return { decision: 'require_approval', reasons };
  }
  return { decision: 'allow', reasons: reasons.length ? reasons : ['policy requirements satisfied'] };
}
export function getGeasPolicy() {
  return { version: 'GEAS-3.0', principles: [
    'human authority remains final','provider-neutral execution','estimated value is never verified revenue',
    'agent actions require scoped identity and authorization','irreversible external actions require approval',
    'unavailable providers produce truthful unavailable states','evidence must precede verification'
  ]};
}
