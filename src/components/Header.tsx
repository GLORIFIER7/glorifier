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
  BrainCircuit,
  Atom
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
    { id: 'scientists', label: '24/7 AI Scientist Fleet', icon: Atom, badge: '24/7 Earn' },
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
    <header className="sticky top-0 z-40 bg-[#090909] border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm border border-slate-700 bg-[#111] flex items-center justify-center">
              <div className="w-full h-full bg-[#090909] rounded-sm flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  GLORIFIER <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-transparent text-emerald-300 border border-slate-700 font-mono">AI CONTROL PLANE</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Provider-Neutral Intelligence Orchestration
              </p>
            </div>
          </div>

          {/* Center Status Indicators */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-transparent border border-slate-800 text-slate-300">
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
              className="group cursor-pointer flex items-center gap-2.5 px-3 py-1.5 rounded-sm bg-transparent hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-colors"
              title="Click to claim or withdraw funds"
            >
              <div className="w-7 h-7 rounded-sm bg-transparent text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
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
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-transparent border border-slate-800">
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sign in</span>
              </button>
            )}

            <button
              onClick={onOpenWithdraw}
              id="withdraw-cta-btn"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-sm bg-emerald-300 hover:bg-emerald-200 text-slate-950 transition-colors"
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
                className={`flex items-center gap-2 px-3 py-2 text-[11px] font-semibold rounded-sm whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-transparent text-emerald-300 border-b border-emerald-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-medium bg-transparent text-slate-500 border border-slate-800">
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
