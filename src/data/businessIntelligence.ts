export const BI_MODULES = [
  { id: 'web_mentions', title: 'GLORIFIER public-web mentions', collection: 'Public pages, brand mentions and indexed footprint', privacy: 'public' },
  { id: 'github', title: 'GitHub / project activity', collection: 'Repositories, commits, releases and engineering velocity', privacy: 'public' },
  { id: 'competitors', title: 'Competitor intelligence', collection: 'Comparable AI, software, data and digital-service businesses', privacy: 'public' },
  { id: 'trends', title: 'AI / software industry trends', collection: 'Technology, market and research signals', privacy: 'public' },
  { id: 'search', title: 'Traffic / search signals', collection: 'Legally available aggregate search and traffic indicators', privacy: 'aggregate' },
  { id: 'telemetry', title: 'First-party product telemetry', collection: 'Authenticated GLORIFIER activity and product usage', privacy: 'consented' },
  { id: 'revenue', title: 'Revenue and customer metrics', collection: 'Verified transactions, subscriptions and customer events', privacy: 'verified' },
  { id: 'opportunities', title: 'Data-product opportunities', collection: 'Potential datasets, APIs, reports and buyer use cases', privacy: 'governed' },
] as const;
