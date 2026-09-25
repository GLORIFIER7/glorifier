import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';
import { governRevenueAction } from './revenue-control-plane';

export const GLORIFIER_MARKETPLACE_VERSION = 'GMP-1.0';

export type MarketplaceTransactionStatus =
  | 'offer'
  | 'accepted'
  | 'governance'
  | 'awaiting_human_approval'
  | 'contracted'
  | 'invoiced'
  | 'payment_pending'
  | 'paid'
  | 'verified'
  | 'disputed'
  | 'cancelled';

export async function initializeMarketplaceTransactions() {
  const db = getPostgresPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS glorifier_marketplace_parties (
      id TEXT PRIMARY KEY,
      party_type TEXT NOT NULL CHECK (party_type IN ('buyer','seller')),
      tenant_ref TEXT,
      name TEXT NOT NULL,
      external_ref TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_marketplace_parties_type ON glorifier_marketplace_parties(party_type, created_at DESC);

    CREATE TABLE IF NOT EXISTS glorifier_marketplace_transactions (
      id TEXT PRIMARY KEY,
      offer_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL REFERENCES glorifier_marketplace_parties(id),
      seller_id TEXT NOT NULL REFERENCES glorifier_marketplace_parties(id),
      status TEXT NOT NULL DEFAULT 'offer',
      amount NUMERIC,
      currency TEXT NOT NULL DEFAULT 'USD',
      governance_event_id TEXT,
      governance_cycle_id TEXT,
      contract_ref TEXT,
      invoice_ref TEXT,
      payment_ref TEXT,
      evidence_status TEXT NOT NULL DEFAULT 'not_verified',
      human_approval_required BOOLEAN NOT NULL DEFAULT TRUE,
      execution_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_status ON glorifier_marketplace_transactions(status, updated_at DESC);

    CREATE TABLE IF NOT EXISTS glorifier_marketplace_payment_evidence (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL REFERENCES glorifier_marketplace_transactions(id) ON DELETE CASCADE,
      source TEXT NOT NULL,
      external_ref TEXT NOT NULL,
      amount NUMERIC,
      currency TEXT,
      observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      evidence_status TEXT NOT NULL DEFAULT 'not_verified',
      payload_hash TEXT,
      details JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_marketplace_payment_evidence_tx ON glorifier_marketplace_payment_evidence(transaction_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS glorifier_marketplace_events (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL REFERENCES glorifier_marketplace_transactions(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      actor TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function event(transactionId:string,eventType:string,fromStatus:string|null,toStatus:string,actor:string,details:Record<string,unknown>={}) {
  await getPostgresPool().query(
    `INSERT INTO glorifier_marketplace_events(id,transaction_id,event_type,from_status,to_status,actor,details)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [`mpe-${crypto.randomUUID()}`,transactionId,eventType,fromStatus,toStatus,actor,JSON.stringify(details)]
  );
}

export async function registerMarketplaceParty(input:{partyType:'buyer'|'seller';name:string;tenantRef?:string|null;externalRef?:string|null;metadata?:Record<string,unknown>}) {
  await initializeMarketplaceTransactions();
  const id=`party-${crypto.randomUUID()}`;
  const r=await getPostgresPool().query(
    `INSERT INTO glorifier_marketplace_parties(id,party_type,tenant_ref,name,external_ref,metadata)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id,input.partyType,input.tenantRef||null,input.name,input.externalRef||null,JSON.stringify(input.metadata||{})]
  );
  return r.rows[0];
}

export async function listMarketplaceParties(partyType?:'buyer'|'seller') {
  await initializeMarketplaceTransactions();
  const r=await getPostgresPool().query(
    `SELECT * FROM glorifier_marketplace_parties ${partyType?'WHERE party_type=$1':''} ORDER BY created_at DESC`,
    partyType?[partyType]:[]
  );
  return r.rows;
}

export async function createMarketplaceTransaction(input:{offerId:string;buyerId:string;sellerId:string;amount?:number|null;currency?:string;actor?:string}) {
  await initializeMarketplaceTransactions();
  const id=`txn-${crypto.randomUUID()}`;
  const r=await getPostgresPool().query(
    `INSERT INTO glorifier_marketplace_transactions(id,offer_id,buyer_id,seller_id,amount,currency)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id,input.offerId,input.buyerId,input.sellerId,input.amount??null,input.currency||'USD']
  );
  await event(id,'transaction-created',null,'offer',input.actor||'human-owner',{economicTruth:'NOT VERIFIED'});
  return r.rows[0];
}

export async function acceptMarketplaceTransaction(transactionId:string, actor='human-owner') {
  await initializeMarketplaceTransactions();
  const r=await getPostgresPool().query('SELECT * FROM glorifier_marketplace_transactions WHERE id=$1',[transactionId]);
  if(!r.rows[0]) throw new Error('Marketplace transaction not found');
  const current=r.rows[0];
  if(current.status!=='offer') throw new Error(`Transaction cannot be accepted from status ${current.status}`);
  await getPostgresPool().query(`UPDATE glorifier_marketplace_transactions SET status='accepted',updated_at=NOW() WHERE id=$1`,[transactionId]);
  await event(transactionId,'buyer-accepted','offer','accepted',actor,{});
  return getMarketplaceTransaction(transactionId);
}

export async function governMarketplaceTransaction(transactionId:string, actor='human-owner') {
  await initializeMarketplaceTransactions();
  const r=await getPostgresPool().query('SELECT * FROM glorifier_marketplace_transactions WHERE id=$1',[transactionId]);
  if(!r.rows[0]) throw new Error('Marketplace transaction not found');
  const tx=r.rows[0];
  if(!['accepted','governance','awaiting_human_approval'].includes(tx.status)) throw new Error(`Transaction cannot enter governance from status ${tx.status}`);
  const result=await governRevenueAction({
    machine:'marketplace',
    actionType:'contract',
    objective:`Govern marketplace transaction ${transactionId}`,
    evidenceRefs:[],
    amount:tx.amount==null?null:Number(tx.amount),
    currency:tx.currency,
    actor
  });
  const status=result.status==='blocked'?'governance':'awaiting_human_approval';
  await getPostgresPool().query(
    `UPDATE glorifier_marketplace_transactions SET status=$2,governance_event_id=$3,governance_cycle_id=$4,updated_at=NOW() WHERE id=$1`,
    [transactionId,status,result.id||null,result.governanceCycleId||null]
  );
  await event(transactionId,'governance',tx.status,status,actor,{governanceStatus:result.status});
  return { transaction:await getMarketplaceTransaction(transactionId), governance:result };
}

export async function recordMarketplaceContract(transactionId:string,contractRef:string,actor='human-owner') {
  return transitionWithRef(transactionId,'awaiting_human_approval','contracted','contract',contractRef,actor);
}

export async function recordMarketplaceInvoice(transactionId:string,invoiceRef:string,actor='human-owner') {
  return transitionWithRef(transactionId,'contracted','invoiced','invoice',invoiceRef,actor);
}

async function transitionWithRef(transactionId:string,from:string,to:string,eventType:string,ref:string,actor:string) {
  await initializeMarketplaceTransactions();
  const r=await getPostgresPool().query('SELECT * FROM glorifier_marketplace_transactions WHERE id=$1',[transactionId]);
  if(!r.rows[0]) throw new Error('Marketplace transaction not found');
  if(r.rows[0].status!==from) throw new Error(`Transaction must be ${from}`);
  const column=eventType==='contract'?'contract_ref':'invoice_ref';
  await getPostgresPool().query(`UPDATE glorifier_marketplace_transactions SET status=$2,${column}=$3,updated_at=NOW() WHERE id=$1`,[transactionId,to,ref]);
  await event(transactionId,eventType,from,to,actor,{externalRef:ref});
  return getMarketplaceTransaction(transactionId);
}

export async function recordMarketplacePaymentEvidence(input:{transactionId:string;source:string;externalRef:string;amount?:number|null;currency?:string|null;payloadHash?:string|null;details?:Record<string,unknown>;qualifiesForVerification?:boolean;actor?:string}) {
  await initializeMarketplaceTransactions();
  if(!input.externalRef.trim()) throw new Error('Payment evidence requires externalRef');
  const txr=await getPostgresPool().query('SELECT * FROM glorifier_marketplace_transactions WHERE id=$1',[input.transactionId]);
  if(!txr.rows[0]) throw new Error('Marketplace transaction not found');
  const tx=txr.rows[0];
  const verified=input.qualifiesForVerification===true;
  const evidenceStatus=verified?'verified':'evidence-backed';
  const id=`mpev-${crypto.randomUUID()}`;
  await getPostgresPool().query(
    `INSERT INTO glorifier_marketplace_payment_evidence(id,transaction_id,source,external_ref,amount,currency,evidence_status,payload_hash,details)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id,input.transactionId,input.source,input.externalRef,input.amount??null,input.currency||tx.currency,evidenceStatus,input.payloadHash||null,JSON.stringify(input.details||{})]
  );
  if(verified) {
    await getPostgresPool().query(`UPDATE glorifier_marketplace_transactions SET status='verified',payment_ref=$2,evidence_status='verified',updated_at=NOW() WHERE id=$1`,[input.transactionId,input.externalRef]);
    await event(input.transactionId,'payment-verified',tx.status,'verified',input.actor||'human-owner',{externalRef:input.externalRef,source:input.source});
  } else {
    await getPostgresPool().query(`UPDATE glorifier_marketplace_transactions SET status='paid',payment_ref=$2,evidence_status='evidence-backed',updated_at=NOW() WHERE id=$1`,[input.transactionId,input.externalRef]);
    await event(input.transactionId,'payment-evidence-recorded',tx.status,'paid',input.actor||'human-owner',{externalRef:input.externalRef,source:input.source});
  }
  return getMarketplaceTransaction(input.transactionId);
}

export async function getMarketplaceTransaction(id:string) {
  await initializeMarketplaceTransactions();
  const tx=await getPostgresPool().query('SELECT * FROM glorifier_marketplace_transactions WHERE id=$1',[id]);
  if(!tx.rows[0]) return null;
  const evidence=await getPostgresPool().query('SELECT * FROM glorifier_marketplace_payment_evidence WHERE transaction_id=$1 ORDER BY created_at DESC',[id]);
  const events=await getPostgresPool().query('SELECT * FROM glorifier_marketplace_events WHERE transaction_id=$1 ORDER BY created_at DESC',[id]);
  return {transaction:tx.rows[0],paymentEvidence:evidence.rows,events:events.rows,economicTruth:{verifiedRevenue:tx.rows[0].status==='verified',paymentRequiresExternalReference:true,estimatedValueIsNotRevenue:true}};
}

export async function listMarketplaceTransactions(status?:MarketplaceTransactionStatus) {
  await initializeMarketplaceTransactions();
  const r=await getPostgresPool().query(`SELECT * FROM glorifier_marketplace_transactions ${status?'WHERE status=$1':''} ORDER BY updated_at DESC`,status?[status]:[]);
  return r.rows;
}
