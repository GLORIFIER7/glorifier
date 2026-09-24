import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';
import { recordWorkUnit, getWorkUnitSummary, recordCustomerRoi, getCustomerRoi, upsertOpportunityNode } from './business-model';
import { createSaasSubscription, registerSaasTenant } from './saas-registry';

export const GLORIFIER_CUSTOMER_OPERATING_SYSTEM_VERSION = 'GCOS-1.0';
const stages = ['signup','tenant','plan','subscription','usage','work-units','roi','opportunities','billing','retention','expansion'] as const;

export async function initializeCustomerOperatingSystem() {
  await getPostgresPool().query(`CREATE TABLE IF NOT EXISTS glorifier_customer_profiles (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL UNIQUE REFERENCES saas_tenants(id) ON DELETE CASCADE,
    owner_ref TEXT, lifecycle_stage TEXT NOT NULL DEFAULT 'signup', health_status TEXT NOT NULL DEFAULT 'unknown',
    last_activity_at TIMESTAMPTZ, metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS glorifier_customer_billing_events (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, amount NUMERIC, currency TEXT DEFAULT 'USD',
    evidence_status TEXT NOT NULL DEFAULT 'not_verified', external_ref TEXT,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB NOT NULL DEFAULT '{}');
    CREATE TABLE IF NOT EXISTS glorifier_customer_lifecycle_events (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
    from_stage TEXT, to_stage TEXT NOT NULL, actor TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS idx_customer_lifecycle_tenant ON glorifier_customer_lifecycle_events(tenant_id, created_at DESC);`);
}
async function ensureProfile(tenantId:string){await initializeCustomerOperatingSystem();const r=await getPostgresPool().query(`INSERT INTO glorifier_customer_profiles(id,tenant_id,lifecycle_stage,last_activity_at) VALUES($1,$2,'signup',NOW()) ON CONFLICT(tenant_id) DO UPDATE SET last_activity_at=NOW() RETURNING *`,[`cust-${crypto.randomUUID()}`,tenantId]);return r.rows[0];}
async function lifecycle(tenantId:string,fromStage:string|null,toStage:string,actor:string,details:Record<string,unknown>){await getPostgresPool().query(`INSERT INTO glorifier_customer_lifecycle_events(id,tenant_id,from_stage,to_stage,actor,details) VALUES($1,$2,$3,$4,$5,$6)`,[`cle-${crypto.randomUUID()}`,tenantId,fromStage,toStage,actor,JSON.stringify(details)]);}
async function advanceStage(tenantId:string,stage:typeof stages[number],details:Record<string,unknown>={},actor='system'){
  await ensureProfile(tenantId); const current=await getCustomerLifecycle(tenantId); const ci=Math.max(0,stages.indexOf(current.profile?.lifecycleStage||'signup')); const ti=stages.indexOf(stage); const target=ti>=ci?stage:current.profile?.lifecycleStage||stage;
  if(target!==current.profile?.lifecycleStage) await lifecycle(tenantId,current.profile?.lifecycleStage||null,target,actor,details);
  await getPostgresPool().query(`UPDATE glorifier_customer_profiles SET lifecycle_stage=$2,last_activity_at=NOW(),updated_at=NOW() WHERE tenant_id=$1`,[tenantId,target]); return getCustomerLifecycle(tenantId);
}
export async function onboardCustomer(input:{name:string;ownerRef?:string|null;externalRef?:string|null;metadata?:Record<string,unknown>}){const tenant=await registerSaasTenant(input);await initializeCustomerOperatingSystem();await getPostgresPool().query(`INSERT INTO glorifier_customer_profiles(id,tenant_id,owner_ref,lifecycle_stage,last_activity_at,metadata) VALUES($1,$2,$3,'tenant',NOW(),$4)`,[`cust-${crypto.randomUUID()}`,tenant.id,input.ownerRef||null,JSON.stringify(input.metadata||{})]);await lifecycle(tenant.id,'signup','tenant','customer-onboarding',{});return getCustomerLifecycle(tenant.id);}
export async function attachCustomerSubscription(input:{tenantId:string;planId:string;status?:any;renewsAt?:string|null;externalRef?:string|null}){await ensureProfile(input.tenantId);const subscription=await createSaasSubscription(input);await advanceStage(input.tenantId,'subscription',{subscriptionId:subscription.id});return {subscription,customer:await getCustomerLifecycle(input.tenantId)};}
export async function recordCustomerUsage(input:{tenantId:string;kind:any;units?:number;provider?:string|null;model?:string|null;taskRef?:string|null;estimatedCost?:number|null}){await ensureProfile(input.tenantId);const workUnit=await recordWorkUnit(input);await advanceStage(input.tenantId,'usage');await advanceStage(input.tenantId,'work-units',{workUnitId:workUnit.id});return {workUnit,customer:await getCustomerLifecycle(input.tenantId)};}
export async function recordCustomerRoiAndAdvance(input:any){await ensureProfile(input.tenantId);const roi=await recordCustomerRoi(input);await advanceStage(input.tenantId,'roi',{roiId:roi.id});return {roi,customer:await getCustomerLifecycle(input.tenantId)};}
export async function createCustomerOpportunity(input:any){await ensureProfile(input.tenantId);const opportunity=await upsertOpportunityNode({...input,nodeType:input.nodeType||'customer-opportunity'});await advanceStage(input.tenantId,'opportunities',{nodeId:opportunity.id});return {opportunity,customer:await getCustomerLifecycle(input.tenantId)};}
export async function recordCustomerBillingEvent(input:any){await ensureProfile(input.tenantId);const id=`bill-${crypto.randomUUID()}`;const status=input.evidenceStatus||'not_verified';const r=await getPostgresPool().query(`INSERT INTO glorifier_customer_billing_events(id,tenant_id,event_type,amount,currency,evidence_status,external_ref,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[id,input.tenantId,input.eventType,input.amount??null,input.currency||'USD',status,input.externalRef||null,JSON.stringify(input.metadata||{})]);await advanceStage(input.tenantId,'billing',{billingEventId:id,economicTruth:status==='verified'?'VERIFIED':status==='evidence-backed'?'EVIDENCE-BACKED':'NOT VERIFIED'});return r.rows[0];}
export async function advanceCustomerLifecycle(input:{tenantId:string;stage:typeof stages[number];actor?:string;details?:Record<string,unknown>}){return advanceStage(input.tenantId,input.stage,input.details||{},input.actor||'system');}
export async function getCustomerLifecycle(tenantId:string){await ensureProfile(tenantId);const db=getPostgresPool();const [profile,subscription,usage,roi,opportunities,billing,events]=await Promise.all([db.query('SELECT * FROM glorifier_customer_profiles WHERE tenant_id=$1',[tenantId]),db.query('SELECT s.*,p.name plan_name FROM saas_subscriptions s JOIN saas_plans p ON p.id=s.plan_id WHERE s.tenant_id=$1 ORDER BY s.created_at DESC LIMIT 1',[tenantId]),getWorkUnitSummary(tenantId),getCustomerRoi(tenantId),db.query('SELECT * FROM glorifier_opportunity_graph WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100',[tenantId]),db.query('SELECT * FROM glorifier_customer_billing_events WHERE tenant_id=$1 ORDER BY observed_at DESC LIMIT 100',[tenantId]),db.query('SELECT * FROM glorifier_customer_lifecycle_events WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100',[tenantId])]);const p=profile.rows[0];return {version:GLORIFIER_CUSTOMER_OPERATING_SYSTEM_VERSION,profile:p?{id:p.id,tenantId:p.tenant_id,ownerRef:p.owner_ref||null,lifecycleStage:p.lifecycle_stage,healthStatus:p.health_status,lastActivityAt:p.last_activity_at,metadata:p.metadata||{}}:null,subscription:subscription.rows[0]||null,usage,roi,opportunities:opportunities.rows,billing:billing.rows,events:events.rows,lifecycle:stages,economicTruth:{usageIsNotRevenue:true,roiIsNotRevenue:true,estimatedBillingIsNotRevenue:true,verifiedRevenueRequiresQualifyingPaymentEvidence:true,missingEvidenceIsNotZero:true}};}
