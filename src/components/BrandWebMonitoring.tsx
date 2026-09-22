import React, { useEffect, useState } from 'react';
import { Globe2, ShieldCheck, Search, Bell, Plus, RefreshCw, ExternalLink } from 'lucide-react';

type Term={id:string;term:string;termType:string;status:string};
type Observation={id:string;term_id:string;source_name:string;source_url:string;observedAt:string;matched_text:string;classification:string;confidence:number;review_status:string};
type Alert={id:string;severity:string;reason:string;createdAt:string;action_status:string};

export const BrandWebMonitoring: React.FC = () => {
  const [terms,setTerms]=useState<Term[]>([]);
  const [observations,setObservations]=useState<Observation[]>([]);
  const [alerts,setAlerts]=useState<Alert[]>([]);
  const [loading,setLoading]=useState(false);
  const [newTerm,setNewTerm]=useState('');

  const load=async()=>{setLoading(true);try{
    const [t,o,a]=await Promise.all([fetch('/api/brand-monitor/terms'),fetch('/api/brand-monitor/observations'),fetch('/api/brand-monitor/alerts')]);
    if(t.ok)setTerms(await t.json()); if(o.ok)setObservations(await o.json()); if(a.ok)setAlerts(await a.json());
  }finally{setLoading(false)}};
  useEffect(()=>{void load()},[]);

  const add=async()=>{if(!newTerm.trim())return; const r=await fetch('/api/brand-monitor/terms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({term:newTerm.trim(),termType:'phrase'})}); if(r.ok){setNewTerm('');void load()}};
  const scan=async()=>{await fetch('/api/brand-monitor/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})});void load()};

  return <div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div><div className="flex items-center gap-2"><Globe2 className="w-6 h-6 text-cyan-400"/><h2 className="text-2xl font-bold text-white">GLORIFIER Brand/Web Monitoring Bot</h2><span className="px-2 py-1 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">24/7 WATCH</span></div>
      <p className="text-sm text-slate-400 mt-1">Public-source monitoring, evidence preservation, and human review routing.</p></div>
      <button onClick={scan} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold"><Search className="w-4 h-4"/>Run scan</button>
    </div>
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200"><ShieldCheck className="inline w-4 h-4 mr-1"/> The bot records public observations; it does not automatically claim ownership, send legal threats, or issue takedowns. Potential infringement is routed for human/legal review.</div>
    <div className="grid md:grid-cols-3 gap-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><div className="text-xs text-slate-500">Monitored terms</div><div className="text-3xl font-bold">{terms.length}</div></div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><div className="text-xs text-slate-500">Evidence observations</div><div className="text-3xl font-bold">{observations.length}</div></div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><div className="text-xs text-slate-500">Open alerts</div><div className="text-3xl font-bold">{alerts.filter(a=>a.action_status==='pending').length}</div></div>
    </div>
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2 mb-3"><Plus className="w-4 h-4"/><h3 className="font-semibold">Brand / phrase registry</h3></div>
      <div className="flex gap-2"><input value={newTerm} onChange={e=>setNewTerm(e.target.value)} placeholder="Add a phrase, product, domain, or handle" className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm"/><button onClick={add} className="px-3 rounded-lg bg-slate-800 hover:bg-slate-700">Add</button></div>
      <div className="flex flex-wrap gap-2 mt-3">{terms.map(t=><span key={t.id} className="px-2.5 py-1 rounded-full bg-slate-800 text-xs">{t.term}</span>)}</div>
    </div>
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <div className="p-4 flex items-center justify-between"><h3 className="font-semibold flex items-center gap-2"><Bell className="w-4 h-4"/>Recent evidence</h3><button onClick={load} className="text-slate-400 hover:text-white"><RefreshCw className={loading?'w-4 h-4 animate-spin':'w-4 h-4'}/></button></div>
      {observations.length===0?<div className="p-8 text-center text-sm text-slate-500">No observations yet. The scheduled worker will populate evidence from permitted public sources when connectors are configured.</div>:
      <div className="divide-y divide-slate-800">{observations.map(o=><div key={o.id} className="p-4 flex items-start justify-between gap-4"><div><div className="text-sm font-semibold">{o.matched_text}</div><div className="text-xs text-slate-500">{o.source_name} · {new Date(o.observedAt).toLocaleString()}</div><div className="text-xs text-slate-400 mt-1">{o.classification} · {Math.round(o.confidence*100)}% confidence</div></div><a href={o.source_url} target="_blank" rel="noreferrer" className="text-cyan-400"><ExternalLink className="w-4 h-4"/></a></div>)}</div>}
    </div>
  </div>;
};
