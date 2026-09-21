import { aiOrchestrator } from './orchestrator';
import type { AIMessage } from './types';
import type { AIRoleId } from './roles';
import { getRoleSystemPrompt } from './role-prompts';

export async function runAIRole(role: AIRoleId, task: string, context: unknown, provider?: string) {
  const messages: AIMessage[] = [
    { role: 'system', content: getRoleSystemPrompt(role) },
    {
      role: 'user',
      content: JSON.stringify({ task, context }),
    },
  ];

  return aiOrchestrator.generate({
    messages,
    provider: provider as any,
    temperature: 0.2,
    maxTokens: 3000,
  });
}
