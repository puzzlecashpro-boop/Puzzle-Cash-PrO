import { Gift, Sparkles, X } from 'lucide-react';
import { useGame } from '@/react-app/context/GameContext';

export default function DailyBonusModal() {
  const { state, claimDailyBonus, closeDailyBonus } = useGame();

  if (!state.showDailyBonus || state.isLoadingWallet) return null;

  const handleClaim = async () => {
    await claimDailyBonus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-gradient-to-br from-card via-card to-neon-purple/10 rounded-2xl border-2 border-neon-purple/50 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-neon-purple/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-neon-cyan/20 rounded-full blur-3xl" />
        </div>

        {/* Close button */}
        <button
          onClick={closeDailyBonus}
          className="absolute top-4 right-4 p-1 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="relative p-6 text-center">
          {/* Icon */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-yellow via-neon-magenta to-neon-purple rounded-2xl animate-pulse-glow" />
            <div className="absolute inset-1 bg-card rounded-xl flex items-center justify-center">
              <Gift className="w-12 h-12 text-neon-yellow animate-float" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-neon-cyan animate-pulse" />
            <Sparkles className="absolute -bottom-1 -left-2 w-5 h-5 text-neon-magenta animate-pulse delay-150" />
          </div>

          {/* Title */}
          <h2 className="font-gaming text-2xl font-bold text-foreground mb-2">
            Daily <span className="text-neon-yellow text-glow-cyan">Bonus!</span>
          </h2>

          {/* Description */}
          <p className="text-muted-foreground mb-4">
            Claim your free practice credits and start winning today!
          </p>

          {/* Reward Display */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-green/20 border border-neon-green/50 mb-6">
            <Sparkles className="w-5 h-5 text-neon-green" />
            <span className="font-gaming font-bold text-neon-green text-xl">+3 Practice Credits</span>
          </div>

          {/* Claim Button */}
          <button
            onClick={handleClaim}
            className="w-full py-3 px-6 rounded-xl font-gaming font-semibold text-lg bg-gradient-to-r from-neon-purple via-neon-magenta to-neon-cyan text-white hover:opacity-90 transition-all duration-300 hover:scale-[1.02] box-glow-purple"
          >
            CLAIM NOW
          </button>
        </div>
      </div>
    </div>
  );
}
