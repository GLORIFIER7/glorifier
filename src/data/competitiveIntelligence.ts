export type CompetitiveSignalStatus = 'monitored' | 'connector_ready' | 'needs_review';

export type CompetitiveDimension =
  | 'products' | 'pricing' | 'ai_features' | 'funding_ma'
  | 'customer_segments' | 'api' | 'data_products' | 'marketing' | 'technology';

export type CompetitorProfile = {
  id: string;
  company: string;
  website: string;
  overlap: string;
  dimensions: CompetitiveDimension[];
  status: CompetitiveSignalStatus;
};

export const COMPETITOR_PROFILES: CompetitorProfile[] = [
  { id: 'dataiku', company: 'Dataiku', website: 'https://www.dataiku.com/', overlap: 'AI, analytics, orchestration and governance', dimensions: ['products','pricing','ai_features','customer_segments','api','data_products','marketing','technology'], status: 'monitored' },
  { id: 'salesforce', company: 'Salesforce', website: 'https://www.salesforce.com/', overlap: 'AI agents, CRM data and business automation', dimensions: ['products','pricing','ai_features','funding_ma','customer_segments','api','data_products','marketing','technology'], status: 'monitored' },
  { id: 'zapier', company: 'Zapier', website: 'https://zapier.com/', overlap: 'AI automation and integrations', dimensions: ['products','pricing','ai_features','customer_segments','api','marketing','technology'], status: 'monitored' },
  { id: 'hubspot', company: 'HubSpot', website: 'https://www.hubspot.com/', overlap: 'CRM, customer intelligence and AI agents', dimensions: ['products','pricing','ai_features','customer_segments','api','marketing','technology'], status: 'monitored' },
  { id: 'palantir', company: 'Palantir', website: 'https://www.palantir.com/', overlap: 'Data intelligence, AI and operational systems', dimensions: ['products','pricing','ai_features','funding_ma','customer_segments','api','data_products','marketing','technology'], status: 'connector_ready' },
  { id: 'microsoft', company: 'Microsoft', website: 'https://www.microsoft.com/', overlap: 'AI, cloud, productivity and enterprise data', dimensions: ['products','pricing','ai_features','funding_ma','customer_segments','api','data_products','marketing','technology'], status: 'connector_ready' },
  { id: 'google', company: 'Google', website: 'https://www.google.com/', overlap: 'AI, Workspace, cloud and data', dimensions: ['products','pricing','ai_features','funding_ma','customer_segments','api','data_products','marketing','technology'], status: 'connector_ready' },
];

export const COMPETITIVE_DIMENSIONS: Array<{ id: CompetitiveDimension; label: string }> = [
  { id: 'products', label: 'Products' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'ai_features', label: 'New AI features' },
  { id: 'funding_ma', label: 'Funding / acquisitions' },
  { id: 'customer_segments', label: 'Customer segments' },
  { id: 'api', label: 'API capabilities' },
  { id: 'data_products', label: 'Data products' },
  { id: 'marketing', label: 'Marketing strategy' },
  { id: 'technology', label: 'Technology changes' },
];
