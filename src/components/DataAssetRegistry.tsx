import React, { useMemo, useState } from 'react';
import { Database, ShieldCheck, ShieldAlert, Lock, Search, CheckCircle2, CircleHelp } from 'lucide-react';
import { DATA_ASSET_REGISTRY, DataAsset } from '../data/dataAssetRegistry';

const statusLabel: Record<DataAsset['commercializationStatus'], string> = {
  eligible_after_review: 'Eligible after review',
  blocked: 'Blocked',
  research_only: 'Research only',
  not_ready: 'Not ready'
};

export const DataAssetRegistry: React.FC = () => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | DataAsset['origin']>('all');

  const assets = useMemo(() => DATA_ASSET_REGISTRY.filter(asset => {
    const matchesFilter = filter === 'all' || asset.origin === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || [asset.name, asset.source, asset.category, asset.productIdea].some(v => v.toLowerCase().includes(q));
    return matchesFilter && matchesQuery;
  }), [query, filter]);

  const counts = {
    total: DATA_ASSET_REGISTRY.length,
    blocked: DATA_ASSET_REGISTRY.filter(a => a.commercializationStatus === 'blocked').length,
    demo: DATA_ASSET_REGISTRY.filter(a => a.origin === 'demo').length,
    ready: DATA_ASSET_REGISTRY.filter(a => a.commercializationStatus === 'eligible_after_review').length
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              GLORIFIER Data Asset Registry
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Provenance and commercialization gate for every dataset. Assets are not considered saleable until origin, rights, consent, privacy controls, and permitted use are verified.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 min-w-[320px]">
            {[
              ['Assets', counts.total],
              ['Demo', counts.demo],
              ['Blocked', counts.blocked],
              ['Eligible', counts.ready]
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-2 text-center">
                <div className="text-sm font-bold text-white">{value}</div>
                <div className="text-[9px] uppercase text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search assets, sources, products..." className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300">
            <option value="all">All origins</option>
            <option value="demo">Demo</option>
            <option value="real_app_activity">Real app activity</option>
            <option value="connected_integration">Connected integration</option>
            <option value="imported">Imported</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {assets.map(asset => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
        {assets.length === 0 && <div className="rounded-xl border border-slate-800 p-8 text-center text-sm text-slate-500">No assets match this filter.</div>}
      </div>
    </div>
  );
};

const AssetCard: React.FC<{ asset: DataAsset }> = ({ asset }) => {
  const blocked = asset.commercializationStatus === 'blocked';
  const verified = asset.consentStatus === 'verified';
  return (
    <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-white">{asset.name}</h3>
            <span className="text-[9px] uppercase px-2 py-1 rounded-full border border-slate-700 text-slate-400">{asset.origin.replaceAll('_', ' ')}</span>
            <span className={`text-[9px] uppercase px-2 py-1 rounded-full border ${blocked ? 'border-rose-500/30 text-rose-300 bg-rose-500/10' : 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'}`}>
              {statusLabel[asset.commercializationStatus]}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{asset.source}</div>
          <p className="text-xs text-slate-300 mt-3 max-w-4xl">{asset.evidence}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] min-w-[340px]">
          <Meta icon={asset.consentStatus === 'verified' ? CheckCircle2 : CircleHelp} label="Consent" value={asset.consentStatus.replaceAll('_', ' ')} />
          <Meta icon={asset.sensitivity === 'restricted' ? ShieldAlert : ShieldCheck} label="Sensitivity" value={asset.sensitivity} />
          <Meta icon={asset.anonymizationStatus === 'anonymized' ? ShieldCheck : Lock} label="Privacy" value={asset.anonymizationStatus.replaceAll('_', ' ')} />
          <Meta icon={Database} label="Category" value={asset.category} />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
        <div><div className="text-[10px] uppercase text-slate-500">Fields</div><div className="text-slate-300 mt-1">{asset.fields.join(' • ')}</div></div>
        <div><div className="text-[10px] uppercase text-slate-500">Allowed use</div><div className="text-slate-300 mt-1">{asset.allowedUse.join(' • ')}</div></div>
        <div><div className="text-[10px] uppercase text-slate-500">Product / buyer</div><div className="text-slate-300 mt-1">{asset.productIdea} — {asset.buyerProfile}</div></div>
      </div>
    </div>
  );
};

const Meta: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-2">
    <div className="flex items-center gap-1 text-slate-500"><Icon className="w-3 h-3" />{label}</div>
    <div className="text-slate-200 font-semibold mt-1 capitalize">{value}</div>
  </div>
);
