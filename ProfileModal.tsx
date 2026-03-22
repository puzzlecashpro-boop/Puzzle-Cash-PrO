import { X, User, Mail, Gamepad2, HelpCircle, HeadphonesIcon, LogOut, Clock, Trophy, Coins } from 'lucide-react';
import { useAuth } from '@getmocha/users-service/react';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user, logout } = useAuth();

  if (!open || !user) return null;

  const handleSignOut = async () => {
    try {
      await logout();
      onClose();
      // Force full page reload to clear all auth state and reset wallet
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out failed:', error);
      // Even if logout fails, force reload
      window.location.href = '/';
    }
  };

  const userName = user.google_user_data.name || 
                   user.google_user_data.given_name || 
                   user.email.split('@')[0];
  const userEmail = user.email;
  const userPicture = user.google_user_data.picture;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-card border border-primary/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 border-b border-primary/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg bg-background/50 hover:bg-background/80 text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-gaming text-xl font-bold text-foreground">My Profile</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* User Info Section */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10 border border-neon-cyan/30">
            {userPicture ? (
              <img 
                src={userPicture} 
                alt={userName}
                className="w-16 h-16 rounded-full border-2 border-neon-cyan"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-neon-cyan/20 border-2 border-neon-cyan flex items-center justify-center">
                <User className="w-8 h-8 text-neon-cyan" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-neon-cyan" />
                <span className="font-gaming font-semibold text-foreground truncate">
                  {userName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground truncate">
                  {userEmail}
                </span>
              </div>
            </div>
          </div>

          {/* How to Play Section */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Gamepad2 className="w-5 h-5 text-neon-green" />
              <h3 className="font-gaming font-semibold text-foreground">How to Play</h3>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-neon-yellow/20">
                  <Coins className="w-4 h-4 text-neon-yellow" />
                </div>
                <div>
                  <span className="text-foreground font-medium">₹10 Entry Fee</span>
                  <p>Pay ₹10 to enter a Paid Battle against another player.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-neon-magenta/20">
                  <Clock className="w-4 h-4 text-neon-magenta" />
                </div>
                <div>
                  <span className="text-foreground font-medium">60 Second Timer</span>
                  <p>Complete the puzzle as fast as you can within 60 seconds.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-neon-green/20">
                  <Trophy className="w-4 h-4 text-neon-green" />
                </div>
                <div>
                  <span className="text-foreground font-medium">Win ₹16</span>
                  <p>Beat your opponent to win ₹16! (20% platform fee)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rules Section */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="w-5 h-5 text-neon-cyan" />
              <h3 className="font-gaming font-semibold text-foreground">Game Rules</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan" />
                Practice mode is free and uses Practice Credits
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan" />
                Paid Battles require account login
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan" />
                Minimum withdrawal amount is ₹100
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan" />
                All games are matched with real players
              </li>
            </ul>
          </div>

          {/* Contact Support Section */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <HeadphonesIcon className="w-5 h-5 text-neon-purple" />
              <h3 className="font-gaming font-semibold text-foreground">Contact Support</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Having issues or need help? Reach out to our support team:
            </p>
            <a 
              href="mailto:puzzlecashpro@gmail.com"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-purple/20 border border-neon-purple/50 text-neon-purple hover:bg-neon-purple/30 transition-all"
            >
              <Mail className="w-4 h-4" />
              puzzlecashpro@gmail.com
            </a>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-red-600/30 to-red-500/30 border-2 border-red-500 text-red-400 hover:from-red-600/50 hover:to-red-500/50 hover:text-red-300 transition-all duration-300 font-gaming font-bold text-lg"
          >
            <LogOut className="w-6 h-6" />
            SIGN OUT
          </button>
        </div>
      </div>
    </div>
  );
}
