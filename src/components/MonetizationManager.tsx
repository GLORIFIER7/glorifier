import React, { useMemo, useState } from 'react';
import { Bot, BrainCircuit, DollarSign, Gauge, Play, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { MonetizationPolicy, SovereignStats } from '../types';

interface MonetizationManagerProps {
  policy: MonetizationPolicy;
  stats: SovereignStats;
  onUpdatePolicy: (policy: Partial<MonetizationPolicy>) => void;
}

export const MonetizationManager: React.FC<MonetizationManagerProps> = ({ policy, stats, onUpdatePolicy }) => {
  const [goal, setGoal] = useState('Find privacy-preserving ways to increase monthly data compensation without exceeding my current privacy settings.');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  const projected = useMemo(() => {
    const multiplier = policy.brokerMode === 'autonomous-maximize' ? 1.35 : policy.brokerMode === 'balanced-protective' ? 1.15 : 0.9;
    return Math.max(stats.monthlyPacingUsd, stats.monthlyPacingUsd * multiplier);
  }, [policy.brokerMode, stats.monthlyPacingUsd]);

  const runManager = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/broker-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: goal,
          currentPolicy: policy,
          footprintsSummary: JSON.stringify({
            monthlyPacingUsd: stats.monthlyPacingUsd,
            activeDataStreamsCount: stats.activeDataStreamsCount,
            privacyShieldIndex: stats.privacyShieldIndex,
          }),
        }),
      });
      const data = await response.json();
      setReply(data.reply || data.error || 'No AI response returned.');
    } catch (error) {
      setReply(error instanceof Error ? error.message : 'Monetization manager is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
              <Bot className="w-4 h-4" /> AI Bot Monetization Manager
            </div>
            <h2 className="mt-2 text-2xl font-bold text-white">Autonomous Yield Operations</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              An AI control layer that analyzes yield opportunities, privacy constraints and compensation strategy.
              It can recommend actions, but policy changes remain under your control.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <div className="text-xs text-slate-400">Projected monthly pacing</div>
            <div className="text-2xl font-bold font-mono text-emerald-400">{projected.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          ['Current Pacing', '$' + stats.monthlyPacingUsd.toFixed(2), TrendingUp],
          ['Active Streams', String(stats.activeDataStreamsCount), Gauge],
          ['Privacy Shield', String(stats.privacyShieldIndex) + '%', ShieldCheck],
          ['Claimable Yield', '$' + stats.totalEarnedUsd.toFixed(2), Wallet],
        ].map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{label}</span>
              {React.createElement(Icon as React.ElementType, { className: 'w-4 h-4 text-emerald-400' })}
            </div>
            <div className="mt-2 text-xl font-bold font-mono text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center gap-2 text-white font-semibold">
            <BrainCircuit className="w-5 h-5 text-emerald-400" />
            Ask the Monetization Bot
          </div>
          <textarea
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            className="mt-4 w-full min-h-32 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-200 outline-none focus:border-emerald-500/50"
            placeholder="Describe your monetization goal..."
          />
          <button
            onClick={runManager}
            disabled={loading || !goal.trim()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            <Play className="w-4 h-4" /> {loading ? 'Analyzing...' : 'Run AI Analysis'}
          </button>
          {reply && (
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-300 whitespace-pre-wrap">
              {reply}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center gap-2 font-semibold text-white">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Strategy Controls
          </div>
          <label className="mt-5 block text-xs text-slate-400">Operating mode</label>
          <select
            value={policy.brokerMode}
            onChange={(event) => onUpdatePolicy({ brokerMode: event.target.value as MonetizationPolicy['brokerMode'] })}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          >
            <option value="strict-sovereign">Strict Sovereign</option>
            <option value="balanced-protective">Balanced Protective</option>
            <option value="autonomous-maximize">Autonomous Maximize</option>
          </select>

          <label className="mt-5 block text-xs text-slate-400">Minimum monthly floor</label>
          <input
            type="number"
            min="0"
            value={policy.minimumMonthlyFloorUsd}
            onChange={(event) => onUpdatePolicy({ minimumMonthlyFloorUsd: Number(event.target.value) || 0 })}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          />

          <label className="mt-5 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={policy.autoNegotiateHighBids}
              onChange={(event) => onUpdatePolicy({ autoNegotiateHighBids: event.target.checked })}
            />
            Enable AI high-bid negotiation
          </label>

          <div className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
            The bot provides analysis and recommendations. External payments, data sharing and governance changes should require explicit authorization.
          </div>
        </div>
      </div>
    </section>
  );
};
