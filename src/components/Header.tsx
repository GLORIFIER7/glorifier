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
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'ai_ceo', label: 'AI CEO', icon: BrainCircuit },
    { id: 'mediator', label: 'Mediator', icon: ShieldCheck },
    { id: 'integrations', label: 'Intelligence', icon: Globe2 },
    { id: 'global_collaboration', label: 'Collaboration', icon: Users },
    { id: 'discovery', label: '24/7 Discovery', icon: Zap },
    { id: 'ai_collaboration', label: 'AI Models', icon: Sparkles },
    { id: 'sentinel', label: 'Code Sentinel', icon: Bot },
    { id: 'compute', label: 'Compute', icon: Cpu },
    { id: 'accounts', label: 'Accounts & Data', icon: Globe },
    { id: 'marketplace', label: 'Marketplace', icon: Scale, badge: pendingOffersCount > 0 ? pendingOffersCount : undefined },
    { id: 'compensation', label: 'Compensation', icon: Coins },
    { id: 'monetization_sprint', label: 'Monetization', icon: ArrowUpRight },
    { id: 'compliance', label: 'Compliance', icon: ShieldAlert },
    { id: 'patent', label: 'Patent / IP', icon: FileText },
    { id: 'exposures', label: 'Clawback Audit', icon: ShieldAlert },
    { id: 'revenue_verified', label: 'Verified Revenue', icon: Wallet },
    { id: 'connections', label: 'Connections', icon: Lock },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#090909] border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
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

          {/* Right: Wallet Balance & Cashout & Auth */}
          <div className="flex items-center gap-3">
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

          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-1.5 scrollbar-none border-t border-slate-900">
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
