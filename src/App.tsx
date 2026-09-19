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
  logout, 
  testFirestoreConnection 
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

  // Initialize Firebase Auth listener and test Firestore connection
  useEffect(() => {
    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  // Sync with Firestore when user is logged in
  useEffect(() => {
    if (!currentUser) return;

    // Listen to remote policy updates
    const unsubPolicy = subscribeToUserPolicy(currentUser.uid, (remotePolicy) => {
      if (remotePolicy) {
        setPolicy(remotePolicy);
      }
    });

    // Listen to remote grants updates
    const unsubGrants = subscribeToUserGrants(currentUser.uid, (remoteGrants) => {
      if (remoteGrants && remoteGrants.length > 0) {
        setGrants(remoteGrants);
      }
    });

    // Save current policy initially to ensure remote existence
    saveUserPolicy(currentUser.uid, policy).catch(console.error);

    return () => {
      unsubPolicy();
      unsubGrants();
    };
  }, [currentUser]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Login error:', err);
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

      return next;
    });
  };

  // Update privacy tier & epsilon
  const handleUpdatePrivacyTier = (id: string, tier: PrivacyTier, epsilon: number) => {
    setFootprints(prev => prev.map(f => {
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
    }));
  };

  // Update policy
  const handleUpdatePolicy = (newPolicy: Partial<MonetizationPolicy>) => {
    setPolicy(prev => {
      const updated = { ...prev, ...newPolicy };
      
      // If brokerMode changed, adjust pacing
      if (newPolicy.brokerMode === 'autonomous-maximize') {
        setStats(s => ({ ...s, monthlyPacingUsd: 382.40, privacyShieldIndex: 86 }));
      } else if (newPolicy.brokerMode === 'strict-sovereign') {
        setStats(s => ({ ...s, monthlyPacingUsd: 145.00, privacyShieldIndex: 99 }));
      } else if (newPolicy.brokerMode === 'balanced-protective') {
        setStats(s => ({ ...s, monthlyPacingUsd: 215.30, privacyShieldIndex: 94 }));
      }

      if (currentUser) {
        saveUserPolicy(currentUser.uid, updated).catch(console.error);
      }

      return updated;
    });
  };

  // Accept offer
  const handleAcceptOffer = (offerId: string) => {
    setOffers(prev => prev.map(o => {
      if (o.id === offerId) {
        return { ...o, status: 'ACCEPTED' as const };
      }
      return o;
    }));

    const accepted = offers.find(o => o.id === offerId);
    if (accepted) {
      setStats(s => ({
        ...s,
        monthlyPacingUsd: s.monthlyPacingUsd + accepted.offeredCompUsd,
        totalEarnedUsd: s.totalEarnedUsd + 15.00
      }));

      // Add a settlement transaction
      const newTx: CompensationTransaction = {
        id: `tx-${Date.now().toString().slice(-4)}`,
        timestamp: 'Just now',
        buyerName: accepted.buyerName,
        category: accepted.dataCategoriesNeeded[0] || 'browsing',
        amountUsd: 15.00,
        privacyTier: accepted.requiredPrivacyTier,
        txHash: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
        status: 'settled'
      };
      setTransactions(t => [newTx, ...t]);
    }
  };

  // Reject offer
  const handleRejectOffer = (offerId: string) => {
    setOffers(prev => prev.map(o => {
      if (o.id === offerId) {
        return { ...o, status: 'REJECTED' as const };
      }
      return o;
    }));
  };

  // Counter offer
  const handleCounterOffer = (offerId: string, counterAmount: number) => {
    setOffers(prev => prev.map(o => {
      if (o.id === offerId) {
        return {
          ...o,
          status: 'COUNTERED' as const,
          counterOfferAmount: counterAmount
        };
      }
      return o;
    }));
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
  const handleRevokeGrant = (grantId: string) => {
    setGrants(prev => prev.map(g => {
      if (g.id === grantId) {
        return {
          ...g,
          status: 'revoked' as const,
          ttlHoursRemaining: 0
        };
      }
      return g;
    }));
    setStats(s => ({
      ...s,
      privacyShieldIndex: Math.min(100, s.privacyShieldIndex + 3)
    }));
  };

  // Handle grant permission update
  const handleUpdateGrantPermissions = (grantId: string, updatedFields: string[]) => {
    setGrants(prev => prev.map(g => {
      if (g.id === grantId) {
        return {
          ...g,
          sharedFields: updatedFields
        };
      }
      return g;
    }));
  };

  // Trigger simulated telemetry usage event
  const handleTriggerSimulatedUsage = (model: 'Per-Query' | 'Data Shapley' | 'Cohort Subscription' | 'Proof Attestation') => {
    const payoutMap = {
      'Per-Query': 0.057,
      'Data Shapley': 0.338,
      'Cohort Subscription': 1.250,
      'Proof Attestation': 12.000
    };
    const payout = payoutMap[model] || 0.100;

    const newEvent: UsageTelemetryEvent = {
      id: `telemetry-${Date.now()}`,
      timestamp: 'Just now',
      grantId: 'grant-01',
      recipientOrg: model === 'Data Shapley' ? 'Anthropic AI Foundation Models Lab' : 'Stanford Quantitative Economics & Market Lab',
      dataCategory: 'ecommerce',
      eventType: model === 'Data Shapley' ? 'fl_gradient_update' : 'dp_query_laplace',
      queryUnits: 1,
      compensationUsd: payout,
      calculationModel: model,
      zkProofHash: '0x' + Math.random().toString(16).substring(2, 6) + '...' + Math.random().toString(16).substring(2, 6),
      epsilonConsumed: model === 'Per-Query' ? 0.02 : 0
    };

    setTelemetryEvents(prev => [newEvent, ...prev.slice(0, 15)]);
    setStats(s => ({
      ...s,
      totalEarnedUsd: s.totalEarnedUsd + payout,
      pendingSettlementUsd: s.pendingSettlementUsd + payout
    }));

    if (currentUser) {
      recordTelemetryEvent(currentUser.uid, newEvent).catch(console.error);
    }
  };

  // Batch clear settlement
  const handleClearSettlement = () => {
    setStats(s => ({
      ...s,
      pendingSettlementUsd: 0
    }));
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
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            onLogin={handleLogin}
            onAddEarnings={(amount, desc) => {
              setStats(s => ({
                ...s,
                totalEarnedUsd: s.totalEarnedUsd + amount,
                pendingSettlementUsd: s.pendingSettlementUsd + amount
              }));
              const newTx: CompensationTransaction = {
                id: `tx-gmail-${Date.now()}`,
                timestamp: 'Just now',
                buyerName: 'Verified Research Consortia',
                category: 'email',
                amountUsd: amount,
                privacyTier: 'differential-privacy',
                txHash: '0x' + Math.random().toString(16).substring(2, 6) + '...' + Math.random().toString(16).substring(2, 6),
                status: 'settled'
              };
              setTransactions(t => [newTx, ...t]);
            }}
          />
        )}

        {activeTab === 'drive' && (
          <DriveGovernanceTab
            currentUser={currentUser}
            onLogin={handleLogin}
            onAddEarnings={(amount, desc) => {
              setStats(s => ({
                ...s,
                totalEarnedUsd: s.totalEarnedUsd + amount,
                pendingSettlementUsd: s.pendingSettlementUsd + amount
              }));
              const newTx: CompensationTransaction = {
                id: `tx-drive-${Date.now()}`,
                timestamp: 'Just now',
                buyerName: 'Secure Cloud Analytics Group',
                category: 'drive',
                amountUsd: amount,
                privacyTier: 'differential-privacy',
                txHash: '0x' + Math.random().toString(16).substring(2, 6) + '...' + Math.random().toString(16).substring(2, 6),
                status: 'settled'
              };
              setTransactions(t => [newTx, ...t]);
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
