import type { ComputeResource } from './types';

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function listComputeResources(): ComputeResource[] {
  const resources: ComputeResource[] = [
    {
      id: 'local-cpu',
      name: 'GLORIFIER CPU Worker',
      kind: 'cpu',
      provider: 'Railway / Node.js',
      status: 'ready',
      concurrency: Math.max(1, Number(env('GLORIFIER_CPU_CONCURRENCY') || 2)),
      models: [],
      capabilities: ['batch', 'data', 'orchestration', 'health-monitoring']
    }
  ];

  const ollama = env('OLLAMA_BASE_URL');
  if (ollama) {
    resources.push({
      id: 'ollama-gpu',
      name: 'Self-Hosted Ollama Inference',
      kind: 'gpu',
      provider: 'Self-hosted / Ollama',
      status: 'ready',
      endpoint: ollama,
      concurrency: Math.max(1, Number(env('OLLAMA_CONCURRENCY') || 2)),
      models: (env('OLLAMA_MODELS') || '').split(',').map(v => v.trim()).filter(Boolean),
      capabilities: ['llm-inference', 'code', 'reasoning', 'local-data']
    });
  }

  const worker = env('GLORIFIER_COMPUTE_WORKER_URL');
  if (worker) {
    resources.push({
      id: 'remote-gpu-worker',
      name: 'External GPU Worker',
      kind: 'worker',
      provider: env('GLORIFIER_COMPUTE_WORKER_PROVIDER') || 'External GPU',
      status: 'ready',
      endpoint: worker,
      concurrency: Math.max(1, Number(env('GLORIFIER_WORKER_CONCURRENCY') || 4)),
      models: (env('GLORIFIER_WORKER_MODELS') || '').split(',').map(v => v.trim()).filter(Boolean),
      capabilities: ['llm-inference', 'batch', 'embedding', 'code', 'gpu']
    });
  }

  return resources;
}
