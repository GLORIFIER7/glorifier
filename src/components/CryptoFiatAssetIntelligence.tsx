import React, { useEffect, useMemo, useState } from 'react';
import {
  WalletCards, Coins, Globe2, ShieldCheck, RefreshCw, Search, ExternalLink,
  Network, CircleDollarSign, AlertTriangle, LockKeyhole, Bot, BrainCircuit, BarChart3, TrendingUp, PieChart, Landmark, Zap
} from 'lucide-react';

type Asset = {
  id: string;
  name: string;
  symbol: string;
  category: 'Crypto' | 'Token' | 'Stablecoin' | 'NFT' | 'Fiat';
  network: string;
  source: string;
  status: string;
  referenceUrl?: string;
};

const seed: Asset[] = [
  { id: 'cf-btc', name: 'Bitcoin', symbol: 'BTC', category: 'Crypto', network: 'Bitcoin', source: 'Public blockchain', status: 'watch-only' },
  { id: 'cf-eth', name: 'Ethereum', symbol: 'ETH', category: 'Crypto', network: 'Ethereum', source: 'Public blockchain', status: 'watch-only' },
  { id: 'cf-usdt', name: 'Tether USD', symbol: 'USDT', category: 'Stablecoin', network: 'Multi-chain', source: 'Public token metadata', status: 'indexed' },
  { id: 'cf-usd', name: 'US Dollar', symbol: 'USD', category: 'Fiat', network: 'FX market', source: 'Public FX data', status: 'market-data' },
  { id: 'cf-eur', name: 'Euro', symbol: 'EUR', category: 'Fiat', network: 'FX market', source: 'Public FX data', status: 'market-data' },
];

