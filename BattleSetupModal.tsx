import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { X, Swords, Users, Crown, Wallet, AlertCircle, Clock } from 'lucide-react';
import { GameData } from '@/react-app/data/games';
import { useGame } from '@/react-app/context/GameContext';

interface BattleSetupModalProps {
  game: GameData;
  open: boolean;
  onClose: () => void;
}

type BattleMode = '1v1' | 'tournament';
type EntryFee = 10 | 50 | 100;

// Payout structures (20% platform fee for 1v1, ~24% for tournament)
const PAYOUTS = {
  '1v1': {
    10: 16,
    50: 80,
    100: 160,
  },
  'tournament': {
    // 5-player tournament - winner takes all
    10: 38,
    50: 190,
    100: 380,
  },
};

const MATCHMAKING_TIMEOUT = 30; // 30 seconds - if no player found, cancel and refund
const BOT_MATCH_TIME = 15; // After 15 seconds, match with a bot

// Bot names pool for AI opponents
const BOT_NAMES = [
  'SpeedKing', 'PuzzlePro', 'QuickMind', 'BrainAce', 'FastSolver',
  'ChampX', 'ProGamer', 'MindBlitz', 'SwiftWin', 'TopPlayer',
  'NinjaX', 'RapidFire', 'SharpMind', 'BlitzMaster', 'TurboSolver'
];

