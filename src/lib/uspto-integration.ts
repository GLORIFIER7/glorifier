import { getConnection, registerConnection, recordConnectionEvent } from './connection-registry';

export const USPTO_ACCOUNT_URL = 'https://account.uspto.gov/profile';
export const USPTO_API_MANAGER_URL = 'https://account.uspto.gov/api-manager/';
export const USPTO_TSDR_API_BASE_URL = process.env.USPTO_TSDR_API_BASE_URL || 'https://tsdrapi.uspto.gov';

export const usptoIntegration = {
  id: 'uspto',
  name: 'United States Patent and Trademark Office',
  accountUrl: USPTO_ACCOUNT_URL,
  apiManagerUrl: USPTO_API_MANAGER_URL,
  capabilities: [
    'account-linkage',
    'trademark-status-retrieval',
    'trademark-document-retrieval',
    'ip-evidence-tracking'
  ],
  policy: {
    credentialsStoredInRegistry: false,
    secretsReturnedToClients: false,
    passwordOrMfaStoredByGlorifier: false,
    filingOrPaymentExecutionEnabled: false,
    humanApprovalForConsequentialActions: true
  }
} as const;

export async function initializeUsptoIntegration() {
  return registerConnection({
    id: 'conn-uspto',
    provider: 'uspto',
    displayName: 'USPTO.gov Account / IP Services',
    authType: 'api_key',
    status: process.env.USPTO_API_KEY ? 'pending_authorization' : 'discovered',
    scopes: ['trademark-status-read', 'trademark-documents-read'],
    risk: 'high',
    accountRef: process.env.USPTO_ACCOUNT_REF || null,
    expiresAt: null,
    lastVerifiedAt: null,
    requiresHumanApproval: true,
    metadata: {
      accountUrl: USPTO_ACCOUNT_URL,
      apiManagerUrl: USPTO_API_MANAGER_URL,
      apiBaseUrl: USPTO_TSDR_API_BASE_URL,
      apiKeyConfigured: Boolean(process.env.USPTO_API_KEY),
      accessModel: 'USPTO.gov account + separately issued USPTO API key',
      credentialsStoredInRegistry: false,
      passwordOrMfaStoredByGlorifier: false,
      filingOrPaymentExecutionEnabled: false
    }
  });
}

export async function getUsptoIntegrationStatus() {
  const connection = await getConnection('conn-uspto');
  return {
    integration: usptoIntegration,
    connection: connection ? {
      ...connection,
      metadata: {
        ...connection.metadata,
        apiKeyConfigured: Boolean(process.env.USPTO_API_KEY)
      }
    } : null,
    status: process.env.USPTO_API_KEY
      ? 'api-key-configured-awaiting-human-authorization'
      : 'awaiting-uspTO-api-key',
    accountLogin: {
      supported: true,
      url: USPTO_ACCOUNT_URL,
      automatedPasswordLogin: false,
      mfaBypass: false
    },
    nextStep: process.env.USPTO_API_KEY
      ? 'Authorize the USPTO connection through GLORIFIER before read-only API use.'
      : 'Sign in to the USPTO account, obtain an API key through the USPTO API Manager, then configure USPTO_API_KEY server-side.'
  };
}

export async function requestUsptoAuthorization(actor = 'human-owner') {
  const connection = await getConnection('conn-uspto') || await initializeUsptoIntegration();
  const approval = await import('./connection-registry').then(({ requestConnectionApproval }) =>
    requestConnectionApproval(connection.id, actor, 'uspto-read-only-access', ['trademark-status-read', 'trademark-documents-read'])
  );
  await recordConnectionEvent(connection.id, 'uspto_authorization_requested', actor, {
    approvalId: approval.id,
    scope: ['trademark-status-read', 'trademark-documents-read'],
    note: 'Authorization does not grant filing, payment, ownership transfer, or other irreversible USPTO actions.'
  });
  return approval;
}

export async function getUsptoTrademarkStatus(serialNumber: string) {
  const normalized = String(serialNumber).replace(/[^0-9]/g, '');
  if (!normalized) throw new Error('A numeric USPTO trademark serial number is required');
  if (!process.env.USPTO_API_KEY) throw new Error('USPTO_API_KEY is not configured');

  const connection = await getConnection('conn-uspto');
  if (!connection || connection.status !== 'authorized') {
    throw new Error('USPTO connection is not authorized');
  }

  const response = await fetch(
    `${USPTO_TSDR_API_BASE_URL}/ts/cd/casestatus/sn${normalized}/info.xml`,
    { headers: { 'USPTO-API-KEY': process.env.USPTO_API_KEY } }
  );
  if (!response.ok) throw new Error(`USPTO TSDR request failed with HTTP ${response.status}`);

  const body = await response.text();
  await recordConnectionEvent(connection.id, 'uspto_trademark_status_retrieved', 'uspto-runtime', {
    serialNumber: normalized,
    observedAt: new Date().toISOString(),
    source: 'USPTO TSDR API'
  });

  return {
    serialNumber: normalized,
    source: 'USPTO TSDR API',
    observedAt: new Date().toISOString(),
    contentType: response.headers.get('content-type') || 'application/xml',
    content: body,
    verifiedSource: true,
    revenueVerified: false
  };
}
