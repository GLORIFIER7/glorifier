import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ShieldCheck, 
  TrendingUp, 
  Activity, 
  ArrowUpRight, 
  Cpu, 
  Lock, 
  EyeOff, 
  Play, 
  Pause, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  Shield,
  Layers,
  Users
} from 'lucide-react';
import { SovereignStats, DataFootprintSource, MonetizationPolicy, CompensationTransaction } from '../types';
import { PrivacyShieldProgressBar } from './PrivacyShieldProgressBar';
import { LiveEconomicData } from './LiveEconomicData';
import { BusinessModelPanel } from './BusinessModelPanel';

interface OverviewTabProps {
  stats: SovereignStats;
  footprints: DataFootprintSource[];
  policy: MonetizationPolicy;
  onUpdatePolicy: (newPolicy: Partial<MonetizationPolicy>) => void;
  onToggleFootprint: (id: string) => void;
  onOpenWithdraw: () => void;
  onNavigateToTab: (tab: string) => void;
  transactions: CompensationTransaction[];
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  footprints,
  policy,
  onUpdatePolicy,
  onToggleFootprint,
  onOpenWithdraw,
  onNavigateToTab,
  transactions
}) => {
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [liveStreamEvents, setLiveStreamEvents] = useState<Array<{
    id: string;
    buyer: string;
    category: string;
    amount: number;
    tier: string;
    time: string;
  }>>([
    { id: 'ev-1', buyer: 'Frontier AI Research', category: 'Developer Telemetry', amount: 0.14, tier: 'ε=0.35 Diff. Privacy', time: 'Just now' },
    { id: 'ev-2', buyer: 'BioHealth Genomic Lab', category: 'Sleep Biomarker', amount: 0.22, tier: 'Synthetic Twin', time: '14s ago' },
    { id: 'ev-3', buyer: 'OmniConsumer Macro', category: 'E-Commerce Intent', amount: 0.08, tier: 'ZK-Attestation', time: '42s ago' },
  ]);

  // Simulate live incoming micro-monetization transactions
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      const sampleBuyers = [
        { name: 'Frontier AI Research', cat: 'Developer Telemetry', base: 0.12, tier: 'ε=0.35 Diff. Privacy' },
        { name: 'BioHealth Genomic Lab', cat: 'Health Biomarker', base: 0.18, tier: 'Synthetic Twin' },
        { name: 'OmniConsumer Macro', cat: 'Commerce Basket', base: 0.09, tier: 'ZK-Attestation' },
        { name: 'Stanford Med AI Lab', cat: 'Biometrics Aggregate', base: 0.25, tier: 'ε=0.2 Laplacian' },
        { name: 'DeepReason AI Models', cat: 'Search & Research', base: 0.15, tier: 'Differential ε=0.45' }
      ];

      const chosen = sampleBuyers[Math.floor(Math.random() * sampleBuyers.length)];
      const randomizedAmount = +(chosen.base + (Math.random() * 0.08 - 0.04)).toFixed(2);

      setLiveStreamEvents(prev => [
        {
          id: `ev-${Date.now()}`,
          buyer: chosen.name,
          category: chosen.cat,
          amount: Math.max(0.05, randomizedAmount),
          tier: chosen.tier,
          time: 'Just now'
        },
        ...prev.slice(0, 5)
      ]);
    }, 4500);

    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  const activeMonetizingCount = footprints.filter(f => f.isMonetized).length;
  const shieldedCount = footprints.filter(f => !f.isMonetized).length;

  return (
    <div className="space-y-6">
      <LiveEconomicData />
      <BusinessModelPanel />

      {/* Autonomous Policy Strategy Selector */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              Autonomous Broker Stance
            </h3>
            <p className="text-xs text-slate-400">
              Select how your personal AI agent negotiates terms and filters incoming buyer requests.
            </p>
          </div>
          <div className="text-xs text-slate-400">
            Current Floor: <span className="text-emerald-400 font-mono font-semibold">${policy.minimumMonthlyFloorUsd}/mo</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Conservative */}
          <div 
            onClick={() => onUpdatePolicy({ brokerMode: 'strict-sovereign', globalEpsilon: 0.15, minimumMonthlyFloorUsd: 50 })}
            id="policy-stance-strict"
            className={`cursor-pointer rounded-lg p-3.5 border transition-all ${
              policy.brokerMode === 'strict-sovereign'
                ? 'bg-slate-800/90 border-emerald-500/80 shadow-md'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white">Strict Sovereign</div>
              {policy.brokerMode === 'strict-sovereign' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Zero-knowledge only. Academic biomedical research permitted. No commercial AI pretraining.
            </p>
            <div className="mt-2 text-[10px] font-mono text-slate-300 flex items-center gap-2">
              <span>ε = 0.15</span> • <span>Floor: $50/mo</span>
            </div>
          </div>

          {/* Balanced (Recommended) */}
          <div 
            onClick={() => onUpdatePolicy({ brokerMode: 'balanced-protective', globalEpsilon: 0.35, minimumMonthlyFloorUsd: 35 })}
            id="policy-stance-balanced"
            className={`cursor-pointer rounded-lg p-3.5 border transition-all ${
              policy.brokerMode === 'balanced-protective'
                ? 'bg-slate-800/90 border-emerald-500/80 shadow-md'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white">Balanced Governance</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold">RECOMMENDED</span>
              </div>
              {policy.brokerMode === 'balanced-protective' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              High compensation with audited differential privacy (ε=0.35). AI labs & non-profit academic. Ad-brokers quarantined.
            </p>
            <div className="mt-2 text-[10px] font-mono text-emerald-400 flex items-center gap-2">
              <span>ε = 0.35</span> • <span>Floor: $35/mo</span> • <span>~$215/mo avg</span>
            </div>
          </div>

          {/* Yield Maximizer */}
          <div 
            onClick={() => onUpdatePolicy({ brokerMode: 'autonomous-maximize', globalEpsilon: 0.65, minimumMonthlyFloorUsd: 20 })}
            id="policy-stance-maximize"
            className={`cursor-pointer rounded-lg p-3.5 border transition-all ${
              policy.brokerMode === 'autonomous-maximize'
                ? 'bg-slate-800/90 border-emerald-500/80 shadow-md'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white">Yield Maximizer</div>
              {policy.brokerMode === 'autonomous-maximize' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Broader licensing pool using synthetic twins & coarse k-anonymity. Maximizes micro-payout volume across all verified buyers.
            </p>
            <div className="mt-2 text-[10px] font-mono text-amber-300 flex items-center gap-2">
              <span>ε = 0.65</span> • <span>Floor: $20/mo</span> • <span>~$380/mo pacing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Quick Stream Switchboard & Real-time Compensation Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Quick Stream Switchboard */}
        <div className="lg:col-span-7 rounded-xl bg-slate-900 border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Footprint Streams Switchboard
              </h3>
              <p className="text-xs text-slate-400">
                Grant or revoke AI monetization access to your internet digital footprint.
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('footprints')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              Full Inspection & Noise &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {footprints.map((fp) => (
              <div
                key={fp.id}
                id={`stream-row-${fp.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    fp.isMonetized 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}>
                    {fp.isMonetized ? <Activity className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate">{fp.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                        {fp.platform}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                      <span>{(fp.dataPointsMonthly / 1000).toFixed(0)}k points/mo</span>
                      <span className="font-mono text-emerald-400 font-medium">
                        {fp.isMonetized ? `+$${fp.userMonthlyCompUsd.toFixed(2)}/mo` : '$0.00 (Shielded)'}
                      </span>
                      <span className="hidden sm:inline text-slate-500 font-mono">
                        {fp.privacyTier}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-2">
                  <button
                    onClick={() => onToggleFootprint(fp.id)}
                    id={`toggle-btn-${fp.id}`}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                      fp.isMonetized
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {fp.isMonetized ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Monetizing
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-slate-400" />
                        Shielded Private
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 cols: Live Micro-Compensation Stream */}
        <div className="lg:col-span-5 rounded-xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Live Compensation Clearing
                </h3>
                <p className="text-xs text-slate-400">
                  Micro-royalties streamed as models query your protected data vault.
                </p>
              </div>
              <button
                onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                id="toggle-livestream-btn"
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title={isLiveStreaming ? 'Pause live simulator' : 'Resume live simulator'}
              >
                {isLiveStreaming ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            </div>

            <div className="space-y-2.5">
              {liveStreamEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-200">{ev.buyer}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{ev.category}</span>
                      <span>•</span>
                      <span className="font-mono text-emerald-400/80">{ev.tier}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400">
                      +${ev.amount.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500">{ev.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="rounded-lg bg-slate-950 p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Settled Royalty Payout</div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">
                  ${stats.totalEarnedUsd.toFixed(2)} USDC
                </div>
              </div>
              <button
                onClick={onOpenWithdraw}
                id="overview-claim-payout-btn"
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
              >
                Withdraw Funds
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
