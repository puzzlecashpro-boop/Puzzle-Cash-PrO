import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@getmocha/users-service/react';

export interface GameState {
  walletBalance: number;
  practiceCredits: number;
  totalWins: number;
  totalLosses: number;
  currentGame: string | null;
  gameMode: 'practice' | 'battle' | null;
  entryFee: number;
  isMatchmaking: boolean;
  showDailyBonus: boolean;
  isLoadingWallet: boolean;
}

interface GameContextType {
  state: GameState;
  refreshWallet: () => Promise<void>;
  deposit: (amount: number) => Promise<boolean>;
  withdraw: (amount: number) => Promise<{ success: boolean; error?: string }>;
  deductEntryFee: (amount: number, battleType?: string, gameName?: string) => Promise<boolean>;
  refundEntryFee: (amount: number, battleType?: string, gameName?: string) => Promise<boolean>;
  usePracticeCredit: () => Promise<boolean>;
  claimDailyBonus: () => Promise<boolean>;
  closeDailyBonus: () => void;
  recordGameResult: (result: {
    gameId: string;
    gameMode: 'practice' | 'battle';
    entryFee: number;
    prizeWon: number;
    score: number;
    timeTaken: number;
    isWin: boolean;
    battleType?: string;
    gameName?: string;
    tournamentRank?: number;
  }) => Promise<void>;
  startGame: (gameId: string, mode: 'practice' | 'battle', fee?: number) => void;
  endGame: () => void;
  setMatchmaking: (status: boolean) => void;
  // For guest mode (not logged in)
  guestAddToWallet: (amount: number) => void;
  guestDeductFromWallet: (amount: number) => boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const { user, isPending: isAuthPending } = useAuth();
  
  const [state, setState] = useState<GameState>({
    walletBalance: 500,
    practiceCredits: 5,
    totalWins: 0,
    totalLosses: 0,
    currentGame: null,
    gameMode: null,
    entryFee: 0,
    isMatchmaking: false,
    showDailyBonus: false,
    isLoadingWallet: true,
  });

  // Check if daily bonus was already claimed today (using localStorage)
  const hasClaimedDailyBonusToday = useCallback((): boolean => {
    try {
      const lastClaimed = localStorage.getItem('dailyBonusLastClaimed');
      if (!lastClaimed) return false;
      
      const lastDate = new Date(lastClaimed);
      const today = new Date();
      
      // Check if it's the same calendar day
      return (
        lastDate.getFullYear() === today.getFullYear() &&
        lastDate.getMonth() === today.getMonth() &&
        lastDate.getDate() === today.getDate()
      );
    } catch {
      return false;
    }
  }, []);

