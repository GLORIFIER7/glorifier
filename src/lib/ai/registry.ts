import { GeminiProvider } from './providers/gemini';
import { OpenAICompatibleProvider } from './providers/openai-compatible';
import type { AIProvider, AIProviderId, ProviderRegistryEntry } from './types';

const providers: AIProvider[] = [
  new GeminiProvider(),
  new OpenAICompatibleProvider({
    id: 'openai',
    name: 'OpenAI',
    apiKeyEnv: 'OPENAI_API_KEY',
    baseUrlEnv: 'OPENAI_BASE_URL',
    modelEnv: 'OPENAI_MODEL',
  }),
  new OpenAICompatibleProvider({
    id: 'meta',
    name: 'Meta',
    apiKeyEnv: 'META_API_KEY',
    baseUrlEnv: 'META_BASE_URL',
    modelEnv: 'META_MODEL',
  }),
];

export function listProviders(): ProviderRegistryEntry[] {
  return providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    status: provider.status(),
    models: provider.models(),
  }));
}

export function getProvider(id: AIProviderId): AIProvider {
  const provider = providers.find((candidate) => candidate.id === id);
  if (!provider) throw new Error(`Unknown AI provider: ${id}`);
  return provider;
}

export function getConnectedProviders(): AIProvider[] {
  return providers.filter((provider) => provider.status() === 'connected');
}
