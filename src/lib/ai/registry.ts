import { GeminiProvider } from './providers/gemini';
import { AnthropicProvider } from './providers/anthropic';
import { OpenAICompatibleProvider } from './providers/openai-compatible';
import type { AIProvider, AIProviderId, ProviderRegistryEntry } from './types';

const compatibleProviders = [
  { id: 'openai', name: 'OpenAI', apiKeyEnv: 'OPENAI_API_KEY', baseUrlEnv: 'OPENAI_BASE_URL', modelEnv: 'OPENAI_MODEL', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  { id: 'meta', name: 'Meta Llama', apiKeyEnv: 'META_API_KEY', baseUrlEnv: 'META_BASE_URL', modelEnv: 'META_MODEL' },
  { id: 'xai', name: 'xAI', apiKeyEnv: 'XAI_API_KEY', baseUrlEnv: 'XAI_BASE_URL', modelEnv: 'XAI_MODEL', defaultBaseUrl: 'https://api.x.ai/v1', defaultModel: 'grok-4' },
  { id: 'mistral', name: 'Mistral AI', apiKeyEnv: 'MISTRAL_API_KEY', baseUrlEnv: 'MISTRAL_BASE_URL', modelEnv: 'MISTRAL_MODEL', defaultBaseUrl: 'https://api.mistral.ai/v1', defaultModel: 'mistral-large-latest' },
  { id: 'deepseek', name: 'DeepSeek', apiKeyEnv: 'DEEPSEEK_API_KEY', baseUrlEnv: 'DEEPSEEK_BASE_URL', modelEnv: 'DEEPSEEK_MODEL', defaultBaseUrl: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-reasoner' },
  { id: 'qwen', name: 'Alibaba Qwen', apiKeyEnv: 'QWEN_API_KEY', baseUrlEnv: 'QWEN_BASE_URL', modelEnv: 'QWEN_MODEL' },
  { id: 'nvidia', name: 'NVIDIA NIM', apiKeyEnv: 'NVIDIA_API_KEY', baseUrlEnv: 'NVIDIA_BASE_URL', modelEnv: 'NVIDIA_MODEL' },
  { id: 'groq', name: 'Groq', apiKeyEnv: 'GROQ_API_KEY', baseUrlEnv: 'GROQ_BASE_URL', modelEnv: 'GROQ_MODEL', defaultBaseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-4-scout' },
  { id: 'together', name: 'Together AI', apiKeyEnv: 'TOGETHER_API_KEY', baseUrlEnv: 'TOGETHER_BASE_URL', modelEnv: 'TOGETHER_MODEL' },
  { id: 'fireworks', name: 'Fireworks AI', apiKeyEnv: 'FIREWORKS_API_KEY', baseUrlEnv: 'FIREWORKS_BASE_URL', modelEnv: 'FIREWORKS_MODEL' },
];

const providers: AIProvider[] = [
  new GeminiProvider(),
  new AnthropicProvider(),
  ...compatibleProviders.map((config) => new OpenAICompatibleProvider(config)),
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


export interface ProviderExecutionRequest {
  messages: import('./types').AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: AIProviderId;
}

export interface ProviderExecutionResult {
  response?: import('./types').AIResponse;
  provider: string;
  attemptedProviders: string[];
  errors: string[];
}

/**
 * GLORIFIER AI CEO provider-routing boundary.
 * The registry is authoritative for provider selection; provider failures are
 * recorded and execution continues to another authenticated provider.
 * No synthetic response is ever produced here.
 */
export async function executeThroughProviderRegistry(
  request: ProviderExecutionRequest
): Promise<ProviderExecutionResult> {
  const connected = getConnectedProviders();
  const preferredProvider = request.preferredProvider
    || (request.model?.startsWith('gemini') ? 'gemini' : request.model?.startsWith('gpt') ? 'openai' : undefined);

  const ordered = [...connected].sort((a, b) => {
    if (preferredProvider) {
      if (a.id === preferredProvider && b.id !== preferredProvider) return -1;
      if (b.id === preferredProvider && a.id !== preferredProvider) return 1;
    }
    if (a.id === 'gemini' && b.id !== 'gemini') return -1;
    if (b.id === 'gemini' && a.id !== 'gemini') return 1;
    if (a.id === 'openai' && b.id !== 'openai') return -1;
    if (b.id === 'openai' && a.id !== 'openai') return 1;
    return 0;
  });

  const attemptedProviders: string[] = [];
  const errors: string[] = [];

  for (const provider of ordered) {
    attemptedProviders.push(provider.id);
    try {
      const response = await provider.generate(request);
      if (response.text?.trim()) {
        return { response, provider: provider.id, attemptedProviders, errors };
      }
      errors.push(`${provider.id}: empty response`);
    } catch (error) {
      errors.push(`${provider.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    provider: 'provider-registry-exhausted',
    attemptedProviders,
    errors,
  };
}
