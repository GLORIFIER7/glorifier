import React, { useState } from 'react';
import {
  ShieldCheck, Wallet, Sparkles, Layers, Bot, Globe, Users, SlidersHorizontal,
  Mail, HardDrive, Coins, Lock, Database, Scale, Cpu, BrainCircuit, BadgeDollarSign,
  Network, Globe2, ShieldAlert, FileText, LogIn, LogOut, User as UserIcon,
  ChevronDown, Menu, X, Activity
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

type NavItem = { id: string; label: string; icon: React.ElementType; badge?: string | number };
type NavGroup = { id: string; label: string; items: NavItem[] };

export const Header: React.FC<HeaderProps> = ({
  activeTab, setActiveTab, stats, policy, onOpenWithdraw, pendingOffersCount, currentUser, onLogin, onLogout
}) => {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const groups: NavGroup[] = [
    {
      id: 'command', label: 'Command', items: [
        { id: 'overview', label: 'Overview', icon: Layers },
        { id: 'ai_ceo', label: 'AI CEO', icon: BrainCircuit, badge: 'Human Authority' },
        { id: 'global_collaboration', label: 'Global Collaboration', icon: Network, badge: 'GCR-1.0' },
        { id: 'integrations', label: 'Intelligence Hub', icon: Globe2 },
      ]
    },
    {
      id: 'ai', label: 'AI & Automation', items: [
        { id: 'gpt_cowork', label: 'GPT Co-Work', icon: Sparkles },
        { id: 'ai_collaboration', label: 'AI Models Council', icon: Users },
        { id: 'sentinel', label: '24/7 Code Sentinel', icon: Bot, badge: '24/7' },
        { id: 'compute', label: 'Independent Compute', icon: Cpu, badge: 'Provider-Neutral' },
      ]
    },
    {
      id: 'data', label: 'Data & Privacy', items: [
        { id: 'accounts', label: 'Internet Accounts', icon: Globe },
        { id: 'control', label: 'Data Control', icon: SlidersHorizontal },
        { id: 'footprints', label: 'Footprint Tiers', icon: Database },
        { id: 'privacy_lab', label: 'Privacy Tech Lab', icon: Lock },
        { id: 'gmail', label: 'Gmail', icon: Mail, badge: currentUser ? 'Connected' : 'Auth' },
        { id: 'drive', label: 'Google Drive', icon: HardDrive, badge: currentUser ? 'Connected' : 'Auth' },
      ]
    },
    {
      id: 'revenue', label: 'Revenue', items: [
        { id: 'marketplace', label: 'Marketplace & Bids', icon: Scale, badge: pendingOffersCount || undefined },
        { id: 'compensation', label: 'Compensation Engine', icon: Coins },
        { id: 'monetization_sprint', label: 'Monetization Sprint', icon: BadgeDollarSign },
      ]
    },
    {
      id: 'governance', label: 'Governance', items: [
        { id: 'compliance', label: 'Compliance Scientist', icon: ShieldAlert },
        { id: 'broker', label: 'AI Broker & Strategy', icon: Sparkles },
        { id: 'patent', label: 'Patent & IP', icon: Scale },
        { id: 'exposures', label: 'Clawback Audit', icon: FileText },
      ]
    }
  ];

  const activeItem = groups.flatMap(g => g.items).find(i => i.id === activeTab);
  const navigate = (id: string) => {
    setActiveTab(id);
    setOpenGroup(null);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-6">
        <div className="flex min-h-14 items-center gap-3">
          <button onClick={() => navigate('overview')} className="flex min-w-0 items-center gap-2.5 text-left" aria-label="GLORIFIER AI home">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white">GLORIFIER AI</span>
                <span className="hidden rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 sm:inline">CONTROL PLANE</span>
              </div>
              <div className="hidden truncate text-[10px] text-slate-500 sm:block">Provider-neutral intelligence orchestration</div>
            </div>
          </button>

          <div className="ml-auto hidden items-center gap-1.5 md:flex">
            {groups.map(group => (
              <div key={group.id} className="relative">
                <button
                  onClick={() => setOpenGroup(openGroup === group.id ? null : group.id)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold transition ${group.items.some(i => i.id === activeTab) ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
                >
                  {group.label}<ChevronDown className={`h-3 w-3 transition ${openGroup === group.id ? 'rotate-180' : ''}`} />
                </button>
                {openGroup === group.id && (
                  <div className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-slate-800 bg-slate-950 p-1.5 shadow-2xl">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      return (
                        <button key={item.id} onClick={() => navigate(item.id)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${activeTab === item.id ? 'bg-emerald-500/10 text-emerald-300' : 'text-slate-300 hover:bg-slate-900'}`}>
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {item.badge && <span className="text-[9px] text-slate-500">{item.badge}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-[10px]">
              <span className="text-slate-500">AI</span> <span className="font-medium text-emerald-400">{policy.aiModel || 'Provider-neutral'}</span>
            </div>
            <button onClick={onOpenWithdraw} className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 hover:border-emerald-500/40">
              <Wallet className="h-3.5 w-3.5" /> ${stats.totalEarnedUsd.toFixed(2)}
            </button>
          </div>

          {currentUser ? (
            <button onClick={onLogout} title="Sign out" className="hidden h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-emerald-400 sm:flex">
              {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : <UserIcon className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <button onClick={onLogin} className="hidden items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-900 sm:flex">
              <LogIn className="h-3.5 w-3.5 text-emerald-400" /> Sign in
            </button>
          )}

          <button onClick={() => setMobileOpen(!mobileOpen)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-300 md:hidden" aria-label="Open navigation">
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-900 py-2 md:hidden">
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
          <span className="truncate text-[11px] text-slate-400">{activeItem?.label || 'Overview'}</span>
          <span className="ml-auto text-[10px] text-emerald-400">AI Active</span>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-800 py-2 md:hidden">
            {groups.map(group => (
              <div key={group.id} className="border-b border-slate-900 py-1 last:border-0">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">{group.label}</div>
                {group.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} onClick={() => navigate(item.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs ${activeTab === item.id ? 'bg-emerald-500/10 text-emerald-300' : 'text-slate-400'}`}>
                      <Icon className="h-3.5 w-3.5" /> {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="flex gap-2 px-2 pt-2">
              <button onClick={onOpenWithdraw} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950"><Wallet className="h-3.5 w-3.5" /> ${stats.totalEarnedUsd.toFixed(2)}</button>
              {currentUser ? (
                <button onClick={onLogout} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300"><LogOut className="h-3.5 w-3.5" /></button>
              ) : (
                <button onClick={onLogin} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300"><LogIn className="h-3.5 w-3.5" /></button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
