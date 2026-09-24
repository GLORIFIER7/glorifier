import { getPostgresPool } from './db/postgres';

export const GLORIFIER_SALESFORCE_ARCHITECTURE_VERSION='GSF-1.0';

export const GLORIFIER_SALESFORCE_REFINED_ARCHITECTURE={
  source:'Salesforce Well-Architected and architecture guidance',
  principles:[
    'trust-first architecture',
    'zero-trust identity and integration',
    'least privilege and defense in depth',
    'API-led and event-driven integration',
    'customer-360 style semantic customer model',
    'data lineage and identity resolution',
    'deterministic automation for critical outcomes',
    'agentic actions remain permissioned and auditable',
    'continuous observability, reliability and recovery'
  ],
  refinedLayers:[
    'Human Authority',
    'AI CEO',
    'Policy Compliance Security and Architecture Gates',
    'Customer and Identity 360',
    'Data and Semantic Business Layer',
    'API and Integration Fabric',
    'Event and Change Fabric',
    'Workflow and Deterministic Automation',
    'AI Agent Orchestration and Trusted Context',
    'Business Applications and Customer Workflows',
    'Evidence Audit and Observability',
    'Revenue Control Plane',
    'Governed Action',
    'Verified Outcomes'
  ],
  patterns:{
    integration:'API-led system/process/experience APIs with explicit authentication and authorization',
    events:'publish-subscribe and change-data/event streams for asynchronous workflows',
    customer:'unified customer identity, tenant, account, contact, subscription, interaction and consent context',
    data:'canonical business objects, lineage, provenance, identity resolution and governed activation',
    automation:'deterministic workflow for critical business rules plus AI reasoning where appropriate',
    agentic:'bounded tools, least privilege, trusted context, action policies, auditability and human approval for consequential actions',
    reliability:'async processing, retries, circuit breakers, health models, capacity planning and disaster recovery',
    security:'zero trust, least privilege, defense in depth, encryption, audit trails and threat modeling'
  },
  sourceAlignment:[
    'Salesforce Well-Architected Trust',
    'Salesforce Event-Driven Architecture',
    'Salesforce Data 360 Architecture',
    'Salesforce Integration Patterns',
    'Salesforce Agentic Enterprise Trust'
  ]
} as const;

export async function initializeSalesforceArchitecture(){
  await getPostgresPool().query(`CREATE TABLE IF NOT EXISTS glorifier_salesforce_architecture_patterns(
    id TEXT PRIMARY KEY, pattern_key TEXT NOT NULL, layer TEXT NOT NULL, description TEXT NOT NULL,
    source_ref TEXT NOT NULL, evidence_status TEXT NOT NULL DEFAULT 'evidence-backed',
    metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS idx_gsf_pattern_layer ON glorifier_salesforce_architecture_patterns(layer);
  `);
}

export function getSalesforceRefinedArchitecture(){return GLORIFIER_SALESFORCE_REFINED_ARCHITECTURE;}

export async function runSalesforceArchitectureHealthCheck(){
  await initializeSalesforceArchitecture();
  const r=await getPostgresPool().query('SELECT count(*)::int AS count FROM glorifier_salesforce_architecture_patterns');
  return {version:GLORIFIER_SALESFORCE_ARCHITECTURE_VERSION,patternsRecorded:r.rows[0].count,continuousImprovement:true,humanAuthority:true,autonomousIrreversibleActions:false};
}
