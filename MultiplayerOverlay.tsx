import { useState, useEffect, useRef } from 'react';
import { User, Swords, Bot } from 'lucide-react';

interface MultiplayerOverlayProps {
  playerScore: number;
  maxScore?: number;
  isPlaying: boolean;
  gameStartTime?: number; // Timestamp when game started
  onOpponentWins?: (opponentTime: number) => void; // Called when opponent reaches 100% first
}

// AI completion times - ALL GAMES: 32-40 seconds
// Gives skilled players a fair chance to win while keeping matches competitive
// Random variation ensures AI doesn't finish at the same time every match
const getAiCompletionTime = (): number => {
  const min = 32;
  const max = 40;
  // Random time within range for natural variation
  return min + Math.random() * (max - min);
};

export default function MultiplayerOverlay({ playerScore, maxScore = 100, isPlaying, gameStartTime, onOpponentWins }: MultiplayerOverlayProps) {
  const [opponentScore, setOpponentScore] = useState(0);
  const [aiCompletionTime] = useState(() => getAiCompletionTime());
  const [opponentName] = useState(() => 
    sessionStorage.getItem('opponentName') || 'Opponent'
  );
  const opponentWonRef = useRef(false); // Track if opponent already won

  // AI progress - smooth steady movement like a human playing
  useEffect(() => {
    if (!isPlaying || !gameStartTime) return;
    
    const updateAiProgress = () => {
      const elapsed = (Date.now() - gameStartTime) / 1000;
      
      // Smooth linear progress - no jumps, steady movement
      let progress = elapsed / aiCompletionTime;
      
      // Tiny micro-variance (±1%) for human-like feel without visible jumps
      const microVariance = (Math.sin(elapsed * 3) * 0.01);
      progress = Math.min(1, Math.max(0, progress + microVariance));
      
      // Convert to score
      const newScore = Math.round(progress * maxScore);
      setOpponentScore(Math.min(newScore, maxScore));
      
      // Check if opponent won (reached 100% before player)
      if (newScore >= maxScore && playerScore < maxScore && !opponentWonRef.current) {
        opponentWonRef.current = true;
        if (onOpponentWins) {
          onOpponentWins(aiCompletionTime);
        }
      }
    };
    
    // Update every 100ms for smooth progress
    updateAiProgress();
    const interval = setInterval(updateAiProgress, 100);
    return () => clearInterval(interval);
  }, [isPlaying, gameStartTime, aiCompletionTime, maxScore, playerScore, onOpponentWins]);
  
  // Reset opponent won flag when game restarts
  useEffect(() => {
    if (gameStartTime) {
      opponentWonRef.current = false;
      setOpponentScore(0);
    }
  }, [gameStartTime]);

  // Calculate progress percentages
  const playerProgress = Math.min((playerScore / maxScore) * 100, 100);
  const opponentProgress = Math.min((opponentScore / maxScore) * 100, 100);
  
  // Determine who's leading
  const playerLeading = playerScore > opponentScore;
  const tied = playerScore === opponentScore;

  return (
    <div className="w-full mb-4 p-4 rounded-xl bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/50 backdrop-blur-sm shadow-lg shadow-primary/20">
      {/* VS Header */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <Swords className="w-5 h-5 text-neon-yellow" />
        <span className="font-gaming text-sm text-neon-yellow tracking-wider">⚡ LIVE BATTLE ⚡</span>
        <Swords className="w-5 h-5 text-neon-yellow" />
      </div>

      {/* Player Row */}
      <div className="space-y-4">
        {/* You */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 w-28 flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              playerLeading ? 'bg-neon-green/30 border-2 border-neon-green shadow-lg shadow-neon-green/30' : 'bg-neon-cyan/30 border-2 border-neon-cyan'
            }`}>
              <User className={`w-4 h-4 ${playerLeading ? 'text-neon-green' : 'text-neon-cyan'}`} />
            </div>
            <span className={`font-gaming text-sm font-bold ${playerLeading ? 'text-neon-green' : 'text-foreground'}`}>
              ME
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="flex-1 h-6 bg-background rounded-full overflow-hidden border-2 border-primary/30 shadow-inner">
            <div 
              className={`h-full transition-all duration-300 rounded-full relative ${
                playerLeading ? 'bg-gradient-to-r from-neon-green via-neon-cyan to-neon-green' : 'bg-gradient-to-r from-neon-cyan to-neon-purple'
              }`}
              style={{ width: `${playerProgress}%` }}
            >
              {playerProgress > 15 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-black">
                  {Math.round(playerProgress)}%
                </span>
              )}
            </div>
          </div>
          
          {/* Score */}
          <div className={`w-14 text-right font-gaming font-bold text-lg ${
            playerLeading ? 'text-neon-green text-glow-green' : 'text-neon-cyan'
          }`}>
            {playerScore}
          </div>
        </div>

        {/* Opponent */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 w-28 flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              !playerLeading && !tied ? 'bg-neon-magenta/30 border-2 border-neon-magenta shadow-lg shadow-neon-magenta/30' : 'bg-muted border-2 border-border'
            }`}>
              <Bot className={`w-4 h-4 ${!playerLeading && !tied ? 'text-neon-magenta' : 'text-muted-foreground'}`} />
            </div>
            <span className={`font-gaming text-xs truncate ${
              !playerLeading && !tied ? 'text-neon-magenta' : 'text-muted-foreground'
            }`}>
              {opponentName}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="flex-1 h-6 bg-background rounded-full overflow-hidden border-2 border-primary/30 shadow-inner">
            <div 
              className={`h-full transition-all duration-300 rounded-full relative ${
                !playerLeading && !tied ? 'bg-gradient-to-r from-neon-magenta via-neon-purple to-neon-magenta' : 'bg-muted'
              }`}
              style={{ width: `${opponentProgress}%` }}
            >
              {opponentProgress > 15 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-black">
                  {Math.round(opponentProgress)}%
                </span>
              )}
            </div>
          </div>
          
          {/* Score */}
          <div className={`w-14 text-right font-gaming font-bold text-lg ${
            !playerLeading && !tied ? 'text-neon-magenta' : 'text-muted-foreground'
          }`}>
            {opponentScore}
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mt-3 text-center">
        {tied ? (
          <span className="text-sm text-neon-yellow font-bold">⚔️ TIED!</span>
        ) : playerLeading ? (
          <span className="text-sm text-neon-green font-bold animate-pulse">🔥 You're ahead by {playerScore - opponentScore}!</span>
        ) : (
          <span className="text-sm text-neon-magenta font-bold">⚡ Opponent leads by {opponentScore - playerScore}</span>
        )}
      </div>
    </div>
  );
}
