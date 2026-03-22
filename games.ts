import { Search, Layers, Calculator, Grid3X3, Gamepad2, Box } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface GameData {
  id: string;
  title: string;
  icon: LucideIcon;
  color: 'cyan' | 'magenta' | 'purple' | 'yellow' | 'green';
  isAvailable: boolean;
  description: string;
  entryFee: number;
  prizePool: number;
  timeLimit: number; // seconds
}

export const games: GameData[] = [
  {
    id: 'word-search',
    title: 'Word Search',
    icon: Search,
    color: 'cyan',
    isAvailable: true,
    description: 'Find hidden words in a grid of letters. Race against time to find them all!',
    entryFee: 10,
    prizePool: 16,
    timeLimit: 90,
  },
  {
    id: 'memory-match',
    title: 'Memory Match',
    icon: Layers,
    color: 'magenta',
    isAvailable: true,
    description: 'Flip cards and match pairs. Test your memory under pressure!',
    entryFee: 10,
    prizePool: 16,
    timeLimit: 60,
  },
  {
    id: 'speed-math',
    title: 'Speed Math',
    icon: Calculator,
    color: 'purple',
    isAvailable: true,
    description: 'Solve math problems as fast as you can. Quick thinking wins!',
    entryFee: 10,
    prizePool: 16,
    timeLimit: 45,
  },
  {
    id: 'sliding-puzzle',
    title: 'Sliding Tile',
    icon: Grid3X3,
    color: 'yellow',
    isAvailable: true,
    description: 'Rearrange tiles to complete the picture. Classic brain teaser!',
    entryFee: 10,
    prizePool: 16,
    timeLimit: 120,
  },
  {
    id: '2048-speedrun',
    title: '2048 Speed Run',
    icon: Gamepad2,
    color: 'green',
    isAvailable: true,
    description: 'Reach 2048 as fast as possible. Merge tiles strategically!',
    entryFee: 10,
    prizePool: 16,
    timeLimit: 180,
  },
  {
    id: 'block-puzzle',
    title: 'Block Puzzle',
    icon: Box,
    color: 'cyan',
    isAvailable: true,
    description: 'Fit blocks together to clear lines. Tetris-style fun!',
    entryFee: 10,
    prizePool: 16,
    timeLimit: 120,
  },
];

export function getGameById(id: string): GameData | undefined {
  return games.find(game => game.id === id);
}
