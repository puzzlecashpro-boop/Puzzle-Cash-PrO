import { useState } from 'react';
import { X, ArrowUpCircle, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import { useGame } from '@/react-app/context/GameContext';

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
}

const MIN_WITHDRAWAL = 100;

export default function WithdrawModal({ open, onClose }: WithdrawModalProps) {
  const { state, withdraw, deposit } = useGame();
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [withdrawnAmount, setWithdrawnAmount] = useState('');
  const [withdrawnUpi, setWithdrawnUpi] = useState('');

  if (!open) return null;

  const validateUPI = (upi: string): boolean => {
    // Basic UPI validation: should contain @ and have valid format
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    return upiRegex.test(upi);
  };

  const handleDevAddBalance = async () => {
    try {
      await deposit(100);
    } catch {
      // Silently handle error
    }
  };

  const handleWithdraw = async () => {
    setError('');
    
    const withdrawAmount = parseInt(amount);
    
    // Validate amount
    if (!withdrawAmount || withdrawAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (withdrawAmount < MIN_WITHDRAWAL) {
      setError(`Minimum withdrawal is ₹${MIN_WITHDRAWAL}`);
      return;
    }
    
    if (withdrawAmount > state.walletBalance) {
      setError('Insufficient balance');
      return;
    }
    
    // Validate UPI ID
    if (!upiId.trim()) {
      setError('Please enter your UPI ID');
      return;
    }
    
    if (!validateUPI(upiId.trim())) {
      setError('Please enter a valid UPI ID (e.g., yourname@upi)');
      return;
    }

    setIsLoading(true);
    
    // Store values for success message before clearing
    setWithdrawnAmount(amount);
    setWithdrawnUpi(upiId.trim());
    
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Call the actual withdraw function to deduct from database
      const result = await withdraw(withdrawAmount);
      
      setIsLoading(false);

      if (result.success) {
        setShowSuccess(true);
      } else {
        setError(result.error || 'Withdrawal failed. Please try again.');
      }
    } catch {
      setIsLoading(false);
      setError('Withdrawal failed. Please try again.');
    }
  };

  const handleClose = () => {
    setAmount('');
    setUpiId('');
    setError('');
    setShowSuccess(false);
    setWithdrawnAmount('');
    setWithdrawnUpi('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-card rounded-2xl border border-neon-magenta/30 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-6 h-6 text-neon-magenta" />
            <h2 className="font-gaming font-semibold text-lg">Withdraw Funds</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {showSuccess ? (
            /* Success State */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-neon-magenta/20 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-neon-magenta" />
              </div>
              <div>
                <h3 className="font-gaming font-semibold text-lg text-neon-magenta">Withdrawal Processing!</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Your withdrawal of ₹{withdrawnAmount} is being processed.<br />
                  Funds will be sent to {withdrawnUpi} within 24 hours.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="mt-4 px-6 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors font-medium"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Balance Info */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Available Balance</div>
                    <div className="font-gaming font-bold text-2xl text-neon-yellow">
                      ₹{state.walletBalance.toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={handleDevAddBalance}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-neon-green border border-dashed border-muted-foreground/30 hover:border-neon-green/50 rounded transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Dev Test: Add ₹100
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Withdrawal Amount <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError('');
                    }}
                    placeholder={`Min ₹${MIN_WITHDRAWAL}`}
                    className="w-full pl-8 pr-4 py-3 rounded-lg bg-input border border-border focus:border-neon-magenta focus:ring-1 focus:ring-neon-magenta outline-none transition-all"
                  />
                </div>
              </div>

              {/* UPI ID */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Your UPI ID <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => {
                    setUpiId(e.target.value);
                    setError('');
                  }}
                  placeholder="yourname@upi"
                  className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:border-neon-magenta focus:ring-1 focus:ring-neon-magenta outline-none transition-all"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  <span className="text-sm text-destructive">{error}</span>
                </div>
              )}

              {/* Info Note */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
                <AlertCircle className="w-5 h-5 text-neon-cyan flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Minimum withdrawal: <span className="text-neon-cyan font-semibold">₹{MIN_WITHDRAWAL}</span>. 
                  Withdrawals are processed within 24 hours.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!showSuccess && (
          <div className="p-4 border-t border-border bg-muted/30">
            <button
              onClick={handleWithdraw}
              disabled={!amount || !upiId || isLoading}
              className="w-full py-3 rounded-xl font-gaming font-semibold bg-neon-magenta text-white hover:bg-neon-magenta/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'PROCESSING...' : 'WITHDRAW'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
