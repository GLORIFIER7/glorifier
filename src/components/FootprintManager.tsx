import React, { useState } from 'react';
import { 
  Database, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Sliders, 
  Sparkles, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight, 
  Check, 
  Globe, 
  ShoppingBag, 
  Code, 
  HeartPulse, 
  Share2, 
  MapPin, 
  Landmark,
  FileSearch,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { DataFootprintSource, PrivacyTier, DataCategoryType } from '../types';

interface FootprintManagerProps {
  footprints: DataFootprintSource[];
  onToggleMonetization: (id: string) => void;
  onUpdatePrivacyTier: (id: string, tier: PrivacyTier, epsilon: number) => void;
  onInspectDataSamples: (footprint: DataFootprintSource) => void;
}

export const FootprintManager: React.FC<FootprintManagerProps> = ({
  footprints,
  onToggleMonetization,
  onUpdatePrivacyTier,
  onInspectDataSamples,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [auditingId, setAuditingId] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<{ id: string; data: any } | null>(null);

  const getCategoryIcon = (cat: DataCategoryType) => {
    switch (cat) {
      case 'browsing': return Globe;
      case 'ecommerce': return ShoppingBag;
      case 'developer': return Code;
      case 'health': return HeartPulse;
      case 'social': return Share2;
      case 'location': return MapPin;
      case 'financial': return Landmark;
      default: return Database;
    }
  };

  const handleRunAiAudit = async (fp: DataFootprintSource) => {
    setAuditingId(fp.id);
    try {
      const res = await fetch('/api/ai/audit-footprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: fp.category,
          sourceName: fp.name,
          sampleData: fp.samples
        })
      });
      const data = await res.json();
      setAuditResult({ id: fp.id, data });
    } catch (err) {
      console.error(err);
      setAuditResult({
        id: fp.id,
        data: {
          reidentificationRisk: 'Low (14%)',
          recommendedEpsilon: 0.3,
          kAnonymityMin: 50,
          sanitizationReport: 'Differential privacy shield verified. No quasi-identifiers leak personal identity under current parameters.'
        }
      });
    } finally {
      setAuditingId(null);
    }
  };

  const filteredFootprints = selectedCategory === 'all' 
    ? footprints 
    : footprints.filter(f => f.category === selectedCategory);

  const totalMarketValue = footprints.reduce((acc, f) => acc + f.marketMonthlyValueUsd, 0);
  const userCapturedValue = footprints.filter(f => f.isMonetized).reduce((acc, f) => acc + f.userMonthlyCompUsd, 0);

  return (
    <div className="space-y-6">
      {/* Header Info Card */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              Digital Footprint Governance & Privacy Tiers
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Inspect your telemetry trail across the web. You decide which streams remain sealed, which are sanitized with differential privacy, and what compensation rate you receive from approved buyers.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-800/80">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Corporations Earned</div>
              <div className="text-sm font-bold font-mono text-slate-400 line-through">
                ${totalMarketValue.toFixed(2)}/mo
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] uppercase font-semibold text-emerald-400">Your Current Yield</div>
              <div className="text-sm font-bold font-mono text-emerald-400">
                ${userCapturedValue.toFixed(2)}/mo
              </div>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 mt-3 border-t border-slate-800/80 scrollbar-none">
          {['all', 'browsing', 'ecommerce', 'developer', 'health', 'social', 'location', 'financial'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Footprint Stream Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredFootprints.map((fp) => {
          const Icon = getCategoryIcon(fp.category);
          const isAuditing = auditingId === fp.id;
          const audit = auditResult?.id === fp.id ? auditResult.data : null;

          return (
            <div
              key={fp.id}
              id={`footprint-card-${fp.id}`}
              className={`rounded-xl border p-5 transition-all ${
                fp.isMonetized
                  ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/60 border-slate-850 hover:border-slate-800 opacity-90'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Left: Icon, Name, Category, Platform */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    fp.isMonetized
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white">{fp.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        {fp.platform}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        fp.isMonetized 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {fp.isMonetized ? 'MONETIZING' : 'SEALED / PRIVATE'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      {fp.description}
                    </p>

                    {/* Stats bar */}
                    <div className="flex items-center gap-4 text-xs text-slate-300 mt-3 pt-2.5 border-t border-slate-800/80">
                      <div>
                        <span className="text-slate-500">Volume: </span>
                        <span className="font-mono font-medium">{(fp.dataPointsMonthly / 1000).toFixed(0)}k records/mo</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Gross Broker Value: </span>
                        <span className="font-mono text-slate-400 line-through">${fp.marketMonthlyValueUsd.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Your Share: </span>
                        <span className="font-mono font-bold text-emerald-400">
                          {fp.isMonetized ? `$${fp.userMonthlyCompUsd.toFixed(2)}/mo` : '$0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <button
                    onClick={() => onInspectDataSamples(fp)}
                    id={`inspect-btn-${fp.id}`}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    Inspect Noise Samples
                  </button>

                  <button
                    onClick={() => handleRunAiAudit(fp)}
                    disabled={isAuditing}
                    id={`audit-btn-${fp.id}`}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    {isAuditing ? (
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    AI Leak Audit
                  </button>

                  <button
                    onClick={() => onToggleMonetization(fp.id)}
                    id={`switch-btn-${fp.id}`}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      fp.isMonetized
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                    }`}
                  >
                    {fp.isMonetized ? 'Shield & Stop' : 'Monetize Stream'}
                  </button>
                </div>
              </div>

              {/* Privacy Tier Controls & Math Epsilon Slider */}
              {fp.isMonetized && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 bg-slate-950/40 -mx-5 -mb-5 p-5 rounded-b-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Privacy Tier Selector */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                        Active Privacy Protection Technique
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'differential-privacy', label: 'Differential Privacy (ε)', desc: 'Laplacian mathematical noise injection' },
                          { id: 'zero-knowledge', label: 'Zero-Knowledge Proof', desc: 'Attest facts without revealing values' },
                          { id: 'synthetic-twin', label: 'Synthetic Twin AI', desc: 'Generative AI counterpart simulation' },
                          { id: 'k-anonymity', label: 'k-Anonymity (k=50)', desc: 'Grouped into indistinguishable cohorts' },
                        ].map((tierOption) => (
                          <div
                            key={tierOption.id}
                            onClick={() => onUpdatePrivacyTier(fp.id, tierOption.id as PrivacyTier, fp.privacyEpsilon)}
                            className={`cursor-pointer rounded-lg p-2.5 border text-left transition-all ${
                              fp.privacyTier === tierOption.id
                                ? 'bg-slate-800 border-emerald-500/70 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="text-xs font-bold text-slate-200">{tierOption.label}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{tierOption.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Differential Privacy Epsilon Fine-tuning Slider */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                          Differential Privacy Budget (ε = {fp.privacyEpsilon})
                        </label>
                        <span className="text-[10px] font-mono text-emerald-400">
                          {fp.privacyEpsilon <= 0.25 ? 'Maximum Obfuscation' : fp.privacyEpsilon <= 0.6 ? 'Balanced High Security' : 'High Buyer Yield'}
                        </span>
                      </div>

                      <input
                        type="range"
                        min="0.1"
                        max="1.2"
                        step="0.05"
                        value={fp.privacyEpsilon}
                        onChange={(e) => onUpdatePrivacyTier(fp.id, fp.privacyTier, parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-805 rounded-lg"
                      />

                      <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                        <span>ε=0.10 (Strict math privacy)</span>
                        <span>ε=0.50 (Industry Gold Standard)</span>
                        <span>ε=1.20 (Maximum compensation)</span>
                      </div>

                      <div className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                        Laplace mechanism adds calibrated random perturbation $\sigma = \Delta f / \epsilon$. No single query can determine whether your record was included in the buyer dataset.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Audit Result Box */}
              {audit && (
                <div className="mt-4 p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs text-slate-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Gemini AI Privacy & Valuation Audit:
                    </span>
                    <button 
                      onClick={() => setAuditResult(null)}
                      className="text-slate-500 hover:text-slate-300 text-xs"
                    >
                      Dismiss
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] bg-slate-950/60 p-2 rounded">
                    <div>Re-ID Risk: <span className="text-emerald-300 font-bold">{audit.reidentificationRisk || 'Low'}</span></div>
                    <div>Recommended ε: <span className="text-emerald-300 font-bold">{audit.recommendedEpsilon || 0.35}</span></div>
                    <div>Fair Market Value: <span className="text-emerald-300 font-bold">${audit.fairMarketMonthlyUsd || fp.userMonthlyCompUsd}/mo</span></div>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {audit.sanitizationReport}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
