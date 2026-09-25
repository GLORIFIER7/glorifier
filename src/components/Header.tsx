import React, { useState } from 'react';
import {
  ShieldCheck, Wallet, Sparkles, Layers, Bot, Globe, Users, SlidersHorizontal, Search,
  Mail, HardDrive, Coins, Lock, Database, Scale, Cpu, BrainCircuit, BadgeDollarSign,
  Network, Globe2, ShieldAlert, FileText, LogIn, LogOut, User as UserIcon,
  ChevronDown, Menu, X, Activity
} from 'lucide-react';
import { SovereignStats, MonetizationPolicy } from '../types';
import { User } from 'firebase/auth';
import { MediatorDashboard } from './MediatorDashboard';

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

type NavItem = { id: string; label: string; icon: React.ElementType; badge?: string | number };
type NavGroup = { id: string; label: string; items: NavItem[] };

export const Header: React.FC<HeaderProps> = ({
  activeTab, setActiveTab, stats, policy, onOpenWithdraw, pendingOffersCount, currentUser, onLogin, onLogout
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const primary = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'ai_ceo', label: 'AI CEO', icon: BrainCircuit },
    { id: 'mediator', label: 'Mediator', icon: Network },
    { id: 'integrations', label: 'Intelligence Hub', icon: Globe2 },
    { id: 'global_collaboration', label: 'Global Collaboration', icon: Users },
  ];

  const more = [
    { id: 'discovery', label: '24/7 Discovery', icon: Search },
    { id: 'ai_collaboration', label: 'AI Models / Providers', icon: Users },
    { id: 'sentinel', label: 'Code Sentinel', icon: Bot },
    { id: 'compute', label: 'Compute', icon: Cpu },
    { id: 'accounts', label: 'Accounts & Data Control', icon: Database },
    { id: 'marketplace', label: 'Marketplace & Bids', icon: Scale, badge: pendingOffersCount || undefined },
    { id: 'compensation', label: 'Compensation', icon: Coins },
    { id: 'monetization_sprint', label: 'Monetization', icon: BadgeDollarSign },
    { id: 'compliance', label: 'Compliance', icon: ShieldAlert },
    { id: 'patent', label: 'Patent/IP', icon: FileText },
    { id: 'exposures', label: 'Clawback Audit', icon: FileText },
    { id: 'revenue_verified', label: 'Revenue / Verified Earnings', icon: Wallet },
    { id: 'connections', label: 'Connection & Authorization', icon: Lock },
  ];

  const activeMore = more.some(item => item.id === activeTab);
  const activeLabel = [...primary, ...more].find(item => item.id === activeTab)?.label || 'Overview';

  const navigate = (id: string) => {
    setActiveTab(id);
    setMoreOpen(false);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-3 sm:px-5">
        <div className="flex h-14 items-center gap-2">
          <button onClick={() => navigate('overview')} className="flex min-w-0 items-center gap-2.5" aria-label="GLORIFIER AI home">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-emerald-500/25 bg-emerald-500/5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <div className="text-sm font-bold tracking-tight text-white">GLORIFIER AI</div>
              <div className="text-[9px] uppercase tracking-wider text-slate-600">Mediator · Control Plane</div>
            </div>
          </button>

          <nav className="ml-3 hidden items-center gap-0.5 md:flex">
            {primary.map(item => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button key={item.id} onClick={() => navigate(item.id)}
                  className={\`inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition ${active ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}\`}>
                  <Icon className="h-3.5 w-3.5" />{item.label}
                </button>
              );
            })}
            <div className="relative">
              <button onClick={() => setMoreOpen(!moreOpen)}
                className={\`inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-xs font-medium ${activeMore ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:bg-slate-900'}\`}>
                More <ChevronDown className={\`h-3 w-3 transition ${moreOpen ? 'rotate-180' : ''}\`} />
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-full mt-1 grid w-[360px] grid-cols-2 gap-0.5 rounded-lg border border-slate-800 bg-slate-950 p-1.5 shadow-2xl">
                  {more.map(item => {
                    const Icon = item.icon;
                    return (
                      <button key={item.id} onClick={() => navigate(item.id)}
                        className={\`flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs ${activeTab === item.id ? 'bg-emerald-500/10 text-emerald-300' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}\`}>
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && <span className="text-[9px] text-slate-500">{item.badge}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="hidden rounded-md border border-slate-800 px-2 py-1 text-[10px] text-slate-500 lg:inline">
              {policy.aiModel || 'Provider-neutral'}
            </span>
            <button onClick={onOpenWithdraw} className="inline-flex items-center gap-1 rounded-md border border-slate-800 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 hover:border-emerald-500/30">
              <Wallet className="h-3.5 w-3.5" /> ${stats.totalEarnedUsd.toFixed(2)}
            </button>
            {currentUser ? (
              <button onClick={onLogout} title="Sign out" className="hidden h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-emerald-400 sm:flex">
                {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : <UserIcon className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <button onClick={onLogin} className="hidden rounded-md border border-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-900 sm:flex">Sign in</button>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-800 md:hidden" aria-label="Open navigation">
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-900 py-1.5 md:hidden">
          <Activity className="h-3 w-3 text-emerald-400" />
          <span className="truncate text-[10px] text-slate-500">{activeLabel}</span>
          <span className="ml-auto text-[9px] uppercase tracking-wider text-slate-600">Control plane</span>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-800 py-2 md:hidden">
            <div className="grid grid-cols-2 gap-1">
              {[...primary, ...more].map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.id} onClick={() => navigate(item.id)}
                    className={\`flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs ${activeTab === item.id ? 'bg-emerald-500/10 text-emerald-300' : 'text-slate-400'}\`}>
                    <Icon className="h-3.5 w-3.5" />{item.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-1.5 border-t border-slate-900 pt-2">
              {currentUser ? (
                <button onClick={onLogout} className="flex-1 rounded-md border border-slate-800 px-3 py-2 text-xs text-slate-300"><LogOut className="mr-1 inline h-3.5 w-3.5" /> Sign out</button>
              ) : (
                <button onClick={onLogin} className="flex-1 rounded-md border border-slate-800 px-3 py-2 text-xs text-slate-300"><LogIn className="mr-1 inline h-3.5 w-3.5" /> Sign in</button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
