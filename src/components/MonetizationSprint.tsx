import React, { useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, Bot, CheckCircle2, Clock3, Gift, Landmark, RefreshCw, ShieldCheck, WalletCards, Zap } from 'lucide-react';

type Channel = 'voucher' | 'crypto' | 'fiat' | 'gcash';

interface MonetizationSprintProps {
  onOpenWithdraw: () => void;
}

const channels: { id: Channel; label: string; icon: React.ReactNode; note: string }[] = [
  { id: 'voucher', label: 'Voucher', icon: <Gift className="w-4 h-4" />, note: 'Use only when a legitimate buyer/provider supports a voucher or gift-card settlement.' },
  { id: 'crypto', label: 'Crypto', icon: <WalletCards className="w-4 h-4" />, note: 'Wallet/network must be verified before release.' },
  { id: 'fiat', label: 'Fiat', icon: <Landmark className="w-4 h-4" />, note: 'Bank or supported payout account; settlement confirmation required.' },
  { id: 'gcash', label: 'GCash', icon: <BadgeDollarSign className="w-4 h-4" />, note: 'Business disbursement onboarding/authorization is required for automated payouts.' },
];

export const MonetizationSprint: React.FC<MonetizationSprintProps> = ({ onOpenWithdraw }) => {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Channel>('gcash');

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/revenue/control-plane');
      const data = await response.json();
      if (data?.ok) setSnapshot(data.snapshot);
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const verified = Number(snapshot?.verifiedRevenue ?? snapshot?.verifiedEarnings ?? 0);
  const estimated = Number(snapshot?.estimatedRevenue ?? snapshot?.estimatedEarnings ?? 0);
  const payoutReady = verified > 0;

  const stages = useMemo(() => [
    { label: 'Verified evidence', done: verified > 0 },
    { label: 'Buyer / revenue event', done: verified > 0 },
    { label: 'Settlement confirmed', done: verified > 0 },
    { label: 'Payout request', done: false },
  ], [verified]);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-slate-950 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-4 h-4" /> 7-Day Monetization Sprint
            </div>
            <h2 className="text-2xl font-bold text-white mt-1">AI Monetization Scientists → Verified Payout</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Prioritize legitimate, evidence-backed revenue opportunities and move verified funds through the fastest authorized payout channel available.
            </p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-xs font-semibold">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-xs text-slate-500 uppercase">Verified revenue</div>
            <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">${verified.toFixed(2)}</div>
            <div className="text-[11px] text-slate-500 mt-1">Eligible only after evidence + settlement.</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-xs text-slate-500 uppercase">Estimated pipeline</div>
            <div className="text-2xl font-mono font-bold text-amber-300 mt-1">${estimated.toFixed(2)}</div>
            <div className="text-[11px] text-slate-500 mt-1">Never treated as payout balance.</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-xs text-slate-500 uppercase">Payout status</div>
            <div className={`text-lg font-bold mt-2 ${payoutReady ? 'text-emerald-400' : 'text-amber-300'}`}>
              {payoutReady ? 'Ready for governed request' : 'Build verified revenue first'}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-white">Scientist monetization queue</h3>
        </div>
        <div className="grid gap-3">
          {['Business Intelligence Scientist', 'Data Scientist', 'Finance Scientist', 'Security Scientist', 'Engineering Scientist', 'Compliance Scientist'].map((name) => (
            <div key={name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div>
                <div className="text-sm font-semibold text-slate-200">{name}</div>
                <div className="text-[11px] text-slate-500">Find buyer demand → produce evidence → create governed revenue event.</div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">PRIORITIZED</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h3 className="font-bold text-white mb-4">Payout route</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setSelected(channel.id)}
              className={`text-left rounded-xl border p-4 transition-colors ${selected === channel.id ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}
            >
              <div className="flex items-center gap-2 text-slate-200 font-semibold">{channel.icon}{channel.label}</div>
              <p className="text-[11px] text-slate-500 mt-2">{channel.note}</p>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Selected route: {channels.find(c => c.id === selected)?.label}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            GLORIFIER can prepare and govern the request, but it must not invent earnings or mark a payout settled before the payment provider confirms settlement.
          </p>
          <button
            onClick={onOpenWithdraw}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400"
          >
            <WalletCards className="w-4 h-4" /> Open Payout
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h3 className="font-bold text-white mb-4">7-day execution gates</h3>
        <div className="grid gap-3">
          {stages.map((stage, index) => (
            <div key={stage.label} className="flex items-center gap-3">
              {stage.done ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Clock3 className="w-5 h-5 text-amber-300" />}
              <div className="text-sm text-slate-300"><span className="text-slate-500 mr-2">{index + 1}.</span>{stage.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
