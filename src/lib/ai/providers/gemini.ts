import { GoogleGenAI } from '@google/genai';
import type { AIMessage, AIProvider, AIRequest, AIResponse } from '../types';

function toPrompt(messages: AIMessage[]): { systemInstruction?: string; contents: string } {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const conversation = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  return {
    systemInstruction: system || undefined,
    contents: conversation,
  };
}

export class GeminiProvider implements AIProvider {
  id = 'gemini' as const;
  name = 'Google Gemini';

  private client: GoogleGenAI | null = null;

  private getClient() {
    if (!this.client && process.env.GEMINI_API_KEY) {
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return this.client;
  }

  status() {
    return process.env.GEMINI_API_KEY ? 'connected' as const : 'disconnected' as const;
  }

  models() {
    return process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : [];
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const client = this.getClient();
    if (!client) throw new Error('Gemini is not configured. Set GEMINI_API_KEY.');

    const model = request.model || process.env.GEMINI_MODEL;
    if (!model) throw new Error('Gemini model is not configured. Set GEMINI_MODEL.');

    const prompt = toPrompt(request.messages);
    const response = await client.models.generateContent({
      model,
      contents: prompt.contents,
      config: {
        systemInstruction: prompt.systemInstruction,
        ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
        ...(request.maxTokens === undefined ? {} : { maxOutputTokens: request.maxTokens }),
      },
    });

    return {
      provider: this.id,
      model,
      text: response.text || '',
    };
  }
}
