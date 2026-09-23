import type { ComputeSnapshot, ComputeTask, ComputeTaskResult } from './types';
import { listComputeResources } from './registry';

const counters = { completed: 0, failed: 0 };
let activeTasks = 0;
let queuedTasks = 0;

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
  const response = await fetch(resource.endpoint!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const response = await fetch(`${resource.endpoint!.replace(/\\/$/, '')}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: task.objective, stream: false })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}: ${body.slice(0, 500)}`);
  const parsed = JSON.parse(body);
  return { taskId: task.id, resourceId: resource.id, model, status: 'completed', text: parsed.response || '', latencyMs: Date.now() - started };
}

export async function executeComputeTask(task: ComputeTask): Promise<ComputeTaskResult> {
  const resource = chooseResource(task);
  if (!resource) {
    queuedTasks += 1;
    return { taskId: task.id, resourceId: 'none', status: 'queued', error: 'No independent compute resource is currently configured.' };
  }

  activeTasks += 1;
  try {
    const result = resource.id === 'ollama-gpu' || resource.id === 'remote-gpu-worker'
      ? await (resource.id === 'ollama-gpu' ? runOllama(resource, task) : runRemote(resource, task))
      : { taskId: task.id, resourceId: resource.id, status: 'completed' as const, text: 'CPU worker accepted the orchestration task.', latencyMs: 0 };
    counters.completed += 1;
    return result;
  } catch (error) {
    counters.failed += 1;
    return { taskId: task.id, resourceId: resource.id, status: 'failed', error: error instanceof Error ? error.message : String(error) };
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