export default function BattleSetupModal({ game, open, onClose }: BattleSetupModalProps) {
  const navigate = useNavigate();
  const { state, deductEntryFee, refundEntryFee, startGame, setMatchmaking } = useGame();
  const [battleMode, setBattleMode] = useState<BattleMode>('1v1');
  const [entryFee, setEntryFee] = useState<EntryFee>(10);
  const [isSearching, setIsSearching] = useState(false);
  const [countdown, setCountdown] = useState(MATCHMAKING_TIMEOUT);
  const [error, setError] = useState('');
  const [showTimeoutAlert, setShowTimeoutAlert] = useState(false);
  
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const matchFoundRef = useRef<NodeJS.Timeout | null>(null);
  const matchCancelledRef = useRef(false); // Track if match was cancelled/timed out

  // Reset all state when modal opens or closes
  useEffect(() => {
    if (open) {
      // Reset state when modal opens
      setBattleMode('1v1');
      setEntryFee(10);
      setIsSearching(false);
      setCountdown(MATCHMAKING_TIMEOUT);
      setError('');
      setShowTimeoutAlert(false);
      matchCancelledRef.current = false;
    } else {
      // Clean up timers when modal closes
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (matchFoundRef.current) clearTimeout(matchFoundRef.current);
      matchCancelledRef.current = true;
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (matchFoundRef.current) clearTimeout(matchFoundRef.current);
    };
  }, []);

  // Countdown timer during matchmaking
  useEffect(() => {
    if (isSearching && countdown > 0 && !matchCancelledRef.current) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // Time's up - trigger timeout
            if (!matchCancelledRef.current) {
              matchCancelledRef.current = true; // Prevent match from starting
              // Clear the match found timeout immediately
              if (matchFoundRef.current) {
                clearTimeout(matchFoundRef.current);
                matchFoundRef.current = null;
              }
              if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
              }
              handleMatchmakingTimeout();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [isSearching]);

  const handleMatchmakingTimeout = async () => {
    // Mark as cancelled first to prevent any pending match from starting
    matchCancelledRef.current = true;
    
    // Clear all timers
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (matchFoundRef.current) {
      clearTimeout(matchFoundRef.current);
      matchFoundRef.current = null;
    }
    
    setIsSearching(false);
    setMatchmaking(false);
    
    // Refund the entry fee
    await refundEntryFee(entryFee, battleMode, game.title);
    
    // Show timeout alert
    setShowTimeoutAlert(true);
  };

  const handleTimeoutAlertClose = () => {
    setShowTimeoutAlert(false);
    setCountdown(MATCHMAKING_TIMEOUT);
    onClose();
    // Navigate home
    navigate('/');
  };

  if (!open) return null;

  const handleStartBattle = async () => {
    setError('');
    setCountdown(MATCHMAKING_TIMEOUT);

    if (state.walletBalance < entryFee) {
      setError(`Insufficient balance! You need ₹${entryFee} but have ₹${state.walletBalance}.`);
      return;
    }

    const success = await deductEntryFee(entryFee, battleMode, game.title);
    if (!success) {
      setError('Failed to deduct entry fee. Please try again.');
      return;
    }

    setIsSearching(true);
    setMatchmaking(true);
    matchCancelledRef.current = false; // Reset cancelled flag

    // Wait exactly 15 seconds then match with a bot
    // This simulates "no real player found, matching with AI"
    const matchTime = BOT_MATCH_TIME * 1000; // 15 seconds
    
    matchFoundRef.current = setTimeout(() => {
      // Check if match was cancelled/timed out before starting
      if (matchCancelledRef.current) {
        return; // Don't start the game if match was cancelled
      }
      
      if (countdownRef.current) clearInterval(countdownRef.current);
      setIsSearching(false);
      setMatchmaking(false);
      
      // Select a random bot opponent
      const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      
      startGame(game.id, 'battle', entryFee);
      sessionStorage.setItem('battleType', battleMode);
      sessionStorage.setItem('battleEntryFee', entryFee.toString());
      sessionStorage.setItem('opponentName', botName);
      sessionStorage.setItem('opponentIsBot', 'true');
      
      navigate(`/game/${game.id}`);
      onClose();
    }, matchTime);
  };

  const handleCancelMatchmaking = async () => {
    // Mark as cancelled first
    matchCancelledRef.current = true;
    
    // Clear timers
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (matchFoundRef.current) {
      clearTimeout(matchFoundRef.current);
      matchFoundRef.current = null;
    }
    
    setIsSearching(false);
    setMatchmaking(false);
    
    // Refund entry fee
    await refundEntryFee(entryFee, battleMode, game.title);
    
    setCountdown(MATCHMAKING_TIMEOUT);
    alert('Match cancelled. Entry fee refunded.');
  };

  const Icon = game.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      {/* Timeout Alert Modal */}
      {showTimeoutAlert && (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/80">
          <div className="bg-card rounded-2xl border border-neon-yellow/50 p-6 max-w-sm mx-4 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-yellow/20 flex items-center justify-center">
              <Clock className="w-8 h-8 text-neon-yellow" />
            </div>
            <h3 className="font-gaming text-xl text-neon-yellow mb-2">Match Cancelled</h3>
            <p className="text-muted-foreground mb-4">
              Match cancelled due to lack of players. Entry fee of ₹{entryFee} has been refunded to your wallet.
            </p>
            <button
              onClick={handleTimeoutAlertClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-yellow to-neon-green text-black font-gaming font-bold hover:opacity-90 transition-opacity"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-md bg-card rounded-2xl border border-neon-magenta/30 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Searching Overlay */}
        {isSearching && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/95 backdrop-blur-sm">
            {/* Countdown Timer */}
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-neon-yellow/20 border border-neon-yellow/50">
              <Clock className="w-4 h-4 text-neon-yellow" />
              <span className="font-gaming text-lg text-neon-yellow">{countdown}s</span>
            </div>

            <div className="relative">
              <div className="w-24 h-24 border-4 border-neon-magenta/30 border-t-neon-magenta rounded-full animate-spin" />
              {battleMode === '1v1' ? (
                <Swords className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-neon-magenta" />
              ) : (
                <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-neon-magenta" />
              )}
            </div>
            <p className="mt-4 font-gaming text-xl text-neon-magenta animate-pulse">
              {battleMode === '1v1' ? 'Finding Opponent...' : 'Joining Tournament...'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {battleMode === '1v1' 
                ? 'Matching you with a worthy rival' 
                : 'Gathering 4 other players...'}
            </p>
            <div className="mt-4 flex gap-1">
              {[...Array(battleMode === '1v1' ? 2 : 5)].map((_, i) => (
                <div 
                  key={i}
                  className="w-2 h-2 rounded-full bg-neon-magenta/50 animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            
            {/* Cancel Button */}
            <button
              onClick={handleCancelMatchmaking}
              className="mt-6 px-6 py-2 rounded-lg border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors font-medium"
            >
              Cancel Match
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-neon-magenta/10 to-neon-purple/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-magenta/20">
              <Icon className="w-6 h-6 text-neon-magenta" />
            </div>
            <div>
              <h2 className="font-gaming font-semibold text-lg">{game.title}</h2>
              <p className="text-xs text-muted-foreground">Battle Setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {/* Wallet Balance */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-neon-cyan" />
              <span className="text-sm text-muted-foreground">Your Balance</span>
            </div>
            <span className="font-gaming text-lg text-neon-cyan">₹{state.walletBalance}</span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Mode Selection */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Select Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setBattleMode('1v1')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  battleMode === '1v1'
                    ? 'border-neon-magenta bg-neon-magenta/10'
                    : 'border-border bg-muted/30 hover:border-neon-magenta/50'
                }`}
              >
                <Swords className={`w-8 h-8 mx-auto mb-2 ${battleMode === '1v1' ? 'text-neon-magenta' : 'text-muted-foreground'}`} />
                <div className={`font-gaming font-semibold ${battleMode === '1v1' ? 'text-neon-magenta' : 'text-foreground'}`}>
                  1 vs 1 Battle
                </div>
                <div className="text-xs text-muted-foreground mt-1">Head to head</div>
              </button>
              
              <button
                onClick={() => setBattleMode('tournament')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  battleMode === 'tournament'
                    ? 'border-neon-yellow bg-neon-yellow/10'
                    : 'border-border bg-muted/30 hover:border-neon-yellow/50'
                }`}
              >
                <Crown className={`w-8 h-8 mx-auto mb-2 ${battleMode === 'tournament' ? 'text-neon-yellow' : 'text-muted-foreground'}`} />
                <div className={`font-gaming font-semibold ${battleMode === 'tournament' ? 'text-neon-yellow' : 'text-foreground'}`}>
                  Group Match
                </div>
                <div className="text-xs text-muted-foreground mt-1">5 Players</div>
              </button>
            </div>
          </div>

          {/* Entry Fee Selection */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Entry Fee
            </label>
            <div className="grid grid-cols-3 gap-3">
              {([10, 50, 100] as EntryFee[]).map((fee) => (
                <button
                  key={fee}
                  onClick={() => setEntryFee(fee)}
                  disabled={state.walletBalance < fee}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    entryFee === fee
                      ? 'border-neon-green bg-neon-green/10'
                      : state.walletBalance < fee
                      ? 'border-border/50 bg-muted/20 opacity-50 cursor-not-allowed'
                      : 'border-border bg-muted/30 hover:border-neon-green/50'
                  }`}
                >
                  <div className={`font-gaming text-xl ${entryFee === fee ? 'text-neon-green' : 'text-foreground'}`}>
                    ₹{fee}
                  </div>
                  {state.walletBalance < fee && (
                    <div className="text-xs text-destructive mt-1">Low balance</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Prize Info */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-neon-yellow/10 to-neon-green/10 border border-neon-yellow/30">
            {battleMode === '1v1' ? (
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Winner Takes</div>
                <div className="font-gaming text-3xl text-neon-yellow">₹{PAYOUTS['1v1'][entryFee]}</div>
                <div className="text-xs text-muted-foreground mt-1">20% platform fee</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Winner Takes</div>
                <div className="font-gaming text-3xl text-neon-yellow">₹{PAYOUTS['tournament'][entryFee]}</div>
                <div className="text-xs text-muted-foreground mt-1">5 players • Winner takes all</div>
              </div>
            )}
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartBattle}
            disabled={isSearching || state.walletBalance < entryFee}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-neon-magenta to-neon-purple text-white font-gaming font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {battleMode === '1v1' ? (
              <Swords className="w-6 h-6" />
            ) : (
              <Crown className="w-6 h-6" />
            )}
            {state.walletBalance < entryFee 
              ? 'Insufficient Balance' 
              : `Enter ${battleMode === '1v1' ? '1v1 Battle' : 'Group Match'} - ₹${entryFee}`}
          </button>
        </div>
      </div>
    </div>
  );
}
