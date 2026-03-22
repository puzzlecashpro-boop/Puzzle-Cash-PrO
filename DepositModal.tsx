import { useState } from 'react';
import { X, ArrowDownCircle, Copy, Check, CheckCircle, LogIn } from 'lucide-react';
import { useAuth } from '@getmocha/users-service/react';

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
  onOpenLogin?: () => void;
}

const UPI_ID = 'puzzlecash@upi';

export default function DepositModal({ open, onClose, onOpenLogin }: DepositModalProps) {
  const { user, isPending } = useAuth();
  const [transactionRef, setTransactionRef] = useState('');
  const [amount, setAmount] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const isLoggedIn = !!user;

  const handleCopyUPI = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = UPI_ID;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async () => {
    if (!transactionRef.trim() || !amount.trim()) return;
    
    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
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
        setError('Server returned invalid response');
        return;
      }
      
      console.log('Deposit request response:', data);
      
      if (data.success === true) {
        alert('Success: Deposit submitted to database! ID: ' + (data.id || 'unknown'));
        setShowSuccess(true);
      } else {
        const errorMsg = data.error || 'Unknown error';
        alert('DB Error: ' + errorMsg);
        console.error('Deposit request failed:', data);
        setError(errorMsg);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Network error';
      alert('DB Error: ' + errMsg);
      console.error('Deposit request network error:', err);
      setError('Network error: ' + errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTransactionRef('');
    setAmount('');
    setShowSuccess(false);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-card rounded-2xl border border-neon-green/30 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-6 h-6 text-neon-green" />
            <h2 className="font-gaming font-semibold text-lg">Deposit Funds</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {isPending ? (
            <div className="py-8 text-center">
              <div className="w-8 h-8 mx-auto border-2 border-neon-green border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground mt-4">Loading...</p>
            </div>
          ) : !isLoggedIn ? (
            /* Not Logged In State */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-neon-magenta/20 flex items-center justify-center">
                <LogIn className="w-10 h-10 text-neon-magenta" />
              </div>
              <div>
                <h3 className="font-gaming font-semibold text-lg text-neon-magenta">Login Required</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Please log in to deposit funds.<br />
                  We need your account info to credit your wallet.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenLogin?.();
                }}
                className="mt-4 px-6 py-2 rounded-lg bg-neon-magenta text-white hover:bg-neon-magenta/80 transition-colors font-medium"
              >
                Log In Now
              </button>
            </div>
          ) : showSuccess ? (
            /* Success State */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-neon-green/20 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-neon-green" />
              </div>
              <div>
                <h3 className="font-gaming font-semibold text-lg text-neon-green">Request Submitted!</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Deposit request sent to admin.<br />
                  Balance will update within 2 hours.
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
              {/* QR Code Placeholder */}
              <div className="flex flex-col items-center">
                <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center p-3">
                  <div className="w-full h-full border-4 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-xs text-center px-2">QR Code<br/>Coming Soon</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Scan to pay via UPI</p>
              </div>

              {/* UPI ID */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Or pay to UPI ID</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-3 rounded-lg bg-muted/50 border border-border font-mono text-neon-green">
                    {UPI_ID}
                  </div>
                  <button
                    onClick={handleCopyUPI}
                    className={`p-3 rounded-lg border transition-all ${
                      copied 
                        ? 'bg-neon-green/20 border-neon-green text-neon-green' 
                        : 'bg-muted border-border hover:border-neon-green text-muted-foreground hover:text-neon-green'
                    }`}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Transaction Reference */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Amount Paid (₹) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount you paid"
                  className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:border-neon-green focus:ring-1 focus:ring-neon-green outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Transaction Reference No. <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="Enter UPI transaction ID"
                  className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:border-neon-green focus:ring-1 focus:ring-neon-green outline-none transition-all"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the 12-digit transaction reference from your payment app
                </p>
              </div>

              {error && (
                <div className="text-sm text-destructive text-center">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!showSuccess && (
          <div className="p-4 border-t border-border bg-muted/30">
            <button
              onClick={handleSubmit}
              disabled={!transactionRef.trim() || !amount.trim() || isSubmitting}
              className="w-full py-3 rounded-xl font-gaming font-semibold bg-neon-green text-background hover:bg-neon-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT DEPOSIT REQUEST'}
            </button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Make payment first, then submit the reference number
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
