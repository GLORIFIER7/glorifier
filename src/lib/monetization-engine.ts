import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';

export type MonetizationOpportunityStatus = 'discovered' | 'qualified' | 'proposed' | 'negotiation' | 'contracted' | 'invoiced' | 'paid' | 'lost' | 'rejected';

export interface MonetizationOpportunity {
  id:string; source:string; title:string; description?:string|null; status:MonetizationOpportunityStatus;
  estimatedValue?:number|null; currency?:string|null; probability?:number|null; expectedValue?:number|null;
  customerRef?:string|null; evidenceRef?:string|null; nextAction?:string|null; requiresHumanApproval:boolean;
  metadata:Record<string,unknown>;
}

export async function initializeMonetizationEngine(){
  const db=getPostgresPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS monetization_opportunities (
      id TEXT PRIMARY KEY, source TEXT NOT NULL, title TEXT NOT NULL, description TEXT,
      status TEXT NOT NULL DEFAULT 'discovered', estimated_value NUMERIC, currency TEXT,
      probability NUMERIC DEFAULT 0, expected_value NUMERIC, customer_ref TEXT, evidence_ref TEXT,
      next_action TEXT, requires_human_approval BOOLEAN NOT NULL DEFAULT TRUE,
      metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_monetization_status ON monetization_opportunities(status, updated_at DESC);
    CREATE TABLE IF NOT EXISTS monetization_events (
      id TEXT PRIMARY KEY, opportunity_id TEXT NOT NULL REFERENCES monetization_opportunities(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL, amount NUMERIC, currency TEXT, external_ref TEXT, source TEXT,
      observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), evidence_status TEXT NOT NULL DEFAULT 'not_verified',
      details JSONB NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_monetization_events_opportunity ON monetization_events(opportunity_id, observed_at DESC);
  `);
}

export async function registerMonetizationOpportunity(input:Partial<MonetizationOpportunity>&{source:string;title:string}){
  await initializeMonetizationEngine();
  const id=input.id||`opp-${crypto.randomUUID()}`;
  const value=input.estimatedValue==null?null:Number(input.estimatedValue);
  const probability=Math.max(0,Math.min(1,Number(input.probability??0)));
  const expected=value==null?null:value*probability;
  const r=await getPostgresPool().query(
    `INSERT INTO monetization_opportunities(id,source,title,description,status,estimated_value,currency,probability,expected_value,customer_ref,evidence_ref,next_action,requires_human_approval,metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT(id) DO UPDATE SET source=EXCLUDED.source,title=EXCLUDED.title,description=EXCLUDED.description,status=EXCLUDED.status,estimated_value=EXCLUDED.estimated_value,currency=EXCLUDED.currency,probability=EXCLUDED.probability,expected_value=EXCLUDED.expected_value,customer_ref=EXCLUDED.customer_ref,evidence_ref=EXCLUDED.evidence_ref,next_action=EXCLUDED.next_action,metadata=EXCLUDED.metadata,updated_at=NOW()
     RETURNING *`,
    [id,input.source,input.title,input.description||null,input.status||'discovered',value,input.currency||null,probability,expected,input.customerRef||null,input.evidenceRef||null,input.nextAction||null,input.requiresHumanApproval!==false,JSON.stringify(input.metadata||{})]
  );
  return mapOpportunity(r.rows[0]);
}

export async function listMonetizationOpportunities(status?:MonetizationOpportunityStatus){
  await initializeMonetizationEngine();
  const q=status?['SELECT * FROM monetization_opportunities WHERE status=$1 ORDER BY expected_value DESC NULLS LAST,updated_at DESC',[status]]:['SELECT * FROM monetization_opportunities WHERE status NOT IN (\'lost\',\'rejected\') ORDER BY expected_value DESC NULLS LAST,updated_at DESC',[]];
  const r=await getPostgresPool().query(q[0] as string,q[1] as any[]);
  return r.rows.map(mapOpportunity);
}

export async function recordMonetizationEvent(opportunityId:string,input:{eventType:string;amount?:number|null;currency?:string|null;externalRef?:string|null;source?:string|null;evidenceStatus?:'not_verified'|'verified';details?:Record<string,unknown>}){
  await initializeMonetizationEngine();
  const exists=await getPostgresPool().query('SELECT id FROM monetization_opportunities WHERE id=$1',[opportunityId]);
  if(!exists.rows[0]) throw new Error('Monetization opportunity not found');
  const id=`monetization-event-${crypto.randomUUID()}`;
  const verified=input.evidenceStatus==='verified' && Boolean(input.externalRef);
  await getPostgresPool().query(
    'INSERT INTO monetization_events(id,opportunity_id,event_type,amount,currency,external_ref,source,evidence_status,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [id,opportunityId,input.eventType,input.amount??null,input.currency||null,input.externalRef||null,input.source||null,verified?'verified':'not_verified',JSON.stringify(input.details||{})]
  );
  if(input.eventType==='paid' && verified) await getPostgresPool().query("UPDATE monetization_opportunities SET status='paid',updated_at=NOW() WHERE id=$1",[opportunityId]);
  return {id,opportunityId,evidenceStatus:verified?'verified':'not_verified',revenueVerified:verified};
}

export async function buildMonetizationDashboard(){
  await initializeMonetizationEngine();
  const db=getPostgresPool();
  const [pipeline,verified,counts]=await Promise.all([
    db.query("SELECT COALESCE(currency,'UNKNOWN') currency,COALESCE(SUM(estimated_value),0) estimated,COALESCE(SUM(expected_value),0) expected FROM monetization_opportunities WHERE status NOT IN ('lost','rejected','paid') GROUP BY COALESCE(currency,'UNKNOWN')"),
    db.query("SELECT COALESCE(currency,'UNKNOWN') currency,COALESCE(SUM(amount),0) paid FROM monetization_events WHERE evidence_status='verified' AND event_type='paid' AND external_ref IS NOT NULL AND external_ref<>'' GROUP BY COALESCE(currency,'UNKNOWN')"),
    db.query("SELECT status,COUNT(*)::int count FROM monetization_opportunities GROUP BY status")
  ]);
  return {
    pipeline:pipeline.rows.map((x:any)=>({currency:String(x.currency),estimated:Number(x.estimated),expected:Number(x.expected),label:'NOT VERIFIED'})),
    verifiedPaid:verified.rows.map((x:any)=>({currency:String(x.currency),amount:Number(x.paid),label:'VERIFIED'})),
    counts:counts.rows.map((x:any)=>({status:x.status,count:Number(x.count)})),
    rules:{estimatedPipelineIsNotRevenue:true,expectedValueIsNotRevenue:true,verifiedPaidRequiresExternalReference:true,autonomousContracting:false,autonomousPaymentMovement:false,humanApprovalForConsequentialActions:true}
  };
}

function mapOpportunity(x:any):MonetizationOpportunity{
  return {id:x.id,source:x.source,title:x.title,description:x.description||null,status:x.status,estimatedValue:x.estimated_value==null?null:Number(x.estimated_value),currency:x.currency||null,probability:x.probability==null?null:Number(x.probability),expectedValue:x.expected_value==null?null:Number(x.expected_value),customerRef:x.customer_ref||null,evidenceRef:x.evidence_ref||null,nextAction:x.next_action||null,requiresHumanApproval:Boolean(x.requires_human_approval),metadata:x.metadata||{}};
}


export async function governValueAction(input: { objective: string; actionType?: string; evidenceRefs?: string[]; actor?: string }) {
  const { governRevenueAction } = await import('./revenue-control-plane');
  return governRevenueAction({ machine: 'opportunity-engine', actionType: (input.actionType || 'propose') as any, objective: input.objective, evidenceRefs: input.evidenceRefs || [], actor: input.actor || 'human-owner' });
}
