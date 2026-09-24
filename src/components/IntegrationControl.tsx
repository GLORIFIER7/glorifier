import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, CircleAlert, ExternalLink, Globe2, LockKeyhole, RefreshCw } from 'lucide-react';
import { IntelligenceHub } from './IntelligenceHub';

type CollaborationProvider = { id: string; name: string; category: string; capabilities: string[]; status: string; authorized: boolean; requiresHumanApproval: boolean; connectionId: string | null; scopes: string[]; };

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
  const [collaboration, setCollaboration] = useState<CollaborationProvider[]>([]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/integrations', { cache: 'no-store' });
      if (!response.ok) throw new Error('Integration registry unavailable');
      setRegistry(await response.json());
      const collaborationResponse = await fetch('/api/collaboration/status', { cache: 'no-store' });
      if (collaborationResponse.ok) setCollaboration((await collaborationResponse.json()).providers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load integration registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <section className="space-y-10">
      <IntelligenceHub />
      <div className="border-t border-slate-800 pt-8" />
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

      {collaboration.length > 0 && (\n        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">\n          <div className="flex items-center gap-2">\n            <Globe2 className="w-5 h-5 text-indigo-300" />\n            <h3 className="font-semibold text-white">Global Synthesis & Collaboration</h3>\n          </div>\n          <p className="text-xs text-slate-400 mt-1">External AI and platform ecosystems use the same connection, authorization and audit model.</p>\n          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">\n            {collaboration.map((provider) => (\n              <div key={provider.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">\n                <div className="flex items-center justify-between gap-3">\n                  <span className="font-semibold text-white">{provider.name}</span>\n                  <span className="text-[10px] rounded-full px-2 py-1 bg-slate-800 text-slate-300">{provider.authorized ? 'Authorized' : 'Discovered / permission-gated'}</span>\n                </div>\n                <div className="text-[10px] text-slate-500 uppercase mt-2">{provider.category}</div>\n                <div className="flex flex-wrap gap-1 mt-3">{provider.capabilities.map((cap) => <span key={cap} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400">{cap}</span>)}</div>\n                <div className="text-[10px] text-emerald-400 mt-3">Human approval required for consequential actions</div>\n              </div>\n            ))}\n          </div>\n        </div>\n      )}\n\n      {registry && (
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
