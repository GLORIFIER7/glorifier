import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, CircleAlert, ExternalLink, Globe2, LockKeyhole, RefreshCw } from 'lucide-react';

type Integration = {
  id: string;
  name: string;
  category: string;
  status: string;
  detail: string;
  publicUrl: string;
};

type Registry = {
  ok: boolean;
  generatedAt: string;
  policy: {
    secretsExposed: boolean;
    privateCredentialsReturned: boolean;
    coreInfrastructureIndependentOfGoogleCloud: boolean;
  };
  integrations: Integration[];
};

const statusLabel: Record<string, string> = {
  connected: 'Connected',
  configured: 'Configured',
  ready: 'Ready',
  available: 'Available',
  'public-monitoring': 'Public monitoring',
  planned: 'Planned',
  optional: 'Optional',
  'needs-config': 'Needs configuration'
};

export const IntegrationControl: React.FC = () => {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/integrations', { cache: 'no-store' });
      if (!response.ok) throw new Error('Integration registry unavailable');
      setRegistry(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load integration registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Global Integration Control</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">One control surface for public web presence, code, AI, data and infrastructure integrations.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
          <LockKeyhole className="w-4 h-4" /> Credential isolation
        </div>
        <p className="text-xs text-slate-400 mt-1">The registry exposes integration status only. API keys, tokens, database URLs and private credentials are never returned to the browser.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300">{error}</div>
      )}

      {registry && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs text-slate-500 uppercase">Integrations</div>
              <div className="text-2xl font-bold text-white mt-1">{registry.integrations.length}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs text-slate-500 uppercase">Credentials exposed</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{registry.policy.secretsExposed ? 'Yes' : 'No'}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs text-slate-500 uppercase">GCP dependency</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{registry.policy.coreInfrastructureIndependentOfGoogleCloud ? 'Optional' : 'Required'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {registry.integrations.map((item) => {
              const active = ['connected', 'configured', 'public-monitoring'].includes(item.status);
              return (
                <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {active ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <CircleAlert className="w-4 h-4 text-amber-400 shrink-0" />}
                      <h3 className="font-semibold text-white">{item.name}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">{statusLabel[item.status] || item.status}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{item.detail}</p>
                    <div className="text-[10px] text-slate-600 mt-2 uppercase tracking-wider">{item.category}</div>
                  </div>
                  <a href={item.publicUrl} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-emerald-400 shrink-0" aria-label={`Open ${item.name}`}>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] text-slate-600 flex items-center gap-1">
            <Activity className="w-3 h-3" /> Registry refreshed {new Date(registry.generatedAt).toLocaleString()}
          </div>
        </>
      )}
    </section>
  );
};
