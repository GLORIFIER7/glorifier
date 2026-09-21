import type { AIProviderId } from './types';

export interface ProviderMetrics {
  requests: number;
  successes: number;
  failures: number;
  totalLatencyMs: number;
  lastLatencyMs?: number;
  estimatedCostUsd: number;
  lastUsedAt?: string;
}

const metrics = new Map<AIProviderId, ProviderMetrics>();

function get(id: AIProviderId): ProviderMetrics {
  const current = metrics.get(id);
  if (current) return current;
  const fresh = { requests: 0, successes: 0, failures: 0, totalLatencyMs: 0, estimatedCostUsd: 0 };
  metrics.set(id, fresh);
  return fresh;
}

function rate(name: string): number {
  const value = Number(process.env[name] || 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function recordProviderSuccess(
  provider: AIProviderId,
  latencyMs: number,
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number }
) {
  const item = get(provider);
  item.requests += 1;
  item.successes += 1;
  item.totalLatencyMs += latencyMs;
  item.lastLatencyMs = latencyMs;
  item.lastUsedAt = new Date().toISOString();

  const input = usage?.inputTokens || 0;
  const output = usage?.outputTokens || 0;
  const inputRate = rate(provider === 'gemini' ? 'GEMINI_INPUT_COST_PER_1K' : provider === 'meta' ? 'META_INPUT_COST_PER_1K' : 'OPENAI_INPUT_COST_PER_1K');
  const outputRate = rate(provider === 'gemini' ? 'GEMINI_OUTPUT_COST_PER_1K' : provider === 'meta' ? 'META_OUTPUT_COST_PER_1K' : 'OPENAI_OUTPUT_COST_PER_1K');
  item.estimatedCostUsd += (input / 1000) * inputRate + (output / 1000) * outputRate;
}

export function recordProviderFailure(provider: AIProviderId) {
  const item = get(provider);
  item.requests += 1;
  item.failures += 1;
  item.lastUsedAt = new Date().toISOString();
}

export function providerReliability(provider: AIProviderId): number {
  const item = get(provider);
  if (!item.requests) return 0.5;
  return item.successes / item.requests;
}

export function averageLatencyMs(provider: AIProviderId): number {
  const item = get(provider);
  return item.successes ? item.totalLatencyMs / item.successes : 0;
}

export function snapshotProviderMetrics() {
  return Array.from(metrics.entries()).map(([provider, item]) => ({
    provider,
    ...item,
    reliability: Number(providerReliability(provider).toFixed(4)),
    averageLatencyMs: Math.round(averageLatencyMs(provider)),
  }));
}
