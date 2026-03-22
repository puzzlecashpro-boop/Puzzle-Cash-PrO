import { useState, useMemo } from 'react';
import { X, Copy, Check, Gift, Users, Share2, Ticket, Loader2 } from 'lucide-react';
import { useAuth } from '@getmocha/users-service/react';

interface ReferralModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ReferralModal({ open, onClose }: ReferralModalProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState('');

  // Generate a unique referral code based on user ID or random string
  const referralCode = useMemo(() => {
    if (user?.id) {
      // Use first 6 chars of user ID (uppercase)
      const code = user.id.replace(/-/g, '').substring(0, 6).toUpperCase();
      return `PC${code}`;
    }
    // Fallback: generate random 6-digit code
    return `PC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }, [user?.id]);

  const appLink = 'https://elr6dnw3w3yj4.mocha.app';

  const whatsappMessage = encodeURIComponent(
    `Hey! Join me on Puzzle Cash Pro, play fun word puzzles and earn real cash. Use my referral code: ${referralCode} to get a joining bonus! Download here: ${appLink}`
  );

  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = referralCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    window.open(whatsappUrl, '_blank');
  };

  const handleApplyCode = async () => {
    if (!inputCode.trim()) {
      setApplyError('Please enter a referral code');
      return;
    }

    setApplyingCode(true);
    setApplyError('');
    setApplySuccess(false);

    try {
      const res = await fetch('/api/referrals/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: inputCode.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (res.ok) {
        setApplySuccess(true);
        setInputCode('');
      } else {
        setApplyError(data.error || 'Failed to apply referral code');
      }
    } catch {
      setApplyError('Network error. Please try again.');
    } finally {
      setApplyingCode(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[90vh] rounded-2xl bg-card border border-primary/30 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="relative p-4 border-b border-border bg-gradient-to-r from-neon-green/20 via-neon-yellow/10 to-neon-cyan/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neon-green/20">
              <Gift className="w-6 h-6 text-neon-green" />
            </div>
            <div>
              <h2 className="font-gaming font-bold text-xl text-foreground">Refer & Earn</h2>
              <p className="text-sm text-muted-foreground">Invite friends, earn rewards!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {/* Enter Referral Code Section */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-neon-magenta/10 to-neon-purple/10 border border-neon-magenta/30">
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="w-5 h-5 text-neon-magenta" />
              <span className="font-medium text-foreground">Have a referral code?</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g. PCABC123)"
                className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-magenta/50 font-mono uppercase"
                maxLength={12}
                disabled={applyingCode || applySuccess}
              />
              <button
                onClick={handleApplyCode}
                disabled={applyingCode || applySuccess || !inputCode.trim()}
                className="px-4 py-2 rounded-lg bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/50 hover:bg-neon-magenta/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {applyingCode ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : applySuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  'Apply'
                )}
              </button>
            </div>
            {applyError && (
              <p className="text-sm text-red-400 mt-2">{applyError}</p>
            )}
            {applySuccess && (
              <p className="text-sm text-neon-green mt-2">Code applied! Referrer gets ₹5 after your first deposit.</p>
            )}
          </div>

          {/* Reward Info */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-neon-green/10 to-neon-yellow/10 border border-neon-green/30">
            <div className="flex items-start gap-3">
              <Users className="w-6 h-6 text-neon-green flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-foreground font-medium">How it works</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Invite a friend. When they join and make their first deposit, you get <span className="text-neon-yellow font-semibold">₹5 reward!</span>
                </p>
              </div>
            </div>
          </div>

          {/* Referral Code Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Your Referral Code</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 rounded-xl bg-background border-2 border-dashed border-neon-cyan/50 font-gaming text-xl text-neon-cyan tracking-widest text-center">
                {referralCode}
              </div>
              <button
                onClick={handleCopyCode}
                className={`p-3 rounded-xl transition-all duration-300 ${
                  copied
                    ? 'bg-neon-green/20 border border-neon-green/50 text-neon-green'
                    : 'bg-card border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50'
                }`}
                title={copied ? 'Copied!' : 'Copy code'}
              >
                {copied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
            {copied && (
              <p className="text-sm text-neon-green text-center animate-in fade-in duration-200">
                Code copied to clipboard!
              </p>
            )}
          </div>

          {/* WhatsApp Share Button */}
          <button
            onClick={handleWhatsAppShare}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold text-lg transition-all duration-300 shadow-lg shadow-[#25D366]/30"
          >
            <Share2 className="w-5 h-5" />
            Invite Friends via WhatsApp
          </button>

          {/* Steps */}
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-muted-foreground">3 Simple Steps:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan font-bold text-xs">1</div>
                <span className="text-muted-foreground">Share your referral code with friends</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan font-bold text-xs">2</div>
                <span className="text-muted-foreground">Friend signs up & makes first deposit</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-neon-green/20 flex items-center justify-center text-neon-green font-bold text-xs">3</div>
                <span className="text-muted-foreground">You receive ₹5 bonus!</span>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground text-center">
              Rewards will be credited automatically once your friend completes their first deposit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
