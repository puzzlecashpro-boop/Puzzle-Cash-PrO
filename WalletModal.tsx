import { useState, useEffect } from 'react';
import { X, Wallet, ArrowDownCircle, ArrowUpCircle, Copy, Check, AlertCircle, Loader2, History, FileText } from 'lucide-react';
import { useGame } from '@/react-app/context/GameContext';
import { useAuth } from '@getmocha/users-service/react';

interface Transaction {
  id: number;
  type: string;
  title: string;
  amount: number;
  is_credit: number;
  created_at: string;
}

interface WithdrawalRecord {
  id: number;
  amount: number;
  upi_id: string;
  status: string;
  payout_utr: string | null;
  created_at: string;
  updated_at: string;
}

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
}

type TabType = 'deposit' | 'withdraw' | 'history' | 'withdrawals';

export default function WalletModal({ open, onClose, onLogin }: WalletModalProps) {
  const { state, refreshWallet } = useGame();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('deposit');
  
  // Deposit state
  const [transactionRef, setTransactionRef] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSubmitted, setDepositSubmitted] = useState(false);
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawUPI, setWithdrawUPI] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawProcessing, setWithdrawProcessing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // History state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Withdrawal history state
  const [withdrawalRecords, setWithdrawalRecords] = useState<WithdrawalRecord[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);

  const UPI_ID = '8511363064@okbizaxis';

  const fetchTransactions = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/wallet/transactions', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
    setLoadingHistory(false);
  };

  const fetchWithdrawalHistory = async () => {
    setLoadingWithdrawals(true);
    try {
      const res = await fetch('/api/wallet/withdrawal-history', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setWithdrawalRecords(data.withdrawals || []);
      }
    } catch (err) {
      console.error('Failed to fetch withdrawal history:', err);
    }
    setLoadingWithdrawals(false);
  };

  useEffect(() => {
    if (activeTab === 'history' && user) {
      fetchTransactions();
    }
    if (activeTab === 'withdrawals' && user) {
      fetchWithdrawalHistory();
    }
  }, [activeTab, user]);

  const handleCopyUPI = async () => {
    await navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDepositSubmit = async () => {
    if (!transactionRef.trim() || !depositAmount.trim()) {
      setDepositError('Please fill in all fields');
      return;
    }
    
    const amountNum = parseInt(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setDepositError('Please enter a valid amount');
      return;
    }
    
    if (transactionRef.trim().length < 6) {
      setDepositError('Transaction reference must be at least 6 characters');
      return;
    }
    
    setDepositSubmitting(true);
    setDepositError('');
    
    try {
      const res = await fetch('/api/wallet/deposit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNum, upiRef: transactionRef.trim() }),
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        alert('DB Error: Server returned invalid response');
        setDepositError('Server returned invalid response');
        return;
      }
      
      console.log('Deposit request response:', data);
      
      if (data.success === true) {
        alert('Success: Deposit submitted to database! ID: ' + (data.id || 'unknown'));
        setDepositSubmitted(true);
      } else {
        const errorMsg = data.error || 'Unknown error';
        alert('DB Error: ' + errorMsg);
        console.error('Deposit request failed:', data);
        setDepositError(errorMsg);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Network error';
      alert('DB Error: ' + errMsg);
      console.error('Deposit request network error:', err);
      setDepositError('Network error: ' + errMsg);
    } finally {
      setDepositSubmitting(false);
    }
  };

  const handleWithdrawSubmit = async () => {
    setWithdrawError('');
    
    const amount = parseInt(withdrawAmount);
    
    // Validation
    if (!withdrawAmount || isNaN(amount)) {
      setWithdrawError('Please enter a valid amount');
      return;
    }
    
    if (amount < 100) {
      setWithdrawError('Minimum withdrawal amount is ₹100');
      return;
    }
    
    if (amount > state.walletBalance) {
      setWithdrawError('Insufficient balance');
      return;
    }
    
    if (!withdrawUPI.trim() || !withdrawUPI.includes('@')) {
      setWithdrawError('Please enter a valid UPI ID');
      return;
    }
    
    setWithdrawProcessing(true);
    
    try {
      const res = await fetch('/api/wallet/withdraw-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, upiId: withdrawUPI.trim() }),
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        alert('DB Error: Server returned invalid response');
        setWithdrawError('Server returned invalid response');
        return;
      }
      
      console.log('Withdrawal request response:', data);
      
      if (data.success === true) {
        setWithdrawAmount('');
        setWithdrawUPI('');
        await refreshWallet();
        // Switch to Payouts tab to show the pending request
        setActiveTab('withdrawals');
        setWithdrawSuccess(false);
      } else {
        const errorMsg = data.error || 'Unknown error';
        alert('DB Error: ' + errorMsg);
        console.error('Withdrawal request failed:', data);
        setWithdrawError(errorMsg);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Network error';
      alert('DB Error: ' + errMsg);
      console.error('Withdrawal request network error:', err);
      setWithdrawError('Network error: ' + errMsg);
    } finally {
      setWithdrawProcessing(false);
    }
  };

  const resetState = () => {
    setTransactionRef('');
    setDepositAmount('');
    setDepositSubmitted(false);
    setDepositSubmitting(false);
    setDepositError('');
    setWithdrawAmount('');
    setWithdrawUPI('');
    setWithdrawError('');
    setWithdrawProcessing(false);
    setWithdrawSuccess(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[90vh] rounded-2xl bg-card border border-primary/30 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="relative p-4 border-b border-border bg-gradient-to-r from-neon-cyan/10 to-neon-magenta/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-gaming font-bold text-xl text-foreground">My Wallet</h2>
              <p className="text-sm text-muted-foreground">
                Balance: <span className="text-neon-yellow font-semibold">₹{state.walletBalance.toLocaleString()}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => { setActiveTab('deposit'); resetState(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 font-semibold transition-all ${
              activeTab === 'deposit'
                ? 'text-neon-green border-b-2 border-neon-green bg-neon-green/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            Deposit
          </button>
          <button
            onClick={() => { setActiveTab('withdraw'); resetState(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 font-semibold transition-all ${
              activeTab === 'withdraw'
                ? 'text-neon-magenta border-b-2 border-neon-magenta bg-neon-magenta/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            Withdraw
          </button>
          <button
            onClick={() => { setActiveTab('history'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 font-semibold transition-all ${
              activeTab === 'history'
                ? 'text-neon-cyan border-b-2 border-neon-cyan bg-neon-cyan/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button
            onClick={() => { setActiveTab('withdrawals'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 font-semibold transition-all ${
              activeTab === 'withdrawals'
                ? 'text-neon-yellow border-b-2 border-neon-yellow bg-neon-yellow/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-4 h-4" />
            Payouts
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {!user ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">Sign In Required</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Please sign in to deposit or withdraw funds
              </p>
              <button
                onClick={onLogin}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all"
              >
                Sign In
              </button>
            </div>
          ) : activeTab === 'deposit' ? (
            <DepositSection
              upiId={UPI_ID}
              transactionRef={transactionRef}
              setTransactionRef={setTransactionRef}
              depositAmount={depositAmount}
              setDepositAmount={setDepositAmount}
              depositSubmitted={depositSubmitted}
              depositSubmitting={depositSubmitting}
              depositError={depositError}
              onSubmit={handleDepositSubmit}
              copied={copied}
              onCopy={handleCopyUPI}
            />
          ) : activeTab === 'withdraw' ? (
            <WithdrawSection
              balance={state.walletBalance}
              withdrawAmount={withdrawAmount}
              setWithdrawAmount={setWithdrawAmount}
              withdrawUPI={withdrawUPI}
              setWithdrawUPI={setWithdrawUPI}
              error={withdrawError}
              processing={withdrawProcessing}
              success={withdrawSuccess}
              onSubmit={handleWithdrawSubmit}
            />
          ) : activeTab === 'history' ? (
            <HistorySection
              transactions={transactions}
              loading={loadingHistory}
            />
          ) : (
            <WithdrawalHistorySection
              withdrawals={withdrawalRecords}
              loading={loadingWithdrawals}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DepositSection({
  upiId,
  transactionRef,
  setTransactionRef,
  depositAmount,
  setDepositAmount,
  depositSubmitted,
  depositSubmitting,
  depositError,
  onSubmit,
  copied,
  onCopy,
}: {
  upiId: string;
  transactionRef: string;
  setTransactionRef: (val: string) => void;
  depositAmount: string;
  setDepositAmount: (val: string) => void;
  depositSubmitted: boolean;
  depositSubmitting: boolean;
  depositError: string;
  onSubmit: () => void;
  copied: boolean;
  onCopy: () => void;
}) {
  if (depositSubmitted) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-green/20 flex items-center justify-center animate-pulse">
          <Check className="w-8 h-8 text-neon-green" />
        </div>
        <h3 className="font-semibold text-lg text-neon-green mb-2">Request Submitted!</h3>
        <p className="text-muted-foreground text-sm">
          Your deposit request has been submitted successfully.<br />
          <span className="text-foreground font-medium">Balance will update within 60 minutes. After 10 PM, by 9 AM next morning.</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Payment Instructions Notice */}
      <div className="p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-neon-cyan flex-shrink-0 mt-0.5" />
        <p className="text-sm text-neon-cyan">
          <span className="font-semibold">Note:</span> Deposits are verified manually. Your balance will be updated within 60 minutes of payment. For payments made after 10:00 PM, balance will reflect by 9:00 AM the next morning.
        </p>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center">
        <div className="w-48 rounded-xl bg-white p-2 mb-3">
          <img 
            src="https://019ccb48-73d3-7e1c-b1e1-06064847fef8.mochausercontent.com/gpay-qr-code.png" 
            alt="Google Pay QR Code" 
            className="w-full h-auto rounded-lg"
          />
        </div>
        <p className="text-xs text-muted-foreground mb-2">Scan QR code to pay</p>
        <p className="text-xs text-center text-neon-green font-medium px-4">
          Verified Merchant: Prafull Chaudhari. Payments are securely processed via Google Pay Business for Puzzle Cash Pro.
        </p>
      </div>

      {/* Payment Instructions */}
      <div className="p-3 rounded-lg bg-neon-yellow/10 border border-neon-yellow/30 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-neon-yellow flex-shrink-0 mt-0.5" />
        <p className="text-sm text-neon-yellow">
          Your balance will be updated within 60 minutes of payment verification.
        </p>
      </div>

      {/* UPI ID */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">UPI ID</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-3 rounded-lg bg-muted border border-border font-mono text-foreground">
            {upiId}
          </div>
          <button
            onClick={onCopy}
            className="p-3 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-all"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Deposit Amount */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Deposit Amount (₹) <span className="text-destructive">*</span>
        </label>
        <input
          type="number"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="Enter amount you paid"
          className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Transaction Reference */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Transaction Reference Number <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={transactionRef}
          onChange={(e) => setTransactionRef(e.target.value)}
          placeholder="Enter UTR/Transaction ID"
          className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <p className="text-xs text-muted-foreground">
          Enter the UTR number from your payment app after making the payment
        </p>
      </div>

      {/* Error Message */}
      {depositError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{depositError}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={onSubmit}
        disabled={!transactionRef.trim() || !depositAmount.trim() || depositSubmitting}
        className="w-full py-3 rounded-lg bg-neon-green text-white font-semibold hover:bg-neon-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {depositSubmitting ? 'Submitting...' : 'Submit Request'}
      </button>

      {/* WhatsApp Support */}
      <a
        href="https://wa.me/918511363064?text=Hi%2C%20I%20need%20help%20with%20my%20Puzzle%20Cash%20Pro%20deposit"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-sm text-neon-cyan hover:underline"
      >
        Need help? Contact Support on WhatsApp
      </a>
    </div>
  );
}

function WithdrawSection({
  balance,
  withdrawAmount,
  setWithdrawAmount,
  withdrawUPI,
  setWithdrawUPI,
  error,
  processing,
  success,
  onSubmit,
}: {
  balance: number;
  withdrawAmount: string;
  setWithdrawAmount: (val: string) => void;
  withdrawUPI: string;
  setWithdrawUPI: (val: string) => void;
  error: string;
  processing: boolean;
  success: boolean;
  onSubmit: () => void;
}) {
  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-green/20 flex items-center justify-center">
          <Check className="w-8 h-8 text-neon-green" />
        </div>
        <h3 className="font-semibold text-lg text-neon-green mb-2">Request Submitted!</h3>
        <p className="text-muted-foreground text-sm">
          Your withdrawal request has been submitted.<br />
          <span className="text-foreground font-medium">Check the Payouts tab for status.</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Processing Time Notice */}
      <div className="p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-neon-cyan flex-shrink-0 mt-0.5" />
        <p className="text-sm text-neon-cyan">
          Withdrawal requests are processed daily between 8:00 PM and 10:00 PM. Please ensure your UPI details are correct.
        </p>
      </div>

      {/* Info Box */}
      <div className="p-3 rounded-lg bg-neon-yellow/10 border border-neon-yellow/30">
        <p className="text-sm text-neon-yellow">
          <span className="font-semibold">Minimum withdrawal:</span> ₹100
        </p>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₹</span>
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Enter amount"
            min="100"
            max={balance}
            className="w-full pl-8 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Available balance: ₹{balance.toLocaleString()}
        </p>
      </div>

      {/* UPI Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Your UPI ID</label>
        <input
          type="text"
          value={withdrawUPI}
          onChange={(e) => setWithdrawUPI(e.target.value)}
          placeholder="yourname@upi"
          className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={onSubmit}
        disabled={processing}
        className="w-full py-3 rounded-lg bg-neon-magenta text-background font-semibold hover:bg-neon-magenta/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          'Withdraw'
        )}
      </button>

      {/* WhatsApp Support */}
      <a
        href="https://wa.me/918511363064?text=Hi%2C%20I%20need%20help%20with%20my%20Puzzle%20Cash%20Pro%20withdrawal"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-sm text-neon-cyan hover:underline"
      >
        Need help? Contact Support on WhatsApp
      </a>
    </div>
  );
}

function HistorySection({
  transactions,
  loading,
}: {
  transactions: Transaction[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <History className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg text-foreground mb-2">No Transactions Yet</h3>
        <p className="text-muted-foreground text-sm">
          Your transaction history will appear here
        </p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (_type: string, isCredit: boolean) => {
    if (isCredit) {
      return <ArrowDownCircle className="w-5 h-5 text-neon-green" />;
    }
    return <ArrowUpCircle className="w-5 h-5 text-neon-magenta" />;
  };

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
      {transactions.map((tx) => {
        const isCredit = tx.is_credit === 1;
        return (
          <div
            key={tx.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted/70 transition-colors"
          >
            <div className={`p-2 rounded-lg ${isCredit ? 'bg-neon-green/20' : 'bg-neon-magenta/20'}`}>
              {getTypeIcon(tx.type, isCredit)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{tx.title}</p>
              <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
            </div>
            <div className={`font-semibold text-sm ${isCredit ? 'text-neon-green' : 'text-neon-magenta'}`}>
              {isCredit ? '+' : '-'}₹{tx.amount}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WithdrawalHistorySection({
  withdrawals,
  loading,
}: {
  withdrawals: WithdrawalRecord[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-neon-yellow animate-spin" />
      </div>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg text-foreground mb-2">No Withdrawals Yet</h3>
        <p className="text-muted-foreground text-sm">
          Your withdrawal requests will appear here
        </p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'text-neon-green bg-neon-green/20 border-neon-green/30';
      case 'rejected':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'pending':
      default:
        return 'text-neon-yellow bg-neon-yellow/20 border-neon-yellow/30';
    }
  };

  return (
    <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
      {withdrawals.map((w) => (
        <div
          key={w.id}
          className="p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted/70 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-neon-magenta">₹{w.amount}</span>
            <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(w.status)}`}>
              {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>UPI: {w.upi_id || 'N/A'}</p>
            <p>Requested: {formatDate(w.created_at)}</p>
            {w.status.toLowerCase() === 'approved' && w.payout_utr && (
              <p className="text-neon-green font-medium">
                Payout UTR: <span className="font-mono">{w.payout_utr}</span>
              </p>
            )}
            {w.status.toLowerCase() === 'rejected' && (
              <p className="text-red-400">Amount refunded to wallet</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
