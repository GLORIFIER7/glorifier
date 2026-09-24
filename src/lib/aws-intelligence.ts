import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';
import { registerConnection } from './connection-registry';

export const GLORIFIER_AWS_INTELLIGENCE_VERSION = 'GAWS-1.0';

export const AWS_WELL_ARCHITECTED_PILLARS = [
  'operational-excellence','security','reliability','performance-efficiency','cost-optimization','sustainability'
] as const;

export type AwsEvidenceStatus = 'not_verified'|'evidence-backed'|'verified';
export type AwsResourceClass = 'account'|'organization'|'compute'|'container'|'serverless'|'storage'|'database'|'network'|'security'|'observability'|'identity'|'billing'|'marketplace'|'other';

export async function initializeAwsIntelligence() {
  const db=getPostgresPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS glorifier_aws_accounts (
      id TEXT PRIMARY KEY, account_ref TEXT NOT NULL UNIQUE, name TEXT, region TEXT,
      status TEXT NOT NULL DEFAULT 'discovered', evidence_status TEXT NOT NULL DEFAULT 'not_verified',
      source_ref TEXT, metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS glorifier_aws_resources (
      id TEXT PRIMARY KEY, account_ref TEXT NOT NULL, resource_ref TEXT NOT NULL,
      resource_class TEXT NOT NULL, service TEXT NOT NULL, region TEXT, status TEXT,
      estimated_monthly_cost NUMERIC, currency TEXT DEFAULT 'USD', evidence_status TEXT NOT NULL DEFAULT 'not_verified',
      observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB NOT NULL DEFAULT '{}',
      UNIQUE(account_ref,resource_ref)
    );
    CREATE INDEX IF NOT EXISTS idx_gaws_resources_account ON glorifier_aws_resources(account_ref);
    CREATE INDEX IF NOT EXISTS idx_gaws_resources_service ON glorifier_aws_resources(service);
    CREATE TABLE IF NOT EXISTS glorifier_aws_findings (
      id TEXT PRIMARY KEY, account_ref TEXT, pillar TEXT NOT NULL, category TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info', title TEXT NOT NULL, description TEXT NOT NULL,
      evidence_refs JSONB NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'open',
      recommended_action TEXT, human_approval_required BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS glorifier_aws_cost_observations (
      id TEXT PRIMARY KEY, account_ref TEXT, period_start TIMESTAMPTZ, period_end TIMESTAMPTZ,
      amount NUMERIC NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', service TEXT,
      evidence_status TEXT NOT NULL DEFAULT 'not_verified', source_ref TEXT,
      metadata JSONB NOT NULL DEFAULT '{}', observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS glorifier_aws_marketplace_signals (
      id TEXT PRIMARY KEY, account_ref TEXT, product_ref TEXT NOT NULL, pricing_model TEXT,
      dimension TEXT, quantity NUMERIC, amount NUMERIC, currency TEXT DEFAULT 'USD',
      evidence_status TEXT NOT NULL DEFAULT 'not_verified', source_ref TEXT,
      observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB NOT NULL DEFAULT '{}'
    );
  `);
  await registerConnection({
    id:'conn-aws',
    provider:'aws',
    displayName:'Amazon Web Services',
    authType:'service_account',
    status: process.env.AWS_ACCESS_KEY_ID ? 'pending_authorization' : 'discovered',
    scopes:[
      'account-read','organizations-read','resource-inventory-read','cost-read','billing-read',
      'iam-security-read','cloudwatch-read','marketplace-read'
    ],
    risk:'critical',
    accountRef:process.env.AWS_ACCOUNT_ID||null,
    requiresHumanApproval:true,
    metadata:{
      credentialsStoredInRegistry:false, secretsReturnedToClients:false,
      readOnlyByDefault:true, destructiveActionsEnabled:false,
      billingMovementEnabled:false, humanApprovalForConsequentialActions:true,
      wellArchitectedPillars:[...AWS_WELL_ARCHITECTED_PILLARS],
      sources:['AWS Well-Architected Framework','AWS Organizations','AWS Control Tower','AWS Marketplace']
    }
  });
}

export function getAwsIntelligencePolicy() {
  return {
    version:GLORIFIER_AWS_INTELLIGENCE_VERSION,
    architecture:[
      'AWS Connection','Account & Organization Inventory','Resource Intelligence',
      'Security & IAM Intelligence','Reliability Intelligence','Performance Intelligence',
      'Cost & FinOps Intelligence','Sustainability Intelligence','Marketplace Intelligence',
      'Evidence','Revenue Control Plane','Human Authority'
    ],
    wellArchitected:{
      pillars:[...AWS_WELL_ARCHITECTED_PILLARS],
      alignmentOnly:true,
      certificationClaimAllowed:false
    },
    economicTruth:{
      cloudCostIsNotRevenue:true,
      marketplaceListingIsNotRevenue:true,
      usageIsNotRevenue:true,
      estimatedSavingsIsNotRevenue:true,
      missingEvidenceIsNotZero:true,
      verifiedRevenueRequiresQualifyingPaymentEvidence:true
    },
    authority:{
      readOnlyByDefault:true,
      autonomousDeletion:false,
      autonomousIamPrivilegeChanges:false,
      autonomousBillingChanges:false,
      autonomousResourceProvisioning:false,
      autonomousFinancialMovement:false,
      humanApprovalForConsequentialActions:true
    }
  };
}

export async function recordAwsAccount(input:{accountRef:string;name?:string;region?:string;status?:string;evidenceStatus?:AwsEvidenceStatus;sourceRef?:string;metadata?:Record<string,unknown>}) {
  await initializeAwsIntelligence();
  const r=await getPostgresPool().query(`
    INSERT INTO glorifier_aws_accounts(id,account_ref,name,region,status,evidence_status,source_ref,metadata)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT(account_ref) DO UPDATE SET name=EXCLUDED.name,region=EXCLUDED.region,status=EXCLUDED.status,
      evidence_status=EXCLUDED.evidence_status,source_ref=EXCLUDED.source_ref,metadata=EXCLUDED.metadata,updated_at=NOW()
    RETURNING *`,[
      `aws-account-${crypto.randomUUID()}`,input.accountRef,input.name||null,input.region||null,input.status||'discovered',
      input.evidenceStatus||'not_verified',input.sourceRef||null,JSON.stringify(input.metadata||{})
    ]);
  return r.rows[0];
}

export async function recordAwsResource(input:{accountRef:string;resourceRef:string;resourceClass:AwsResourceClass;service:string;region?:string;status?:string;estimatedMonthlyCost?:number;currency?:string;evidenceStatus?:AwsEvidenceStatus;metadata?:Record<string,unknown>}) {
  await initializeAwsIntelligence();
  const r=await getPostgresPool().query(`
    INSERT INTO glorifier_aws_resources(id,account_ref,resource_ref,resource_class,service,region,status,estimated_monthly_cost,currency,evidence_status,metadata)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT(account_ref,resource_ref) DO UPDATE SET resource_class=EXCLUDED.resource_class,service=EXCLUDED.service,
      region=EXCLUDED.region,status=EXCLUDED.status,estimated_monthly_cost=EXCLUDED.estimated_monthly_cost,
      currency=EXCLUDED.currency,evidence_status=EXCLUDED.evidence_status,metadata=EXCLUDED.metadata,observed_at=NOW()
    RETURNING *`,
    [`aws-resource-${crypto.randomUUID()}`,input.accountRef,input.resourceRef,input.resourceClass,input.service,input.region||null,
      input.status||null,input.estimatedMonthlyCost??null,input.currency||'USD',input.evidenceStatus||'not_verified',JSON.stringify(input.metadata||{})]);
  return r.rows[0];
}

export async function recordAwsFinding(input:{accountRef?:string;pillar:string;category:string;severity?:string;title:string;description:string;evidenceRefs?:string[];recommendedAction?:string}) {
  await initializeAwsIntelligence();
  const r=await getPostgresPool().query(`
    INSERT INTO glorifier_aws_findings(id,account_ref,pillar,category,severity,title,description,evidence_refs,recommended_action)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [`aws-finding-${crypto.randomUUID()}`,input.accountRef||null,input.pillar,input.category,input.severity||'info',input.title,input.description,
      JSON.stringify(input.evidenceRefs||[]),input.recommendedAction||null]);
  return r.rows[0];
}

export async function recordAwsCostObservation(input:{accountRef?:string;periodStart?:string;periodEnd?:string;amount:number;currency?:string;service?:string;evidenceStatus?:AwsEvidenceStatus;sourceRef?:string;metadata?:Record<string,unknown>}) {
  await initializeAwsIntelligence();
  const r=await getPostgresPool().query(`
    INSERT INTO glorifier_aws_cost_observations(id,account_ref,period_start,period_end,amount,currency,service,evidence_status,source_ref,metadata)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [`aws-cost-${crypto.randomUUID()}`,input.accountRef||null,input.periodStart||null,input.periodEnd||null,Number(input.amount),
      input.currency||'USD',input.service||null,input.evidenceStatus||'not_verified',input.sourceRef||null,JSON.stringify(input.metadata||{})]);
  return r.rows[0];
}

export async function getAwsIntelligenceSnapshot() {
  await initializeAwsIntelligence();
  const db=getPostgresPool();
  const [accounts,resources,findings,costs,marketplace]=await Promise.all([
    db.query('SELECT COUNT(*)::int count FROM glorifier_aws_accounts'),
    db.query('SELECT resource_class,COUNT(*)::int count FROM glorifier_aws_resources GROUP BY resource_class ORDER BY count DESC'),
    db.query("SELECT severity,COUNT(*)::int count FROM glorifier_aws_findings WHERE status='open' GROUP BY severity ORDER BY count DESC"),
    db.query("SELECT COALESCE(SUM(amount),0) amount FROM glorifier_aws_cost_observations WHERE currency='USD'"),
    db.query('SELECT COUNT(*)::int count FROM glorifier_aws_marketplace_signals')
  ]);
  return {
    version:GLORIFIER_AWS_INTELLIGENCE_VERSION,
    policy:getAwsIntelligencePolicy(),
    accounts:Number(accounts.rows[0].count),
    resourcesByClass:resources.rows,
    openFindings:findings.rows,
    observedUsdCosts:Number(costs.rows[0].amount),
    marketplaceSignals:Number(marketplace.rows[0].count),
    truth:'AWS infrastructure, costs, savings and marketplace signals are intelligence/evidence; none is revenue unless qualifying payment evidence enters the verified revenue ledger.'
  };
}
