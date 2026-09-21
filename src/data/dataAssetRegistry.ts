import { DataCategoryType } from '../types';

export type DataAssetOrigin = 'demo' | 'real_app_activity' | 'connected_integration' | 'imported';
export type DataAssetConsent = 'verified' | 'user_required' | 'unknown' | 'not_applicable';
export type DataAssetSensitivity = 'low' | 'moderate' | 'high' | 'restricted';
export type DataAssetCommercialization = 'eligible_after_review' | 'blocked' | 'research_only' | 'not_ready';

export interface DataAsset {
  id: string;
  name: string;
  source: string;
  ownerReference: 'current_user' | 'system' | 'third_party';
  origin: DataAssetOrigin;
  consentStatus: DataAssetConsent;
  fields: string[];
  category: DataCategoryType;
  sensitivity: DataAssetSensitivity;
  anonymizationStatus: 'not_started' | 'aggregation_required' | 'anonymized' | 'synthetic_only';
  allowedUse: string[];
  prohibitedUse: string[];
  commercializationStatus: DataAssetCommercialization;
  estimatedMarketValueUsdMonthly: number | null;
  productIdea: string;
  buyerProfile: string;
  evidence: string;
  lastAuditedAt: string;
}

export const DATA_ASSET_REGISTRY: DataAsset[] = [
  {
    id: 'asset-demo-developer-trends',
    name: 'Developer Technology Trends',
    source: 'Demo footprint / developer telemetry',
    ownerReference: 'system',
    origin: 'demo',
    consentStatus: 'unknown',
    fields: ['technology_category', 'usage_frequency', 'trend_direction'],
    category: 'developer',
    sensitivity: 'low',
    anonymizationStatus: 'aggregation_required',
    allowedUse: ['Aggregated trend research', 'Technology market intelligence'],
    prohibitedUse: ['Individual profiling', 'Raw event resale'],
    commercializationStatus: 'not_ready',
    estimatedMarketValueUsdMonthly: null,
    productIdea: 'Aggregated developer technology trend API',
    buyerProfile: 'Developer tooling companies and research teams',
    evidence: 'Current repository contains demo/example footprint data; real customer provenance is not yet established.',
    lastAuditedAt: '2026-09-21'
  },
  {
    id: 'asset-demo-web-interests',
    name: 'Web Interest Trends',
    source: 'Demo footprint / web-interest examples',
    ownerReference: 'system',
    origin: 'demo',
    consentStatus: 'unknown',
    fields: ['topic_category', 'interest_signal', 'sentiment_bucket'],
    category: 'browsing',
    sensitivity: 'moderate',
    anonymizationStatus: 'aggregation_required',
    allowedUse: ['Aggregated audience research'],
    prohibitedUse: ['Individual targeting', 'Identity resolution'],
    commercializationStatus: 'not_ready',
    estimatedMarketValueUsdMonthly: null,
    productIdea: 'Anonymous topic-interest trend API',
    buyerProfile: 'Consumer research and market intelligence teams',
    evidence: 'Repository examples include web/video/social interest signals; these are treated as demo data until real provenance is verified.',
    lastAuditedAt: '2026-09-21'
  },
  {
    id: 'asset-gmail-insights',
    name: 'Gmail-Derived Commercial Insights',
    source: 'Google Workspace integration',
    ownerReference: 'current_user',
    origin: 'connected_integration',
    consentStatus: 'user_required',
    fields: ['aggregate_receipt_category', 'aggregate_newsletter_category', 'aggregate_travel_category'],
    category: 'email',
    sensitivity: 'restricted',
    anonymizationStatus: 'synthetic_only',
    allowedUse: ['User-approved aggregate research only'],
    prohibitedUse: ['Raw email resale', 'Message-content resale', 'Individual profiling'],
    commercializationStatus: 'blocked',
    estimatedMarketValueUsdMonthly: null,
    productIdea: 'Consent-controlled aggregate commerce trend dataset',
    buyerProfile: 'Market research organizations',
    evidence: 'Workspace integration exists, but commercial consent and production aggregation controls must be verified before use.',
    lastAuditedAt: '2026-09-21'
  },
  {
    id: 'asset-drive-insights',
    name: 'Google Drive Aggregate Insights',
    source: 'Google Drive integration',
    ownerReference: 'current_user',
    origin: 'connected_integration',
    consentStatus: 'user_required',
    fields: ['aggregate_document_category', 'aggregate_topic_category', 'aggregate_file_activity'],
    category: 'drive',
    sensitivity: 'restricted',
    anonymizationStatus: 'synthetic_only',
    allowedUse: ['User-approved aggregate research only'],
    prohibitedUse: ['Raw document resale', 'Document content resale', 'Individual profiling'],
    commercializationStatus: 'blocked',
    estimatedMarketValueUsdMonthly: null,
    productIdea: 'Privacy-preserving document activity trend dataset',
    buyerProfile: 'Enterprise research teams',
    evidence: 'Drive governance code exists, but private document content is not treated as saleable data.',
    lastAuditedAt: '2026-09-21'
  },
  {
    id: 'asset-health-biometric',
    name: 'Health / Biometric Telemetry',
    source: 'Demo health footprint',
    ownerReference: 'system',
    origin: 'demo',
    consentStatus: 'unknown',
    fields: ['aggregate_sleep_metric', 'aggregate_activity_metric'],
    category: 'health',
    sensitivity: 'restricted',
    anonymizationStatus: 'synthetic_only',
    allowedUse: ['Synthetic testing and privacy research'],
    prohibitedUse: ['Raw health resale', 'Individual health profiling', 'Insurance risk profiling'],
    commercializationStatus: 'blocked',
    estimatedMarketValueUsdMonthly: null,
    productIdea: 'Synthetic health-data benchmark',
    buyerProfile: 'Privacy and health-AI researchers',
    evidence: 'Health data is present in demo footprint structures and is intentionally blocked from commercial sale pending explicit rights and safeguards.',
    lastAuditedAt: '2026-09-21'
  }
];
