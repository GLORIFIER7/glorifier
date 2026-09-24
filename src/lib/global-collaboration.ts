import { listConnections, recordConnectionEvent, registerConnection } from './connection-registry';

export const globalProviders = [
  {
    id: 'hugging-face',
    name: 'Hugging Face',
    category: 'ai-ecosystem',
    capabilities: ['model-discovery', 'dataset-discovery', 'paper-search', 'space-discovery', 'jobs'],
    auth: 'oauth2',
    defaultRisk: 'medium' as const,
    publicUrl: 'https://huggingface.co/'
  },
  {
    id: 'meta',
    name: 'Meta / Facebook',
    category: 'social-ai-platform',
    capabilities: ['developer-platform', 'facebook-pages', 'instagram', 'messenger', 'llama-research'],
    auth: 'oauth2',
    defaultRisk: 'high' as const,
    publicUrl: 'https://developers.facebook.com/'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    category: 'ai-ecosystem',
    capabilities: ['model-inference', 'multimodal', 'structured-output', 'agent-collaboration', 'model-discovery'],
    auth: 'api_key',
    defaultRisk: 'medium' as const,
    publicUrl: 'https://ai.google.dev/gemini-api'
  }
];

export async function ensureGlobalProviderConnections() {
  for (const provider of globalProviders) {
    await registerConnection({
      id: `provider-${provider.id}`,
      provider: provider.id,
      displayName: provider.name,
      authType: provider.auth,
      status: 'discovered',
      scopes: [],
      risk: provider.defaultRisk,
      accountRef: null,
      expiresAt: null,
      lastVerifiedAt: null,
      requiresHumanApproval: true,
      metadata: {
        category: provider.category,
        capabilities: provider.capabilities,
        publicUrl: provider.publicUrl,
        credentialPolicy: 'minimum-scope; secrets-isolated; human-approval-for-consequential-actions'
      }
    });
  }
}

export async function getGlobalCollaborationStatus() {
  const connections = await listConnections();
  return globalProviders.map((provider) => {
    const connection = connections.find((item) => item.id === `provider-${provider.id}`);
    return {
      ...provider,
      status: connection?.status || 'discovered',
      authorized: connection?.status === 'authorized',
      requiresHumanApproval: connection?.requiresHumanApproval ?? true,
      connectionId: connection?.id || null,
      scopes: connection?.scopes || [],
      configured: provider.id === 'gemini' ? Boolean(process.env.GEMINI_API_KEY) : undefined
    };
  });
}

export async function recordGlobalCollaboration(providerId: string, action: string, actor = 'global-collaboration', details: Record<string, unknown> = {}) {
  const connectionId = `provider-${providerId}`;
  const connections = await listConnections();
  const connection = connections.find((item) => item.id === connectionId);
  if (!connection) throw new Error('Global provider is not registered');
  return recordConnectionEvent(connectionId, action, actor, { provider: providerId, ...details });
}
