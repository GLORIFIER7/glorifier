import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, Clock3, Database, Eye, FileCheck2,
  GitBranch, Play, RefreshCw, ShieldCheck, WalletCards, Workflow
} from 'lucide-react';

type Json = Record<string, any>;

const stages = ['OBSERVED','EVIDENCE_PENDING','QUALIFIED','AUTHORIZATION_PENDING','EXECUTION_READY','IN_PROGRESS','DELIVERY_PENDING','ACCEPTANCE_PENDING','SETTLEMENT_PENDING','RESOLVED','REJECTED'];

async function getJson(url: string, init?: RequestInit): Promise<Json> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || data?.details || `Request failed: ${response.status}`);
  return data;
}

function StatCard({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-emerald-400" />
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

export const GlobalCollaborationDashboard: React.FC = () => {
  const [status, setStatus] = useState<Json | null>(null);
  const [discovery, setDiscovery] = useState<Json | null>(null);
  const [bounties, setBounties] = useState<Json | null>(null);
  const [resolution, setResolution] = useState<Json | null>(null);
  const [revenue, setRevenue] = useState<Json | null>(null);
  const [policy, setPolicy] = useState<Json | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.allSettled([
        getJson('/api/global-collaboration/status'),
        getJson('/api/opportunities/24x7/status'),
        getJson('/api/opportunities/github-bounties?limit=25'),
        getJson('/api/global-resolution/cases?limit=100'),
        getJson('/api/economic-os/verified-revenue'),
        getJson('/api/global-collaboration/policy')
      ]);
      const [s,d,b,r,v,p] = results;
      if (s.status === 'fulfilled') setStatus(s.value);
      if (d.status === 'fulfilled') setDiscovery(d.value);
      if (b.status === 'fulfilled') setBounties(b.value);
      if (r.status === 'fulfilled') setResolution(r.value);
      if (v.status === 'fulfilled') setRevenue(v.value);
      if (p.status === 'fulfilled') setPolicy(p.value);
      const failed = results.find(x => x.status === 'rejected') as PromiseRejectedResult | undefined;
      if (failed) setError(failed.reason?.message || 'Some operational data is unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 60000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const runCycle = async () => {
    setRunning(true);
    setError('');
    try {
      await getJson('/api/global-collaboration/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'human-owner-command-center', limit: 200 })
      });
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Global collaboration cycle failed');
    } finally {
      setRunning(false);
    }
  };

  const caseRows = useMemo(() => Array.isArray(resolution?.cases) ? resolution.cases : [], [resolution]);
  const bountyRows = useMemo(() => Array.isArray(bounties?.opportunities) ? bounties.opportunities : [], [bounties]);
  const resolved = caseRows.filter(c => c.stage === 'RESOLVED').length;
  const awaitingAuth = caseRows.filter(c => c.stage === 'AUTHORIZATION_PENDING').length;
  const evidencePending = caseRows.filter(c => c.stage === 'EVIDENCE_PENDING').length;
  const verifiedRevenue = revenue?.verifiedRevenue ?? revenue?.revenue ?? revenue?.summary?.verifiedRevenue ?? 0;

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/20 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-[0.2em]">
              <Workflow className="h-4 w-4" /> Global Collaboration Control Plane
            </div>
            <h2 className="mt-2 text-2xl font-bold text-white">GLORIFIER AI CEO Operations</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              One operational surface for global discovery, evidence, specialist review, authorization,
              resolution and the verified-revenue boundary.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-600 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={runCycle} disabled={running} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">
              <Play className="h-4 w-4" /> {running ? 'Running…' : 'Run collaboration cycle'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mr-2 inline h-4 w-4" /> {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Activity} label="Collaboration" value={status?.status || 'ACTIVE'} detail={status?.version || 'GCR-1.0'} />
        <StatCard icon={Eye} label="Evidence pending" value={evidencePending} detail="Requires verification" />
        <StatCard icon={ShieldCheck} label="Authorization queue" value={awaitingAuth} detail="Human authority boundary" />
        <StatCard icon={CheckCircle2} label="Resolved cases" value={resolved} detail="External acceptance + settlement evidence" />
        <StatCard icon={WalletCards} label="Verified revenue" value={String(verifiedRevenue)} detail="Ledger evidence only" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h3 className="font-semibold text-white">Opportunity & evidence queue</h3>
              <p className="text-xs text-slate-500">{discovery?.findingsObserved ?? discovery?.findings?.length ?? 0} observed findings</p>
            </div>
            <Database className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="max-h-80 overflow-auto p-3">
            {bountyRows.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No bounty records returned.</div>
            ) : bountyRows.slice(0, 12).map((b: any) => (
              <div key={b.id} className="border-b border-slate-900 px-2 py-3 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-200">{b.title || 'Untitled opportunity'}</div>
                    <div className="mt-1 text-xs text-slate-500">{b.repository || b.sourceUrl || 'Source recorded'}</div>
                  </div>
                  <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-400">{b.stage || 'OBSERVED'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h3 className="font-semibold text-white">Resolution cases</h3>
              <p className="text-xs text-slate-500">{caseRows.length} cases currently exposed</p>
            </div>
            <Workflow className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="max-h-80 overflow-auto p-3">
            {caseRows.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No resolution cases returned.</div>
            ) : caseRows.slice(0, 12).map((c: any) => (
              <div key={c.id} className="border-b border-slate-900 px-2 py-3 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-200">{c.title || c.sourceTitle || 'Resolution case'}</div>
                    <div className="mt-1 text-xs text-slate-500">{c.category || 'global'} · {c.estimatedValue ?? 'value unverified'}</div>
                  </div>
                  <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-400">{c.stage}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><GitBranch className="h-4 w-4 text-cyan-400" /> 24/7 Discovery</div>
          <div className="mt-3 space-y-2 text-xs text-slate-400">
            <div className="flex justify-between"><span>Continuous</span><span className="text-emerald-400">Enabled</span></div>
            <div className="flex justify-between"><span>Sources scanned</span><span>{discovery?.sourcesScanned ?? '—'}</span></div>
            <div className="flex justify-between"><span>Findings observed</span><span>{discovery?.findingsObserved ?? '—'}</span></div>
            <div className="flex justify-between"><span>Economic truth</span><span className="text-amber-300">NOT VERIFIED</span></div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><FileCheck2 className="h-4 w-4 text-emerald-400" /> Evidence state</div>
          <div className="mt-3 text-xs text-slate-400">
            AI-generated content cannot become evidence merely because a model produced it. External source evidence controls acceptance and settlement state.
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><Clock3 className="h-4 w-4 text-amber-400" /> Authorization gate</div>
          <div className="mt-3 text-xs text-slate-400">
            Consequential, irreversible, contractual, access and financial actions remain approval-gated.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-slate-300">
        <strong className="text-amber-300">Economic truth boundary:</strong> estimated opportunity value, pipeline value,
        advertised bounties, invoices, account balances and model estimates are never displayed as verified revenue.
        Verified revenue requires qualifying external settlement evidence.
        {policy?.policy?.nonFabrication ? <span className="block mt-2 text-xs text-slate-500">{policy.policy.nonFabrication}</span> : null}
      </div>

      <div className="text-[11px] text-slate-600">
        Resolution stages: {stages.join(' → ')}
      </div>
    </section>
  );
};
