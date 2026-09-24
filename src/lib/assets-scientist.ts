import { getGatsGovernancePolicy } from './gats-policy';
import { getGlorifierCompliancePolicy } from './compliance-policy';

export const GLORIFIER_ASSET_SCIENTIST_VERSION = 'GAS-0.1';

export const assetsScientistPolicy = {
  id: 'GLORIFIER-ASSETS-SCIENTIST',
  version: GLORIFIER_ASSET_SCIENTIST_VERSION,
  status: 'active-internal-policy',
  mission: 'Continuously analyze connected assets, evidence, lifecycle, valuation, risk, utilization, and opportunities while keeping asset value separate from verified revenue.',
  assetClasses: ['crypto','fiat','gaming','stock','bond','etf','iot','intellectual-property','other'],
  principles: {
    ownershipRequiresEvidence: true,
    marketValueIsNotRevenue: true,
    estimatedValueIsNotVerified: true,
    missingEvidenceIsNotZero: true,
    staleValuationsMustBeFlagged: true,
    conflictingSourcesMustBeSurfaced: true,
    autonomousTradingDisabled: true,
    autonomousFundMovementDisabled: true,
    irreversibleAssetActionsRequireHumanApproval: true
  },
  workflow: [
    'Discover asset',
    'Identify source and ownership evidence',
    'Classify asset',
    'Assess lifecycle and condition',
    'Estimate or observe valuation',
    'Assess risk and utilization',
    'Identify value-realization opportunities',
    'Verify qualifying evidence',
    'Prepare governed action',
    'Require human authorization for consequential action',
    'Record resulting evidence'
  ],
  collaboration: {
    policyScientist: 'interprets governance and policy requirements',
    complianceScientist: 'maps asset controls to compliance requirements and evidence',
    financeScientist: 'analyzes financial implications and valuation scenarios',
    riskScientist: 'assesses asset and operational risk',
    dataScientist: 'validates asset data quality and uncertainty',
    aiCeo: 'coordinates priorities and final orchestration'
  },
  externalAlignment: {
    iso55000: 'reference principles',
    iso55001: 'asset-management-system alignment reference',
    certificationClaimAllowed: false
  }
} as const;

export function getAssetsScientistPolicy() {
  return {
    ...assetsScientistPolicy,
    gatsVersion: getGatsGovernancePolicy().version,
    compliancePolicyVersion: getGlorifierCompliancePolicy().version
  };
}

export function buildAssetAssessment(input: {
  assetRef: string;
  assetClass: string;
  evidenceRefs?: string[];
  estimatedValue?: number;
  currency?: string;
}) {
  const evidenceRefs = Array.isArray(input.evidenceRefs) ? input.evidenceRefs.map(String).filter(Boolean) : [];
  return {
    assetRef: input.assetRef,
    assetClass: input.assetClass,
    evidenceRefs,
    evidenceStatus: evidenceRefs.length ? 'evidence-recorded' : 'evidence-missing',
    estimatedValue: input.estimatedValue ?? null,
    valueLabel: input.estimatedValue != null ? 'NOT VERIFIED' : 'NOT RECORDED',
    currency: input.currency || null,
    marketValueIsNotRevenue: true,
    ownershipConclusion: 'not-determined',
    valuationConclusion: input.estimatedValue != null ? 'estimated-not-verified' : 'not-determined',
    humanApprovalRequiredForConsequentialAction: true,
    nextStep: evidenceRefs.length ? 'Review asset evidence, valuation freshness, and risk.' : 'Collect authoritative ownership and asset evidence.'
  } as const;
}
