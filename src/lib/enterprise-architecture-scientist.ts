import { getPostgresPool } from './db/postgres';
export const GLORIFIER_EAS_VERSION='GEAS-1.0';
export const ENTERPRISE_ARCHITECTURE_PRINCIPLES=[
'well-architected-quality-gates','data-foundation-and-lineage','semantic-business-layer','ai-gateway-and-policy-enforcement',
'multi-agent-orchestration','grounded-knowledge-and-rag','tool-and-protocol-interoperability','model-lifecycle-and-evaluation',
'observability-and-operational-excellence','security-privacy-and-responsible-ai','reliability-and-resilience','cost-and-finops',
'hybrid-multicloud-portability','continuous-assessment-and-improvement'
] as const;
export function getEnterpriseArchitectureScientistPolicy(){return{version:GLORIFIER_EAS_VERSION,
sources:['Google Cloud Well-Architected Framework','Microsoft Azure Well-Architected Framework','IBM Architecture Patterns and AI Governance'],
refinedArchitecture:['Human Authority','AI CEO','Policy/Compliance/Security Governance','Architecture Quality Gates','AI Gateway','Provider-Neutral Orchestration','Specialist Agents','Knowledge/Data Foundation','Semantic Business Layer','Tools/MCP/A2A/OpenAPI','Model Evaluation & Lifecycle','Observability/SRE','FinOps/Cost Intelligence','Evidence & Lineage','Revenue Control Plane'],
principles:[...ENTERPRISE_ARCHITECTURE_PRINCIPLES],continuousImprovement:true,humanAuthority:true,autonomousIrreversibleActions:false,certificationClaimAllowed:false};}
export async function initializeEnterpriseArchitectureScientist(){await getPostgresPool().query(`CREATE TABLE IF NOT EXISTS glorifier_architecture_assessments(id TEXT PRIMARY KEY,source_family TEXT NOT NULL,domain TEXT NOT NULL,finding TEXT NOT NULL,evidence_refs JSONB NOT NULL DEFAULT '[]',status TEXT NOT NULL DEFAULT 'observed',priority TEXT NOT NULL DEFAULT 'normal',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); CREATE TABLE IF NOT EXISTS glorifier_architecture_watchlist(id TEXT PRIMARY KEY,domain TEXT NOT NULL,subject TEXT NOT NULL,cadence_minutes INTEGER NOT NULL DEFAULT 1440,enabled BOOLEAN NOT NULL DEFAULT TRUE,last_run_at TIMESTAMPTZ,next_run_at TIMESTAMPTZ);`);}
export async function recordArchitectureAssessment(input:{sourceFamily:string;domain:string;finding:string;evidenceRefs?:string[];priority?:string}){await initializeEnterpriseArchitectureScientist();const r=await getPostgresPool().query(`INSERT INTO glorifier_architecture_assessments(id,source_family,domain,finding,evidence_refs,priority) VALUES(gen_random_uuid()::text,$1,$2,$3,$4,$5) RETURNING *`,[input.sourceFamily,input.domain,input.finding,JSON.stringify(input.evidenceRefs||[]),input.priority||'normal']);return r.rows[0];}
export async function getEnterpriseArchitectureSnapshot(){await initializeEnterpriseArchitectureScientist();const r=await getPostgresPool().query(`SELECT domain,COUNT(*)::int count FROM glorifier_architecture_assessments GROUP BY domain ORDER BY count DESC`);return{version:GLORIFIER_EAS_VERSION,policy:getEnterpriseArchitectureScientistPolicy(),assessmentCounts:r.rows};}
