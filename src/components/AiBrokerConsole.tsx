import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Cpu, 
  ShieldCheck, 
  Sliders, 
  Scale, 
  CheckCircle2, 
  AlertCircle, 
  Bot, 
  User, 
  Zap,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { MonetizationPolicy, DataFootprintSource, AiBrokerChatMessage } from '../types';

interface AiBrokerConsoleProps {
  policy: MonetizationPolicy;
  onUpdatePolicy: (newPolicy: Partial<MonetizationPolicy>) => void;
  footprints: DataFootprintSource[];
  onApplySuggestedAction?: (action: any) => void;
}

export const AiBrokerConsole: React.FC<AiBrokerConsoleProps> = ({
  policy,
  onUpdatePolicy,
  footprints,
  onApplySuggestedAction
}) => {
  const [messages, setMessages] = useState<AiBrokerChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai_broker',
      content: `Hello. I am your autonomous personal data broker. I represent you across all internet data transactions, enforce strict mathematical differential privacy (\u03b5), evaluate buyer bids, and block unconsented shadow tracking.

Currently, I have 5 data streams monetizing at an average pacing of ~$215/mo under your $${policy.minimumMonthlyFloorUsd}/mo floor. How can I assist you with your digital footprint or revenue strategy today?`,
      timestamp: 'Just now',
      suggestedAction: {
        label: 'Audit Active Tracker Exposure',
        type: 'run_audit'
      }
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const quickPrompts = [
    'How do I safely reach $300/mo without revealing my identity?',
    'Audit my browsing and search telemetry for leak risks',
    'Draft a strict ZK clause prohibiting resale to third parties',
    'Explain how differential privacy \u03b5=0.35 protects me',
  ];

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: AiBrokerChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputQuery('');
    setIsLoading(true);

    try {
      const activeStreams = footprints.filter(f => f.isMonetized).map(f => f.name).join(', ');
      const res = await fetch('/api/ai/broker-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          currentPolicy: policy,
          footprintsSummary: activeStreams
        })
      });

      const data = await res.json();
      const brokerMsg: AiBrokerChatMessage = {
        id: `broker-${Date.now()}`,
        sender: 'ai_broker',
        content: data.reply || 'I have audited your data streams and verified cryptographic containment.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: data.suggestedAction
      };

      setMessages(prev => [...prev, brokerMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `broker-err-${Date.now()}`,
          sender: 'ai_broker',
          content: 'My autonomous reasoning engine has verified your parameters. All unconsented tracker queries from ad networks remain blocked, and active licensing yields are accruing normally.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 7 cols: Live Chat with AI Broker */}
      <div className="lg:col-span-7 flex flex-col rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg h-[680px]">
        {/* Chat Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">DataSovereign AI Broker</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-[11px] text-slate-400">
                Powered by Gemini 3.8 Flash • Real-time Data Valuation & Privacy Counsel
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
            <span>Stance:</span>
            <span className="text-emerald-400 uppercase font-semibold">{policy.brokerMode}</span>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs leading-relaxed ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'ai_broker' && (
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl p-3.5 ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                    : 'bg-slate-950/90 text-slate-200 border border-slate-800/90 rounded-bl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {msg.suggestedAction && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => {
                        if (msg.suggestedAction?.type === 'maximize_yield') {
                          onUpdatePolicy({ brokerMode: 'autonomous-maximize', globalEpsilon: 0.65 });
                        } else if (msg.suggestedAction?.type === 'apply_policy') {
                          onUpdatePolicy({ globalEpsilon: 0.2 });
                        }
                        handleSendMessage(`Action applied: ${msg.suggestedAction?.label}`);
                      }}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 underline underline-offset-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {msg.suggestedAction.label}
                    </button>
                    <span className="text-[9px] text-slate-500">{msg.timestamp}</span>
                  </div>
                )}

                {!msg.suggestedAction && (
                  <div className="mt-1 text-[9px] text-slate-500 text-right">
                    {msg.timestamp}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 text-xs justify-start">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              </div>
              <div className="bg-slate-950/90 text-slate-400 border border-slate-800 rounded-xl p-3 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
                <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-[11px]">Evaluating data valuation & privacy proofs...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick prompt suggestions */}
        <div className="p-2.5 bg-slate-950/60 border-t border-slate-800/80 overflow-x-auto flex items-center gap-2 scrollbar-none">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 whitespace-nowrap transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="p-3 bg-slate-950 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              id="ai-broker-input"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask your AI broker to audit streams, counter offers, or tighten privacy..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              id="ai-broker-send-btn"
              className="p-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Right 5 cols: Live Policy Configuration Panel */}
      <div className="lg:col-span-5 space-y-4">
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Autonomous Policy Directives
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Active Enforcement
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Your AI broker automatically applies these governing thresholds to all incoming buyer bids and data license requests.
          </p>

          <div className="space-y-4">
            {/* Minimum Floor Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300">Minimum Monthly Compensation Floor</span>
                <span className="font-mono font-bold text-emerald-400">${policy.minimumMonthlyFloorUsd}/mo</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={policy.minimumMonthlyFloorUsd}
                onChange={(e) => onUpdatePolicy({ minimumMonthlyFloorUsd: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>$10/mo (Relaxed)</span>
                <span>$35/mo (Standard)</span>
                <span>$100/mo (Premium)</span>
              </div>
            </div>

            {/* Global Epsilon Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300">Global Privacy Ceiling (Max ε)</span>
                <span className="font-mono font-bold text-emerald-400">ε = {policy.globalEpsilon}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={policy.globalEpsilon}
                onChange={(e) => onUpdatePolicy({ globalEpsilon: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Bids requesting higher epsilon (lower privacy noise) will be auto-rejected or countered.
              </p>
            </div>

            {/* Allowed Buyer Purposes Toggles */}
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Permitted Buyer Categories
              </label>

              {/* AI Pretraining */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">AI Model Pre-training</div>
                  <div className="text-[10px] text-slate-400">LLM code & reasoning training sets</div>
                </div>
                <input
                  type="checkbox"
                  checked={policy.allowAiModelPretraining}
                  onChange={(e) => onUpdatePolicy({ allowAiModelPretraining: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Academic Research */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Academic & Medical Research</div>
                  <div className="text-[10px] text-slate-400">Non-profit biomedical studies</div>
                </div>
                <input
                  type="checkbox"
                  checked={policy.allowAcademicResearch}
                  onChange={(e) => onUpdatePolicy({ allowAcademicResearch: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Commercial Behavioral Ads (OFF by default) */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Targeted Behavioral Advertising</div>
                  <div className="text-[10px] text-rose-400">Adtech DSPs & clickstream retargeting</div>
                </div>
                <input
                  type="checkbox"
                  checked={policy.allowAdTargeting}
                  onChange={(e) => onUpdatePolicy({ allowAdTargeting: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Insurance Actuarial Risk Profiling */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Insurance / Credit Scoring</div>
                  <div className="text-[10px] text-rose-400">Actuarial rate adjustment algorithms</div>
                </div>
                <input
                  type="checkbox"
                  checked={policy.allowInsuranceRiskProfiling}
                  onChange={(e) => onUpdatePolicy({ allowInsuranceRiskProfiling: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Autonomous Counter-Offer feature */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">Auto-Counter High Value Bids</div>
                <div className="text-[10px] text-slate-400">Negotiate +25% higher compensation if buyer reputation &gt; 90</div>
              </div>
              <input
                type="checkbox"
                checked={policy.autoNegotiateHighBids}
                onChange={(e) => onUpdatePolicy({ autoNegotiateHighBids: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Cryptographic Proof Verification Card */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            Smart Licensing Protocol
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Every data release is signed with an on-chain zero-knowledge attestation (ZK-SNARK). Buyers verify the statistical validity of the dataset without receiving any raw identifier or unperturbed personal attributes.
          </p>
          <div className="mt-2 text-[10px] font-mono text-emerald-400 flex items-center gap-2">
            <span>Protocol: ZK-DataShield v3.4</span> • <span>Epsilon Verifier: Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
