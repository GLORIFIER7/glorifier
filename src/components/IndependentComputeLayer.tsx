import React, { useCallback, useEffect, useState } from 'react';
import { Cpu, Gauge, RefreshCw, Server, Zap } from 'lucide-react';

type Resource = {
  id: string; name: string; kind: string; provider: string; status: string;
  endpoint?: string; models: string[]; concurrency: number; capabilities: string[];
};
type Snapshot = {
  resources: Resource[]; queuedTasks: number; activeTasks: number; completedTasks: number; failedTasks: number;
  capacity: { totalConcurrency: number; readyConcurrency: number; gpuResources: number; inferenceResources: number };
};

export const IndependentComputeLayer: React.FC = () => {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [objective, setObjective] = useState('Run an independent local-model production test');
  const [model, setModel] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/compute');
      if (res.ok) setSnapshot(await res.json());
    } catch {}
  }, []);

  useEffect(() => { refresh(); const timer = setInterval(refresh, 15000); return () => clearInterval(timer); }, [refresh]);

  const runTask = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/compute/task', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective, preferredModel: model || undefined, taskType: 'inference' })
      });
      setResult(await res.json());
      await refresh();
    } finally { setLoading(false); }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-cyan-300"><Cpu className="w-5 h-5" /><span className="font-bold">Independent Compute Layer</span></div>
            <p className="mt-1 text-sm text-slate-400">Provider-neutral compute routing. OpenAI and Gemini are optional intelligence providers, not required compute dependencies.</p>
          </div>
          <button onClick={refresh} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      {snapshot && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Ready concurrency', snapshot.capacity.readyConcurrency, Gauge],
              ['GPU resources', snapshot.capacity.gpuResources, Zap],
              ['Inference resources', snapshot.capacity.inferenceResources, Server],
              ['Completed tasks', snapshot.completedTasks, Cpu]
            ].map(([label, value, Icon]: any) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <Icon className="w-4 h-4 text-cyan-400 mb-2" />
                <div className="text-xl font-bold">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 font-semibold">Compute resources</div>
            <div className="divide-y divide-slate-800">
              {snapshot.resources.map(resource => (
                <div key={resource.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-200">{resource.name}</div>
                    <div className="text-xs text-slate-500">{resource.provider} · {resource.kind} · concurrency {resource.concurrency}</div>
                    <div className="text-xs text-slate-400 mt-1">{resource.capabilities.join(' · ')}</div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${resource.status === 'ready' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-300 border-amber-500/30 bg-amber-500/10'}`}>{resource.status.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="font-semibold">Run independent inference</h3>
            <p className="text-xs text-slate-500 mt-1">Requires OLLAMA_BASE_URL + OLLAMA_MODELS or an external compute worker URL for real model inference.</p>
            <div className="grid gap-3 mt-4">
              <input value={model} onChange={e => setModel(e.target.value)} placeholder="Preferred model (optional)" className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm outline-none focus:border-cyan-500/50" />
              <textarea value={objective} onChange={e => setObjective(e.target.value)} rows={3} className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm outline-none focus:border-cyan-500/50" />
              <button disabled={loading} onClick={runTask} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{loading ? 'Running…' : 'Run on independent compute'}</button>
            </div>
            {result && <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-xs text-slate-300 overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
          </div>
        </>
      )}
    </section>
  );
};
