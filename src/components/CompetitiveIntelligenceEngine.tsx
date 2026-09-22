import React, { useEffect, useState } from 'react';
import { Activity, Building2, CheckCircle2, RefreshCw, ShieldCheck, Target, Zap } from 'lucide-react';
import { COMPETITOR_PROFILES, COMPETITIVE_DIMENSIONS } from '../data/competitiveIntelligence';

type Signal = {
  id: string;
  competitor: string;
  dimension: string;
  status: 'observed' | 'connector_ready';
  summary: string;
  evidence: string[];
  opportunity: string;
};

type Report = {
  generatedAt: string;
  executiveSummary: string;
  signals: Signal[];
  counts: { competitors: number; observed: number; connectorReady: number; opportunities: number };
};

export const CompetitiveIntelligenceEngine: React.FC = () => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const collect = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/business-intelligence/competitive');
      if (!res.ok) throw new Error(`Competitive intelligence HTTP ${res.status}`);
      setReport(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Competitive intelligence collection failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void collect(); }, []);

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-slate-900 border border-slate-800 p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">GLORIFIER Competitive Intelligence Engine</h2>
              <span className="text-[9px] uppercase px-2 py-1 rounded-full border border-cyan-500/30 text-cyan-300 bg-cyan-500/10">CIE</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Tracks documented competitor changes and converts verified observations into business-opportunity signals for the GLORIFIER AI CEO.
            </p>
          </div>
          <button onClick={() => void collect()} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Analyzing…' : 'Collect intelligence'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            ['Competitors', report?.counts.competitors ?? COMPETITOR_PROFILES.length],
            ['Observed', report?.counts.observed ?? 0],
            ['Connector-ready', report?.counts.connectorReady ?? COMPETITOR_PROFILES.length],
            ['Opportunity signals', report?.counts.opportunities ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg bg-slate-950 border border-slate-800 p-3">
              <div className="text-[9px] uppercase text-slate-500">{label}</div>
              <div className="text-lg font-bold text-slate-100 mt-1">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200">
          <ShieldCheck className="inline w-3.5 h-3.5 mr-1" />
          CIE uses public/business-relevant information only. It does not ingest private competitor data or bypass access controls.
        </div>
        {error && <div className="mt-3 text-xs text-rose-300">{error}</div>}
        {report?.executiveSummary && (
          <div className="mt-4 rounded-lg bg-slate-950 border border-slate-800 p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">AI CEO opportunity brief</div>
            <p className="text-sm text-slate-200 mt-1">{report.executiveSummary}</p>
            <div className="text-[10px] text-slate-600 mt-2">Generated {new Date(report.generatedAt).toLocaleString()}</div>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-slate-900/80 border border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Competitor monitoring matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-500 border-b border-slate-800">
              <th className="py-2 pr-4">Company</th><th className="py-2 pr-4">Overlap</th><th className="py-2 pr-4">Coverage</th><th className="py-2">Status</th>
            </tr></thead>
            <tbody>
              {COMPETITOR_PROFILES.map((c) => (
                <tr key={c.id} className="border-b border-slate-900">
                  <td className="py-3 pr-4 font-semibold text-slate-200">{c.company}</td>
                  <td className="py-3 pr-4 text-slate-400">{c.overlap}</td>
                  <td className="py-3 pr-4 text-slate-400">{c.dimensions.length}/{COMPETITIVE_DIMENSIONS.length} dimensions</td>
                  <td className="py-3"><span className="inline-flex items-center gap-1 text-slate-300"><CheckCircle2 className="w-3.5 h-3.5" />{c.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(report?.signals ?? []).map((s) => (
          <article key={s.id} className="rounded-xl bg-slate-900/80 border border-slate-800 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-cyan-400" /><h3 className="text-sm font-bold text-white">{s.competitor}</h3></div>
              <span className="text-[9px] uppercase text-slate-500">{s.dimension}</span>
            </div>
            <p className="text-xs text-slate-300 mt-3">{s.summary}</p>
            <div className="mt-3 space-y-1">{s.evidence.map((e) => <div key={e} className="text-[11px] text-slate-500">• {e}</div>)}</div>
            <div className="mt-4 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
              <div className="text-[9px] uppercase text-cyan-300">Opportunity signal</div>
              <div className="text-xs text-slate-200 mt-1">{s.opportunity}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
