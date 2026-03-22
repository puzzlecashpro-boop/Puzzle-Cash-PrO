import { useState, useRef, useEffect } from 'react';
import { Wallet, LogIn, User, Trophy, Shield, Menu, X, Settings, Gift } from 'lucide-react';
import { Link } from 'react-router';
import { useGame } from '@/react-app/context/GameContext';
import { useAuth } from '@getmocha/users-service/react';

interface HeaderProps {
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onSettings: () => void;
  onLogin: () => void;
  onWallet: () => void;
  onLeaderboard: () => void;
  onProfile: () => void;
  onReferral: () => void;
}

export default function Header({ onSettings, onLogin, onWallet, onLeaderboard, onProfile, onReferral }: HeaderProps) {
  const { state } = useGame();
  const { user, isPending } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuItemClick = (action: () => void) => {
    action();
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/80 border-b border-primary/20">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan via-neon-purple to-neon-magenta flex items-center justify-center box-glow-cyan">
            <span className="font-gaming font-bold text-background text-lg">P</span>
          </div>
          <h1 className="font-gaming font-bold text-xl text-glow-cyan text-primary hidden sm:block">
            PUZZLE CASH
          </h1>
        </Link>

        {/* Right Side: Wallet + Menu */}
        <div className="flex items-center gap-3">
          {/* Wallet Balance - Always Visible */}
          <button
            onClick={onWallet}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-primary/30 neon-border hover:bg-card/80 hover:border-neon-yellow/50 transition-all duration-300 cursor-pointer"
            title="Open Wallet"
          >
            <Wallet className="w-5 h-5 text-neon-yellow" />
            <span className="font-gaming font-semibold text-neon-yellow">
              {state.isLoadingWallet ? '...' : `₹${state.walletBalance.toLocaleString()}`}
            </span>
          </button>

          {/* Menu Button */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-card border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 transition-all duration-300"
              title="Menu"
            >
              {menuOpen ? (
                <X className="w-6 h-6" />
              ) : isPending ? (
                <Menu className="w-6 h-6" />
              ) : user ? (
                user.google_user_data.picture ? (
                  <img 
                    src={user.google_user_data.picture} 
                    alt="" 
                    className="w-8 h-8 rounded-lg border border-neon-cyan"
                  />
                ) : (
                  <User className="w-6 h-6 text-neon-cyan" />
                )
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-card border border-primary/30 shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User Info (if logged in) */}
                {user && (
                  <div className="px-4 py-3 border-b border-primary/20 bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10">
                    <p className="font-medium text-foreground truncate">
                      {user.google_user_data.name || user.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                )}

                {/* Menu Items */}
                <div className="py-2">
                  {/* Profile (if logged in) */}
                  {user && (
                    <button
                      onClick={() => handleMenuItemClick(onProfile)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary/10 transition-colors"
                    >
                      <User className="w-5 h-5 text-neon-cyan" />
                      <span className="text-foreground">My Profile</span>
                    </button>
                  )}

                  {/* Leaderboard */}
                  <button
                    onClick={() => handleMenuItemClick(onLeaderboard)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary/10 transition-colors"
                  >
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="text-foreground">Leaderboard</span>
                  </button>

                  {/* Refer & Earn */}
                  <button
                    onClick={() => handleMenuItemClick(onReferral)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary/10 transition-colors"
                  >
                    <Gift className="w-5 h-5 text-neon-green" />
                    <span className="text-foreground">Refer & Earn</span>
                  </button>

                  {/* Admin Panel - Only for admin */}
                  {user?.email?.toLowerCase().trim() === 'puzzlecashpro@gmail.com' && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary/10 transition-colors"
                    >
                      <Shield className="w-5 h-5 text-red-400" />
                      <span className="text-foreground">Admin Panel</span>
                    </Link>
                  )}

                  {/* Settings */}
                  <button
                    onClick={() => handleMenuItemClick(onSettings)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary/10 transition-colors"
                  >
                    <Settings className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">Settings</span>
                  </button>

                  {/* Divider */}
                  <div className="my-2 border-t border-primary/20" />

                  {/* Sign In / Sign Out */}
                  {user ? (
                    <button
                      onClick={() => handleMenuItemClick(onProfile)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-500/10 transition-colors text-red-400"
                    >
                      <LogIn className="w-5 h-5 rotate-180" />
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMenuItemClick(onLogin)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neon-green/10 transition-colors text-neon-green"
                    >
                      <LogIn className="w-5 h-5" />
                      <span>Sign In</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
