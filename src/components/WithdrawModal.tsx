import React, { useState } from 'react';
import { 
  X, 
  Wallet, 
  CheckCircle2, 
  Landmark, 
  CreditCard, 
  Coins, 
  ShieldCheck, 
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Globe,
  ArrowRight
} from 'lucide-react';
import { SovereignStats, MonetizationPolicy } from '../types';

interface WithdrawModalProps {
  stats: SovereignStats;
  policy: MonetizationPolicy;
  onClose: () => void;
  onWithdrawSuccess: (amount: number, method: string, txHash: string) => void;
}

type StablecoinType = 'USDC' | 'USDT' | 'DAI' | 'PYUSD';
type CryptoNetwork = 'Base' | 'Solana' | 'Polygon' | 'Arbitrum' | 'Ethereum';

interface SupportedToken {
  symbol: StablecoinType;
  name: string;
  peg: string;
  iconBg: string;
  badgeColor: string;
}

const SUPPORTED_STABLECOINS: SupportedToken[] = [
  { symbol: 'USDC', name: 'USD Coin (Circle)', peg: '1:1 USD', iconBg: 'bg-blue-500/20 text-blue-400', badgeColor: 'text-blue-400 border-blue-500/30' },
  { symbol: 'USDT', name: 'Tether USD', peg: '1:1 USD', iconBg: 'bg-emerald-500/20 text-emerald-400', badgeColor: 'text-emerald-400 border-emerald-500/30' },
  { symbol: 'DAI', name: 'Dai / USDS (Sky)', peg: '1:1 USD', iconBg: 'bg-amber-500/20 text-amber-400', badgeColor: 'text-amber-400 border-amber-500/30' },
  { symbol: 'PYUSD', name: 'PayPal USD', peg: '1:1 USD', iconBg: 'bg-cyan-500/20 text-cyan-400', badgeColor: 'text-cyan-400 border-cyan-500/30' }
];

