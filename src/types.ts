export type PrivacyTier = 'zero-knowledge' | 'differential-privacy' | 'k-anonymity' | 'synthetic-twin';

export type FootprintStatus = 'active-monetizing' | 'shielded-private' | 'opted-out' | 'clawback-pending';

export type DataCategoryType = 
  | 'browsing'
  | 'ecommerce'
  | 'social'
  | 'health'
  | 'developer'
  | 'location'
  | 'financial';

export interface DataSampleRecord {
  field: string;
  rawValue: string;
  anonymizedValue: string;
  noiseLevel: string;
}

export interface DataFootprintSource {
  id: string;
  name: string;
  category: DataCategoryType;
  platform: string;
  iconName: string;
  dataPointsMonthly: number;
  marketMonthlyValueUsd: number;
  userMonthlyCompUsd: number;
  isMonetized: boolean;
  privacyTier: PrivacyTier;
  privacyEpsilon: number; // e.g. 0.3 to 1.5
  status: FootprintStatus;
  lastSync: string;
  description: string;
  leakRiskScore: number; // 0-100 (100 = high risk)
  samples: DataSampleRecord[];
}

export interface BuyerOffer {
  id: string;
  buyerName: string;
  buyerCategory: 'AI Research Lab' | 'Academic Medicine' | 'Consumer Trends' | 'Autonomous Systems' | 'FinTech Benchmark';
  buyerVerified: boolean;
  reputationScore: number;
  dataCategoriesNeeded: DataCategoryType[];
  offeredCompUsd: number;
  pricingCadence: 'monthly' | 'per_query' | 'one_off';
  requiredPrivacyTier: PrivacyTier;
  maxEpsilonAllowed: number;
  retentionWindowDays: number;
  purposeSummary: string;
  prohibitedPurposes: string[];
  aiBrokerScore: number; // 0-100
  aiVerdict: 'RECOMMEND' | 'CAUTION' | 'REJECT';
  aiBrokerReasoning: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
  counterOfferAmount?: number;
  timestamp: string;
}

export interface MonetizationPolicy {
  brokerMode: 'autonomous-maximize' | 'balanced-protective' | 'strict-sovereign';
  minimumMonthlyFloorUsd: number;
  allowAiModelPretraining: boolean;
  allowAdTargeting: boolean;
  allowAcademicResearch: boolean;
  allowInsuranceRiskProfiling: boolean;
  globalEpsilon: number;
  autoNegotiateHighBids: boolean;
  payoutMethod: 'usdc_solana' | 'stripe_connect' | 'direct_ach';
  walletAddress: string;
}

export interface CompensationTransaction {
  id: string;
  timestamp: string;
  buyerName: string;
  category: DataCategoryType;
  amountUsd: number;
  privacyTier: PrivacyTier;
  txHash: string;
  status: 'settled' | 'pending';
}

export interface DataBrokerExposure {
  id: string;
  brokerName: string;
  brokerType: 'AdTech Aggregator' | 'Risk Profiler' | 'Shadow Tracker' | 'People Search Data Mill';
  estimatedRecordsHeld: number;
  exposureSeverity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  monetizedWithoutConsent: number; // Estimated revenue they make off user in $/yr
  status: 'detected' | 'clawback_sent' | 'purged';
  complianceStatute: string; // GDPR Art. 17 / CCPA § 1798.105
  actionTimestamp?: string;
}

export interface AiBrokerChatMessage {
  id: string;
  sender: 'user' | 'ai_broker';
  content: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    type: 'apply_policy' | 'opt_out_all' | 'maximize_yield' | 'run_audit';
    payload?: any;
  };
}

export interface SovereignStats {
  totalEarnedUsd: number;
  pendingSettlementUsd: number;
  activeDataStreamsCount: number;
  monthlyPacingUsd: number;
  totalDataPointsGoverned: number;
  privacyShieldIndex: number; // 0-100
  brokerBidsProcessedToday: number;
}

export interface ActiveDataGrant {
  id: string;
  dataPointName: string;
  category: DataCategoryType;
  sharedFields: string[];
  recipientOrg: string;
  recipientCategory: string;
  purpose: string;
  protectionTech: 'Differential Privacy' | 'Homomorphic Encryption' | 'Federated Learning' | 'Zero-Knowledge Attestation';
  epsilonLevel?: number;
  compensationModel: 'per_query' | 'subscription' | 'shapley_ml' | 'per_action';
  rateDescription: string;
  grantedAt: string;
  expiresAt: string;
  ttlHoursRemaining: number;
  status: 'active' | 'revoked' | 'expired';
  verifiableToken: string;
  totalQueriesServed: number;
  revenueAccruedUsd: number;
}

export interface UsageTelemetryEvent {
  id: string;
  timestamp: string;
  grantId: string;
  recipientOrg: string;
  dataCategory: DataCategoryType;
  eventType: 'dp_query_laplace' | 'fhe_computation' | 'fl_gradient_update' | 'zk_proof_verification' | 'batch_subscription_tick';
  queryUnits: number;
  compensationUsd: number;
  calculationModel: 'Per-Query' | 'Data Shapley' | 'Cohort Subscription' | 'Proof Attestation';
  zkProofHash: string;
  epsilonConsumed: number;
}
