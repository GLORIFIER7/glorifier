import React, { useEffect, useState } from 'react';
import { BrainCircuit, ShieldCheck, UserCheck, Bot, RefreshCw } from 'lucide-react';

type Agent = { id: string; role: string; authority: string };
type Status = {
  role: string;
  version: string;
  status: string;
  authority: Record<string, boolean>;
  chainOfCommand: string[];
  agents: Agent[];
  operatingPrinciples: string[];
  generatedAt: string;
};

export const AICeoControl: React.FC = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/ceo');
      if (!response.ok) throw new Error('AI CEO status unavailable');
      setStatus(await response.json());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400"><BrainCircuit className="h-6 w-6" /></div>
              <div>
                <h2 className="text-xl font-bold text-white">GLORIFIER AI CEO</h2>
                <p className="text-sm text-slate-400">Executive orchestration layer above the AI agent fleet</p>
              </div>
            </div>
          </div>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <UserCheck className="mb-2 h-5 w-5 text-emerald-400" />
            <div className="text-xs uppercase tracking-wide text-slate-500">Final authority</div>
            <div className="mt-1 font-semibold text-emerald-300">Human Owner</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
            <ShieldCheck className="mb-2 h-5 w-5 text-cyan-400" />
            <div className="text-xs uppercase tracking-wide text-slate-500">Production deployment</div>
            <div className="mt-1 font-semibold text-white">Human-approved only</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
            <Bot className="mb-2 h-5 w-5 text-violet-400" />
            <div className="text-xs uppercase tracking-wide text-slate-500">Agent fleet</div>
            <div className="mt-1 font-semibold text-white">Gemini · Codex · GPT · Specialists</div>
          </div>
        </div>
      </div>

      {status && (
        <>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-300">Chain of command</h3>
            <div className="flex flex-wrap items-center gap-2">
              {status.chainOfCommand.map((item, index) => (
                <React.Fragment key={item}>
                  <span className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">{item}</span>
                  {index < status.chainOfCommand.length - 1 && <span className="text-slate-600">→</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {status.agents.map(agent => (
              <div key={agent.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-white capitalize">{agent.id}</h3>
                  <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase text-slate-400">{agent.authority}</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{agent.role}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">Guardrails</h3>
            <ul className="grid gap-2 md:grid-cols-2">
              {status.operatingPrinciples.map(item => <li key={item} className="text-sm text-slate-400">• {item}</li>)}
            </ul>
          </div>
        </>
      )}

      {!status && !loading && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">AI CEO status endpoint is unavailable. The governance policy remains defined in the application.</div>
      )}
    </section>
  );
};
