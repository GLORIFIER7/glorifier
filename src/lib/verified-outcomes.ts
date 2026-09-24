import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';

export const GLORIFIER_VERIFIED_OUTCOMES_VERSION = 'GVO-1.0';

export type OutcomeVerificationStatus = 'not_verified'|'evidence_backed'|'verified'|'disputed';

export async function initializeVerifiedOutcomes() {
  await getPostgresPool().query(`
    CREATE TABLE IF NOT EXISTS glorifier_verified_outcomes (
      id TEXT PRIMARY KEY,
      opportunity_ref TEXT NOT NULL,
      governance_event_id TEXT,
      observed_what JSONB NOT NULL DEFAULT '{}',
      opportunity_what JSONB NOT NULL DEFAULT '{}',
      action_what JSONB NOT NULL DEFAULT '{}',
      authorized_by TEXT,
      authorization_at TIMESTAMPTZ,
      evidence JSONB NOT NULL DEFAULT '[]',
      economic_outcome JSONB NOT NULL DEFAULT '{}',
      verification_status TEXT NOT NULL DEFAULT 'not_verified',
      verification_basis JSONB NOT NULL DEFAULT '{}',
      disputed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_verified_outcomes_opportunity ON glorifier_verified_outcomes(opportunity_ref, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_verified_outcomes_status ON glorifier_verified_outcomes(verification_status, created_at DESC);
  `);
}

export async function recordVerifiedOutcome(input:{
  opportunityRef:string;
  governanceEventId?:string|null;
  observedWhat:Record<string,unknown>;
  opportunityWhat:Record<string,unknown>;
  actionWhat:Record<string,unknown>;
  authorizedBy?:string|null;
  authorizationAt?:string|null;
  evidence?:Array<Record<string,unknown>>;
  economicOutcome?:Record<string,unknown>;
  actor?:string;
}) {
  await initializeVerifiedOutcomes();
  const id=`outcome-${crypto.randomUUID()}`;
  const evidence=input.evidence||[];
  const economic=input.economicOutcome||{};
  const qualifyingPaymentEvidence=evidence.some((e:any)=>Boolean(e.qualifiesForVerification) && Boolean(e.externalRef));
  const status:OutcomeVerificationStatus=qualifyingPaymentEvidence?'verified':evidence.length?'evidence_backed':'not_verified';
  const r=await getPostgresPool().query(`
    INSERT INTO glorifier_verified_outcomes
    (id,opportunity_ref,governance_event_id,observed_what,opportunity_what,action_what,authorized_by,authorization_at,evidence,economic_outcome,verification_status,verification_basis)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
  `,[id,input.opportunityRef,input.governanceEventId||null,JSON.stringify(input.observedWhat||{}),JSON.stringify(input.opportunityWhat||{}),JSON.stringify(input.actionWhat||{}),input.authorizedBy||null,input.authorizationAt||null,JSON.stringify(evidence),JSON.stringify(economic),status,JSON.stringify({qualifyingPaymentEvidence,rule:'Qualifying external evidence is required before an economic outcome is VERIFIED'})]);
  return mapOutcome(r.rows[0]);
}

export async function verifyOutcome(id:string,input:{evidence?:Array<Record<string,unknown>>;economicOutcome?:Record<string,unknown>;verificationBasis?:Record<string,unknown>;actor?:string}) {
  await initializeVerifiedOutcomes();
  const evidence=input.evidence||[];
  if(!evidence.some((e:any)=>Boolean(e.qualifiesForVerification)&&Boolean(e.externalRef))) throw new Error('Outcome cannot be VERIFIED without qualifying evidence and an external reference');
  const r=await getPostgresPool().query(`UPDATE glorifier_verified_outcomes SET evidence=$2,economic_outcome=$3,verification_status='verified',verification_basis=$4,updated_at=NOW() WHERE id=$1 RETURNING *`,[id,JSON.stringify(evidence),JSON.stringify(input.economicOutcome||{}),JSON.stringify(input.verificationBasis||{})]);
  if(!r.rows[0]) throw new Error('Verified outcome not found');
  return mapOutcome(r.rows[0]);
}

export async function disputeOutcome(id:string,reason:string,actor='human-owner') {
  await initializeVerifiedOutcomes();
  const r=await getPostgresPool().query(`UPDATE glorifier_verified_outcomes SET disputed=TRUE,verification_status='disputed',verification_basis=jsonb_build_object('reason',$2,'actor',$3),updated_at=NOW() WHERE id=$1 RETURNING *`,[id,reason,actor]);
  if(!r.rows[0]) throw new Error('Verified outcome not found');
  return mapOutcome(r.rows[0]);
}

export async function getVerifiedOutcome(id:string){await initializeVerifiedOutcomes();const r=await getPostgresPool().query('SELECT * FROM glorifier_verified_outcomes WHERE id=$1',[id]);return r.rows[0]?mapOutcome(r.rows[0]):null;}
export async function listVerifiedOutcomes(limit=100){await initializeVerifiedOutcomes();const r=await getPostgresPool().query('SELECT * FROM glorifier_verified_outcomes ORDER BY created_at DESC LIMIT $1',[Math.max(1,Math.min(500,limit))]);return r.rows.map(mapOutcome);}
function mapOutcome(x:any){return {id:x.id,opportunityRef:x.opportunity_ref,governanceEventId:x.governance_event_id,observedWhat:x.observed_what,opportunityWhat:x.opportunity_what,actionWhat:x.action_what,authorizedBy:x.authorized_by,authorizationAt:x.authorization_at,evidence:x.evidence,economicOutcome:x.economic_outcome,verificationStatus:x.verification_status,verificationBasis:x.verification_basis,disputed:Boolean(x.disputed),createdAt:x.created_at,updatedAt:x.updated_at,economicTruth:{verified:x.verification_status==='verified',missingEvidenceIsNotZero:true,estimatesAreNotRevenue:true}};}
