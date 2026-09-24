import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';

export type LinuxRuntimeStatus = 'discovered' | 'authorized' | 'online' | 'degraded' | 'offline' | 'revoked';
export type LinuxExecutionRisk = 'low' | 'medium' | 'high' | 'critical';

export interface LinuxRuntimeRecord {
  id: string;
  displayName: string;
  hostRef: string;
  runtime: 'linux';
  status: LinuxRuntimeStatus;
  architecture: string;
  capabilities: string[];
  allowedActions: string[];
  risk: LinuxExecutionRisk;
  connectionId?: string | null;
  lastVerifiedAt?: string | null;
  requiresHumanApproval: boolean;
  metadata: Record<string, unknown>;
}

export async function initializeLinuxRuntimeRegistry() {
  const db = getPostgresPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS linux_runtime_registry (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      host_ref TEXT NOT NULL,
      runtime TEXT NOT NULL DEFAULT 'linux',
      status TEXT NOT NULL DEFAULT 'discovered',
      architecture TEXT NOT NULL DEFAULT 'unknown',
      capabilities JSONB NOT NULL DEFAULT '[]',
      allowed_actions JSONB NOT NULL DEFAULT '[]',
      risk TEXT NOT NULL DEFAULT 'medium',
      connection_id TEXT,
      last_verified_at TIMESTAMPTZ,
      requires_human_approval BOOLEAN NOT NULL DEFAULT TRUE,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_linux_runtime_status ON linux_runtime_registry(status);
    CREATE INDEX IF NOT EXISTS idx_linux_runtime_connection ON linux_runtime_registry(connection_id);
    CREATE TABLE IF NOT EXISTS linux_runtime_events (
      id TEXT PRIMARY KEY,
      runtime_id TEXT NOT NULL REFERENCES linux_runtime_registry(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_linux_runtime_events_time ON linux_runtime_events(runtime_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS linux_execution_requests (
      id TEXT PRIMARY KEY,
      runtime_id TEXT NOT NULL REFERENCES linux_runtime_registry(id) ON DELETE CASCADE,
      requested_by TEXT NOT NULL,
      action TEXT NOT NULL,
      command_ref TEXT,
      risk TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending_approval',
      approved_by TEXT,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function registerLinuxRuntime(input: Omit<LinuxRuntimeRecord, 'id'> & { id?: string }) {
  await initializeLinuxRuntimeRegistry();
  const id = input.id || `linux-${crypto.randomUUID()}`;
  const r = await getPostgresPool().query(
    `INSERT INTO linux_runtime_registry
      (id,display_name,host_ref,runtime,status,architecture,capabilities,allowed_actions,risk,connection_id,last_verified_at,requires_human_approval,metadata)
     VALUES($1,$2,$3,'linux',$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT(id) DO UPDATE SET
       display_name=EXCLUDED.display_name, host_ref=EXCLUDED.host_ref, status=EXCLUDED.status,
       architecture=EXCLUDED.architecture, capabilities=EXCLUDED.capabilities, allowed_actions=EXCLUDED.allowed_actions,
       risk=EXCLUDED.risk, connection_id=EXCLUDED.connection_id, last_verified_at=EXCLUDED.last_verified_at,
       requires_human_approval=EXCLUDED.requires_human_approval, metadata=EXCLUDED.metadata, updated_at=NOW()
     RETURNING *`,
    [id,input.displayName,input.hostRef,input.status,input.architecture,JSON.stringify(input.capabilities),JSON.stringify(input.allowedActions),input.risk,input.connectionId||null,input.lastVerifiedAt||null,input.requiresHumanApproval,JSON.stringify(input.metadata||{})]
  );
  return mapRuntime(r.rows[0]);
}

export async function listLinuxRuntimes(status?: LinuxRuntimeStatus) {
  await initializeLinuxRuntimeRegistry();
  const r = status
    ? await getPostgresPool().query('SELECT * FROM linux_runtime_registry WHERE status=$1 ORDER BY display_name',[status])
    : await getPostgresPool().query('SELECT * FROM linux_runtime_registry ORDER BY display_name');
  return r.rows.map(mapRuntime);
}

export async function getLinuxRuntime(id: string) {
  await initializeLinuxRuntimeRegistry();
  const r = await getPostgresPool().query('SELECT * FROM linux_runtime_registry WHERE id=$1',[id]);
  return r.rows[0] ? mapRuntime(r.rows[0]) : null;
}

export async function recordLinuxRuntimeEvent(runtimeId: string, eventType: string, actor: string, details: Record<string, unknown> = {}) {
  await initializeLinuxRuntimeRegistry();
  const id = `lre-${crypto.randomUUID()}`;
  await getPostgresPool().query(
    'INSERT INTO linux_runtime_events(id,runtime_id,event_type,actor,details) VALUES($1,$2,$3,$4,$5)',
    [id,runtimeId,eventType,actor,JSON.stringify(details)]
  );
  return { id, runtimeId, eventType, actor, details };
}

export async function requestLinuxExecution(runtimeId: string, requestedBy: string, action: string, risk: LinuxExecutionRisk = 'medium', commandRef?: string) {
  await initializeLinuxRuntimeRegistry();
  const runtime = await getLinuxRuntime(runtimeId);
  if (!runtime) throw new Error('Linux runtime not found');
  if (!runtime.allowedActions.includes(action) && !runtime.allowedActions.includes('*')) {
    throw new Error('Action is not authorized for this Linux runtime');
  }
  const id = `linux-exec-${crypto.randomUUID()}`;
  const r = await getPostgresPool().query(
    'INSERT INTO linux_execution_requests(id,runtime_id,requested_by,action,command_ref,risk) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
    [id,runtimeId,requestedBy,action,commandRef||null,risk]
  );
  await recordLinuxRuntimeEvent(runtimeId,'execution_requested',requestedBy,{requestId:id,action,risk});
  return r.rows[0];
}

function mapRuntime(x: any): LinuxRuntimeRecord {
  return {
    id:x.id,
    displayName:x.display_name,
    hostRef:x.host_ref,
    runtime:'linux',
    status:x.status,
    architecture:x.architecture,
    capabilities:x.capabilities||[],
    allowedActions:x.allowed_actions||[],
    risk:x.risk,
    connectionId:x.connection_id||null,
    lastVerifiedAt:x.last_verified_at ? new Date(x.last_verified_at).toISOString() : null,
    requiresHumanApproval:Boolean(x.requires_human_approval),
    metadata:x.metadata||{}
  };
}
