import { registerConnection, getConnection, requestConnectionApproval, recordConnectionEvent } from './connection-registry';

export const OPENPROFILE_INTEGRATION = {
  id: 'openprofile',
  provider: 'linux-foundation-openprofile',
  name: 'Linux Foundation OpenProfile',
  url: 'https://openprofile.dev/',
  issuer: 'https://sso.linuxfoundation.org/',
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
  const scopes = ['openid', 'profile', 'email'];
  const approval = await requestConnectionApproval(
    'conn-openprofile',
    actor,
    'authorize OpenProfile OIDC identity/profile access',
    scopes
  );
  await recordConnectionEvent('conn-openprofile', 'authorization_requested', actor, {
    scopes,
    issuer: OPENPROFILE_INTEGRATION.issuer
  });
  return {
    approval,
    authorizationUrl: process.env.OPENPROFILE_AUTHORIZATION_URL || 'https://sso.linuxfoundation.org/authorize',
    issuer: OPENPROFILE_INTEGRATION.issuer,
    scopes,
    humanAuthorizationRequired: true,
    tokenStorage: 'external-secret-vault-required'
  };
}
