import { useEffect, useState } from 'react';
import { X, Trophy, Crown, Medal, Award } from 'lucide-react';

interface Player {
  rank: number;
  name: string;
  gamesWon: number;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setPlayers(data.players || []);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: 'bg-gradient-to-r from-yellow-500/30 via-amber-400/20 to-yellow-600/30',
          border: 'border-yellow-400/60',
          text: 'text-yellow-300',
          glow: 'shadow-[0_0_20px_rgba(234,179,8,0.4)]',
          icon: <Crown className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />,
        };
      case 2:
        return {
          bg: 'bg-gradient-to-r from-slate-400/30 via-gray-300/20 to-slate-500/30',
          border: 'border-slate-300/60',
          text: 'text-slate-200',
          glow: 'shadow-[0_0_15px_rgba(203,213,225,0.3)]',
          icon: <Medal className="w-5 h-5 text-slate-300 drop-shadow-[0_0_6px_rgba(203,213,225,0.7)]" />,
        };
      case 3:
        return {
          bg: 'bg-gradient-to-r from-amber-700/30 via-orange-600/20 to-amber-800/30',
          border: 'border-amber-500/60',
          text: 'text-amber-400',
          glow: 'shadow-[0_0_12px_rgba(217,119,6,0.3)]',
          icon: <Award className="w-5 h-5 text-amber-500 drop-shadow-[0_0_6px_rgba(217,119,6,0.7)]" />,
        };
      default:
        return {
          bg: 'bg-card/50',
          border: 'border-border/50',
          text: 'text-muted-foreground',
          glow: '',
          icon: <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>,
        };
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-gradient-to-b from-card via-background to-card border border-primary/30 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-neon-purple/20 via-neon-cyan/10 to-neon-magenta/20 border-b border-primary/20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,255,255,0.1),transparent_60%)]" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 shadow-[0_0_20px_rgba(234,179,8,0.5)]">
                <Trophy className="w-6 h-6 text-background" />
              </div>
              <div>
                <h2 className="font-gaming text-xl text-primary text-glow-cyan">Leaderboard</h2>
                <p className="text-xs text-muted-foreground">Top 10 Champions</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading champions...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {players.map((player) => {
                const style = getRankStyle(player.rank);
                return (
                  <div
                    key={player.rank}
                    className={`flex items-center gap-3 p-3 rounded-xl ${style.bg} border ${style.border} ${style.glow} transition-all duration-300 hover:scale-[1.02]`}
                  >
                    {/* Rank */}
                    <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${player.rank <= 3 ? 'bg-background/30' : 'bg-muted/50'}`}>
                      {style.icon}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-gaming text-sm ${player.rank <= 3 ? style.text : 'text-foreground'} truncate`}>
                        {player.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {player.rank === 1 ? '👑 Champion' : player.rank === 2 ? '🥈 Runner-up' : player.rank === 3 ? '🥉 Third Place' : `Rank #${player.rank}`}
                      </p>
                    </div>

                    {/* Games Won */}
                    <div className="flex-shrink-0 text-right">
                      <p className={`font-gaming text-lg ${player.rank <= 3 ? style.text : 'text-neon-green'}`}>
                        {player.gamesWon}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wins</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            Win more games to climb the ranks! 🚀
          </p>
        </div>
      </div>
    </div>
  );
}
