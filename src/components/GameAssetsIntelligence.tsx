import React, { useEffect, useMemo, useState } from 'react';
import { Gamepad2, Search, ShieldCheck, ExternalLink, RefreshCw, Image, Box, Music2, Sparkles } from 'lucide-react';

type Asset = {
  id: string; title: string; game: string; assetType: string; sourceName: string;
  sourceUrl: string; license: string; status: string; observedAt: string;
};

const seed: Asset[] = [
  { id:'ga-1', title:'Open game UI icon set', game:'Open-source sample', assetType:'2D / UI', sourceName:'Public asset repository', sourceUrl:'https://opengameart.org/', license:'Verify source license', status:'indexed', observedAt:new Date().toISOString() },
  { id:'ga-2', title:'Community character model', game:'Open-source sample', assetType:'3D model', sourceName:'Public asset repository', sourceUrl:'https://kenney.nl/assets', license:'Verify source license', status:'indexed', observedAt:new Date().toISOString() },
];

export const GameAssetsIntelligence: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>(seed);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Connector-ready');

  const load = async () => {
    setStatus('Refreshing…');
    try {
      const res = await fetch('/api/game-assets');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.assets) && data.assets.length) setAssets(data.assets);
      }
      setStatus('Connected');
    } catch { setStatus('Connector-ready'); }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => assets.filter(a =>
    [a.title,a.game,a.assetType,a.sourceName,a.license].join(' ').toLowerCase().includes(query.toLowerCase())
  ), [assets, query]);

  const counts = useMemo(() => ({
    total: assets.length,
    images: assets.filter(a => /2d|image|texture|sprite|ui/i.test(a.assetType)).length,
    models: assets.filter(a => /3d|model|mesh/i.test(a.assetType)).length,
    audio: assets.filter(a => /audio|music|sound/i.test(a.assetType)).length,
  }), [assets]);

  return <section className="space-y-6">
    <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-widest"><Gamepad2 className="w-4 h-4"/> Game Asset Intelligence</div>
          <h2 className="mt-2 text-2xl font-bold text-white">Games & Assets across public sources</h2>
          <p className="mt-2 text-sm text-slate-400 max-w-3xl">Index public game-asset evidence, metadata, provenance and licensing signals. GLORIFIER stores references and permitted metadata rather than copying restricted game files.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold hover:border-cyan-500/50"><RefreshCw className="w-4 h-4"/> Scan connectors</button>
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>{status}</div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[['Indexed assets',counts.total,Gamepad2],['2D / images',counts.images,Image],['3D / models',counts.models,Box],['Audio',counts.audio,Music2]].map(([label,value,Icon]: any) =>
        <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><Icon className="w-4 h-4 text-cyan-400"/><div className="mt-3 text-2xl font-bold">{value}</div><div className="text-xs text-slate-400">{label}</div></div>
      )}
    </div>

    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="relative"><Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search games, assets, types, sources or licenses…" className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-cyan-500"/></div>
    </div>

    <div className="grid gap-3">
      {filtered.map(asset => <article key={asset.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-cyan-400"/><h3 className="font-semibold">{asset.title}</h3></div>
            <p className="mt-1 text-sm text-slate-400">{asset.game} • {asset.assetType} • {asset.sourceName}</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-300"><ShieldCheck className="w-3 h-3"/>{asset.license}</span>
            <a href={asset.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200">Source <ExternalLink className="w-3 h-3"/></a>
          </div>
        </div>
      </article>)}
      {!filtered.length && <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">No matching assets.</div>}
    </div>
  </section>;
};
