import { getGatsGovernancePolicy } from './gats-policy';

export const GLORIFIER_COMPLIANCE_POLICY_VERSION = 'GCP-0.1';

export const glorifierCompliancePolicy = {
  id: 'GLORIFIER-COMPLIANCE',
  version: GLORIFIER_COMPLIANCE_POLICY_VERSION,
  status: 'active-internal-policy',
  mission: 'Continuously map applicable requirements and internal policies to observable controls, evidence, risks, and remediation actions.',
  principles: {
    evidenceFirst: true,
    missingEvidenceIsNotCompliance: true,
    missingEvidenceIsNotNonCompliance: true,
    noUnsupportedComplianceClaims: true,
    humanReviewForMaterialFindings: true
  },
  controlDomains: [
    'AI governance',
    'model trust and security',
    'privacy and data protection',
    'identity and access management',
    'connection authorization',
    'economic truth and revenue evidence',
    'financial action controls',
    'auditability and records',
    'incident and risk management',
    'third-party/provider governance',
    'AI lifecycle and continual improvement'
  ],
  workflow: [
    'Identify requirement',
    'Map requirement to control',
    'Collect evidence',
    'Assess control state',
    'Record gap or uncertainty',
    'Propose remediation',
    'Human review where material',
    'Track remediation evidence',
    'Reassess continuously'
  ],
  externalAlignment: {
    iso42001: 'reference alignment',
    iso42005: 'impact-assessment reference',
    certificationClaimAllowed: false
  }
} as const;

export function getGlorifierCompliancePolicy() {
  return {
    ...glorifierCompliancePolicy,
    gatsVersion: getGatsGovernancePolicy().version
  };
}

export function evaluateCompliancePolicy() {
  const p = glorifierCompliancePolicy;
  const checks = [
    ['evidence-first', p.principles.evidenceFirst],
    ['missing-evidence-handling', p.principles.missingEvidenceIsNotCompliance && p.principles.missingEvidenceIsNotNonCompliance],
    ['unsupported-claims-blocked', p.principles.noUnsupportedComplianceClaims],
    ['human-review', p.principles.humanReviewForMaterialFindings],
    ['continuous-workflow', p.workflow.length >= 5],
    ['external-claims-controlled', p.externalAlignment.certificationClaimAllowed === false]
  ] as const;
  const controls = checks.map(([id, passed]) => ({ id, status: passed ? 'implemented' : 'gap' }));
  return {
    policyId: p.id,
    version: p.version,
    status: controls.every(c => c.status === 'implemented') ? 'active-conformant-internal-policy' : 'gaps-found',
    controls,
    disclaimer: 'Internal GLORIFIER compliance framework; it does not establish legal compliance, certification, accreditation, or third-party conformity.'
  };
}

export function buildComplianceAssessment(input: {
  objective: string;
  evidenceRefs?: string[];
  applicableRequirements?: string[];
}) {
  const evidenceRefs = Array.isArray(input.evidenceRefs) ? input.evidenceRefs.map(String).filter(Boolean) : [];
  const requirements = Array.isArray(input.applicableRequirements) ? input.applicableRequirements.map(String).filter(Boolean) : [];
  return {
    objective: input.objective,
    requirements,
    evidenceRefs,
    evidenceStatus: evidenceRefs.length ? 'evidence-recorded' : 'evidence-missing',
    complianceConclusion: 'not-determined',
    missingEvidenceIsNotNonCompliance: true,
    recommendedNextStep: evidenceRefs.length ? 'Review evidence and map controls to requirements.' : 'Collect authoritative evidence before making a compliance conclusion.',
    humanReviewRequired: true
  } as const;
}
