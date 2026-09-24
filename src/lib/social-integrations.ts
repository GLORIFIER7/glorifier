import crypto from 'node:crypto';
import {
  registerConnection,
  getConnection,
  requestConnectionApproval,
  recordConnectionEvent
} from './connection-registry';

export type SocialProvider = 'linkedin' | 'facebook' | 'tiktok';

const CALLBACK_BASE = process.env.SOCIAL_OAUTH_CALLBACK_BASE_URL || 'https://glorifier-artificial-intelligence-production.up.railway.app';

export const socialIntegrations = {
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    authType: 'oauth2' as const,
    authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['openid', 'profile', 'email', 'w_member_social'],
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    redirectUriEnv: 'LINKEDIN_REDIRECT_URI',
    capabilities: ['profile-read', 'email-read', 'member-social-post']
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    authType: 'oauth2' as const,
    authorizationUrl: 'https://www.facebook.com/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/oauth/access_token',
    scopes: ['public_profile', 'email'],
    clientIdEnv: 'FACEBOOK_APP_ID',
    clientSecretEnv: 'FACEBOOK_APP_SECRET',
    redirectUriEnv: 'FACEBOOK_REDIRECT_URI',
    capabilities: ['profile-read', 'page-management-after-approval']
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    authType: 'oauth2' as const,
    authorizationUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: ['user.info.basic'],
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    redirectUriEnv: 'TIKTOK_REDIRECT_URI',
    capabilities: ['profile-read', 'video-read-after-approval', 'content-post-after-approval']
  }
} as const;

function cfg(provider: SocialProvider) {
  return socialIntegrations[provider];
}

function redirectUri(provider: SocialProvider) {
  const c = cfg(provider);
  return process.env[c.redirectUriEnv] || `${CALLBACK_BASE}/api/social/${provider}/callback`;
}

export async function initializeSocialIntegrations() {
  for (const provider of Object.keys(socialIntegrations) as SocialProvider[]) {
    const c = cfg(provider);
    await registerConnection({
      id: `conn-${provider}`,
      provider,
      displayName: `${c.name} Social Integration`,
      authType: c.authType,
      status: process.env[c.clientIdEnv] ? 'pending_authorization' : 'discovered',
      scopes: [...c.scopes],
      risk: 'high',
      accountRef: null,
      requiresHumanApproval: true,
      metadata: {
        capabilities: c.capabilities,
        authorizationUrl: c.authorizationUrl,
        redirectUri: redirectUri(provider),
        clientConfigured: Boolean(process.env[c.clientIdEnv] && process.env[c.clientSecretEnv]),
        credentialsStoredInRegistry: false,
        secretsReturnedToClients: false,
        autonomousPostingEnabled: false,
        autonomousMessagingEnabled: false,
        humanApprovalForConsequentialActions: true
      }
    });
  }
}

export function getSocialIntegrationStatus(provider: SocialProvider) {
  const c = cfg(provider);
  return {
    provider,
    name: c.name,
    connectionId: `conn-${provider}`,
    clientConfigured: Boolean(process.env[c.clientIdEnv] && process.env[c.clientSecretEnv]),
    redirectUri: redirectUri(provider),
    scopes: [...c.scopes],
    capabilities: c.capabilities,
    authorizationRequired: true,
    humanApprovalRequired: true,
    autonomousPostingEnabled: false,
    autonomousMessagingEnabled: false,
    credentialsStoredInRegistry: false,
    nextStep: process.env[c.clientIdEnv] ? 'request_human_authorization' : 'configure_developer_app_credentials'
  };
}

function providerFromPath(value: string): SocialProvider {
  const provider = value.toLowerCase() as SocialProvider;
  if (!['linkedin', 'facebook', 'tiktok'].includes(provider)) throw new Error('Unsupported social provider');
  return provider;
}

export async function completeSocialCallback(providerInput: string, code: string, state: string) {
  const provider = providerFromPath(providerInput);
  if (!code || !state) throw new Error('OAuth code and state are required');

  // The authorization state is intentionally never treated as authorization by itself.
  // Token exchange remains server-side; access tokens are never returned to clients.
  const connection = await getConnection(`conn-${provider}`);
  if (!connection) throw new Error('Social connection not initialized');

  const c = cfg(provider);
  const clientId = process.env[c.clientIdEnv];
  const clientSecret = process.env[c.clientSecretEnv];
  if (!clientId || !clientSecret) throw new Error(`${provider} client credentials are not configured`);

  const response = await fetch(c.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(provider),
      client_id: clientId,
      client_secret: clientSecret
    })
  });
  const payload = await response.text();
  if (!response.ok) throw new Error(`${provider} token exchange failed: HTTP ${response.status}`);

  // Token persistence is deliberately not implemented here until a dedicated
  // encrypted server-side credential vault is connected.
  await recordConnectionEvent(connection.id, 'oauth_code_exchanged', 'oauth-callback', {
    provider,
    statePresent: Boolean(state),
    tokenExchangeSucceeded: true,
    tokenPayloadLength: payload.length,
    credentialsPersisted: false
  });

  return {
    provider,
    connected: false,
    requiresCredentialVault: true,
    message: 'OAuth token exchange succeeded, but GLORIFIER has not persisted the credential because the encrypted credential vault is not enabled.'
  };
}

export async function buildSocialAuthorization(provider: SocialProvider, actor = 'human-owner') {
  const c = cfg(provider);
  const clientId = process.env[c.clientIdEnv];
  if (!clientId) throw new Error(`${provider} client credentials are not configured`);

  const connection = await getConnection(`conn-${provider}`);
  if (!connection) throw new Error('Social connection not initialized');

  const approval = await requestConnectionApproval(
    connection.id,
    actor,
    `authorize-${provider}-oauth`,
    [...c.scopes]
  );

  const state = crypto.randomBytes(24).toString('hex');
  await recordConnectionEvent(connection.id, 'oauth_authorization_started', actor, {
    approvalId: approval.id,
    stateHash: crypto.createHash('sha256').update(state).digest('hex'),
    provider
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(provider),
    response_type: 'code',
    scope: c.scopes.join(provider === 'tiktok' ? ',' : ' '),
    state
  });

  return {
    provider,
    authorizationUrl: `${c.authorizationUrl}?${params.toString()}`,
    approvalId: approval.id,
    state,
    redirectUri: redirectUri(provider)
  };
}
