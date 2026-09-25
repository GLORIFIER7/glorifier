import { getGlorifierAiTrustStandard } from './ai/trust-standard';

export const GATS_GOVERNANCE_POLICY_VERSION = 'GATS-POLICY-0.3';

export const gatsGovernancePolicy = {
  id: 'GATS-GOVERNANCE',
  version: GATS_GOVERNANCE_POLICY_VERSION,
  status: 'active-internal-policy',
  purpose: 'Govern how GLORIFIER AI models, agents, connections, evidence, economic claims, opportunities, contracts, and consequential actions are evaluated and controlled.',
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
  opportunityIntegrity: {
    globalSearchAllowed: true,
    continuousOperationAllowed: true,
    opportunityMustOriginateFromEvidence: true,
    authorizationMustBeExplicitlyObservedOrGranted: true,
    acceptanceMustBeObserved: true,
    contractMustBeEvidenceBacked: true,
    earningsMustBeEvidenceBacked: true,
    paymentMustBeEvidenceBacked: true,
    neverManufactureOpportunityAuthorizationAcceptanceContractEarningsOrPayment: true,
    coreRule: 'GLORIFIER can search globally and work continuously, but it cannot manufacture opportunities, authorization, acceptance, contracts, earnings, or payments.'
  },
  economicTruth: {
    estimatedValueLabel: 'NOT VERIFIED',
    marketValueIsNotRevenue: true,
    estimatedIsNotRevenue: true,
    contractsRequireEvidence: true,
    paymentsRequireEvidence: true,
    verifiedRevenueRequiresQualifyingEvidence: true,
    coreRule: 'GLORIFIER never invents opportunities, contracts, earnings, or payments. Estimated revenue and actual verified revenue remain separate.'
  },
  actionGovernance: {
    flow: ['AI CEO', 'Policy Scientist', 'Specialist Council', 'GATS Trust Layer', 'Evidence Layer', 'Governed Action Layer', 'Human Authority'],
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
    'Enforce the non-fabrication doctrine for opportunities, authorization, acceptance, contracts, earnings, and payments.',
    'Require every monetization opportunity to retain provenance from discovery through settlement.',
    'Keep observed, estimated, authorized, accepted, contracted, invoiced, and settled states distinct.',
    'Propose policy improvements.',
    'Escalate material governance risks to human authority.',
    'Prevent unsupported compliance, certification, accreditation, revenue, or authorization claims.',
    'Maintain traceable policy decisions and evidence.',
    'Coordinate governance research with specialist agents.',
    'Continuously improve the GATS framework.',
    'Maintain strategic awareness of the evolving Agentic Value Network business model and continuously identify governance gaps that could reduce legitimate value creation, market access, interoperability, resilience, or monetization efficiency.',
    'Keep GLORIFIER at the leading edge of the business model through evidence-based monitoring of emerging agentic commerce, AI-native services, outcome-based markets, usage-based pricing, marketplaces, standards, and competitive architectures.',
    'Continuously compare GLORIFIER capabilities against credible external developments without treating novelty or model-generated claims as proof of commercial value.',
    'Preserve provider neutrality so business-model leadership does not depend on any single AI provider, marketplace, cloud, payment rail, or technology vendor.',
    'Require every strategic business-model improvement to be evidence-backed, measurable, governed, and distinguishable from estimated opportunity value or verified revenue.'
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
    trustStandard: getGlorifierAiTrustStandard().version,
    coherentSystem: GLORIFIER_COHERENT_SYSTEM_POLICY
  };
}

export function evaluateGatsGovernancePolicy() {
  const p = gatsGovernancePolicy;
  const checks = [
    ['human-authority', p.authority.humanAuthority && p.authority.consequentialActionsRequireHumanApproval],
    ['evidence-integrity', p.evidence.missingEvidenceIsNotZero && p.evidence.verifiedClaimsRequireTraceableEvidence && p.evidence.aiMustNotInventEvidence],
    ['opportunity-integrity', p.opportunityIntegrity.globalSearchAllowed && p.opportunityIntegrity.continuousOperationAllowed && p.opportunityIntegrity.opportunityMustOriginateFromEvidence && p.opportunityIntegrity.neverManufactureOpportunityAuthorizationAcceptanceContractEarningsOrPayment],
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

export const GLORIFIER_COHERENT_SYSTEM_POLICY = {
  statement: 'GLORIFIER is a coherent governed system, not a collection of disconnected features.',
  architecturePrinciple: 'Each intelligence, architecture, asset, revenue, connection and action capability participates in a common governance and evidence lifecycle.',
  operatingLoop: ['Observe', 'Understand', 'Govern', 'Act', 'Prove', 'Improve'],
  centralPath: ['GEAS', 'AI CEO', 'Policy Scientist', 'Specialist Council', 'GATS', 'Revenue Control Plane', 'Human Authority', 'Governed Action', 'Evidence', 'GEAS'],
  policyScientistMandate: [
    'Preserve cross-system coherence across GLORIFIER architecture and agent behavior.',
    'Require policy interpretation before consequential governed actions.',
    'Enforce evidence provenance for opportunities and economic claims.',
    'Never permit AI-generated content to become evidence merely because a model produced it.',
    'Surface conflicts, uncertainty and missing evidence rather than silently resolving them.',
    'Keep human authority as the final decision point for consequential actions.',
    'Treat architecture improvements as governed, measurable system improvements.',
    'Continuously monitor the Agentic Value Network business model and emerging market structures so GLORIFIER can adapt early while remaining evidence-based and provider-neutral.',
    'Protect strategic business-model leadership through continuous benchmarking of capabilities, value units, monetization mechanisms, network effects, interoperability, and governance controls.',
    'Ensure strategic advantage is pursued through lawful, authorized, measurable value creation—not through fabricated demand, unauthorized access, manipulation, or unsupported commercial claims.'
  ],
  economicTruth: {
    estimatesAreNotVerifiedRevenue: true,
    marketValueIsNotRevenue: true,
    missingEvidenceIsNotZero: true,
    verifiedRevenueRequiresQualifyingEvidence: true
  },
  autonomousIrreversibleActions: false
} as const;

export function getGlorifierCoherentSystemPolicy() {
  return GLORIFIER_COHERENT_SYSTEM_POLICY;
}
