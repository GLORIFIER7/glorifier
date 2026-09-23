import React, { useEffect, useState } from 'react';
import { Activity, BrainCircuit, ExternalLink, FileSearch, RefreshCw, ShieldCheck } from 'lucide-react';

type Evidence = { id: string; source: string; title: string; url: string; publishedAt?: string; summary: string; };
type Analysis = { provider: string; model: string; output: string; status: string; };
type Report = {
  id: string; generatedAt: string; windowHours: number; sourceCount: number; evidenceCount: number;
  executiveSummary: string; themes: Array<{theme: string; evidenceIds: string[]; summary: string;}>;
  disagreements: string[]; evidence: Evidence[]; analyses: Analysis[];
};

export const IntelligenceHub: React.FC = () => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (refresh = false) => {
    setLoading(true); setError('');
    try {
      const response = await fetch(refresh ? '/api/intelligence/report?refresh=true' : '/api/intelligence/report', { cache: 'no-store' });
      if (!response.ok) throw new Error('Intelligence service unavailable');
      setReport(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load intelligence report');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  return (
    <section className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold text-white">GLORIFIER Intelligence Hub</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">Public-web evidence aggregation + cross-model synthesis + auditable evidence trails.</p>
        </div>
        <button onClick={() => void load(true)} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold">
          <RefreshCw className={loading ? 'animate-spin' : ''} /> Generate fresh report
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300">{error}</div>}

      {!report && loading && <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">Collecting public sources and asking available AI models to cross-check them…</div>}

      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Sources', report.sourceCount],
              ['Evidence', report.evidenceCount],
              ['AI analyses', report.analyses.filter(a => a.status === 'completed').length],
              ['Disagreements', report.disagreements.length]
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
                <div className="text-2xl font-bold text-white mt-1">{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><ShieldCheck className="w-4 h-4" /> Executive synthesis</div>
            <p className="text-sm text-slate-200 mt-2 leading-6">{report.executiveSummary}</p>
            <div className="text-[10px] text-slate-500 mt-3">Generated {new Date(report.generatedAt).toLocaleString()} · {report.windowHours}h evidence window</div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white"><FileSearch className="w-4 h-4 text-cyan-400" /> Themes</div>
              <div className="space-y-3 mt-4">
                {report.themes.slice(0, 8).map(theme => (
                  <div key={theme.theme} className="border-l-2 border-emerald-500/50 pl-3">
                    <div className="text-sm font-semibold text-slate-200">{theme.theme}</div>
                    <div className="text-xs text-slate-400 mt-1">{theme.summary}</div>
                    <div className="text-[10px] text-slate-600 mt-1">{theme.evidenceIds.length} linked evidence item(s)</div>
                  </div>
                ))}
                {report.themes.length === 0 && <div className="text-xs text-slate-500">No structured themes returned.</div>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white"><BrainCircuit className="w-4 h-4 text-purple-400" /> Cross-model analysis</div>
              <div className="space-y-3 mt-4">
                {report.analyses.map(analysis => (
                  <div key={analysis.provider} className="rounded-lg bg-slate-950/70 border border-slate-800 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-200">{analysis.provider}</span>
                      <span className="text-[10px] text-slate-500">{analysis.model}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 whitespace-pre-wrap line-clamp-8">{analysis.output}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {report.disagreements.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
              <div className="text-sm font-semibold text-amber-300">Model/source disagreements</div>
              <ul className="mt-3 space-y-2 text-xs text-slate-300 list-disc pl-5">{report.disagreements.map(item => <li key={item}>{item}</li>)}</ul>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2 text-sm font-semibold text-white"><Activity className="w-4 h-4 text-emerald-400" /> Evidence ledger</div>
            <div className="divide-y divide-slate-800">
              {report.evidence.slice(0, 20).map(item => (
                <div key={item.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-emerald-400">{item.source}</div>
                    <div className="text-sm font-semibold text-slate-200 mt-0.5">{item.title}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">{item.summary}</div>
                    <div className="text-[10px] text-slate-600 mt-1">Evidence ID: {item.id}</div>
                  </div>
                  <a href={item.url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-emerald-400 shrink-0" aria-label="Open source"><ExternalLink className="w-4 h-4" /></a>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
};
