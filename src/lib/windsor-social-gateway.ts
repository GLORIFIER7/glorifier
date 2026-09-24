import crypto from 'node:crypto';
import { getPostgresPool } from './db/postgres';
import { registerConnection } from './connection-registry';

export const WINDSOR_SOCIAL_CONNECTORS = { facebook: 'facebook', linkedin: 'linkedin_organic', tiktok: 'tiktok_organic' } as const;
type SocialPlatform = keyof typeof WINDSOR_SOCIAL_CONNECTORS;

export async function initializeWindsorSocialGateway() {
  const db = getPostgresPool();
  await db.query(`CREATE TABLE IF NOT EXISTS social_gateway_events (
    id TEXT PRIMARY KEY, platform TEXT NOT NULL, connector TEXT NOT NULL,
    event_type TEXT NOT NULL, status TEXT NOT NULL, evidence_ref TEXT,
    metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_social_gateway_events_platform ON social_gateway_events(platform, created_at DESC)`);
  await registerConnection({
    id: 'conn-windsor-social', provider: 'windsor.ai', displayName: 'Windsor.ai Social Gateway',
    authType: 'api_key', status: process.env.WINDSOR_API_KEY ? 'authorized' : 'discovered',
    scopes: ['social-read','social-performance'], risk: 'high', requiresHumanApproval: true,
    metadata: { platforms: Object.keys(WINDSOR_SOCIAL_CONNECTORS), credentialsStoredInRegistry: false,
      secretsReturnedToClients: false, autonomousPostingEnabled: false, autonomousMessagingEnabled: false,
      autonomousAdSpendEnabled: false, humanApprovalForConsequentialActions: true, evidenceRequired: true }
  });
}

export function getWindsorSocialGatewayStatus() {
  return { provider:'windsor.ai', connectionId:'conn-windsor-social',
    configured:Boolean(process.env.WINDSOR_API_KEY),
    platforms:Object.entries(WINDSOR_SOCIAL_CONNECTORS).map(([platform,connector])=>({platform,connector,configured:Boolean(process.env.WINDSOR_API_KEY)})),
    autonomousPostingEnabled:false, autonomousMessagingEnabled:false, autonomousAdSpendEnabled:false,
    humanApprovalRequired:true, evidenceRequired:true,
    economicTruth:'social performance data is source evidence; it is not verified revenue by itself' };
}

function assertPlatform(value:string):SocialPlatform {
  if (!(value in WINDSOR_SOCIAL_CONNECTORS)) throw new Error('Unsupported Windsor social platform');
  return value as SocialPlatform;
}

export async function getWindsorSocialData(platformInput:string, fields:string[], datePreset='last_30d') {
  const platform=assertPlatform(platformInput);
  const apiKey=process.env.WINDSOR_API_KEY;
  if(!apiKey) throw new Error('WINDSOR_API_KEY is not configured');
  const connector=WINDSOR_SOCIAL_CONNECTORS[platform];
  const url=new URL(`https://connectors.windsor.ai/${connector}`);
  url.searchParams.set('api_key',apiKey); url.searchParams.set('fields',fields.join(',')); url.searchParams.set('date_preset',datePreset);
  const response=await fetch(url,{headers:{'User-Agent':'Windsor/1.0'}});
  if(!response.ok) throw new Error(`Windsor data request failed: HTTP ${response.status}`);
  const data=await response.json();
  await getPostgresPool().query(`INSERT INTO social_gateway_events(id,platform,connector,event_type,status,metadata) VALUES($1,$2,$3,'data-sync','success',$4)`,
    [crypto.randomUUID(),platform,connector,JSON.stringify({fields,datePreset})]);
  return {platform,connector,datePreset,source:'windsor.ai',observedAt:new Date().toISOString(),data};
}
