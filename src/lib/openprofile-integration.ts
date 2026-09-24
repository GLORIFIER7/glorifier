import crypto from 'node:crypto';
import { registerConnection, getConnection, requestConnectionApproval, recordConnectionEvent } from './connection-registry';
import { getPostgresPool } from './db/postgres';

export const OPENPROFILE_INTEGRATION = {
  id: 'openprofile',
  provider: 'linux-foundation-openprofile',
  name: 'Linux Foundation OpenProfile',
  url: 'https://openprofile.dev/',
  issuer: process.env.OPENPROFILE_ISSUER || 'https://sso.linuxfoundation.org/',
  authType: 'oidc' as const,
  capabilities: [
    'profile-identity',
    'open-source-community-profile',
    'lf-meetings-and-events-profile',
    'contributor-attribution-context'
  ],
  policy: {
    credentialsStoredInConnectionRegistry: false,
    secretsReturnedToClients: false,
    passwordOrMfaStoredByGlorifier: false,
    autonomousProfileChanges: false,
    humanApprovalForAuthorization: true,
    publicProfileDataOnlyByDefault: true
  }
};

export async function initializeOpenProfileIntegration() {
  await getPostgresPool().query(`CREATE TABLE IF NOT EXISTS openprofile_oidc_states (state TEXT PRIMARY KEY, nonce TEXT NOT NULL, code_verifier TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL, actor TEXT NOT NULL);`);
  const clientIdConfigured = Boolean(process.env.OPENPROFILE_CLIENT_ID);
  return registerConnection({
    id: 'conn-openprofile',
    provider: OPENPROFILE_INTEGRATION.provider,
    displayName: 'Linux Foundation OpenProfile',
    authType: 'oidc',
    status: clientIdConfigured ? 'pending_authorization' : 'discovered',
    scopes: ['openid', 'profile', 'email'],
    risk: 'medium',
    accountRef: process.env.OPENPROFILE_ACCOUNT_REF || null,
    requiresHumanApproval: true,
    metadata: {
      profileUrl: OPENPROFILE_INTEGRATION.url,
      issuer: OPENPROFILE_INTEGRATION.issuer,
      clientIdConfigured,
      capabilities: OPENPROFILE_INTEGRATION.capabilities,
      publicProfileDataOnlyByDefault: true,
      credentialsStoredInRegistry: false
    }
  });
}

export async function getOpenProfileIntegrationStatus() {
  await initializeOpenProfileIntegration();
  return {
    integration: OPENPROFILE_INTEGRATION,
    connection: await getConnection('conn-openprofile'),
    configured: Boolean(process.env.OPENPROFILE_CLIENT_ID),
    authorizationRequired: true
  };
}

export async function requestOpenProfileAuthorization(actor = 'human-owner') {
  await initializeOpenProfileIntegration();
  const clientId = process.env.OPENPROFILE_CLIENT_ID;
  const redirectUri = process.env.OPENPROFILE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return {
      configured: false,
      humanAuthorizationRequired: true,
      setupRequired: ['OPENPROFILE_CLIENT_ID', 'OPENPROFILE_CLIENT_SECRET', 'OPENPROFILE_REDIRECT_URI'],
      note: 'Linux Foundation SSO access must be registered/authorized for this GLORIFIER application before an OIDC authorization URL can be issued.'
    };
  }
  const scopes = ['openid', 'profile', 'email'];
  const state = crypto.randomBytes(32).toString('base64url');
  const nonce = crypto.randomBytes(32).toString('base64url');
  const codeVerifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  await getPostgresPool().query(
    'INSERT INTO openprofile_oidc_states(state,nonce,code_verifier,expires_at,actor) VALUES($1,$2,$3,NOW()+INTERVAL \'10 minutes\',$4)',
    [state, nonce, codeVerifier, actor]
  );
  const approval = await requestConnectionApproval('conn-openprofile', actor, 'authorize OpenProfile OIDC identity/profile access', scopes);
  await recordConnectionEvent('conn-openprofile', 'authorization_url_issued', actor, { scopes, stateCreated: true });
  const authorizationEndpoint = process.env.OPENPROFILE_AUTHORIZATION_URL;
  if (!authorizationEndpoint) throw new Error('OPENPROFILE_AUTHORIZATION_URL is not configured; obtain the Linux Foundation OIDC application endpoint before enabling authorization.');
  const url = new URL(authorizationEndpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return { configured: true, approval, authorizationUrl: url.toString(), issuer: OPENPROFILE_INTEGRATION.issuer, scopes, humanAuthorizationRequired: true, pkce: true, tokenStorage: 'external-secret-vault-required', expiresInMinutes: 10 };
}

export async function completeOpenProfileCallback(code: string, state: string) {
  await initializeOpenProfileIntegration();
  const db = getPostgresPool();
  const stateResult = await db.query('SELECT * FROM openprofile_oidc_states WHERE state=$1 AND expires_at>NOW()', [state]);
  const saved = stateResult.rows[0];
  if (!saved) throw new Error('Invalid or expired OpenProfile authorization state');
  await db.query('DELETE FROM openprofile_oidc_states WHERE state=$1', [state]);
  const clientId = process.env.OPENPROFILE_CLIENT_ID;
  const clientSecret = process.env.OPENPROFILE_CLIENT_SECRET;
  const redirectUri = process.env.OPENPROFILE_REDIRECT_URI;
  const tokenEndpoint = process.env.OPENPROFILE_TOKEN_URL;
  if (!clientId || !clientSecret || !redirectUri || !tokenEndpoint) throw new Error('OpenProfile OIDC client/token configuration is incomplete');
  const body = new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:redirectUri,client_id:clientId,client_secret:clientSecret,code_verifier:saved.code_verifier});
  const tokenResponse = await fetch(tokenEndpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',accept:'application/json'},body});
  if (!tokenResponse.ok) throw new Error('OpenProfile token exchange failed');
  const tokens:any=await tokenResponse.json();
  if (!tokens.access_token) throw new Error('OpenProfile authorization did not return an access token');
  const userinfoUrl=process.env.OPENPROFILE_USERINFO_URL;
  let claims:any={};
  if(userinfoUrl){
    const ui=await fetch(userinfoUrl,{headers:{authorization:'Bearer '+tokens.access_token,accept:'application/json'}});
    if(ui.ok) claims=await ui.json();
  }
  const subject=String(claims.sub||'');
  await db.query("UPDATE connection_registry SET status='authorized',account_ref=$2,last_verified_at=NOW(),updated_at=NOW() WHERE id='conn-openprofile'",[subject||null]);
  await recordConnectionEvent('conn-openprofile','authorization_completed',saved.actor,{subjectPresent:Boolean(subject),claimsReceived:Object.keys(claims),tokenStored:false});
  return {authorized:true, connection:await getConnection('conn-openprofile'), profile:{subject:subject||null,name:claims.name||null,email:claims.email||null,emailVerified:claims.email_verified===true}, tokenStored:false, humanAuthorizationCompleted:true};
}
