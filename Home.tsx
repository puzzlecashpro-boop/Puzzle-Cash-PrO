import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Zap, Trophy, Users, Gift } from 'lucide-react';
import Header from '@/react-app/components/Header';
import GameCard from '@/react-app/components/GameCard';
import DailyBonusModal from '@/react-app/components/modals/DailyBonusModal';
import DepositModal from '@/react-app/components/modals/DepositModal';
import WithdrawModal from '@/react-app/components/modals/WithdrawModal';
import SettingsModal from '@/react-app/components/modals/SettingsModal';
import GameSelectModal from '@/react-app/components/modals/GameSelectModal';
import LoginModal from '@/react-app/components/modals/LoginModal';
import WalletModal from '@/react-app/components/modals/WalletModal';
import LeaderboardModal from '@/react-app/components/modals/LeaderboardModal';
import ProfileModal from '@/react-app/components/modals/ProfileModal';
import BattleSetupModal from '@/react-app/components/modals/BattleSetupModal';
import ReferralModal from '@/react-app/components/modals/ReferralModal';
import BannerAd from '@/react-app/components/ads/BannerAd';
import { games, GameData } from '@/react-app/data/games';
import { useGame } from '@/react-app/context/GameContext';

export default function HomePage() {
  const { state } = useGame();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showBattleSetup, setShowBattleSetup] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameData | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState(() => Math.floor(Math.random() * 301) + 150);

  // Dynamic online players counter (150-450 range, updates every 5-10 seconds)
  useEffect(() => {
    const updateCounter = () => {
      // Random change between -20 and +20
      setOnlinePlayers(prev => {
        const change = Math.floor(Math.random() * 41) - 20;
        const newValue = prev + change;
        // Clamp between 150 and 450
        return Math.max(150, Math.min(450, newValue));
      });
    };
    
    // Update every 5-10 seconds randomly
    const scheduleUpdate = () => {
      const delay = Math.floor(Math.random() * 5000) + 5000; // 5000-10000ms
      return setTimeout(() => {
        updateCounter();
        timerId = scheduleUpdate();
      }, delay);
    };
    
    let timerId = scheduleUpdate();
    return () => clearTimeout(timerId);
  }, []);

  const handleGameClick = (game: GameData) => {
    if (game.isAvailable) {
      setSelectedGame(game);
    }
  };

  const handleRequireLogin = () => {
    setLoginMessage('Sign in to play Paid Battles and win real cash!');
    setShowLogin(true);
  };

  const handleLoginClick = () => {
    setLoginMessage('');
    setShowLogin(true);
  };

  const handleOpenBattleSetup = () => {
    setSelectedGame((prev) => prev); // Keep game selected
    setShowBattleSetup(true);
  };

  const handleCloseBattleSetup = () => {
    setShowBattleSetup(false);
    setSelectedGame(null); // Reset game selection when battle setup closes
  };

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <Header
        onDeposit={() => setShowDeposit(true)}
        onWithdraw={() => setShowWithdraw(true)}
        onSettings={() => setShowSettings(true)}
        onLogin={handleLoginClick}
        onWallet={() => setShowWallet(true)}
        onLeaderboard={() => setShowLeaderboard(true)}
        onProfile={() => setShowProfile(true)}
        onReferral={() => setShowReferral(true)}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 pb-28">
        {/* Hero Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard
            icon={Zap}
            value={state.isLoadingWallet ? '...' : state.practiceCredits}
            label="Practice Credits"
            color="cyan"
          />
          <StatCard
            icon={Trophy}
            value={state.isLoadingWallet ? '...' : state.totalWins}
            label="Games Won"
            color="yellow"
          />
          <StatCard
            icon={Users}
            value={onlinePlayers}
            label="Online Players"
            color="magenta"
          />
          <StatCard
            icon={Gift}
            value="₹16"
            label="Win Amount"
            color="green"
          />
        </div>

        {/* Section Title */}
        <div className="mb-6">
          <h2 className="font-gaming text-2xl font-bold text-foreground mb-1">
            Choose Your <span className="text-primary text-glow-cyan">Battle</span>
          </h2>
          <p className="text-muted-foreground">
            Play free practice matches or enter paid battles to win real cash
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <GameCard
              key={game.id}
              {...game}
              onClick={() => handleGameClick(game)}
            />
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-8 pb-16 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            🎮 More games coming soon! Stay tuned for updates.
          </p>
          <Link 
            to="/admin" 
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Admin Panel
          </Link>
        </div>
      </main>

      {/* Banner Ad - hidden when wallet screens are open */}
      {!showWallet && !showDeposit && !showWithdraw && <BannerAd />}

      {/* Modals */}
      <DailyBonusModal />
      <DepositModal open={showDeposit} onClose={() => setShowDeposit(false)} onOpenLogin={() => { setShowDeposit(false); setShowLogin(true); }} />
      <WithdrawModal open={showWithdraw} onClose={() => setShowWithdraw(false)} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <LeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
      <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} />
      <ReferralModal open={showReferral} onClose={() => setShowReferral(false)} />
      <WalletModal 
        open={showWallet} 
        onClose={() => setShowWallet(false)} 
        onLogin={() => { setShowWallet(false); handleLoginClick(); }}
      />
      <LoginModal 
        open={showLogin} 
        onClose={() => setShowLogin(false)} 
        message={loginMessage}
      />
      {selectedGame && (
        <GameSelectModal
          game={selectedGame}
          open={!showBattleSetup}
          onClose={() => setSelectedGame(null)}
          onRequireLogin={handleRequireLogin}
          onOpenBattleSetup={handleOpenBattleSetup}
        />
      )}
      {selectedGame && (
        <BattleSetupModal
          game={selectedGame}
          open={showBattleSetup}
          onClose={handleCloseBattleSetup}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color: 'cyan' | 'magenta' | 'yellow' | 'green';
}) {
  const colorMap = {
    cyan: 'text-neon-cyan bg-neon-cyan/10 border-neon-cyan/30',
    magenta: 'text-neon-magenta bg-neon-magenta/10 border-neon-magenta/30',
    yellow: 'text-neon-yellow bg-neon-yellow/10 border-neon-yellow/30',
    green: 'text-neon-green bg-neon-green/10 border-neon-green/30',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorMap[color]} backdrop-blur-sm`}>
      <Icon className={`w-5 h-5 mb-2 ${colorMap[color].split(' ')[0]}`} />
      <div className="font-gaming font-bold text-xl text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