export const CryptoFiatAssetIntelligence: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>(seed);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Connector-ready');
  const [scientistBusy, setScientistBusy] = useState(false);
  const [scientistReport, setScientistReport] = useState<any | null>(null);
  const [scientistError, setScientistError] = useState('');

  const load = async () => {
    setStatus('Refreshing…');
    try {
      const res = await fetch('/api/crypto-fiat-assets');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.assets) && data.assets.length) setAssets(data.assets);
      }
      setStatus('Connected');
    } catch {
      setStatus('Connector-ready');
    }
  };

  useEffect(() => { void load(); }, []);

  const runFinanceScientists = async () => {
    setScientistBusy(true);
    setScientistError('');
    try {
      const res = await fetch('/api/ai/finance-scientists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Finance scientist council failed');
      setScientistReport(data);
    } catch (error) {
      setScientistError(error instanceof Error ? error.message : 'Finance scientist council failed');
    } finally {
      setScientistBusy(false);
    }
  };

  const filtered = useMemo(() => assets.filter((asset) =>
    [asset.name, asset.symbol, asset.category, asset.network, asset.source, asset.status]
      .join(' ').toLowerCase().includes(query.toLowerCase())
  ), [assets, query]);

  const counts = useMemo(() => ({
    total: assets.length,
    crypto: assets.filter(a => a.category !== 'Fiat').length,
    fiat: assets.filter(a => a.category === 'Fiat').length,
    networks: new Set(assets.map(a => a.network)).size,
  }), [assets]);

  return <section className="space-y-6">
    <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-violet-300 text-xs font-bold uppercase tracking-widest">
            <WalletCards className="w-4 h-4" /> Crypto & Fiat Asset Intelligence
          </div>
          <h2 className="mt-2 text-2xl font-bold text-white">Crypto, wallets, tokens & fiat command center</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Broad public/on-chain and authorized-connector coverage for crypto assets, watch-only wallet addresses,
            tokens, NFTs, exchanges and fiat/FX data. This does not imply access to every private wallet or bank account.
          </p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold hover:border-violet-500/50">
          <RefreshCw className="w-4 h-4" /> Scan connectors
        </button>
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs text-slate-300">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> {status}
      </div>
    </div>

    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-widest"><BrainCircuit className="w-4 h-4" /> Finance Scientist Bots</div>
          <h3 className="mt-2 text-lg font-bold text-white">Unified GLORIFIER Asset Report — AI finance council</h3>
          <p className="mt-1 text-sm text-slate-400 max-w-3xl">Five specialist bots analyze Crypto + Fiat + NFTs + Game Assets + Business Intelligence + verified Revenue data, then return evidence, gaps and monitoring priorities. They do not execute trades or move funds.</p>
        </div>
        <button onClick={() => void runFinanceScientists()} disabled={scientistBusy} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Bot className="w-4 h-4" /> {scientistBusy ? 'Analyzing…' : 'Run finance scientists'}</button>
      </div>
      {scientistError && <div className="mt-3 text-xs text-rose-300">{scientistError}</div>}
      {scientistReport && <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {(scientistReport.scientists || []).map((scientist: any) => <div key={scientist.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between gap-2"><span className="font-semibold text-white">{scientist.name}</span><span className="text-[10px] uppercase tracking-wide text-cyan-300">{scientist.priority}</span></div>
          <div className="mt-1 text-xs text-slate-500">{scientist.specialty}</div>
          <p className="mt-3 text-sm text-slate-300 whitespace-pre-wrap">{scientist.output}</p>
        </div>)}
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 lg:col-span-2">
          <div className="flex items-center gap-2 font-semibold text-cyan-200"><Zap className="w-4 h-4" /> Unified command-center priorities</div>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">{(scientistReport.priorities || []).map((p: string) => <li key={p}>• {p}</li>)}</ul>
        </div>
      </div>}
    </div>

    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-center gap-2 font-semibold text-white"><BarChart3 className="w-5 h-5 text-violet-400" /> Unified asset report coverage</div>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        {[['Crypto + tokens', 'Public/on-chain'], ['Fiat + FX', 'Market data'], ['NFTs', 'Public references'], ['Game Assets', 'Public metadata'], ['Business Intelligence', 'Connector-ready'], ['Revenue', 'Verified ledger']].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-800 bg-slate-950 p-3"><div className="text-sm font-semibold text-white">{label}</div><div className="mt-1 text-xs text-slate-500">{value}</div></div>)}
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        ['Tracked assets', counts.total, Coins],
        ['Crypto / tokens', counts.crypto, CircleDollarSign],
        ['Fiat currencies', counts.fiat, Globe2],
        ['Networks / markets', counts.networks, Network],
      ].map(([label, value, Icon]: any) =>
        <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <Icon className="w-4 h-4 text-violet-400" />
          <div className="mt-3 text-2xl font-bold">{value}</div>
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      )}
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex items-center gap-2 font-semibold text-white">
          <ShieldCheck className="w-5 h-5 text-emerald-400" /> Watch-only wallet intelligence
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Monitor public blockchain addresses, balances, transfers and asset movements when a supported public
          chain connector is configured. No private-key custody is required.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {['Public addresses', 'Token balances', 'Transfers', 'NFT holdings'].map(item =>
            <div key={item} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-3 text-xs text-slate-300">{item}<div className="text-[11px] text-slate-600 mt-1">Connector-ready</div></div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex items-center gap-2 font-semibold text-white">
          <LockKeyhole className="w-5 h-5 text-amber-400" /> Authorized account rail
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Exchange balances and transaction history can be added only through explicitly authorized, read-only
          integrations. Fiat bank/payment balances require an authorized provider connection.
        </p>
        <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
          Never enter seed phrases, private keys, passwords, 2FA codes or unrestricted withdrawal credentials into GLORIFIER.
        </div>
      </div>
    </div>

    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search assets, symbols, networks, wallets or sources…"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-violet-500" />
      </div>
    </div>

    <div className="grid gap-3">
      {filtered.map(asset =>
        <article key={asset.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-violet-400" />
                <h3 className="font-semibold text-white">{asset.name} <span className="text-slate-500">({asset.symbol})</span></h3>
              </div>
              <p className="mt-1 text-sm text-slate-400">{asset.category} • {asset.network} • {asset.source}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-300">
                <ShieldCheck className="w-3 h-3" /> {asset.status}
              </span>
              {asset.referenceUrl && <a href={asset.referenceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200">
                Source <ExternalLink className="w-3 h-3" />
              </a>}
            </div>
          </div>
        </article>
      )}
      {!filtered.length && <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">No matching assets.</div>}
    </div>

    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-500">
      <div className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>Coverage is connector-dependent. Public blockchain data is observable by network, while private fiat accounts and private exchange data are not public. GLORIFIER should store references and permitted metadata, not secrets.</span>
      </div>
    </div>
  </section>;
};
