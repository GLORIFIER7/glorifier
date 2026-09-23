export type ComputeResourceKind = 'cpu' | 'gpu' | 'inference' | 'worker';

export interface ComputeResource {
  id: string;
  name: string;
  kind: ComputeResourceKind;
  provider: string;
  status: 'ready' | 'degraded' | 'offline';
  endpoint?: string;
  models: string[];
  concurrency: number;
  capabilities: string[];
}

export interface ComputeTask {
  id: string;
  objective: string;
  taskType: 'inference' | 'batch' | 'embedding' | 'code' | 'data';
  preferredModel?: string;
  priority?: number;
}

export interface ComputeTaskResult {
  taskId: string;
  resourceId: string;
  model?: string;
  status: 'completed' | 'failed' | 'queued';
  text?: string;
  latencyMs?: number;
  error?: string;
}

export interface ComputeSnapshot {
  resources: ComputeResource[];
  queuedTasks: number;
  activeTasks: number;
  completedTasks: number;
  failedTasks: number;
  capacity: {
    totalConcurrency: number;
    readyConcurrency: number;
    gpuResources: number;
    inferenceResources: number;
  };
}
