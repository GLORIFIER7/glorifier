import type { ComputeSnapshot, ComputeTask, ComputeTaskResult } from './types';
import { listComputeResources } from './registry';

const counters = { completed: 0, failed: 0 };
let activeTasks = 0;
let queuedTasks = 0;
const REQUEST_TIMEOUT_MS = Math.max(5_000, Number(process.env.GLORIFIER_COMPUTE_TIMEOUT_MS || 120_000));

function authHeaders(token?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function chooseResource(task: ComputeTask) {
  const resources = listComputeResources().filter(r => r.status === 'ready');
  return [...resources].sort((a, b) => {
    const aModel = task.preferredModel && a.models.includes(task.preferredModel) ? 1 : 0;
    const bModel = task.preferredModel && b.models.includes(task.preferredModel) ? 1 : 0;
    if (aModel !== bModel) return bModel - aModel;
    if (task.taskType === 'inference' || task.taskType === 'code') {
      const aGpu = a.kind === 'gpu' || a.capabilities.includes('gpu') ? 1 : 0;
      const bGpu = b.kind === 'gpu' || b.capabilities.includes('gpu') ? 1 : 0;
      if (aGpu !== bGpu) return bGpu - aGpu;
    }
    return b.concurrency - a.concurrency;
  })[0];
}

async function runRemote(resource: ReturnType<typeof listComputeResources>[number], task: ComputeTask): Promise<ComputeTaskResult> {
  const started = Date.now();
  const token = process.env.GLORIFIER_COMPUTE_WORKER_TOKEN?.trim();
  const response = await fetchWithTimeout(resource.endpoint!, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ task })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${resource.name} HTTP ${response.status}: ${body.slice(0, 500)}`);
  let parsed: any = {};
  try { parsed = JSON.parse(body); } catch { parsed = { text: body }; }
  return {
    taskId: task.id,
    resourceId: resource.id,
    model: parsed.model || task.preferredModel,
    status: 'completed',
    text: parsed.text || parsed.response || '',
    latencyMs: Date.now() - started
  };
}

async function runOllama(resource: ReturnType<typeof listComputeResources>[number], task: ComputeTask): Promise<ComputeTaskResult> {
  const started = Date.now();
  const model = task.preferredModel || resource.models[0];
  if (!model) throw new Error('OLLAMA_MODELS must contain at least one model for self-hosted inference.');

  const baseUrl = resource.endpoint!.replace(/\/$/, '');
  const token = process.env.OLLAMA_AUTH_TOKEN?.trim();
  const response = await fetchWithTimeout(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ model, prompt: task.objective, stream: false })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}: ${body.slice(0, 500)}`);
  const parsed = JSON.parse(body);
  return { taskId: task.id, resourceId: resource.id, model, status: 'completed', text: parsed.response || '', latencyMs: Date.now() - started };
}

export async function executeComputeTask(task: ComputeTask): Promise<ComputeTaskResult> {
  const resources = listComputeResources()
    .filter(r => r.status === 'ready' && r.capabilities.includes('llm-inference'))
    .sort((a, b) => {
      const preferredA = task.preferredModel && a.models.includes(task.preferredModel) ? 1 : 0;
      const preferredB = task.preferredModel && b.models.includes(task.preferredModel) ? 1 : 0;
      if (preferredA !== preferredB) return preferredB - preferredA;
      return (b.kind === 'gpu' ? 1 : 0) - (a.kind === 'gpu' ? 1 : 0);
    });

  if (!resources.length) {
    queuedTasks += 1;
    return {
      taskId: task.id,
      resourceId: 'none',
      status: 'failed',
      error: 'No authenticated independent LLM compute resource is currently ready.'
    };
  }

  activeTasks += 1;
  const errors: string[] = [];
  try {
    for (const resource of resources) {
      try {
        const result = resource.id === 'ollama-gpu'
          ? await runOllama(resource, task)
          : await runRemote(resource, task);
        if (result.status === 'completed' && result.text?.trim()) {
          counters.completed += 1;
          return result;
        }
        errors.push(`${resource.name}: empty response`);
      } catch (error) {
        errors.push(`${resource.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    counters.failed += 1;
    return {
      taskId: task.id,
      resourceId: 'none',
      status: 'failed',
      error: `All authenticated independent compute resources failed. ${errors.join(' | ')}`
    };
  } finally {
    activeTasks = Math.max(0, activeTasks - 1);
  }
}

export function getComputeSnapshot(): ComputeSnapshot {
  const resources = listComputeResources();
  const ready = resources.filter(r => r.status === 'ready');
  return {
    resources,
    queuedTasks,
    activeTasks,
    completedTasks: counters.completed,
    failedTasks: counters.failed,
    capacity: {
      totalConcurrency: resources.reduce((sum, r) => sum + r.concurrency, 0),
      readyConcurrency: ready.reduce((sum, r) => sum + r.concurrency, 0),
      gpuResources: ready.filter(r => r.kind === 'gpu' || r.capabilities.includes('gpu')).length,
      inferenceResources: ready.filter(r => r.capabilities.includes('llm-inference')).length
    }
  };
}
