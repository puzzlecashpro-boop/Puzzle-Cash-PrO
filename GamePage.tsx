import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Trophy, Frown, Clock, Star, Zap, Home, Crown, Medal, Award } from 'lucide-react';
import { getGameById } from '@/react-app/data/games';
import { useGame } from '@/react-app/context/GameContext';
import WordSearchGame from '@/react-app/components/games/WordSearchGame';
import MemoryMatchGame from '@/react-app/components/games/MemoryMatchGame';
import SpeedMathGame from '@/react-app/components/games/SpeedMathGame';
import Game2048 from '@/react-app/components/games/Game2048';
import SlidingPuzzleGame from '@/react-app/components/games/SlidingPuzzleGame';
import BlockPuzzleGame from '@/react-app/components/games/BlockPuzzleGame';
import MultiplayerOverlay from '@/react-app/components/MultiplayerOverlay';

type GameStatus = 'playing' | 'victory' | 'defeat';
type BattleType = '1v1' | 'tournament' | null;

// Payout structures
const PAYOUTS_1V1: Record<number, number> = { 10: 16, 50: 80, 100: 160 };
const PAYOUTS_TOURNAMENT: Record<number, number[]> = {
  10: [38, 0, 0, 0, 0],   // Winner takes all
  50: [190, 0, 0, 0, 0],
  100: [380, 0, 0, 0, 0],
};

