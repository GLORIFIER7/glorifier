export type AIProviderId = 'openai' | 'gemini' | 'meta' | string;
export type AIProviderStatus = 'connected' | 'disconnected' | 'error';

export interface AIMessage { role: 'system' | 'user' | 'assistant'; content: string; }
export interface AIRequest { messages: AIMessage[]; model?: string; temperature?: number; maxTokens?: number; }

export interface ResponseEvaluation { score: number; passed: boolean; reasons: string[]; }

export interface AIResponse {
  provider: AIProviderId;
  model: string;
  text: string;
  requestId?: string;
  latencyMs?: number;
  evaluation?: ResponseEvaluation;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number; };
}

export interface AIProvider {
  id: AIProviderId; name: string; status(): AIProviderStatus; models(): string[];
  generate(request: AIRequest): Promise<AIResponse>;
}
export interface ProviderRegistryEntry { id: AIProviderId; name: string; status: AIProviderStatus; models: string[]; }
