import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';

export type IoTDeviceStatus = 'discovered' | 'provisioned' | 'online' | 'offline' | 'degraded' | 'disabled';
export type IoTAlertSeverity = 'info' | 'warning' | 'critical';

export async function initializeIotRegistry() {
  const db=getPostgresPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS iot_devices (
      id TEXT PRIMARY KEY, device_key TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      device_type TEXT NOT NULL DEFAULT 'generic', status TEXT NOT NULL DEFAULT 'discovered',
      tenant_id TEXT, connection_id TEXT, last_seen_at TIMESTAMPTZ, firmware_version TEXT,
      capabilities JSONB NOT NULL DEFAULT '[]', metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS iot_telemetry (
      id TEXT PRIMARY KEY, device_id TEXT NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
      observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metric TEXT NOT NULL, value NUMERIC,
      unit TEXT, quality TEXT NOT NULL DEFAULT 'observed', payload JSONB NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_iot_telemetry_device_time ON iot_telemetry(device_id, observed_at DESC);
    CREATE TABLE IF NOT EXISTS iot_alerts (
      id TEXT PRIMARY KEY, device_id TEXT NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
      severity TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', rule TEXT NOT NULL,
      message TEXT NOT NULL, observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB NOT NULL DEFAULT '{}'
    );
  `);
}

export async function registerIotDevice(input:{name:string;deviceType?:string;tenantId?:string|null;connectionId?:string|null;capabilities?:string[];firmwareVersion?:string|null;metadata?:Record<string,unknown>}) {
  await initializeIotRegistry();
  const id=`iot-${crypto.randomUUID()}`, key=`device-${crypto.randomUUID()}`;
  const r=await getPostgresPool().query(
    `INSERT INTO iot_devices(id,device_key,name,device_type,status,tenant_id,connection_id,firmware_version,capabilities,metadata) VALUES($1,$2,$3,$4,'provisioned',$5,$6,$7,$8,$9) RETURNING *`,
    [id,key,input.name,input.deviceType||'generic',input.tenantId||null,input.connectionId||null,input.firmwareVersion||null,JSON.stringify(input.capabilities||[]),JSON.stringify(input.metadata||{})]
  );
  return mapDevice(r.rows[0]);
}

export async function listIotDevices(){await initializeIotRegistry(); const r=await getPostgresPool().query('SELECT * FROM iot_devices ORDER BY created_at DESC'); return r.rows.map(mapDevice);}
export async function recordIotTelemetry(deviceId:string,input:{metric:string;value?:number|null;unit?:string|null;observedAt?:string;quality?:string;payload?:Record<string,unknown>}) {
  await initializeIotRegistry();
  const exists=await getPostgresPool().query('SELECT id FROM iot_devices WHERE id=$1',[deviceId]); if(!exists.rows[0]) throw new Error('IoT device not found');
  const id=`telemetry-${crypto.randomUUID()}`;
  const r=await getPostgresPool().query(
    `INSERT INTO iot_telemetry(id,device_id,observed_at,metric,value,unit,quality,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id,deviceId,input.observedAt||new Date().toISOString(),input.metric,input.value??null,input.unit||null,input.quality||'observed',JSON.stringify(input.payload||{})]
  );
  await getPostgresPool().query('UPDATE iot_devices SET status=$2,last_seen_at=$3,updated_at=NOW() WHERE id=$1',[deviceId,'online',input.observedAt||new Date().toISOString()]);
  return mapTelemetry(r.rows[0]);
}
export async function listIotTelemetry(deviceId:string,limit=100){await initializeIotRegistry(); const r=await getPostgresPool().query('SELECT * FROM iot_telemetry WHERE device_id=$1 ORDER BY observed_at DESC LIMIT $2',[deviceId,Math.min(1000,Math.max(1,limit))]); return r.rows.map(mapTelemetry);}
export async function createIotAlert(input:{deviceId:string;severity:IoTAlertSeverity;rule:string;message:string;metadata?:Record<string,unknown>}) {
  await initializeIotRegistry(); const id=`alert-${crypto.randomUUID()}`;
  const r=await getPostgresPool().query('INSERT INTO iot_alerts(id,device_id,severity,rule,message,metadata) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[id,input.deviceId,input.severity,input.rule,input.message,JSON.stringify(input.metadata||{})]);
  return r.rows[0];
}
function mapDevice(x:any){return {id:x.id,deviceKey:x.device_key,name:x.name,deviceType:x.device_type,status:x.status,tenantId:x.tenant_id||null,connectionId:x.connection_id||null,lastSeenAt:x.last_seen_at?new Date(x.last_seen_at).toISOString():null,firmwareVersion:x.firmware_version||null,capabilities:x.capabilities||[],metadata:x.metadata||{}};}
function mapTelemetry(x:any){return {id:x.id,deviceId:x.device_id,observedAt:new Date(x.observed_at).toISOString(),metric:x.metric,value:x.value==null?null:Number(x.value),unit:x.unit||null,quality:x.quality,payload:x.payload||{}};}


export async function governValueAction(input: { objective: string; actionType?: string; evidenceRefs?: string[]; actor?: string }) {
  const { governRevenueAction } = await import('./revenue-control-plane');
  return governRevenueAction({ machine: 'iot', actionType: (input.actionType || 'propose') as any, objective: input.objective, evidenceRefs: input.evidenceRefs || [], actor: input.actor || 'human-owner' });
}