const NETWORKS: { id: CryptoNetwork; name: string; speed: string; gasSubsidy: string; isEVM: boolean }[] = [
  { id: 'Base', name: 'Base L2', speed: '~1 sec', gasSubsidy: 'Sponsored ($0 gas)', isEVM: true },
  { id: 'Solana', name: 'Solana SPL', speed: '~400 ms', gasSubsidy: 'Sponsored ($0 gas)', isEVM: false },
  { id: 'Polygon', name: 'Polygon PoS', speed: '~2 sec', gasSubsidy: 'Sponsored ($0 gas)', isEVM: true },
  { id: 'Arbitrum', name: 'Arbitrum One', speed: '~1 sec', gasSubsidy: 'Sponsored ($0 gas)', isEVM: true },
  { id: 'Ethereum', name: 'Ethereum Mainnet', speed: '~12 sec', gasSubsidy: 'Standard Relay', isEVM: true }
];

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  stats,
  policy,
  onClose,
  onWithdrawSuccess
}) => {
  const [amount, setAmount] = useState<number>(stats.totalEarnedUsd);
  const [payoutCategory, setPayoutCategory] = useState<'crypto' | 'fiat'>('crypto');
  
  // Crypto Configuration
  const [selectedToken, setSelectedToken] = useState<StablecoinType>('USDC');
  const [selectedNetwork, setSelectedNetwork] = useState<CryptoNetwork>('Base');
  const [walletAddress, setWalletAddress] = useState<string>(policy.walletAddress || '');
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [connectedWalletName, setConnectedWalletName] = useState<string | null>(
    policy.walletAddress ? 'Saved Sovereign Vault' : null
  );
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  // Fiat Configuration
  const [fiatMethod, setFiatMethod] = useState<'stripe_connect' | 'direct_ach'>('stripe_connect');
  const [fiatAccount, setFiatAccount] = useState<string>('Account ending in 4092');

  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);
  const [settledReceipt, setSettledReceipt] = useState<{
    txHash: string;
    amountUsd: number;
    tokenSymbol: string;
    network: string;
    destination: string;
    timestamp: string;
    isCrypto: boolean;
  } | null>(null);

  // Validate address format
  const isAddressValid = () => {
    if (payoutCategory === 'fiat') return fiatAccount.trim().length > 3;
    if (!walletAddress.trim()) return false;
    const isEVM = NETWORKS.find(n => n.id === selectedNetwork)?.isEVM;
    if (isEVM) {
      return /^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim());
    } else {
      // Solana base58 check
      return walletAddress.trim().length >= 32 && walletAddress.trim().length <= 44;
    }
  };

  // Connect Web3 Wallet Simulation / Injected Detection
  const handleConnectWallet = async (walletChoice: string) => {
    setIsWalletConnecting(true);
    setShowWalletPicker(false);
    
    // Check if browser has real provider
    const win = window as any;
    try {
      if (walletChoice === 'MetaMask' && win.ethereum) {
        const accounts = await win.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          setWalletAddress(accounts[0]);
          setConnectedWalletName('MetaMask');
          setIsWalletConnecting(false);
          return;
        }
      } else if (walletChoice === 'Phantom' && win.solana) {
        const resp = await win.solana.connect();
        if (resp && resp.publicKey) {
          setWalletAddress(resp.publicKey.toString());
          setSelectedNetwork('Solana');
          setConnectedWalletName('Phantom');
          setIsWalletConnecting(false);
          return;
        }
      }
    } catch {
      // Fallback to simulated instant connector
    }

    setTimeout(() => {
      let mockAddr = '';
      if (selectedNetwork === 'Solana' || walletChoice === 'Phantom') {
        mockAddr = '7XhM9pYqK3sL8nQ2vR6wE5tU1zC4jB8aD7fG6hJ5kL4';
        setSelectedNetwork('Solana');
      } else {
        mockAddr = '0x71C5687b372480302E9B41d5F58eE5f242Ec33a9';
      }
      setWalletAddress(mockAddr);
      setConnectedWalletName(walletChoice);
      setIsWalletConnecting(false);
    }, 600);
  };

  const handleDisconnectWallet = () => {
    setWalletAddress('');
    setConnectedWalletName(null);
  };

  const handleWithdraw = () => {
    if (amount <= 0 || amount > stats.totalEarnedUsd) return;
    if (!isAddressValid()) return;

    setIsProcessing(true);
    setTimeout(() => {
      let generatedTx = '';
      if (payoutCategory === 'crypto') {
        if (selectedNetwork === 'Solana') {
          generatedTx = `${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}...${Math.random().toString(36).substring(2, 6)}`;
        } else {
          generatedTx = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`;
        }
      } else {
        generatedTx = `ach_ref_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }

      setSettledReceipt({
        txHash: generatedTx,
        amountUsd: amount,
        tokenSymbol: payoutCategory === 'crypto' ? selectedToken : 'USD',
        network: payoutCategory === 'crypto' ? selectedNetwork : (fiatMethod === 'stripe_connect' ? 'Stripe ACH' : 'Federal Reserve Wire'),
        destination: payoutCategory === 'crypto' ? walletAddress : fiatAccount,
        timestamp: new Date().toLocaleString(),
        isCrypto: payoutCategory === 'crypto'
      });
      setIsProcessing(false);
      onWithdrawSuccess(amount, payoutCategory === 'crypto' ? `stablecoin_${selectedToken.toLowerCase()}_${selectedNetwork.toLowerCase()}` : fiatMethod, generatedTx);
    }, 1200);
  };

  const handleCopyTx = () => {
    if (!settledReceipt) return;
    navigator.clipboard.writeText(settledReceipt.txHash);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Disburse Sovereign Data Earnings</h3>
              <p className="text-[11px] text-slate-400">Direct on-chain stablecoin settlement or fiat payout</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {!settledReceipt ? (
          <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Balance Bar */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Available Balance</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  ${stats.totalEarnedUsd.toFixed(2)} USD
                </div>
              </div>
              <button
                onClick={() => setAmount(stats.totalEarnedUsd)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition-colors"
              >
                Max All
              </button>
            </div>

            {/* Payout Category Selector: Crypto vs Fiat */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Payout Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayoutCategory('crypto')}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    payoutCategory === 'crypto'
                      ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${payoutCategory === 'crypto' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Crypto Payout</div>
                      <div className="text-[10px] text-emerald-400 font-mono">Stablecoin (1:1 Peg)</div>
                    </div>
                  </div>
                  {payoutCategory === 'crypto' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutCategory('fiat')}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    payoutCategory === 'fiat'
                      ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${payoutCategory === 'fiat' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Fiat Payout</div>
                      <div className="text-[10px] text-slate-500 font-mono">Bank Wire / ACH</div>
                    </div>
                  </div>
                  {payoutCategory === 'fiat' && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Amount input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Withdrawal Amount
                </label>
                {payoutCategory === 'crypto' && (
                  <span className="text-[10px] font-mono text-slate-400">
                    Est. {amount.toFixed(2)} {selectedToken} (Zero Slippage)
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-mono">$</span>
                <input
                  type="number"
                  min="1"
                  max={stats.totalEarnedUsd}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-16 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <span className="absolute right-3 top-2.5 text-xs font-mono font-bold text-slate-400">
                  USD
                </span>
              </div>
            </div>

            {/* CRYPTO PAYOUT SPECIFIC CONTROLS */}
            {payoutCategory === 'crypto' ? (
              <div className="space-y-3.5 pt-1">
                {/* Stablecoin Token Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Select Stablecoin
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SUPPORTED_STABLECOINS.map((token) => (
                      <button
                        key={token.symbol}
                        type="button"
                        onClick={() => setSelectedToken(token.symbol)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          selectedToken === token.symbol
                            ? 'bg-slate-800 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/20'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white font-mono">{token.symbol}</span>
                          <span className="text-[9px] px-1 py-0.5 rounded bg-slate-900 font-mono text-slate-400">
                            {token.peg}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-1">
                          {token.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Blockchain Network Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Settlement Network
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {NETWORKS.map((net) => (
                      <button
                        key={net.id}
                        type="button"
                        onClick={() => {
                          setSelectedNetwork(net.id);
                          // Auto adjust wallet address if switching between EVM and Solana
                          if (net.id === 'Solana' && walletAddress.startsWith('0x')) {
                            setWalletAddress('7XhM9pYqK3sL8nQ2vR6wE5tU1zC4jB8aD7fG6hJ5kL4');
                          } else if (net.isEVM && !walletAddress.startsWith('0x') && walletAddress.length > 0) {
                            setWalletAddress('0x71C5687b372480302E9B41d5F58eE5f242Ec33a9');
                          }
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          selectedNetwork === net.id
                            ? 'bg-slate-800 border-emerald-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-[11px] font-bold text-slate-200">{net.name}</div>
                        <div className="text-[9px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" />
                          <span>{net.gasSubsidy}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Connect Wallet / Destination Address */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Receiving Wallet Address
                    </label>

                    {connectedWalletName ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{connectedWalletName}</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleDisconnectWallet}
                          className="text-[10px] text-slate-400 hover:text-rose-400"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowWalletPicker(!showWalletPicker)}
                          disabled={isWalletConnecting}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>{isWalletConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
                        </button>

                        {/* Wallet Picker Dropdown */}
                        {showWalletPicker && (
                          <div className="absolute right-0 top-8 z-30 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95">
                            {['MetaMask', 'Phantom', 'Coinbase Wallet', 'Rainbow'].map((wName) => (
                              <button
                                key={wName}
                                type="button"
                                onClick={() => handleConnectWallet(wName)}
                                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between"
                              >
                                <span>{wName}</span>
                                <ArrowRight className="w-3 h-3 text-slate-500" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => {
                      setWalletAddress(e.target.value);
                      if (connectedWalletName && !e.target.value) {
                        setConnectedWalletName(null);
                      }
                    }}
                    placeholder={
                      selectedNetwork === 'Solana'
                        ? 'Paste Solana wallet address (e.g. 7XhM9pYq...)'
                        : 'Paste EVM wallet address (0x...)'
                    }
                    className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none transition-colors ${
                      walletAddress && !isAddressValid()
                        ? 'border-rose-500/50 focus:border-rose-500 text-rose-200'
                        : 'border-slate-800 focus:border-emerald-500'
                    }`}
                  />

                  {walletAddress && !isAddressValid() && (
                    <p className="text-[10px] text-rose-400 mt-1">
                      {selectedNetwork === 'Solana'
                        ? 'Invalid Solana base58 address length.'
                        : 'Invalid EVM format. Address must start with 0x and be 42 characters long.'}
                    </p>
                  )}
                </div>

                {/* Gas Relayer & Peg Attestation */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Gasless Smart Contract Relayer</span>
                    </span>
                    <span className="font-mono text-emerald-400 font-semibold">$0.00 Gas Fee</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span>Exchange Conversion</span>
                    <span className="font-mono text-slate-300">1 USD = 1.0000 {selectedToken}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* FIAT SPECIFIC CONTROLS */
              <div className="space-y-3.5 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Fiat Channel
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'stripe_connect', label: 'Stripe Direct', sub: 'Debit Card • Instant', icon: CreditCard },
                      { id: 'direct_ach', label: 'Bank Wire / ACH', sub: '1-2 Days • USD', icon: Landmark }
                    ].map((ch) => {
                      const Icon = ch.icon;
                      return (
                        <div
                          key={ch.id}
                          onClick={() => setFiatMethod(ch.id as any)}
                          className={`cursor-pointer rounded-xl p-3 border text-left transition-all ${
                            fiatMethod === ch.id
                              ? 'bg-slate-800 border-cyan-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <Icon className="w-4 h-4 mb-1 text-cyan-400" />
                          <div className="text-xs font-bold text-slate-200">{ch.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{ch.sub}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Bank Account / Routing / Debit Token
                  </label>
                  <input
                    type="text"
                    value={fiatAccount}
                    onChange={(e) => setFiatAccount(e.target.value)}
                    placeholder="Account ending in 4092..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleWithdraw}
              disabled={isProcessing || amount <= 0 || amount > stats.totalEarnedUsd || !isAddressValid()}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Broadcasting On-Chain Settlement...
                </>
              ) : (
                <>
                  Disburse ${amount.toFixed(2)} USD via {payoutCategory === 'crypto' ? `${selectedToken} (${selectedNetwork})` : 'Fiat Wire'}
                </>
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
                {settledReceipt.isCrypto
                  ? `Stablecoin funds broadcast to ${settledReceipt.network} network.`
                  : 'Fiat transfer queued for clearing.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs font-mono space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payout Yield:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {settledReceipt.amountUsd.toFixed(2)} {settledReceipt.tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Channel / Network:</span>
                <span className="text-slate-200">{settledReceipt.network}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Recipient:</span>
                <span className="text-slate-300 truncate max-w-[210px]">{settledReceipt.destination}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Proof Tx Hash:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-400 truncate max-w-[160px]">{settledReceipt.txHash}</span>
                  <button
                    onClick={handleCopyTx}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title="Copy Transaction Hash"
                  >
                    {copiedTx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Relayer Gas:</span>
                <span className="text-emerald-400">$0.00 (Sponsored by Protocol)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Settled At:</span>
                <span className="text-slate-400">{settledReceipt.timestamp}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 transition-colors"
            >
              Done & Return to Vault
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
