import { getConnection, registerConnection, recordConnectionEvent } from './connection-registry';

export const ISO_API_BASE_URL = process.env.ISO_API_BASE_URL || 'https://api-portal.iso.org';

export const STANDARDIZATION_IDENTITY_FEDERATION = {
  id: 'sif',
  name: 'Standardization Identity Federation',
  ecosystem: 'ISO/CEN/CENELEC',
  authType: 'oidc' as const,
  purpose: 'Federated identity and SSO for participating standardization applications',
  authorizationRequired: true,
  credentialsStoredInRegistry: false,
  secretReturnedToClients: false
} as const;

export const isoIntegration = {
  id: 'iso',
  name: 'ISO',
  apiPortalUrl: 'https://api-portal.iso.org/',
  homePortalUrl: 'https://sd.iso.org/',
  standards: ['ISO/IEC 42001:2023'],
  policy: {
    credentialsStoredInRegistry: false,
    secretsReturnedToClients: false,
    isoCertificationClaimAllowed: false,
    requiresAuthorizedIsoAccess: true,
    humanApprovalForAccountAuthorization: true
  }
} as const;

export async function initializeIsoIntegration() {
  const isoConnection = await registerConnection({
    id: 'conn-iso',
    provider: 'iso',
    displayName: 'ISO Standards / API Portal',
    authType: 'api_key',
    status: process.env.ISO_API_KEY ? 'pending_authorization' : 'discovered',
    scopes: ['standards-metadata-read'],
    risk: 'medium',
    accountRef: process.env.ISO_ACCOUNT_REF || null,
    expiresAt: null,
    lastVerifiedAt: null,
    requiresHumanApproval: true,
    metadata: {
      apiPortalUrl: isoIntegration.apiPortalUrl,
      homePortalUrl: isoIntegration.homePortalUrl,
      apiBaseUrl: ISO_API_BASE_URL,
      accessModel: 'ISO Member / authorized partner access required',
      apiCredentialConfigured: Boolean(process.env.ISO_API_KEY),
      credentialsStoredInRegistry: false,
      isoCertificationClaimAllowed: false
    }
  });

  await registerConnection({
    id: 'conn-sif',
    provider: 'standardization-identity-federation',
    displayName: 'Standardization Identity Federation (ISO/CEN/CENELEC)',
    authType: 'oidc',
    status: process.env.SIF_CLIENT_ID ? 'pending_authorization' : 'discovered',
    scopes: ['openid'],
    risk: 'high',
    accountRef: process.env.SIF_ACCOUNT_REF || null,
    expiresAt: null,
    lastVerifiedAt: null,
    requiresHumanApproval: true,
    metadata: {
      federation: STANDARDIZATION_IDENTITY_FEDERATION,
      issuer: process.env.SIF_ISSUER_URL || null,
      clientIdConfigured: Boolean(process.env.SIF_CLIENT_ID),
      redirectUri: process.env.SIF_REDIRECT_URI || null,
      identitySources: ['ISO Global Directory', 'CEN Global Directory', 'CENELEC Expert Management System'],
      credentialsStoredInRegistry: false
    }
  });

  return isoConnection;
}

export async function getIsoIntegrationStatus() {
  const connection = await getConnection('conn-iso');
  return {
    integration: isoIntegration,
    connection: connection ? {
      ...connection,
      metadata: {
        ...connection.metadata,
        apiCredentialConfigured: Boolean(process.env.ISO_API_KEY)
      }
    } : null,
    status: process.env.ISO_API_KEY ? 'credential-configured-awaiting-authorization' : 'awaiting-authorized-iso-api-access',
    nextStep: process.env.ISO_API_KEY
      ? 'Authorize the ISO connection through the GLORIFIER human-approval flow before API use.'
      : 'Obtain authorized ISO API access through the ISO API Portal; do not place ISO credentials in source code.'
  };
}

export async function requestIsoAuthorization(actor = 'human-owner') {
  const connection = await getConnection('conn-iso') || await initializeIsoIntegration();
  const approval = await import('./connection-registry').then(({ requestConnectionApproval }) =>
    requestConnectionApproval(connection.id, actor, 'iso-api-access', ['standards-metadata-read'])
  );
  await recordConnectionEvent(connection.id, 'iso_authorization_requested', actor, {
    approvalId: approval.id,
    scope: ['standards-metadata-read'],
    note: 'Authorization does not imply ISO certification.'
  });
  return approval;
}

export function getStandardizationIdentityFederationStatus() {
  return {
    federation: STANDARDIZATION_IDENTITY_FEDERATION,
    connectionId: 'conn-sif',
    status: process.env.SIF_CLIENT_ID ? 'configured-awaiting-human-authorization' : 'integration-ready-awaiting-provider-configuration',
    humanAuthorizationRequired: true,
    providerConfiguration: {
      issuerConfigured: Boolean(process.env.SIF_ISSUER_URL),
      clientIdConfigured: Boolean(process.env.SIF_CLIENT_ID),
      redirectUriConfigured: Boolean(process.env.SIF_REDIRECT_URI)
    },
    upstreamIdentitySources: ['ISO Global Directory', 'CEN Global Directory', 'CENELEC Expert Management System'],
    note: 'GLORIFIER does not impersonate the federation or store federation passwords. Access is granted by the participating identity provider.'
  };
}

export function getIso42001AlignmentTargets() {
  return [
    {
      id: 'GATS-001',
      target: 'AI system/model inventory and identification',
      evidence: ['AI model trust registry', 'connection registry']
    },
    {
      id: 'GATS-002',
      target: 'AI management lifecycle and controlled trust states',
      evidence: ['model trust registry', 'security events']
    },
    {
      id: 'GATS-003',
      target: 'Defined AI system roles, capabilities and governance boundaries',
      evidence: ['capability routing', 'agent registry', 'connection scopes']
    },
    {
      id: 'GATS-004',
      target: 'Traceability, evidence and documented AI outputs',
      evidence: ['evidence registries', 'audit events']
    },
    {
      id: 'GATS-005',
      target: 'AI verification, evaluation and reconciliation',
      evidence: ['multi-provider consensus', 'orchestration audit']
    },
    {
      id: 'GATS-006',
      target: 'AI risk/security monitoring and corrective controls',
      evidence: ['model security events', 'quarantine state']
    },
    {
      id: 'GATS-007',
      target: 'Human oversight and authorization',
      evidence: ['connection approvals', 'action approval gates']
    },
    {
      id: 'GATS-008',
      target: 'Documented information, monitoring and auditability',
      evidence: ['connection events', 'security events', 'invention/evidence registries']
    },
    {
      id: 'GATS-009',
      target: 'Risk/opportunity and economic decision controls',
      evidence: ['economic truth engine', 'monetization ledger']
    },
    {
      id: 'GATS-010',
      target: 'Operational governance of external AI/data connections',
      evidence: ['connection registry', 'authorization records']
    }
  ];
}
