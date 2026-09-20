import { getConnectedProviders, getProvider, listProviders } from './registry';
import type { AIMessage, AIRequest, AIResponse, AIProviderId } from './types';

export interface OrchestratorRequest extends AIRequest {
  provider?: AIProviderId | 'auto';
}

export class AIOrchestrator {
  async generate(request: OrchestratorRequest): Promise<AIResponse> {
    const candidates = request.provider && request.provider !== 'auto'
      ? [getProvider(request.provider)]
      : getConnectedProviders();

    if (candidates.length === 0) {
      throw new Error('No AI providers are connected.');
    }

    const errors: string[] = [];

    for (const provider of candidates) {
      try {
        return await provider.generate(request);
      } catch (error) {
        errors.push(`${provider.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    throw new Error(`All selected AI providers failed. ${errors.join(' | ')}`);
  }

  async collaborate(messages: AIMessage[], providerIds?: AIProviderId[]): Promise<AIResponse[]> {
    const providers = (providerIds?.length
      ? providerIds.map(getProvider)
      : getConnectedProviders());

    return Promise.allSettled(
      providers.map((provider) => provider.generate({ messages }))
    ).then((results) =>
      results
        .filter((result): result is PromiseFulfilledResult<AIResponse> => result.status === 'fulfilled')
        .map((result) => result.value)
    );
  }

  registry() {
    return listProviders();
  }
}

export const aiOrchestrator = new AIOrchestrator();
