import { useState } from 'react';
import { useNavigate } from 'react-router';
import { X, Zap, Swords, Trophy, Clock, Lock } from 'lucide-react';
import { GameData } from '@/react-app/data/games';
import { useGame } from '@/react-app/context/GameContext';
import { useAuth } from '@getmocha/users-service/react';
import VideoAdModal from '@/react-app/components/ads/VideoAdModal';

interface GameSelectModalProps {
  game: GameData;
  open: boolean;
  onClose: () => void;
  onRequireLogin: () => void;
  onOpenBattleSetup: () => void;
}

export default function GameSelectModal({ game, open, onClose, onRequireLogin, onOpenBattleSetup }: GameSelectModalProps) {
  const navigate = useNavigate();
  const { state, usePracticeCredit, startGame } = useGame();
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [showVideoAd, setShowVideoAd] = useState(false);
  const [pendingPractice, setPendingPractice] = useState(false);

  if (!open) return null;

  const handlePractice = () => {
    if (state.practiceCredits <= 0) {
      setError('No practice credits! Claim daily bonus or deposit funds.');
      return;
    }
    
    // Show video ad before starting practice game
    setPendingPractice(true);
    setShowVideoAd(true);
  };

  const handleAdComplete = async () => {
    setShowVideoAd(false);
    
    if (pendingPractice) {
      const success = await usePracticeCredit();
      if (success) {
        startGame(game.id, 'practice');
        navigate(`/game/${game.id}`);
        onClose();
      } else {
        setError('Failed to use practice credit');
      }
      setPendingPractice(false);
    }
  };

  const handleBattle = () => {
    // Require login for paid battles
    if (!user) {
      onClose();
      onRequireLogin();
      return;
    }

    // Open battle setup modal (don't close this modal - let Home.tsx handle it)
    onOpenBattleSetup();
  };

  const Icon = game.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-card rounded-2xl border border-primary/30 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-gaming font-semibold text-lg">{game.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Game Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Time Limit: {game.timeLimit}s</span>
            </div>
            <div className="flex items-center gap-2 text-neon-yellow">
              <Trophy className="w-4 h-4" />
              <span>Prize: ₹{game.prizePool}</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Practice Option */}
          <button
            onClick={handlePractice}
            className="w-full p-4 rounded-xl bg-muted hover:bg-muted/80 border border-border hover:border-neon-cyan/50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neon-cyan/20 group-hover:bg-neon-cyan/30 transition-colors">
                  <Zap className="w-5 h-5 text-neon-cyan" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Practice Match</div>
                  <div className="text-sm text-muted-foreground">Free to play, no prizes</div>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-neon-cyan/20 text-neon-cyan text-sm font-medium">
                FREE
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Uses 1 practice credit</span>
              <span className="text-neon-cyan">{state.practiceCredits} credits left</span>
            </div>
          </button>

          {/* Battle Option */}
          <button
            onClick={handleBattle}
            className="w-full p-4 rounded-xl bg-gradient-to-r from-neon-magenta/20 to-neon-purple/20 hover:from-neon-magenta/30 hover:to-neon-purple/30 border border-neon-magenta/50 hover:border-neon-magenta transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neon-magenta/20 group-hover:bg-neon-magenta/30 transition-colors">
                  <Swords className="w-5 h-5 text-neon-magenta" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Paid Battle</div>
                  <div className="text-sm text-muted-foreground">Compete to win real cash!</div>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-neon-magenta/20 text-neon-magenta text-sm font-medium">
                ₹{game.entryFee}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              {!user ? (
                <span className="flex items-center gap-1 text-neon-yellow">
                  <Lock className="w-3 h-3" />
                  Sign in required
                </span>
              ) : (
                <span className="text-muted-foreground">Entry fee deducted from wallet</span>
              )}
              <span className="text-neon-yellow font-medium">Win ₹{game.prizePool}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Video Ad Modal for Practice Mode */}
      <VideoAdModal
        open={showVideoAd}
        onComplete={handleAdComplete}
      />
    </div>
  );
}
