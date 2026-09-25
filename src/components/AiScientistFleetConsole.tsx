import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  Coins, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Terminal, 
  ExternalLink, 
  ChevronRight, 
  RefreshCw, 
  Cpu, 
  Zap, 
  Layers, 
  Play, 
  Pause, 
  Sliders, 
  Plus, 
  Code, 
  FileText, 
  FileCode, 
  ArrowUpRight, 
  Lock, 
  Search, 
  Check, 
  AlertTriangle,
  Microscope,
  Atom,
  Flame,
  Globe2,
  X
} from 'lucide-react';
import { ScientistAgent, InternetIssue, ScientistMonetizationState, ScientistDomain } from '../lib/scientist-fleet';

interface AiScientistFleetConsoleProps {
  onAddEarnings?: (amount: number, description: string) => void;
  onOpenWithdrawModal?: () => void;
}

export const AiScientistFleetConsole: React.FC<AiScientistFleetConsoleProps> = ({
  onAddEarnings,
  onOpenWithdrawModal
}) => {
  const [fleet, setFleet] = useState<ScientistAgent[]>([]);
  const [issues, setIssues] = useState<InternetIssue[]>([]);
  const [monetization, setMonetization] = useState<ScientistMonetizationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvingIssueId, setResolvingIssueId] = useState<string | null>(null);
  const [activeDomainFilter, setActiveDomainFilter] = useState<string>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
  const [selectedIssueForModal, setSelectedIssueForModal] = useState<InternetIssue | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Submit target form state
  const [newTargetUrl, setNewTargetUrl] = useState('');
  const [newTargetTitle, setNewTargetTitle] = useState('');
  const [newTargetDomain, setNewTargetDomain] = useState<ScientistDomain>('security_vulnerabilities');
  const [newTargetSummary, setNewTargetSummary] = useState('');
  const [newTargetBounty, setNewTargetBounty] = useState<number>(250);

  const loadData = async () => {
    try {
      const [fleetRes, issuesRes, monRes] = await Promise.all([
        fetch('/api/scientists/fleet', { cache: 'no-store' }),
        fetch('/api/scientists/issues', { cache: 'no-store' }),
        fetch('/api/scientists/monetization', { cache: 'no-store' })
      ]);

      if (fleetRes.ok) {
        const data = await fleetRes.json();
        if (data.fleet) setFleet(data.fleet);
      }
      if (issuesRes.ok) {
        const data = await issuesRes.json();
        if (data.issues) setIssues(data.issues);
      }
      if (monRes.ok) {
        const data = await monRes.json();
        if (data.state) setMonetization(data.state);
      }
    } catch (err) {
      console.error('Failed loading scientist fleet data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // 10s live poll
    return () => clearInterval(interval);
  }, []);

  const showBannerMessage = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 6000);
  };

  // Toggle 24/7 background running
  const handleToggleDaemon = async () => {
    try {
      const newState = !monetization?.is247AutonomousRunning;
      const res = await fetch('/api/scientists/loop/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState })
      });
      if (res.ok) {
        const data = await res.json();
        setMonetization(prev => prev ? { ...prev, is247AutonomousRunning: data.is247AutonomousRunning } : null);
        showBannerMessage(data.is247AutonomousRunning ? '24/7 Autonomous Scientist Fleet: RESUMED' : '24/7 Autonomous Loop: PAUSED');
      }
    } catch (err) {
      console.error('Error toggling daemon:', err);
    }
  };

  // Trigger instant automated resolution by AI Scientist
  const handleResolveIssue = async (issueId: string) => {
    setResolvingIssueId(issueId);
    try {
      const res = await fetch('/api/scientists/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, actor: 'human-owner' })
      });
      if (res.ok) {
        const data = await res.json();
        setIssues(prev => prev.map(i => i.id === issueId ? data.issue : i));
        if (data.monetization) setMonetization(data.monetization);
        if (data.issue?.resolutionArtifact) {
          setSelectedIssueForModal(data.issue);
        }
        showBannerMessage(`Issue verified & remediated by AI Scientist. Bounty claimed: $${data.issue?.monetization?.bountyRewardUsd || 0}`);
        if (onAddEarnings && data.issue?.monetization?.claimed) {
          onAddEarnings(data.issue.monetization.bountyRewardUsd, `Scientist Fleet Bounty: ${data.issue.title}`);
        }
        await loadData();
      }
    } catch (err) {
      console.error('Resolution error:', err);
    } finally {
      setResolvingIssueId(null);
    }
  };

  // Approve high-value or human-gated bounty
  const handleApproveBounty = async (issueId: string) => {
    try {
      const res = await fetch('/api/scientists/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, approver: 'human-owner' })
      });
      if (res.ok) {
        const data = await res.json();
        setIssues(prev => prev.map(i => i.id === issueId ? data.issue : i));
        if (data.monetization) setMonetization(data.monetization);
        if (selectedIssueForModal?.id === issueId) {
          setSelectedIssueForModal(data.issue);
        }
        showBannerMessage(`Human Owner approved: $${data.issue?.monetization?.bountyRewardUsd} credited to Sovereign Vault!`);
        if (onAddEarnings && data.issue?.monetization?.bountyRewardUsd) {
          onAddEarnings(data.issue.monetization.bountyRewardUsd, `Human-Approved Bounty: ${data.issue.title}`);
        }
        await loadData();
      }
    } catch (err) {
      console.error('Approval error:', err);
    }
  };

  // Claim all accrued yield from scientist fleet to personal wallet
  const handleClaimYield = async () => {
    try {
      const res = await fetch('/api/scientists/monetization/claim', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.claimedUsd > 0) {
          if (onAddEarnings) {
            onAddEarnings(data.claimedUsd, '24/7 AI Scientist Fleet Yield Vault Claim');
          }
          showBannerMessage(`Successfully claimed $${data.claimedUsd.toFixed(2)} to your sovereign balance! (Tx: ${data.txHash.slice(0, 10)}...)`);
          await loadData();
        } else {
          showBannerMessage('No accrued claimable yield at this moment. 24/7 fleet is currently solving issues.');
        }
      }
    } catch (err) {
      console.error('Claim yield error:', err);
    }
  };

  // Submit target to fleet
  const handleSubmitNewTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetUrl || !newTargetTitle) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/scientists/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: newTargetUrl,
          title: newTargetTitle,
          domain: newTargetDomain,
          summary: newTargetSummary,
          bountyRewardUsd: Number(newTargetBounty) || 175
        })
      });
      if (res.ok) {
        const data = await res.json();
        setIssues(prev => [data.issue, ...prev]);
        setIsSubmitModalOpen(false);
        setNewTargetUrl('');
        setNewTargetTitle('');
        setNewTargetSummary('');
        showBannerMessage(`Target dispatched to AI Scientist Fleet: ${data.issue.title}`);
        await loadData();
      }
    } catch (err) {
      console.error('Submit target error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredIssues = issues.filter(issue => {
    const matchesDomain = activeDomainFilter === 'all' || issue.domain === activeDomainFilter;
    const matchesStatus = activeStatusFilter === 'all' || issue.status === activeStatusFilter;
    return matchesDomain && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 24/7 Global Scientist Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-900 via-slate-950 to-emerald-950/40 p-6 shadow-2xl">
        <div className="absolute -right-8 -top-8 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className={`w-2 h-2 rounded-full ${monetization?.is247AutonomousRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {monetization?.is247AutonomousRunning ? '24/7 AUTONOMOUS OPERATION: ACTIVE' : '24/7 AUTONOMOUS LOOP: PAUSED'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                MULTI-AGENT SCIENTIST FLEET
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-violet-500/10 text-violet-300 border border-violet-500/20">
                PERMANENT GOVERNANCE
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Atom className="w-8 h-8 text-emerald-400 animate-spin-slow" />
              AI Multi-Agent Scientists Fleet
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl">
              Five specialized autonomous domain-expert AI scientists discovering, diagnosing, and mathematically resolving issues, zero-day CVEs, latency bottlenecks, and statutory compliance violations across the internet 24/7 for continuous monetization.
            </p>
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleToggleDaemon}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all shadow-sm ${
                monetization?.is247AutonomousRunning 
                  ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/30' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/40'
              }`}
            >
              {monetization?.is247AutonomousRunning ? (
                <>
                  <Pause className="w-4 h-4" /> Pause 24/7 Loop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Resume 24/7 Fleet
                </>
              )}
            </button>

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" /> Submit Internet Target
            </button>
          </div>
        </div>

        {/* Global Key Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Total Fleet Yield
            </div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
              ${(monetization?.totalEarnedUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/10">
            <div className="text-[10px] uppercase font-semibold text-emerald-300 flex items-center justify-between">
              <span>Claimable Vault</span>
              <button 
                onClick={handleClaimYield}
                disabled={(monetization?.claimableYieldUsd || 0) <= 0}
                className="text-[10px] text-emerald-400 hover:underline font-bold disabled:opacity-40"
              >
                Claim
              </button>
            </div>
            <div className="text-lg font-bold font-mono text-white mt-1 flex items-center justify-between">
              <span>${(monetization?.claimableYieldUsd || 0).toFixed(2)}</span>
              {(monetization?.claimableYieldUsd || 0) > 0 && (
                <button
                  onClick={handleClaimYield}
                  className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-sans text-[10px] font-bold"
                >
                  Withdraw
                </button>
              )}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> 24h Run-Rate
            </div>
            <div className="text-lg font-bold font-mono text-cyan-300 mt-1">
              ${(monetization?.runRateDailyUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}/day
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" /> Resolved Issues
            </div>
            <div className="text-lg font-bold font-mono text-violet-300 mt-1">
              {monetization?.bountiesResolvedCount || 0}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" /> Avg Bounty
            </div>
            <div className="text-lg font-bold font-mono text-amber-300 mt-1">
              ${(monetization?.averageBountyUsd || 0).toFixed(2)}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-rose-400" /> 24/7 Cycles
            </div>
            <div className="text-lg font-bold font-mono text-slate-200 mt-1">
              {monetization?.cycleCount || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionSuccessMessage && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Specialized AI Scientist Roster Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Microscope className="w-5 h-5 text-emerald-400" />
              Active Autonomous Scientist Fleet (5 Specialists)
            </h3>
            <p className="text-xs text-slate-400">
              Each scientist agent operates autonomously under the GLORIFIER AI CEO governance layer, collaborating to fix complex internet bugs.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            Status: All 5 Agents Synced & Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {fleet.map(scientist => (
            <div 
              key={scientist.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between hover:border-slate-700 transition-all hover:shadow-lg group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${scientist.avatarGradient} flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                    {scientist.codename.slice(0, 2)}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    24/7 ACTIVE
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-xs font-mono font-bold text-emerald-400">{scientist.codename}</div>
                  <h4 className="text-sm font-bold text-white mt-0.5">{scientist.name}</h4>
                  <div className="text-[11px] text-slate-400 leading-tight mt-0.5 font-medium">{scientist.title}</div>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-3 mt-2 leading-relaxed">
                  {scientist.bio}
                </p>

                {/* Capabilities pills */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {scientist.capabilities.slice(0, 2).map((cap, idx) => (
                    <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {cap}
                    </span>
                  ))}
                </div>

                {/* Current Active Task */}
                {scientist.currentTask && (
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-mono flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-cyan-400" /> Active Task
                      </span>
                      <span className="text-emerald-400 font-bold font-mono">{scientist.currentTask.progress}%</span>
                    </div>
                    <div className="text-[10px] text-slate-200 font-medium truncate mt-1" title={scientist.currentTask.issueType}>
                      {scientist.currentTask.issueType}
                    </div>
                    <div className="text-[9px] text-slate-500 truncate mt-0.5">
                      {scientist.currentTask.targetUrlOrRepo}
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-500" 
                        style={{ width: `${scientist.currentTask.progress}%` }} 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom stats */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-slate-500">Total Yield</div>
                  <div className="font-mono font-bold text-emerald-400 text-xs">
                    ${scientist.totalBountiesEarnedUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500">Resolved</div>
                  <div className="font-mono font-bold text-white text-xs">{scientist.totalIssuesResolved} fixes</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Internet Radar & Issues Discovered */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-cyan-400" />
              Internet Radar & Detected Issues Feed
            </h3>
            <p className="text-xs text-slate-400">
              Live vulnerabilities, breaking schema changes, cloud bottlenecks, and compliance clawbacks actively queued for resolution.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeDomainFilter}
              onChange={(e) => setActiveDomainFilter(e.target.value)}
              className="text-xs bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Domains ({issues.length})</option>
              <option value="security_vulnerabilities">Security CVEs</option>
              <option value="performance_systems">Systems & Performance</option>
              <option value="statutory_compliance">Statutory Compliance</option>
              <option value="api_interoperability">API Interoperability</option>
              <option value="monetization_arbitrage">Bounty Arbitrage</option>
            </select>

            <select
              value={activeStatusFilter}
              onChange={(e) => setActiveStatusFilter(e.target.value)}
              className="text-xs bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="detected">Detected (Pending Fix)</option>
              <option value="patch_generated">Patch Generated</option>
              <option value="verified_resolved">Verified & Resolved</option>
              <option value="bounty_claimed">Bounty Claimed</option>
            </select>
          </div>
        </div>

        {/* Issue Cards Table / List */}
        <div className="space-y-3">
          {filteredIssues.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400 text-xs">
              No issues matching current filters. 24/7 Scientist Fleet is actively probing the internet.
            </div>
          ) : (
            filteredIssues.map(issue => {
              const assignedDoc = fleet.find(s => s.id === issue.assignedScientistId);
              const isResolving = resolvingIssueId === issue.id;

              return (
                <div 
                  key={issue.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5 hover:border-slate-700 transition-all shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Severity */}
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          issue.severity === 'critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          issue.severity === 'high' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {issue.severity}
                        </span>

                        {/* Status */}
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          issue.status === 'bounty_claimed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          issue.status === 'verified_resolved' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                          issue.status === 'patch_generated' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {issue.status.replace('_', ' ').toUpperCase()}
                        </span>

                        {/* Assigned Doctor */}
                        {assignedDoc && (
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            {assignedDoc.codename} ({assignedDoc.name})
                          </span>
                        )}

                        <span className="text-[10px] text-slate-500">
                          {new Date(issue.detectedAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-white">
                        {issue.title}
                      </h4>

                      <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5 truncate">
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span>{issue.target}</span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {issue.summary}
                      </p>

                      {issue.diagnosticDetails.cveOrCode && (
                        <div className="text-[11px] font-mono text-slate-400 mt-1">
                          Ref: <span className="text-amber-400">{issue.diagnosticDetails.cveOrCode}</span> &bull; {issue.diagnosticDetails.vulnerabilityType}
                        </div>
                      )}
                    </div>

                    {/* Right side: Bounty & Action button */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-left sm:text-right">
                        <div className="text-[10px] uppercase font-semibold text-slate-400">Bounty Yield</div>
                        <div className="text-lg font-bold font-mono text-emerald-400 flex items-center gap-1">
                          ${issue.monetization.bountyRewardUsd.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                          {issue.monetization.sourcePlatform}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {issue.resolutionArtifact && (
                          <button
                            onClick={() => setSelectedIssueForModal(issue)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                          >
                            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                            View Diff
                          </button>
                        )}

                        {issue.status === 'detected' || issue.status === 'investigating' ? (
                          <button
                            onClick={() => handleResolveIssue(issue.id)}
                            disabled={isResolving}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
                          >
                            {isResolving ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Synthesizing...
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5" /> Fix with AI Scientist
                              </>
                            )}
                          </button>
                        ) : issue.status === 'patch_generated' && issue.monetization.requiresHumanApproval && !issue.monetization.approvedByHuman ? (
                          <button
                            onClick={() => handleApproveBounty(issue.id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-950/40"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve & Claim
                          </button>
                        ) : issue.status === 'verified_resolved' && !issue.monetization.claimed ? (
                          <button
                            onClick={() => handleResolveIssue(issue.id)}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5"
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Claim Reward
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-950/30 text-emerald-400 text-xs font-mono font-semibold border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Monetized
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Real-time Monetization Ledger */}
      {monetization && monetization.monetizationLedger.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400" />
                Real-Time 24/7 Monetization & Yield Settlement Ledger
              </h3>
              <p className="text-xs text-slate-400">
                Immutable audit trail of bug bounties, statutory settlements, and SLA credits earned by the scientist fleet.
              </p>
            </div>
            <button
              onClick={handleClaimYield}
              disabled={monetization.claimableYieldUsd <= 0}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
            >
              Transfer Vault to Wallet (${monetization.claimableYieldUsd.toFixed(2)})
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Scientist</th>
                    <th className="py-3 px-4">Issue Title & Scope</th>
                    <th className="py-3 px-4">Target Platform</th>
                    <th className="py-3 px-4">Tx Hash Proof</th>
                    <th className="py-3 px-4 text-right">Settled Yield</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {monetization.monetizationLedger.map(record => (
                    <tr key={record.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-cyan-300">
                        {record.scientistCodename}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-medium max-w-xs truncate" title={record.issueTitle}>
                        {record.issueTitle}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {record.targetPlatform}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[10px] truncate max-w-[120px]">
                        {record.txHash}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        +${record.rewardUsd.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Modal: View Patch & Verification Proof */}
      {selectedIssueForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    VERIFIED ARTIFACT
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Model: {selectedIssueForModal.resolutionArtifact?.modelUsed || 'gemini-3.8-flash'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedIssueForModal.title}
                </h3>
                <div className="text-xs font-mono text-cyan-400 mt-0.5">
                  {selectedIssueForModal.target}
                </div>
              </div>
              <button 
                onClick={() => setSelectedIssueForModal(null)} 
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanation */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Scientific Resolution Rationale</div>
              <p className="text-xs text-slate-200">
                {selectedIssueForModal.resolutionArtifact?.fixExplanation || selectedIssueForModal.summary}
              </p>
            </div>

            {/* Unified Git Diff / Resolution Notice */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-emerald-400" /> Unified Patch / Dispatch Artifact
                </span>
                <span className="text-[10px] text-slate-500 font-mono">SHA-256 Verified</span>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed max-h-72">
                {selectedIssueForModal.resolutionArtifact?.patchDiff}
              </pre>
            </div>

            {/* Verification Proof Hash */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>Cryptographic Proof:</span>
              <span className="text-emerald-400 truncate max-w-sm">
                {selectedIssueForModal.resolutionArtifact?.verificationProofHash}
              </span>
            </div>

            {/* Human Governance Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                Bounty: <span className="font-mono font-bold text-emerald-400">${selectedIssueForModal.monetization.bountyRewardUsd.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedIssueForModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Close
                </button>
                {selectedIssueForModal.status !== 'bounty_claimed' && (
                  <button
                    onClick={() => {
                      handleApproveBounty(selectedIssueForModal.id);
                      setSelectedIssueForModal(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
                  >
                    Human Owner: Approve & Claim Bounty
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Submit Internet Target to Scientist Fleet */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Atom className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Submit Target to AI Scientist Fleet</h3>
              </div>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Provide an internet repository, API endpoint, or data broker URL. The AI multi-agent scientists will autonomously inspect, generate a verified fix, and monetize the resolution.
            </p>

            <form onSubmit={handleSubmitNewTarget} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Target URL / Repository / Endpoint
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. github.com/organization/api-gateway"
                  value={newTargetUrl}
                  onChange={(e) => setNewTargetUrl(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Issue / Objective Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Memory Leak in Webhook Buffer / GDPR Erasure"
                  value={newTargetTitle}
                  onChange={(e) => setNewTargetTitle(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Specialist Domain
                  </label>
                  <select
                    value={newTargetDomain}
                    onChange={(e) => setNewTargetDomain(e.target.value as ScientistDomain)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="security_vulnerabilities">Security Vulnerabilities</option>
                    <option value="performance_systems">Systems & Performance</option>
                    <option value="statutory_compliance">Statutory Compliance</option>
                    <option value="api_interoperability">API Interoperability</option>
                    <option value="monetization_arbitrage">Monetization Arbitrage</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Target Bounty Reward ($)
                  </label>
                  <input
                    type="number"
                    min="25"
                    max="5000"
                    value={newTargetBounty}
                    onChange={(e) => setNewTargetBounty(Number(e.target.value))}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Diagnostic Context & Observed Behavior
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe error code, CVE ID, observed crash, or statutory violation..."
                  value={newTargetSummary}
                  onChange={(e) => setNewTargetSummary(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-950/40 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" /> Dispatch to Fleet
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
