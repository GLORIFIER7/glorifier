import { getConnectedProviders, getProvider, listProviders } from './registry';
import type { AIMessage, AIRequest, AIResponse, AIProviderId, AIProvider } from './types';
import { averageLatencyMs, providerReliability, recordProviderFailure, recordProviderSuccess, snapshotProviderMetrics } from './metrics';

export interface OrchestratorRequest extends AIRequest {
  provider?: AIProviderId | 'auto';
  evaluate?: boolean;
}

export interface ResponseEvaluation {
  score: number;
  passed: boolean;
  reasons: string[];
}

function evaluateResponse(response: AIResponse): ResponseEvaluation {
  const text = response.text?.trim() || '';
  const reasons: string[] = [];
  let score = 100;
  if (!text) { score = 0; reasons.push('Empty response'); }
  else {
    if (text.length < 20) { score -= 20; reasons.push('Very short response'); }
    if (/^(error|failed|exception):/i.test(text)) { score -= 40; reasons.push('Response begins with an error marker'); }
  }
  return { score: Math.max(0, score), passed: score >= 60, reasons };
}

function selectProviders(providers: AIProvider[]): AIProvider[] {
  return [...providers].sort((a, b) => {
    const reliabilityDiff = providerReliability(b.id) - providerReliability(a.id);
    if (Math.abs(reliabilityDiff) > 0.05) return reliabilityDiff;
    const aLatency = averageLatencyMs(a.id);
    const bLatency = averageLatencyMs(b.id);
    if (aLatency && bLatency && Math.abs(aLatency - bLatency) > 150) return aLatency - bLatency;
    return 0;
  });
}

export class AIOrchestrator {
  private async callProvider(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
    const started = Date.now();
    try {
      const response = await provider.generate(request);
      const latencyMs = Date.now() - started;
      response.latencyMs = latencyMs;
      response.evaluation = evaluateResponse(response);
      recordProviderSuccess(provider.id, latencyMs, response.usage);
      return response;
    } catch (error) {
      recordProviderFailure(provider.id);
      throw error;
    }
  }

  async generate(request: OrchestratorRequest): Promise<AIResponse> {
    const connected = request.provider && request.provider !== 'auto' ? [getProvider(request.provider)] : getConnectedProviders();
    const candidates = selectProviders(connected);
    if (candidates.length === 0) throw new Error('No AI providers are connected.');

    const errors: string[] = [];
    for (const provider of candidates) {
      try {
        const result = await this.callProvider(provider, request);
        if (request.evaluate !== false && !result.evaluation?.passed) {
          errors.push(`${provider.id}: response quality check failed`);
          continue;
        }
        return result;
      } catch (error) {
        errors.push(`${provider.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    throw new Error(`All selected AI providers failed. ${errors.join(' | ')}`);
  }

  async collaborate(messages: AIMessage[], providerIds?: AIProviderId[]): Promise<AIResponse[]> {
    const providers = selectProviders(providerIds?.length ? providerIds.map(getProvider) : getConnectedProviders());
    const results = await Promise.allSettled(providers.map((provider) => this.callProvider(provider, { messages })));
    return results
      .filter((result): result is PromiseFulfilledResult<AIResponse> => result.status === 'fulfilled')
      .map((result) => result.value);
  }

  registry() { return listProviders(); }
  metrics() { return snapshotProviderMetrics(); }
}

export const aiOrchestrator = new AIOrchestrator();
