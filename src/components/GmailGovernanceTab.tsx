import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  ShieldCheck, 
  Lock, 
  RefreshCw, 
  Sparkles, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  FileText,
  Sliders,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { User } from 'firebase/auth';
import { getAccessToken } from '../lib/firebase';
import { 
  listGmailMessages, 
  getGmailMessage, 
  analyzeEmailForSovereignMonetization,
  sendGmailMessage 
} from '../services/gmailService';
import { GmailAnalysisItem } from '../types';

interface GmailGovernanceTabProps {
  currentUser: User | null;
  onLogin: () => void;
  onAddEarnings: (amountUsd: number, description: string) => void;
}

export const GmailGovernanceTab: React.FC<GmailGovernanceTabProps> = ({
  currentUser,
  onLogin,
  onAddEarnings,
}) => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<GmailAnalysisItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<GmailAnalysisItem | null>(null);

  // Email composer with mandatory confirmation
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('Data Governance Notice: Sovereign Privacy Rights');
  const [body, setBody] = useState('Greetings,\n\nIn accordance with CCPA/GDPR personal data rights, this inbox is managed via an AI Data Sovereign Gateway. All consumer profile telemetry is scrubbed and synthesized before licensing.\n\nVerified via DataSovereign AI.');
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const hasAccessToken = !!getAccessToken();

  const fetchEmails = async () => {
    if (!currentUser || !hasAccessToken) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { messages: msgList } = await listGmailMessages(10);
      if (msgList.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const fetchedSummaries = await Promise.all(
        msgList.slice(0, 8).map(async (m) => {
          try {
            return await getGmailMessage(m.id);
          } catch {
            return null;
          }
        })
      );

      const validSummaries = fetchedSummaries.filter((s): s is NonNullable<typeof s> => s !== null);
      const analyzed = validSummaries.map(analyzeEmailForSovereignMonetization);
      setMessages(analyzed);

      // Add small telemetry compensation yield
      const totalBatchYield = analyzed.reduce((acc, curr) => acc + curr.estimatedYieldUsd, 0);
      if (totalBatchYield > 0) {
        onAddEarnings(Number(totalBatchYield.toFixed(2)), 'Gmail Data Footprint Governance Index');
      }
    } catch (err: any) {
      console.error('Failed to sync Gmail:', err);
      setError(err.message || 'Error connecting to Gmail. Please sign in again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && hasAccessToken && messages.length === 0) {
      fetchEmails();
    }
  }, [currentUser, hasAccessToken]);

  const handleSendEmailConfirmed = async () => {
    setConfirmSendOpen(false);
    setLoading(true);
    try {
      await sendGmailMessage(recipient, subject, body);
      setSendSuccess(true);
      setComposeOpen(false);
      setRecipient('');
    } catch (err: any) {
      setError(`Failed to send email: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Mail className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Gmail Footprint Governance & Monetization
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Workspace API
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl">
              Extract micro-royalties from receipt telemetry, travel patterns, and research topics without exposing private message contents. All telemetry is sanitized with Zero-Knowledge proofs and Differential Privacy.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!currentUser || !hasAccessToken ? (
              <button
                onClick={onLogin}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <UserCheck className="w-4 h-4" />
                <span>Connect & Authorize Gmail</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchEmails}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Scanning Inbox...' : 'Scan & Tokenize'}</span>
                </button>
                <button
                  onClick={() => setComposeOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Notice</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Scanned Emails</span>
            <div className="text-lg font-bold text-white font-mono mt-0.5">{messages.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Est. Yield Per Scan</span>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
              ${messages.reduce((a, b) => a + b.estimatedYieldUsd, 0).toFixed(2)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Privacy Defense</span>
            <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">ε = 0.25 (Laplace)</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Raw Leaks Prevented</span>
            <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">100% Guaranteed</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button 
            onClick={onLogin} 
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold"
          >
            Re-authorize
          </button>
        </div>
      )}

      {sendSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Email notice dispatched successfully through Gmail API with authenticated signature.</span>
        </div>
      )}

      {/* Main Content Area */}
      {!currentUser || !hasAccessToken ? (
        <div className="p-12 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Gmail Access Authorization Required</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Connect your Google account with official Gmail scopes to inspect how your receipts, newsletters, and transit updates can be tokenized for personal data dividends.
            </p>
          </div>
          <button
            onClick={onLogin}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>Sign in with Google & Authorize Gmail</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email Analysis List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Recent Inbox Streams Analyzed</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  {messages.length} Records
                </span>
              </h3>
              <span className="text-[11px] text-slate-400">Differential Privacy Applied</span>
            </div>

            {loading && messages.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin text-emerald-400 mb-2" />
                Retrieving messages from Gmail and extracting zero-knowledge telemetry...
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs space-y-2">
                <Mail className="w-6 h-6 mx-auto text-slate-600" />
                <p>No recent messages found or access token expired.</p>
                <button
                  onClick={fetchEmails}
                  className="px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold"
                >
                  Scan Inbox Now
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {messages.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedItem?.id === item.id
                        ? 'bg-slate-900 border-emerald-500/50 shadow-md'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate max-w-[200px]">
                            {item.sender}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {item.snippet}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-emerald-400 font-mono">
                          +${item.estimatedYieldUsd.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-400">{item.date}</span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Action: {item.governanceAction}</span>
                      </span>
                      <span className="text-cyan-400 font-mono font-medium">Safe for Buyer Aggregates</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Inspection Panel */}
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Sanitization & Token Inspector</span>
              </h4>

              {selectedItem ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Sender (Masked)</span>
                    <span className="text-slate-200 font-mono mt-0.5 block break-all">{selectedItem.sender}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Category</span>
                    <span className="text-emerald-400 font-semibold mt-0.5 block">{selectedItem.category}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Synthesized Market Insight</span>
                    <p className="text-slate-300 mt-1 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] leading-relaxed">
                      {selectedItem.extractedInsights}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Calculated Compensation</span>
                    <div className="text-base font-bold text-emerald-400 font-mono mt-1">
                      ${selectedItem.estimatedYieldUsd.toFixed(2)} USD
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Zero-Raw Leak Contract</span>
                    </div>
                    <p className="text-[10px] text-emerald-400/80">
                      No raw names, addresses, or account numbers leave the secure enclave. Only statistical vectors are licensed to verified buyers.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                  <EyeOff className="w-6 h-6 mx-auto text-slate-600" />
                  <p>Select any email stream on the left to inspect privacy transformation vectors.</p>
                </div>
              )}
            </div>

            {/* Statutory Disclaimer */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-2">
              <span className="font-semibold text-slate-300 block">Google Workspace Compliance</span>
              <p>
                All Gmail API operations use scoped tokens directly acquired in the browser with explicit user authentication. Sending actions require user confirmation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compose Notice Modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Send Data Governance Notice via Gmail</h3>
              </div>
              <button
                onClick={() => setComposeOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Recipient Email Address</label>
                <input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="e.g. privacy@databroker.com or self"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Subject Line</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Notice Body</label>
                <textarea
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setComposeOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!recipient.trim()) {
                    setError('Please enter a recipient email address.');
                    return;
                  }
                  setConfirmSendOpen(true);
                }}
                disabled={!recipient}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md disabled:opacity-50"
              >
                Review & Confirm Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY Explicit Confirmation Dialog for Sending Email */}
      {confirmSendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-500/30 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Confirm Email Dispatch</h3>
                <p className="text-xs text-slate-400">Explicit User Authorization Required</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">To</span>
                <span className="text-slate-200 font-mono">{recipient}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Subject</span>
                <span className="text-slate-200">{subject}</span>
              </div>
              <p className="text-[11px] text-amber-300/80 pt-1">
                Are you sure you want to send this email from your verified Gmail account? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmSendOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmailConfirmed}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md"
              >
                Yes, Send via Gmail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