// Generate simulated opponent scores
const generateOpponentScores = (playerScore: number): { name: string; score: number }[] => {
  const opponents: { name: string; score: number }[] = [];
  const names = ['CryptoKing', 'SpeedyMike', 'PuzzlePro', 'MindMaster', 'QuickDraw', 'BrainiacX', 'FastFingers', 'ChampionAce', 'NinjaSolver'];
  
  for (let i = 0; i < 9; i++) {
    // Spread opponent scores around player score for realistic competition
    const variance = Math.floor(Math.random() * 60) - 25;
    const oppScore = Math.max(0, playerScore + variance);
    opponents.push({ name: names[i], score: oppScore });
  }
  return opponents;
};

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { state, endGame, recordGameResult } = useGame();
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [score, setScore] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [gameKey, setGameKey] = useState(0); // Key to force re-mount on replay
  const [gameComplete, setGameComplete] = useState(false);
  const [battleType, setBattleType] = useState<BattleType>(null);
  const [battleEntryFee, setBattleEntryFee] = useState(0);
  const [tournamentRank, setTournamentRank] = useState(0);
  const [tournamentResults, setTournamentResults] = useState<{ name: string; score: number }[]>([]);
  const [prizeWon, setPrizeWon] = useState(0);
  const [liveScore, setLiveScore] = useState(0);
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now());
  const [opponentWon, setOpponentWon] = useState(false);

  const game = gameId ? getGameById(gameId) : null;

  // Load battle settings from sessionStorage
  useEffect(() => {
    const storedBattleType = sessionStorage.getItem('battleType') as BattleType;
    const storedEntryFee = parseInt(sessionStorage.getItem('battleEntryFee') || '0', 10);
    setBattleType(storedBattleType);
    setBattleEntryFee(storedEntryFee);
  }, []);

  // Redirect only if game data doesn't exist (invalid game ID)
  useEffect(() => {
    if (!game) {
      navigate('/');
    }
  }, [game, navigate]);

  // Handle opponent (AI bot) winning before player
  const handleOpponentWins = useCallback(async (opponentTime: number) => {
    // Prevent double-triggering
    if (gameComplete || opponentWon) return;
    setOpponentWon(true);
    setGameComplete(true);
    
    // Opponent finished first - player loses
    setScore(liveScore);
    setTimeTaken(Math.round(opponentTime));
    setPrizeWon(0); // No prize for losing
    setGameStatus('defeat');
    
    const gameMode = state.gameMode || 'practice';
    const entryFee = battleEntryFee || state.entryFee || 0;
    
    // Record the loss
    await recordGameResult({
      gameId: gameId || '',
      gameMode,
      entryFee,
      prizeWon: 0,
      score: liveScore,
      timeTaken: Math.round(opponentTime),
      isWin: false,
      battleType: battleType || undefined,
      gameName: game?.title || gameId || '',
    });
  }, [gameComplete, opponentWon, liveScore, state.gameMode, state.entryFee, battleType, battleEntryFee, gameId, recordGameResult, game?.title]);

  const handleGameComplete = useCallback(async (won: boolean, finalScore: number, time: number) => {
    // Prevent double-triggering or if opponent already won
    if (gameComplete || opponentWon) return;
    setGameComplete(true);
    
    setScore(finalScore);
    setTimeTaken(time);

    const gameMode = state.gameMode || 'practice';
    const entryFee = battleEntryFee || state.entryFee || 0;
    let calculatedPrize = 0;
    let rank = 0;

    if (gameMode === 'battle' && battleType && won) {
      if (battleType === '1v1') {
        // 1v1 win - get the fixed payout
        calculatedPrize = PAYOUTS_1V1[entryFee] || 0;
      } else if (battleType === 'tournament') {
        // Tournament - simulate opponent scores and determine rank
        const opponents = generateOpponentScores(finalScore);
        const allPlayers = [{ name: 'You', score: finalScore }, ...opponents];
        allPlayers.sort((a, b) => b.score - a.score);
        
        rank = allPlayers.findIndex(p => p.name === 'You') + 1;
        setTournamentRank(rank);
        setTournamentResults(allPlayers);
        
        // Get prize based on rank (ranks 1-5 win prizes)
        const prizes = PAYOUTS_TOURNAMENT[entryFee] || [];
        if (rank >= 1 && rank <= 5) {
          calculatedPrize = prizes[rank - 1] || 0;
        }
      }
    } else if (gameMode === 'battle' && battleType === 'tournament' && !won) {
      // Lost in tournament - still show ranking
      const opponents = generateOpponentScores(finalScore);
      const allPlayers = [{ name: 'You', score: finalScore }, ...opponents];
      allPlayers.sort((a, b) => b.score - a.score);
      rank = allPlayers.findIndex(p => p.name === 'You') + 1;
      setTournamentRank(rank);
      setTournamentResults(allPlayers);
      
      const prizes = PAYOUTS_TOURNAMENT[entryFee] || [];
      if (rank >= 1 && rank <= 5) {
        calculatedPrize = prizes[rank - 1] || 0;
      }
    }

    setPrizeWon(calculatedPrize);
    
    // Determine if it's a win (for tournaments, rank 1-5 is a "win")
    const isWin = battleType === 'tournament' ? (rank >= 1 && rank <= 5 && calculatedPrize > 0) : won;
    setGameStatus(isWin || (battleType !== 'tournament' && won) ? 'victory' : 'defeat');

    await recordGameResult({
      gameId: gameId || '',
      gameMode,
      entryFee,
      prizeWon: calculatedPrize,
      score: finalScore,
      timeTaken: time,
      isWin: calculatedPrize > 0 || (gameMode === 'practice' && won),
      battleType: battleType || undefined,
      gameName: game?.title || gameId || '',
      tournamentRank: rank || undefined,
    });
  }, [gameComplete, state.gameMode, state.entryFee, battleType, battleEntryFee, gameId, recordGameResult]);

  const handleBackToLobby = () => {
    endGame();
    navigate('/');
  };

  const handlePlayAgain = () => {
    setGameStatus('playing');
    setScore(0);
    setTimeTaken(0);
    setGameComplete(false);
    setOpponentWon(false);
    setTournamentRank(0);
    setTournamentResults([]);
    setPrizeWon(0);
    setGameStartTime(Date.now()); // Reset game start time
    setGameKey(k => k + 1); // Force re-mount of game component
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Loading game...</p>
        </div>
      </div>
    );
  }

  // Victory Screen
  if (gameStatus === 'victory') {
    const isTournament = battleType === 'tournament';
    
    return (
      <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center animate-in zoom-in-95 duration-500">
          {/* Celebration Effect */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-neon-yellow/20 blur-3xl rounded-full animate-pulse" />
            <div className="relative p-6 rounded-full bg-gradient-to-br from-neon-yellow/30 to-neon-green/30 border-2 border-neon-yellow inline-block">
              <Trophy className="w-16 h-16 text-neon-yellow animate-bounce" />
            </div>
          </div>

          <h1 className="font-gaming text-4xl font-bold text-neon-yellow text-glow-yellow mb-2">
            {isTournament ? `RANK #${tournamentRank}` : 'VICTORY!'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isTournament ? (tournamentRank === 1 ? '🏆 Tournament Champion!' : 'Great performance!') : 'You crushed it!'}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-4 rounded-xl bg-card border border-neon-cyan/30">
              <Star className="w-5 h-5 text-neon-cyan mx-auto mb-1" />
              <div className="font-gaming text-xl text-foreground">{score}</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-neon-magenta/30">
              <Clock className="w-5 h-5 text-neon-magenta mx-auto mb-1" />
              <div className="font-gaming text-xl text-foreground">{timeTaken}s</div>
              <div className="text-xs text-muted-foreground">Time</div>
            </div>
          </div>

          {/* Tournament Leaderboard */}
          {isTournament && tournamentResults.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-card border border-primary/30 max-h-48 overflow-y-auto">
              <div className="text-sm font-semibold text-primary mb-2">Tournament Results</div>
              {tournamentResults.slice(0, 5).map((player, idx) => {
                const rank = idx + 1;
                const isYou = player.name === 'You';
                const prizes = PAYOUTS_TOURNAMENT[battleEntryFee] || [];
                const prize = prizes[idx] || 0;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg mb-1 ${
                      isYou ? 'bg-primary/20 border border-primary/50' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {rank === 1 && <Crown className="w-4 h-4 text-neon-yellow" />}
                      {rank === 2 && <Medal className="w-4 h-4 text-gray-300" />}
                      {rank === 3 && <Award className="w-4 h-4 text-amber-600" />}
                      {rank > 3 && <span className="w-4 text-center text-xs text-muted-foreground">#{rank}</span>}
                      <span className={`text-sm ${isYou ? 'font-bold text-primary' : 'text-foreground'}`}>
                        {player.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{player.score} pts</span>
                      <span className="text-sm font-semibold text-neon-green">₹{prize}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Prize Won */}
          {prizeWon > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-neon-green/20 to-neon-cyan/20 border border-neon-green/50 mb-6">
              <div className="text-sm text-muted-foreground mb-1">You won</div>
              <div className="font-gaming text-3xl text-neon-green">₹{prizeWon}</div>
              <div className="text-xs text-muted-foreground mt-1">Added to your wallet</div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handlePlayAgain}
              className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Zap className="w-5 h-5" />
              Play Again
            </button>
            <button
              onClick={handleBackToLobby}
              className="w-full py-3 px-4 rounded-xl bg-muted text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-muted/80 transition-colors"
            >
              <Home className="w-5 h-5" />
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Defeat Screen
  if (gameStatus === 'defeat') {
    const gameMode = state.gameMode || 'practice';
    const isTournament = battleType === 'tournament';
    const isBattle = gameMode === 'battle' && !isTournament;
    
    return (
      <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center animate-in zoom-in-95 duration-500">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
            <div className="relative p-6 rounded-full bg-gradient-to-br from-destructive/30 to-neon-magenta/30 border-2 border-destructive inline-block">
              <Frown className="w-16 h-16 text-destructive" />
            </div>
          </div>

          <h1 className="font-gaming text-4xl font-bold text-destructive mb-2">
            {isTournament ? `RANK #${tournamentRank}` : 'YOU LOST!'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isTournament 
              ? 'Not in the money this time' 
              : (opponentWon 
                ? 'Your opponent finished first!' 
                : 'Time ran out!')}
          </p>

          {/* Entry Fee Lost Notice for Battle Mode */}
          {isBattle && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 mb-4">
              <div className="text-destructive font-semibold mb-1">Entry Fee Lost</div>
              <div className="text-sm text-muted-foreground">
                Your ₹{battleEntryFee} entry fee was not returned.
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-4 rounded-xl bg-card border border-border">
              <Star className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <div className="font-gaming text-xl text-foreground">{score}</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <div className="font-gaming text-xl text-foreground">{timeTaken}s</div>
              <div className="text-xs text-muted-foreground">Time</div>
            </div>
          </div>

          {/* Tournament Leaderboard */}
          {isTournament && tournamentResults.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-card border border-border max-h-48 overflow-y-auto">
              <div className="text-sm font-semibold text-muted-foreground mb-2">Tournament Results</div>
              {tournamentResults.map((player, idx) => {
                const rank = idx + 1;
                const isYou = player.name === 'You';
                const prizes = PAYOUTS_TOURNAMENT[battleEntryFee] || [];
                const prize = rank <= 5 ? (prizes[idx] || 0) : 0;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg mb-1 ${
                      isYou ? 'bg-destructive/20 border border-destructive/50' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {rank === 1 && <Crown className="w-4 h-4 text-neon-yellow" />}
                      {rank === 2 && <Medal className="w-4 h-4 text-gray-300" />}
                      {rank === 3 && <Award className="w-4 h-4 text-amber-600" />}
                      {rank > 3 && <span className="w-4 text-center text-xs text-muted-foreground">#{rank}</span>}
                      <span className={`text-sm ${isYou ? 'font-bold text-destructive' : 'text-foreground'}`}>
                        {player.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{player.score} pts</span>
                      {prize > 0 && <span className="text-sm font-semibold text-neon-green">₹{prize}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Near Miss Popup for 1v1 battles - only show if not opponent won */}
          {isBattle && !opponentWon && (
            <div className="p-4 rounded-xl bg-neon-yellow/10 border border-neon-yellow/30 mb-6">
              <div className="text-neon-yellow font-semibold mb-1">So close!</div>
              <div className="text-sm text-muted-foreground">
                You ran out of time. Try to complete faster next time!
              </div>
            </div>
          )}

          {/* Opponent Won Message */}
          {isBattle && opponentWon && (
            <div className="p-4 rounded-xl bg-neon-magenta/10 border border-neon-magenta/30 mb-6">
              <div className="text-neon-magenta font-semibold mb-1">Opponent was faster!</div>
              <div className="text-sm text-muted-foreground">
                They completed the puzzle in ~{timeTaken}s. Practice more to beat them!
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handlePlayAgain}
              className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Zap className="w-5 h-5" />
              Try Again
            </button>
            <button
              onClick={handleBackToLobby}
              className="w-full py-3 px-4 rounded-xl bg-muted text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-muted/80 transition-colors"
            >
              <Home className="w-5 h-5" />
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game Playing Screen
  const Icon = game.icon;
  const gameMode = state.gameMode || 'practice';
  const TIME_LIMIT = 60; // Fixed 60-second timer for all games
  const displayMode = gameMode === 'battle' 
    ? (battleType === 'tournament' ? `Tournament ₹${battleEntryFee}` : `1v1 ₹${battleEntryFee}`)
    : 'Practice';

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBackToLobby}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <span className="font-gaming font-semibold">{game.title}</span>
          </div>

          <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
            {displayMode}
          </div>
        </div>
      </header>

      {/* Game Container */}
      <main className="max-w-2xl mx-auto p-4">
        {/* Multiplayer Overlay for Battle Mode */}
        {gameMode === 'battle' && (
          <MultiplayerOverlay
            playerScore={liveScore}
            maxScore={100}
            isPlaying={gameStatus === 'playing' && !opponentWon}
            gameStartTime={gameStartTime}
            onOpponentWins={handleOpponentWins}
          />
        )}
        
        {gameId === 'word-search' && (
          <WordSearchGame
            key={gameKey}
            timeLimit={TIME_LIMIT}
            onComplete={handleGameComplete}
            onScoreUpdate={setLiveScore}
          />
        )}
        {gameId === 'memory-match' && (
          <MemoryMatchGame
            key={gameKey}
            timeLimit={TIME_LIMIT}
            onComplete={handleGameComplete}
            onScoreUpdate={setLiveScore}
          />
        )}
        {gameId === 'speed-math' && (
          <SpeedMathGame
            key={gameKey}
            timeLimit={TIME_LIMIT}
            onComplete={handleGameComplete}
            onScoreUpdate={setLiveScore}
          />
        )}
        {gameId === '2048-speedrun' && (
          <Game2048
            key={gameKey}
            timeLimit={TIME_LIMIT}
            onComplete={handleGameComplete}
            onScoreUpdate={setLiveScore}
          />
        )}
        {gameId === 'sliding-puzzle' && (
          <SlidingPuzzleGame
            key={gameKey}
            timeLimit={TIME_LIMIT}
            onComplete={handleGameComplete}
            onScoreUpdate={setLiveScore}
          />
        )}
        {gameId === 'block-puzzle' && (
          <BlockPuzzleGame
            key={gameKey}
            timeLimit={TIME_LIMIT}
            onComplete={handleGameComplete}
            onScoreUpdate={setLiveScore}
          />
        )}
      </main>
    </div>
  );
}
