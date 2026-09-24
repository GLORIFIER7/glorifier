import { getGlorifierAiTrustStandard } from './ai/trust-standard';

export const GATS_GOVERNANCE_POLICY_VERSION = 'GATS-POLICY-0.1';

export const gatsGovernancePolicy = {
  id: 'GATS-GOVERNANCE',
  version: GATS_GOVERNANCE_POLICY_VERSION,
  status: 'active-internal-policy',
  purpose: 'Govern how GLORIFIER AI models, agents, connections, evidence, economic claims, and consequential actions are evaluated and controlled.',
  authority: {
    humanAuthority: true,
    aiIsAdvisoryAndOrchestrating: true,
    consequentialActionsRequireHumanApproval: true,
    irreversibleExecutionAutonomous: false
  },
  evidence: {
    missingEvidenceIsNotZero: true,
    unsupportedClaimsMustBeFlagged: true,
    verifiedClaimsRequireTraceableEvidence: true,
    aiMustNotInventEvidence: true
  },
  economicTruth: {
    estimatedValueLabel: 'NOT VERIFIED',
    marketValueIsNotRevenue: true,
    estimatedIsNotRevenue: true,
    contractsRequireEvidence: true,
    paymentsRequireEvidence: true,
    verifiedRevenueRequiresQualifyingEvidence: true,
    coreRule: 'GLORIFIER never invents opportunities, contracts, earnings, or payments.'
  },
  actionGovernance: {
    flow: [
      'AI CEO',
      'Specialist Council',
      'GATS Trust Layer',
      'Evidence Layer',
      'Governed Action Layer',
      'Human Authority'
    ],
    autonomousTradingDisabled: true,
    autonomousFundMovementDisabled: true,
    autonomousContractingDisabled: true,
    autonomousWithdrawalsDisabled: true,
    autonomousConsequentialSocialActionsDisabled: true,
    executionRequiresExplicitAuthorization: true
  },
  modelGovernance: {
    modelIdentityRequired: true,
    capabilityBoundariesRequired: true,
    multiModelDisagreementMustBeSurfaced: true,
    rogueModelDefenseEnabled: true,
    quarantineCanBlockExecution: true
  },
  connectionGovernance: {
    explicitAuthorizationRequired: true,
    credentialSecretsStoredInConnectionRegistry: false,
    authorizationDoesNotImplyActionPermission: true,
    revocationAndExpirationMustBeObservable: true
  },
  policyScientistMission: [
    'Monitor emerging AI governance requirements.',
    'Identify policy and governance gaps.',
    'Map requirements to GLORIFIER controls and evidence.',
    'Propose policy improvements.',
    'Escalate material governance risks to human authority.',
    'Prevent unsupported compliance, certification, or accreditation claims.',
    'Maintain traceable policy decisions and evidence.',
    'Coordinate governance research with specialist agents.',
    'Continuously improve the GATS framework.'
  ],
  externalAlignment: {
    iso42001: 'alignment-reference-only',
    isoCertificationClaimAllowed: false,
    note: 'Internal GATS implementation does not constitute ISO certification, accreditation, or independent conformity assessment.'
  }
} as const;

export function getGatsGovernancePolicy() {
  return {
    ...gatsGovernancePolicy,
    trustStandard: getGlorifierAiTrustStandard().version
  };
}

export function evaluateGatsGovernancePolicy() {
  const p = gatsGovernancePolicy;
  const checks = [
    ['human-authority', p.authority.humanAuthority && p.authority.consequentialActionsRequireHumanApproval],
    ['evidence-integrity', p.evidence.missingEvidenceIsNotZero && p.evidence.verifiedClaimsRequireTraceableEvidence && p.evidence.aiMustNotInventEvidence],
    ['economic-truth', p.economicTruth.marketValueIsNotRevenue && p.economicTruth.estimatedIsNotRevenue && p.economicTruth.verifiedRevenueRequiresQualifyingEvidence],
    ['action-governance', p.actionGovernance.autonomousTradingDisabled && p.actionGovernance.autonomousFundMovementDisabled && p.actionGovernance.autonomousContractingDisabled && p.actionGovernance.executionRequiresExplicitAuthorization],
    ['model-governance', p.modelGovernance.modelIdentityRequired && p.modelGovernance.capabilityBoundariesRequired && p.modelGovernance.rogueModelDefenseEnabled],
    ['connection-governance', p.connectionGovernance.explicitAuthorizationRequired && p.connectionGovernance.authorizationDoesNotImplyActionPermission]
  ] as const;
  const results = checks.map(([id, passed]) => ({ id, status: passed ? 'implemented' : 'gap' }));
  return {
    policyId: p.id,
    version: p.version,
    status: results.every(r => r.status === 'implemented') ? 'active-conformant-internal-policy' : 'gaps-found',
    controls: results,
    disclaimer: 'Internal GLORIFIER governance policy; not legal advice, ISO certification, accreditation, or third-party conformity assessment.'
  };
}
