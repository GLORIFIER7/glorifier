export const GLORIFIER_PATENT_POLICY = {
  id: 'glorifier-patent-governance-v1',
  name: 'GLORIFIER Patent & Policy Governance Policy',
  version: '1.0.0',
  purpose: 'Govern invention capture, IP research, policy analysis, evidence handling, and attorney-reviewable patent preparation without granting AI legal authority or inventorship.',
  principles: [
    'AI is an analysis and research instrument, not an inventor, patent owner, attorney, or filing authority.',
    'Natural-person inventorship must be documented from actual human contribution and reviewed by qualified patent counsel.',
    'Patentability, novelty, non-obviousness, subject-matter eligibility, enablement, ownership, filing strategy, and priority are counsel-review questions, not AI guarantees.',
    'Technical facts, evidence, inference, legal analysis, and policy interpretation must remain distinguishable.',
    'Missing evidence is not negative evidence.',
    'GLORIFIER must not invent patents, prior-art citations, inventors, filing status, ownership, legal authorities, or evidence.',
    'Confidential invention information must remain governed and must not be treated as public disclosure merely because an AI model processed it.',
    'No public disclosure, patent filing, assignment, license, legal commitment, or payment is executed autonomously.',
    'Policy Scientist and Patent/Attorney Scientist collaborate: Policy Scientist governs policy and ecosystem constraints; Patent/Attorney Scientist performs IP research and technical patent preparation.',
    'Human owner and qualified counsel retain final authority over legal, IP, policy, and irreversible actions.'
  ],
  controls: {
    inventionRegistryRequired: true,
    evidenceReferencesRequired: true,
    priorArtQuestionsRequired: true,
    humanContributionRequired: true,
    humanInventorshipRequired: true,
    counselReviewRequired: true,
    aiInventorship: false,
    patentabilityGuarantee: false,
    autonomousFiling: false,
    autonomousPublicDisclosure: false,
    autonomousAssignment: false,
    autonomousLicensing: false,
    autonomousLegalCommitment: false,
    autonomousPayment: false
  }
} as const;

export function getPatentPolicy() {
  return GLORIFIER_PATENT_POLICY;
}

export function evaluatePatentPolicy(input: {
  humanContributors?: string[];
  evidenceRefs?: string[];
  confidentiality?: string;
  requestedAction?: string;
}) {
  const humanContributors = input.humanContributors?.filter(Boolean) || [];
  const evidenceRefs = input.evidenceRefs?.filter(Boolean) || [];
  const action = String(input.requestedAction || '').toLowerCase();
  const irreversible = /file|publish|disclose|assign|license|sign|pay|submit/.test(action);

  const blockers: string[] = [];
  if (!humanContributors.length) blockers.push('Document human contribution before inventorship analysis.');
  if (!evidenceRefs.length) blockers.push('Attach technical/evidence references before treating the record as substantiated.');
  if (irreversible) blockers.push('Human owner and qualified patent counsel approval required before irreversible IP/legal action.');

  return {
    policyId: GLORIFIER_PATENT_POLICY.id,
    status: blockers.length ? 'review-required' as const : 'research-ready' as const,
    blockers,
    aiAuthority: 'research-support-only',
    humanAuthority: true,
    counselReviewRequired: true,
    confidentialByDefault: input.confidentiality !== 'public'
  };
}
