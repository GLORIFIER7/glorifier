import React from 'react';
import {
  Wallet, Sparkles, SlidersHorizontal, Database, Scale, Layers, ShieldAlert, Activity,
  ArrowUpRight, Coins, Lock, Cloud, Mail, HardDrive, Users, Bot, WalletCards
} from 'lucide-react';
import { SovereignStats, MonetizationPolicy } from '../types';
import { User } from 'firebase/auth';
import { AuthPanel } from './AuthPanel';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  stats: SovereignStats;
  policy: MonetizationPolicy;
  onOpenWithdraw: () => void;
  pendingOffersCount: number;
  currentUser: User | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab, setActiveTab, stats, policy, onOpenWithdraw, pendingOffersCount, currentUser,
}) => {
  const tabs = [
    { id: 'overview', label: 'Overview & Yield', icon: Layers },
    { id: 'control', label: 'Data Control Dashboard', icon: SlidersHorizontal },
    { id: 'data_registry', label: 'Data Asset Registry', icon: Database, badge: 'Governance' },
    { id: 'business_intelligence', label: 'Business Intelligence', icon: Activity, badge: 'Live Intel' },
    { id: 'gmail', label: 'Gmail Footprint', icon: Mail, badge: 'Google Workspace' },
    { id: 'drive', label: 'Google Drive', icon: HardDrive, badge: 'Google Workspace' },
    { id: 'compensation', label: 'Compensation Engine', icon: Coins },
    { id: 'privacy_lab', label: 'Privacy Tech Lab (PETs)', icon: Lock },
    { id: 'footprints', label: 'Footprint Tiers', icon: Database },
    { id: 'broker', label: 'AI Broker & Strategy', icon: Sparkles },
    { id: 'ai_roles', label: 'AI Specialists', icon: Scale, badge: 'Attorney + Data Scientist' },
    { id: 'monetization_manager', label: 'AI Monetization Manager', icon: Bot, badge: 'AI Bot' },
    { id: 'binance_nft', label: 'Binance & NFTs', icon: WalletCards, badge: 'Crypto' },
    { id: 'ai_collaboration', label: 'AI Collaboration Management', icon: Users, badge: 'All AI' },
    { id: 'marketplace', label: 'Marketplace & Bids', icon: Scale, badge: pendingOffersCount > 0 ? pendingOffersCount : undefined },
    { id: 'exposures', label: 'Clawback Audit', icon: ShieldAlert },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full overflow-hidden border border-cyan-400/40 shadow-lg shadow-cyan-950/40 shrink-0 bg-slate-950">
              <img src={`${import.meta.env.BASE_URL}glorifier-logo.svg`} alt="Glorifier AI" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-white truncate">
                GLORIFIER <span className="text-cyan-400">AI</span>
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">COMMAND CENTER</span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Artificial Intelligence • Orchestration • Security • Data • Monetization
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Broker Active:</span>
              <span className="text-emerald-400 font-semibold capitalize">{policy.brokerMode.replace('-', ' ')}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI Engine:</span>
              <span className="text-emerald-300 font-mono text-[11px] font-semibold uppercase">{policy.aiModel || 'GPT-4o'}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cloud DB:</span>
              <span className="text-cyan-300 font-mono text-[11px]">asia-southeast1</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AuthPanel currentUser={currentUser} />
            <div onClick={onOpenWithdraw} id="wallet-payout-button" className="group cursor-pointer flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 transition-all shadow-sm" title="Click to claim or withdraw funds">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Claimable Yield</div>
                <div className="text-sm font-bold text-emerald-400 font-mono flex items-center gap-1">
                  ${stats.totalEarnedUsd.toFixed(2)}
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                </div>
              </div>
            </div>
            <button onClick={onOpenWithdraw} id="withdraw-cta-btn" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-colors">
              Withdraw
            </button>
          </div>
        </div>

        <div className="border-t border-slate-900 py-2">
          <div className="sm:hidden">
            <label htmlFor="mobile-command-navigation" className="sr-only">Command Center section</label>
            <select
              id="mobile-command-navigation"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm font-semibold text-slate-200 outline-none focus:border-emerald-500"
            >
              {tabs.map((tab) => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
            </select>
          </div>
          <nav aria-label="Command Center sections" className="hidden sm:flex space-x-1 overflow-x-auto scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-btn-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    isActive ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/80' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">{tab.badge}</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
