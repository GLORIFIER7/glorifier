import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OverviewTab } from './components/OverviewTab';
import { FootprintManager } from './components/FootprintManager';
import { AiBrokerConsole } from './components/AiBrokerConsole';
import { MarketplaceOffers } from './components/MarketplaceOffers';
import { BrokerExposureAudit } from './components/BrokerExposureAudit';
import { WithdrawModal } from './components/WithdrawModal';
import { DataSampleModal } from './components/DataSampleModal';
import { CompensationEngine } from './components/CompensationEngine';
import { PrivacyTechLab } from './components/PrivacyTechLab';
import { DataControlDashboard } from './components/DataControlDashboard';
import { GmailGovernanceTab } from './components/GmailGovernanceTab';
import { DriveGovernanceTab } from './components/DriveGovernanceTab';
import { AiModelsCollaborationManagement } from './components/AiModelsCollaborationManagement';
import { AIRoleCommandCenter } from './components/AIRoleCommandCenter';
import { MonetizationManager } from './components/MonetizationManager';
import { BinanceNftDashboard } from './components/BinanceNftDashboard';
import { DataAssetRegistry } from './components/DataAssetRegistry';
import { BusinessIntelligenceDashboard } from './components/BusinessIntelligenceDashboard';
import { CompetitiveIntelligenceEngine } from './components/CompetitiveIntelligenceEngine';
import { BrandWebMonitoring } from './components/BrandWebMonitoring';
import { 
  initialStats, 
  initialFootprints, 
  initialBuyerOffers, 
  initialBrokerExposures, 
  initialTransactions, 
  defaultPolicy 
} from './data/initialData';
import { initialActiveGrants, initialUsageTelemetry } from './data/grantsAndTelemetryData';
import { 
  DataFootprintSource, 
  PrivacyTier, 
  MonetizationPolicy, 
  BuyerOffer, 
  CompensationTransaction, 
  DataBrokerExposure,
  ActiveDataGrant,
  UsageTelemetryEvent
} from './types';
import { 
  auth, 
  loginWithGoogle, 
  authorizeGoogleWorkspace,
  logout, 
  testFirestoreConnection,
  authenticatedFetch
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  saveUserPolicy, 
  saveActiveGrant, 
  recordTelemetryEvent, 
  subscribeToUserPolicy, 
  subscribeToUserGrants 
} from './services/firestoreService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [stats, setStats] = useState(initialStats);
  const [footprints, setFootprints] = useState<DataFootprintSource[]>(initialFootprints);
  const [offers, setOffers] = useState<BuyerOffer[]>(initialBuyerOffers);
  const [exposures, setExposures] = useState<DataBrokerExposure[]>(initialBrokerExposures);
  const [transactions, setTransactions] = useState<CompensationTransaction[]>(initialTransactions);
  const [policy, setPolicy] = useState<MonetizationPolicy>(defaultPolicy);
  const [grants, setGrants] = useState<ActiveDataGrant[]>(initialActiveGrants);
  const [telemetryEvents, setTelemetryEvents] = useState<UsageTelemetryEvent[]>(initialUsageTelemetry);

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [inspectingFootprint, setInspectingFootprint] = useState<DataFootprintSource | null>(null);

  // Google Workspace is optional and must never block the Command Center.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      testFirestoreConnection().catch((error) => {
        console.warn('Firebase connection unavailable; continuing without it.', error);
      });

      unsubscribe = onAuthStateChanged(
        auth,
        (user) => setCurrentUser(user),
        (error) => console.warn('Google Workspace auth unavailable; continuing without it.', error),
      );
    } catch (error) {
      console.warn('Google Workspace integration unavailable; continuing without it.', error);
    }

    return () => unsubscribe?.();
  }, []);

  // Railway + Neon is the authoritative application state. Firebase remains optional for Google Workspace only.
  useEffect(() => {
    const userReference = currentUser?.uid || 'anonymous';
    authenticatedFetch('/api/state')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(`State HTTP ${res.status}`)))
      .then((state) => {
        if (state.policy) setPolicy(state.policy);
        if (Array.isArray(state.offers) && state.offers.length) setOffers(state.offers);
        if (Array.isArray(state.grants) && state.grants.length) setGrants(state.grants);
        if (Array.isArray(state.footprints) && state.footprints.length) setFootprints(state.footprints);
        if (Array.isArray(state.exposures) && state.exposures.length) setExposures(state.exposures);
        if (Array.isArray(state.telemetryEvents)) setTelemetryEvents(state.telemetryEvents);
        if (Array.isArray(state.transactions)) setTransactions(state.transactions);
        if (state.stats) setStats((prev) => ({ ...prev, ...state.stats }));
        if (!state.policy && (!state.offers?.length && !state.grants?.length && !state.footprints?.length)) {
          void persistState({ policy, offers: initialBuyerOffers, grants: initialActiveGrants, footprints: initialFootprints, exposures: initialBrokerExposures, telemetryEvents: initialUsageTelemetry, transactions: initialTransactions });
        }
      })
      .catch((error) => console.warn('Authoritative backend state unavailable; keeping local read-only seed data.', error));
  }, [currentUser]);

  const persistState = async (payload: Record<string, unknown>) => {
    const userReference = currentUser?.uid || 'anonymous';
    try {
      const res = await authenticatedFetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userReference, ...payload }),
      });
      if (!res.ok) throw new Error(`State update HTTP ${res.status}`);
    } catch (error) {
      console.error('Failed to persist authoritative state:', error);
    }
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleWorkspaceLogin = async () => {
    try {
      await authorizeGoogleWorkspace();
    } catch (err) {
      console.error('Workspace authorization error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Toggle footprint monetization
  const handleToggleFootprint = (id: string) => {
    setFootprints(prev => {
      const next = prev.map(f => {
        if (f.id === id) {
          const willMonetize = !f.isMonetized;
          return {
            ...f,
            isMonetized: willMonetize,
            status: willMonetize ? ('active-monetizing' as const) : ('shielded-private' as const),
            userMonthlyCompUsd: willMonetize ? Math.round(f.marketMonthlyValueUsd * 0.8) : 0
          };
        }
        return f;
      });

      // Recalculate stats
      const activeCount = next.filter(f => f.isMonetized).length;
      const totalComp = next.filter(f => f.isMonetized).reduce((sum, f) => sum + f.userMonthlyCompUsd, 0);
      setStats(s => ({
        ...s,
        activeDataStreamsCount: activeCount,
        monthlyPacingUsd: totalComp
      }));

      void persistState({ footprints: next });
      return next;
    });
  };

  // Update privacy tier & epsilon
  const handleUpdatePrivacyTier = (id: string, tier: PrivacyTier, epsilon: number) => {
    setFootprints(prev => {
      const next = prev.map(f => {
      if (f.id === id) {
        // Higher epsilon gives higher buyer yield, lower epsilon slightly lower
        const multiplier = epsilon < 0.25 ? 0.65 : epsilon < 0.6 ? 0.8 : 0.95;
        const adjustedComp = f.isMonetized ? Math.round(f.marketMonthlyValueUsd * multiplier) : 0;
        return {
          ...f,
          privacyTier: tier,
          privacyEpsilon: epsilon,
          userMonthlyCompUsd: adjustedComp
        };
      }
      return f;
      });
      void persistState({ footprints: next });
      return next;
    });
  };

  // Update policy with dynamic shield calculation
  const handleUpdatePolicy = (newPolicy: Partial<MonetizationPolicy>) => {
    setPolicy(prev => {
      const updated = { ...prev, ...newPolicy };
      
      // Calculate dynamic privacy shield score based on policy protections
      let baseShield = 91;
      if (updated.brokerMode === 'strict-sovereign') {
        baseShield = 95;
      } else if (updated.brokerMode === 'balanced-protective') {
        baseShield = 91;
      } else {
        baseShield = 84;
      }

      // Epsilon strength factor (lower epsilon = more noise = stronger mathematical shield)
      if (updated.globalEpsilon <= 0.15) {
        baseShield += 2;
      } else if (updated.globalEpsilon <= 0.35) {
        baseShield += 1;
      } else if (updated.globalEpsilon >= 0.60) {
        baseShield -= 2;
      }

      // Protective constraints
      if (!updated.allowAdTargeting) baseShield += 1;
      if (!updated.allowInsuranceRiskProfiling) baseShield += 1;
      if (!updated.allowAiModelPretraining) baseShield += 1;

      const finalShield = Math.min(100, Math.max(50, baseShield));

      // Calculate estimated pacing
      let pacing = 215.30;
      if (updated.brokerMode === 'autonomous-maximize') {
        pacing = 382.40;
      } else if (updated.brokerMode === 'strict-sovereign') {
        pacing = 145.00;
      }

      setStats(s => ({ 
        ...s, 
        monthlyPacingUsd: pacing, 
        privacyShieldIndex: finalShield 
      }));

      void persistState({ policy: updated });

      return updated;
    });
  };

  // Accept offer — persisted by the Railway API; no client-side earnings settlement.
  const handleAcceptOffer = async (offerId: string) => {
    const res = await authenticatedFetch('/api/marketplace/offers/' + encodeURIComponent(offerId) + '/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({  }),
    });
    if (!res.ok) throw new Error(`Offer acceptance HTTP ${res.status}`);
    const state = await res.json();
    if (Array.isArray(state.offers)) setOffers(state.offers);
    if (Array.isArray(state.transactions)) setTransactions(state.transactions);
    if (state.stats) setStats((prev) => ({ ...prev, ...state.stats }));
  };

  // Reject offer
  const handleRejectOffer = async (offerId: string) => {
    const res = await authenticatedFetch('/api/marketplace/offers/' + encodeURIComponent(offerId) + '/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userReference: currentUser?.uid || 'anonymous' }),
    });
    if (!res.ok) throw new Error(`Offer rejection HTTP ${res.status}`);
    const state = await res.json();
    if (Array.isArray(state.offers)) setOffers(state.offers);
  };

  // Counter offer
  const handleCounterOffer = async (offerId: string, counterAmount: number) => {
    const res = await authenticatedFetch('/api/marketplace/offers/' + encodeURIComponent(offerId) + '/counter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ counterAmount }),
    });
    if (!res.ok) throw new Error(`Offer counter HTTP ${res.status}`);
    const state = await res.json();
    if (Array.isArray(state.offers)) setOffers(state.offers);
  };

  // Dispatch clawback notice to data broker
  const handleDispatchClawback = (expId: string) => {
    setExposures(prev => prev.map(exp => {
      if (exp.id === expId) {
        return {
          ...exp,
          status: 'clawback_sent' as const,
          actionTimestamp: `Clawback statutory order dispatched today (${new Date().toLocaleDateString()})`
        };
      }
      return exp;
    }));

    setStats(s => ({
      ...s,
      privacyShieldIndex: Math.min(100, s.privacyShieldIndex + 2)
    }));
  };

  // Handle successful payout claim
  const handleWithdrawSuccess = (amount: number, method: string, txHash: string) => {
    setStats(s => ({
      ...s,
      totalEarnedUsd: Math.max(0, s.totalEarnedUsd - amount)
    }));
  };

  // Handle grant revocation
  const handleRevokeGrant = async (grantId: string) => {
    const res = await authenticatedFetch('/api/grants/' + encodeURIComponent(grantId) + '/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userReference: currentUser?.uid || 'anonymous' }),
    });
    if (!res.ok) throw new Error(`Grant revoke HTTP ${res.status}`);
    const state = await res.json();
    if (Array.isArray(state.grants)) setGrants(state.grants);
  };

  // Handle grant permission update
  const handleUpdateGrantPermissions = async (grantId: string, updatedFields: string[]) => {
    const res = await authenticatedFetch('/api/grants/' + encodeURIComponent(grantId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userReference: currentUser?.uid || 'anonymous', sharedFields: updatedFields }),
    });
    if (!res.ok) throw new Error(`Grant update HTTP ${res.status}`);
    const state = await res.json();
    if (Array.isArray(state.grants)) setGrants(state.grants);
  };

  // Trigger usage event — recorded server-side; client never creates a payout.
  const handleTriggerSimulatedUsage = async (model: 'Per-Query' | 'Data Shapley' | 'Cohort Subscription' | 'Proof Attestation') => {
    const res = await authenticatedFetch('/api/telemetry/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userReference: currentUser?.uid || 'anonymous', model }),
    });
    if (!res.ok) throw new Error(`Telemetry HTTP ${res.status}`);
    const state = await res.json();
    if (Array.isArray(state.telemetryEvents)) setTelemetryEvents(state.telemetryEvents);
    if (Array.isArray(state.transactions)) setTransactions(state.transactions);
    if (state.stats) setStats((prev) => ({ ...prev, ...state.stats }));
  };

  // Batch clear settlement
  const handleClearSettlement = async () => {
    const res = await authenticatedFetch('/api/settlements/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userReference: currentUser?.uid || 'anonymous' }),
    });
    if (!res.ok) throw new Error(`Settlement clear HTTP ${res.status}`);
    const state = await res.json();
    if (state.stats) setStats((prev) => ({ ...prev, ...state.stats }));
  };

  const pendingOffersCount = offers.filter(o => o.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Platform Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        policy={policy}
        onOpenWithdraw={() => setIsWithdrawOpen(true)}
        pendingOffersCount={pendingOffersCount}
        currentUser={currentUser}
      />

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-200/90">
          <span className="font-semibold">Demo data:</span> seeded balances, buyer offers, telemetry and transaction records are illustrative. Verified earnings require a connected payment or revenue event.
        </div>
      </div>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {activeTab === 'data_registry' && (
          <DataAssetRegistry />
        )}

        {activeTab === 'competitive_intelligence' && (
          <CompetitiveIntelligenceEngine />
        )}

        {activeTab === 'brand_monitoring' && (
          <BrandWebMonitoring />
        )}

        {activeTab === 'business_intelligence' && (
          <BusinessIntelligenceDashboard />
        )}

        {activeTab === 'overview' && (
          <OverviewTab
            stats={stats}
            footprints={footprints}
            policy={policy}
            onUpdatePolicy={handleUpdatePolicy}
            onToggleFootprint={handleToggleFootprint}
            onOpenWithdraw={() => setIsWithdrawOpen(true)}
            onNavigateToTab={setActiveTab}
            transactions={transactions}
          />
        )}

        {activeTab === 'control' && (
          <DataControlDashboard
            grants={grants}
            onRevokeGrant={handleRevokeGrant}
            onUpdateGrantPermissions={handleUpdateGrantPermissions}
          />
        )}

        {activeTab === 'gmail' && (
          <GmailGovernanceTab
            currentUser={currentUser}
            onLogin={handleWorkspaceLogin}
            onAddEarnings={(_amount, _desc) => {
              console.warn('Workspace earnings are now recorded only by verified backend revenue events.');
            }}
          />
        )}

        {activeTab === 'drive' && (
          <DriveGovernanceTab
            currentUser={currentUser}
            onLogin={handleWorkspaceLogin}
            onAddEarnings={(_amount, _desc) => {
              console.warn('Workspace earnings are now recorded only by verified backend revenue events.');
            }}
          />
        )}

        {activeTab === 'compensation' && (
          <CompensationEngine
            telemetryEvents={telemetryEvents}
            onTriggerSimulatedUsage={handleTriggerSimulatedUsage}
            onClearSettlement={handleClearSettlement}
            totalPendingUsd={stats.pendingSettlementUsd}
          />
        )}

        {activeTab === 'privacy_lab' && (
          <PrivacyTechLab />
        )}

        {activeTab === 'footprints' && (
          <FootprintManager
            footprints={footprints}
            onToggleMonetization={handleToggleFootprint}
            onUpdatePrivacyTier={handleUpdatePrivacyTier}
            onInspectDataSamples={(fp) => setInspectingFootprint(fp)}
          />
        )}

        {activeTab === 'broker' && (
          <AiBrokerConsole
            policy={policy}
            onUpdatePolicy={handleUpdatePolicy}
            footprints={footprints}
          />
        )}

        {activeTab === 'ai_roles' && (
          <AIRoleCommandCenter />
        )}

        {activeTab === 'binance_nft' && (
          <BinanceNftDashboard />
        )}

        {activeTab === 'monetization_manager' && (
          <MonetizationManager
            currentUser={currentUser}
            policy={policy}
            stats={stats}
            onUpdatePolicy={handleUpdatePolicy}
          />
        )}

        {activeTab === 'ai_collaboration' && (
          <AiModelsCollaborationManagement
            policy={policy}
            onUpdatePolicy={handleUpdatePolicy}
            footprints={footprints}
            onOpenBrokerTab={() => setActiveTab('broker')}
          />
        )}

        {activeTab === 'marketplace' && (
          <MarketplaceOffers
            offers={offers}
            onAcceptOffer={handleAcceptOffer}
            onRejectOffer={handleRejectOffer}
            onCounterOffer={handleCounterOffer}
            policy={policy}
          />
        )}

        {activeTab === 'exposures' && (
          <BrokerExposureAudit
            exposures={exposures}
            onDispatchClawback={handleDispatchClawback}
          />
        )}
      </main>

      {/* Withdraw Modal */}
      {isWithdrawOpen && (
        <WithdrawModal
          stats={stats}
          policy={policy}
          onClose={() => setIsWithdrawOpen(false)}
          onWithdrawSuccess={handleWithdrawSuccess}
          onUpdatePolicy={handleUpdatePolicy}
          userReference={currentUser?.uid || 'anonymous'}
        />
      )}

      {/* Data Noise & Sample Inspector Modal */}
      {inspectingFootprint && (
        <DataSampleModal
          footprint={inspectingFootprint}
          onClose={() => setInspectingFootprint(null)}
          onUpdateEpsilon={(id, eps) => handleUpdatePrivacyTier(id, inspectingFootprint.privacyTier, eps)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Personal Data Monetization Platform &bull; Autonomous AI Data Governance</span>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>ZK-Attestation: Active</span>
            <span>Differential Privacy: \u03b5={policy.globalEpsilon}</span>
            <span>CCPA / GDPR Statutory Rights: Protected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
