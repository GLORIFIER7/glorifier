import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';

export type SaasPlanStatus = 'draft' | 'active' | 'archived';
export type SaasSubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';

export async function initializeSaasRegistry() {
  const db = getPostgresPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS saas_tenants (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, external_ref TEXT,
      status TEXT NOT NULL DEFAULT 'active', metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS saas_plans (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
      status TEXT NOT NULL DEFAULT 'active', currency TEXT DEFAULT 'USD',
      amount NUMERIC, billing_interval TEXT DEFAULT 'month',
      features JSONB NOT NULL DEFAULT '[]', limits JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS saas_subscriptions (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES saas_plans(id), status TEXT NOT NULL DEFAULT 'trialing',
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), renews_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ, external_ref TEXT, metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_tenant ON saas_subscriptions(tenant_id, status);
  `);
}

export async function registerSaasTenant(input: { name:string; externalRef?:string|null; metadata?:Record<string,unknown> }) {
  await initializeSaasRegistry();
  const id=`tenant-${crypto.randomUUID()}`;
  const r=await getPostgresPool().query(
    `INSERT INTO saas_tenants(id,name,external_ref,metadata) VALUES($1,$2,$3,$4) RETURNING *`,
    [id,input.name,input.externalRef||null,JSON.stringify(input.metadata||{})]
  );
  return mapTenant(r.rows[0]);
}

export async function registerSaasPlan(input: { name:string; description?:string|null; amount?:number|null; currency?:string; billingInterval?:string; features?:unknown[]; limits?:Record<string,unknown> }) {
  await initializeSaasRegistry();
  const id=`plan-${crypto.randomUUID()}`;
  const r=await getPostgresPool().query(
    `INSERT INTO saas_plans(id,name,description,amount,currency,billing_interval,features,limits) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id,input.name,input.description||null,input.amount??null,input.currency||'USD',input.billingInterval||'month',JSON.stringify(input.features||[]),JSON.stringify(input.limits||{})]
  );
  return mapPlan(r.rows[0]);
}

export async function listSaasOverview() {
  await initializeSaasRegistry();
  const db=getPostgresPool();
  const [tenants,plans,subs]=await Promise.all([
    db.query('SELECT * FROM saas_tenants ORDER BY created_at DESC'),
    db.query('SELECT * FROM saas_plans WHERE status=$1 ORDER BY name',['active']),
    db.query('SELECT s.*,p.name plan_name,t.name tenant_name FROM saas_subscriptions s JOIN saas_plans p ON p.id=s.plan_id JOIN saas_tenants t ON t.id=s.tenant_id ORDER BY s.created_at DESC')
  ]);
  return { tenants:tenants.rows.map(mapTenant), plans:plans.rows.map(mapPlan), subscriptions:subs.rows.map(mapSubscription),
    policy:{billingExecutionEnabled:false, paymentMovementEnabled:false, revenueRequiresEvidence:true, estimatesAreNotEarnings:true} };
}

export async function createSaasSubscription(input:{tenantId:string;planId:string;status?:SaasSubscriptionStatus;renewsAt?:string|null;externalRef?:string|null}) {
  await initializeSaasRegistry();
  const check=await getPostgresPool().query('SELECT 1 FROM saas_tenants WHERE id=$1 UNION ALL SELECT 1 FROM saas_plans WHERE id=$2',[input.tenantId,input.planId]);
  if(check.rows.length<2) throw new Error('Tenant or plan not found');
  const id=`sub-${crypto.randomUUID()}`;
  const r=await getPostgresPool().query(
    `INSERT INTO saas_subscriptions(id,tenant_id,plan_id,status,renews_at,external_ref) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id,input.tenantId,input.planId,input.status||'trialing',input.renewsAt||null,input.externalRef||null]
  );
  return mapSubscription(r.rows[0]);
}
function mapTenant(x:any){return {id:x.id,name:x.name,externalRef:x.external_ref||null,status:x.status,metadata:x.metadata||{}};}
function mapPlan(x:any){return {id:x.id,name:x.name,description:x.description||null,status:x.status,amount:x.amount==null?null:Number(x.amount),currency:x.currency||'USD',billingInterval:x.billing_interval,features:x.features||[],limits:x.limits||{}};}
function mapSubscription(x:any){return {id:x.id,tenantId:x.tenant_id,tenantName:x.tenant_name||null,planId:x.plan_id,planName:x.plan_name||null,status:x.status,startedAt:x.started_at?new Date(x.started_at).toISOString():null,renewsAt:x.renews_at?new Date(x.renews_at).toISOString():null,externalRef:x.external_ref||null,metadata:x.metadata||{}};}


export async function governSaasAction(input: { objective: string; actionType?: string; evidenceRefs?: string[]; actor?: string }) {
  const { governRevenueAction } = await import('./revenue-control-plane');
  return governRevenueAction({ machine: 'saas', actionType: (input.actionType || 'propose') as any, objective: input.objective, evidenceRefs: input.evidenceRefs || [], actor: input.actor || 'human-owner' });
}
