import React from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  Sparkles, 
  Zap, 
  Sliders, 
  Database, 
  Scale, 
  Layers, 
  ShieldAlert,
  ArrowUpRight,
  SlidersHorizontal,
  Coins,
  Lock,
  LogIn,
  LogOut,
  User as UserIcon,
  Cloud,
  Mail,
  HardDrive,
  Users,
  Globe,
  Globe2,
  Cpu,
  Bot,
  FileText,
  BrainCircuit
} from 'lucide-react';
import { SovereignStats, MonetizationPolicy } from '../types';
import { User } from 'firebase/auth';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  stats: SovereignStats;
  policy: MonetizationPolicy;
  onOpenWithdraw: () => void;
  pendingOffersCount: number;
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  stats,
  policy,
  onOpenWithdraw,
  pendingOffersCount,
  currentUser,
  onLogin,
  onLogout
}) => {
  const tabs = [
    { id: 'overview', label: 'Overview & Yield', icon: Layers },
    { id: 'sentinel', label: '24/7 AI Code Sentinel', icon: Bot, badge: '24/7 Auto' },
    { id: 'gpt_cowork', label: 'Work Together with GPT', icon: Sparkles, badge: 'Interactive Pair' },
    { id: 'accounts', label: 'Internet Accounts', icon: Globe, badge: 'All Web' },
    { id: 'ai_collaboration', label: 'AI Models Council', icon: Users, badge: 'All AI' },
    { id: 'control', label: 'Data Control Dashboard', icon: SlidersHorizontal },
    { id: 'gmail', label: 'Gmail Footprint', icon: Mail, badge: currentUser ? 'Connected' : 'Auth Required' },
    { id: 'drive', label: 'Google Drive', icon: HardDrive, badge: currentUser ? 'Connected' : 'Auth Required' },
    { id: 'compensation', label: 'Compensation Engine', icon: Coins },
    { id: 'privacy_lab', label: 'Privacy Tech Lab (PETs)', icon: Lock },
    { id: 'footprints', label: 'Footprint Tiers', icon: Database },
    { id: 'broker', label: 'AI Broker & Strategy', icon: Sparkles },
    { id: 'marketplace', label: 'Marketplace & Bids', icon: Scale, badge: pendingOffersCount > 0 ? pendingOffersCount : undefined },
    { id: 'patent', label: 'Patent & IP Disclosure', icon: Scale, badge: 'AI Attorney Scientist' },
    { id: 'compute', label: 'Independent Compute', icon: Cpu, badge: 'Provider-Neutral' },
    { id: 'ai_ceo', label: 'AI CEO Command', icon: BrainCircuit, badge: 'Human Authority' },
    { id: 'integrations', label: 'Intelligence Hub', icon: Globe2, badge: 'Global Reports' },
    { id: 'compliance', label: 'Compliance AI Scientist', icon: ShieldAlert, badge: 'GDPR / AI Act' },
    { id: 'exposures', label: 'Clawback Audit', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-950/50 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  DataSovereign <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">AI AGENT</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Personal Data Governance & Fair Compensation Network
              </p>
            </div>
          </div>

          {/* Center Status Indicators */}
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

          {/* Right: Wallet Balance & Cashout & Auth */}
          <div className="flex items-center gap-3">
            <div 
              onClick={onOpenWithdraw}
              id="wallet-payout-button"
              className="group cursor-pointer flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 transition-all shadow-sm"
              title="Click to claim or withdraw funds"
            >
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

            {currentUser ? (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 font-semibold text-xs border border-emerald-500/30">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs text-slate-300 hidden md:inline max-w-[120px] truncate">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="text-slate-400 hover:text-rose-400 p-1 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                id="google-signin-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sign in</span>
              </button>
            )}

            <button
              onClick={onOpenWithdraw}
              id="withdraw-cta-btn"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-colors"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none border-t border-slate-900">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/80'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