  // Fetch wallet data when user logs in
  const refreshWallet = useCallback(async () => {
    if (!user) {
      // For guests, check localStorage to see if they already claimed today
      const alreadyClaimed = hasClaimedDailyBonusToday();
      setState(prev => ({
        ...prev,
        walletBalance: 500,
        practiceCredits: 5,
        isLoadingWallet: false,
        showDailyBonus: !alreadyClaimed,
      }));
      return;
    }

    try {
      const response = await fetch('/api/wallet');
      if (response.ok) {
        const data = await response.json();
        
        // Check if daily bonus can be claimed (backend check + localStorage check)
        const alreadyClaimedLocally = hasClaimedDailyBonusToday();
        let canClaimDaily = !alreadyClaimedLocally;
        
        if (canClaimDaily && data.lastDailyBonusAt) {
          const lastClaim = new Date(data.lastDailyBonusAt);
          const hoursSince = (Date.now() - lastClaim.getTime()) / (1000 * 60 * 60);
          canClaimDaily = hoursSince >= 24;
        }

        setState(prev => ({
          ...prev,
          walletBalance: data.balance,
          practiceCredits: data.practiceCredits,
          totalWins: data.totalWins,
          totalLosses: data.totalLosses,
          isLoadingWallet: false,
          showDailyBonus: canClaimDaily,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
      setState(prev => ({ ...prev, isLoadingWallet: false }));
    }
  }, [user, hasClaimedDailyBonusToday]);

  useEffect(() => {
    if (!isAuthPending) {
      refreshWallet();
    }
  }, [user, isAuthPending, refreshWallet]);

  const deposit = async (amount: number): Promise<boolean> => {
    if (!user) {
      // Guest mode
      setState(prev => ({ ...prev, walletBalance: prev.walletBalance + amount }));
      return true;
    }

    try {
      const response = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, walletBalance: data.balance }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const withdraw = async (amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      if (state.walletBalance >= amount) {
        setState(prev => ({ ...prev, walletBalance: prev.walletBalance - amount }));
        return { success: true };
      }
      return { success: false, error: 'Insufficient balance' };
    }

    try {
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setState(prev => ({ ...prev, walletBalance: data.balance }));
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Network error' };
    }
  };

  const deductEntryFee = async (amount: number, battleType?: string, gameName?: string): Promise<boolean> => {
    if (!user) {
      if (state.walletBalance >= amount) {
        setState(prev => ({ ...prev, walletBalance: prev.walletBalance - amount }));
        return true;
      }
      return false;
    }

    try {
      const response = await fetch('/api/wallet/deduct-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, battleType, gameName }),
      });

      if (response.ok) {
        setState(prev => ({ ...prev, walletBalance: prev.walletBalance - amount }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const refundEntryFee = async (amount: number, battleType?: string, gameName?: string): Promise<boolean> => {
    if (!user) {
      // Guest mode - just add back to local state
      setState(prev => ({ ...prev, walletBalance: prev.walletBalance + amount }));
      return true;
    }

    try {
      const response = await fetch('/api/wallet/refund-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, battleType, gameName }),
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, walletBalance: data.balance }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const usePracticeCredit = async (): Promise<boolean> => {
    if (!user) {
      if (state.practiceCredits > 0) {
        setState(prev => ({ ...prev, practiceCredits: prev.practiceCredits - 1 }));
        return true;
      }
      return false;
    }

    try {
      const response = await fetch('/api/wallet/use-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setState(prev => ({ ...prev, practiceCredits: prev.practiceCredits - 1 }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const claimDailyBonus = async (): Promise<boolean> => {
    // Save claim date to localStorage
    try {
      localStorage.setItem('dailyBonusLastClaimed', new Date().toISOString());
    } catch {
      // Ignore localStorage errors
    }

    if (!user) {
      setState(prev => ({
        ...prev,
        practiceCredits: prev.practiceCredits + 3,
        showDailyBonus: false,
      }));
      return true;
    }

    try {
      const response = await fetch('/api/wallet/daily-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          practiceCredits: data.practiceCredits,
          showDailyBonus: false,
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const closeDailyBonus = () => {
    setState(prev => ({ ...prev, showDailyBonus: false }));
  };

  const recordGameResult = async (result: {
    gameId: string;
    gameMode: 'practice' | 'battle';
    entryFee: number;
    prizeWon: number;
    score: number;
    timeTaken: number;
    isWin: boolean;
    battleType?: string;
    gameName?: string;
    tournamentRank?: number;
  }) => {
    if (!user) {
      // Guest mode - just update local state
      if (result.isWin && result.prizeWon > 0) {
        setState(prev => ({
          ...prev,
          walletBalance: prev.walletBalance + result.prizeWon,
          totalWins: prev.totalWins + 1,
        }));
      } else {
        setState(prev => ({
          ...prev,
          totalLosses: prev.totalLosses + 1,
        }));
      }
      return;
    }

    try {
      const response = await fetch('/api/games/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          walletBalance: data.balance,
          totalWins: data.totalWins,
          totalLosses: data.totalLosses,
        }));
      }
    } catch (error) {
      console.error('Failed to record game:', error);
    }
  };

  const startGame = (gameId: string, mode: 'practice' | 'battle', fee = 0) => {
    setState(prev => ({
      ...prev,
      currentGame: gameId,
      gameMode: mode,
      entryFee: fee,
    }));
  };

  const endGame = () => {
    setState(prev => ({
      ...prev,
      currentGame: null,
      gameMode: null,
      entryFee: 0,
      isMatchmaking: false,
    }));
  };

  const setMatchmaking = (status: boolean) => {
    setState(prev => ({ ...prev, isMatchmaking: status }));
  };

  // Guest mode helpers
  const guestAddToWallet = (amount: number) => {
    setState(prev => ({ ...prev, walletBalance: prev.walletBalance + amount }));
  };

  const guestDeductFromWallet = (amount: number): boolean => {
    if (state.walletBalance >= amount) {
      setState(prev => ({ ...prev, walletBalance: prev.walletBalance - amount }));
      return true;
    }
    return false;
  };

  return (
    <GameContext.Provider
      value={{
        state,
        refreshWallet,
        deposit,
        withdraw,
        deductEntryFee,
        refundEntryFee,
        usePracticeCredit,
        claimDailyBonus,
        closeDailyBonus,
        recordGameResult,
        startGame,
        endGame,
        setMatchmaking,
        guestAddToWallet,
        guestDeductFromWallet,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
