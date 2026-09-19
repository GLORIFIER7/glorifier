import React, { useState } from 'react';
import { 
  X, 
  Wallet, 
  CheckCircle2, 
  ArrowUpRight, 
  Landmark, 
  CreditCard, 
  Coins, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';
import { SovereignStats, MonetizationPolicy } from '../types';

interface WithdrawModalProps {
  stats: SovereignStats;
  policy: MonetizationPolicy;
  onClose: () => void;
  onWithdrawSuccess: (amount: number, method: string, txHash: string) => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  stats,
  policy,
  onClose,
  onWithdrawSuccess
}) => {
  const [amount, setAmount] = useState<number>(stats.totalEarnedUsd);
  const [method, setMethod] = useState<'usdc_solana' | 'stripe_connect' | 'direct_ach'>('usdc_solana');
  const [address, setAddress] = useState(policy.walletAddress);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settledReceipt, setSettledReceipt] = useState<{
    txHash: string;
    amount: number;
    destination: string;
    timestamp: string;
  } | null>(null);

  const handleWithdraw = () => {
    if (amount <= 0 || amount > stats.totalEarnedUsd) return;

    setIsProcessing(true);
    setTimeout(() => {
      const generatedTx = `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`;
      setSettledReceipt({
        txHash: generatedTx,
        amount,
        destination: address || 'User Solana Vault',
        timestamp: new Date().toLocaleString()
      });
      setIsProcessing(false);
      onWithdrawSuccess(amount, method, generatedTx);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Disburse Data Compensation Yield</h3>
              <p className="text-[11px] text-slate-400">Direct settlement from sovereign data vault</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {!settledReceipt ? (
          <div className="p-5 space-y-4">
            {/* Balance Bar */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Available to Withdraw</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  ${stats.totalEarnedUsd.toFixed(2)} USD
                </div>
              </div>
              <button
                onClick={() => setAmount(stats.totalEarnedUsd)}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
              >
                Max All
              </button>
            </div>

            {/* Amount input */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Disbursement Amount ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-mono">$</span>
                <input
                  type="number"
                  min="1"
                  max={stats.totalEarnedUsd}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Payout Channels */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Settlement Channel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'usdc_solana', label: 'USDC (Solana)', sub: 'Instant • 0 Gas', icon: Coins },
                  { id: 'stripe_connect', label: 'Stripe Direct', sub: 'Debit Card • Instant', icon: CreditCard },
                  { id: 'direct_ach', label: 'Bank Wire / ACH', sub: '1-2 Days • USD', icon: Landmark }
                ].map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <div
                      key={ch.id}
                      onClick={() => setMethod(ch.id as any)}
                      className={`cursor-pointer rounded-lg p-2.5 border text-left transition-all ${
                        method === ch.id
                          ? 'bg-slate-800 border-emerald-500 text-white'
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1 text-emerald-400" />
                      <div className="text-[11px] font-bold text-slate-200">{ch.label}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{ch.sub}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Destination Address / Account */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                {method === 'usdc_solana' ? 'Solana Receiving Address' : 'Bank Account / Routing or Debit Token'}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={method === 'usdc_solana' ? 'Solana wallet address...' : 'Account ending in 4092...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero transaction fees. Royalty contract covers all relay gas costs.</span>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={isProcessing || amount <= 0 || amount > stats.totalEarnedUsd}
              className="w-full mt-2 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Clearing Settlement...
                </>
              ) : (
                <>Disburse ${amount.toFixed(2)} to Wallet</>
              )}
            </button>
          </div>
        ) : (
          /* Receipt Screen */
          <div className="p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Disbursement Confirmed!</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Funds successfully transferred from your data royalty pool.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs font-mono space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="text-emerald-400 font-bold">${settledReceipt.amount.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Channel:</span>
                <span className="text-slate-200 uppercase">{method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination:</span>
                <span className="text-slate-200 truncate max-w-[200px]">{settledReceipt.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Proof Hash:</span>
                <span className="text-slate-300">{settledReceipt.txHash}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span className="text-slate-400">{settledReceipt.timestamp}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs"
            >
              Done & Return to Vault
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
