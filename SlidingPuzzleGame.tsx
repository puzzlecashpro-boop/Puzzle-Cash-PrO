import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Trophy, Shuffle } from 'lucide-react';

interface SlidingPuzzleGameProps {
  timeLimit: number;
  onComplete: (won: boolean, score: number, timeTaken: number) => void;
  onScoreUpdate?: (score: number) => void;
}

type Grid = (number | null)[][];

const GRID_SIZE = 4;
const WIN_MOVES_BONUS = 100; // Base score for winning

function findEmptyPosition(grid: Grid): [number, number] {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j] === null) {
        return [i, j];
      }
    }
  }
  return [GRID_SIZE - 1, GRID_SIZE - 1];
}

function isSolvable(flatTiles: number[]): boolean {
  let inversions = 0;
  for (let i = 0; i < flatTiles.length; i++) {
    for (let j = i + 1; j < flatTiles.length; j++) {
      if (flatTiles[i] > flatTiles[j]) {
        inversions++;
      }
    }
  }
  // For 4x4 grid, solvable if inversions + empty row from bottom is odd
  const emptyRowFromBottom = GRID_SIZE - Math.floor(flatTiles.indexOf(0) / GRID_SIZE);
  return (inversions + emptyRowFromBottom) % 2 === 1;
}

function shuffleGrid(): Grid {
  const tiles = Array.from({ length: GRID_SIZE * GRID_SIZE - 1 }, (_, i) => i + 1);
  
  // Fisher-Yates shuffle
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  
  // Add empty space (represented as 0 for solvability check)
  const tilesWithEmpty = [...tiles, 0];
  
  // Ensure puzzle is solvable
  if (!isSolvable(tilesWithEmpty)) {
    // Swap first two tiles to make it solvable
    [tiles[0], tiles[1]] = [tiles[1], tiles[0]];
  }
  
  // Create grid
  const grid: Grid = [];
  let idx = 0;
  for (let i = 0; i < GRID_SIZE; i++) {
    const row: (number | null)[] = [];
    for (let j = 0; j < GRID_SIZE; j++) {
      if (idx < tiles.length) {
        row.push(tiles[idx++]);
      } else {
        row.push(null);
      }
    }
    grid.push(row);
  }
  
  return grid;
}

function isSolved(grid: Grid): boolean {
  let expected = 1;
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (i === GRID_SIZE - 1 && j === GRID_SIZE - 1) {
        if (grid[i][j] !== null) return false;
      } else {
        if (grid[i][j] !== expected) return false;
        expected++;
      }
    }
  }
  return true;
}

function countCorrectTiles(grid: Grid): number {
  let count = 0;
  let expected = 1;
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (i === GRID_SIZE - 1 && j === GRID_SIZE - 1) {
        if (grid[i][j] === null) count++;
      } else {
        if (grid[i][j] === expected) count++;
        expected++;
      }
    }
  }
  return count;
}

export default function SlidingPuzzleGame({ timeLimit, onComplete, onScoreUpdate }: SlidingPuzzleGameProps) {
  const [grid, setGrid] = useState<Grid>(() => shuffleGrid());
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [startTime] = useState(Date.now());
  const gameEndedRef = useRef(false);

  // Report score updates (based on correct tiles)
  useEffect(() => {
    const correctTiles = countCorrectTiles(grid);
    onScoreUpdate?.(correctTiles * 20);
  }, [grid, onScoreUpdate]);

  // Timer
  useEffect(() => {
    if (gameEndedRef.current) return;
    
    if (timeLeft <= 0) {
      gameEndedRef.current = true;
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const correctTiles = countCorrectTiles(grid);
      const score = correctTiles * 20; // Points for each correct tile
      onComplete(false, score, timeTaken);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, grid, startTime, onComplete]);

  // Check win condition
  useEffect(() => {
    if (isSolved(grid) && !gameEndedRef.current) {
      gameEndedRef.current = true;
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      // Score based on time remaining and fewer moves
      const timeBonus = timeLeft * 5;
      const moveEfficiency = Math.max(0, WIN_MOVES_BONUS - moves);
      const score = 320 + timeBonus + moveEfficiency; // 320 = 16 tiles * 20 points
      onComplete(true, score, timeTaken);
    }
  }, [grid, timeLeft, moves, startTime, onComplete]);

  const handleTileClick = useCallback((row: number, col: number) => {
    if (gameEndedRef.current) return;
    
    const [emptyRow, emptyCol] = findEmptyPosition(grid);
    
    // Check if clicked tile is adjacent to empty space
    const isAdjacent = 
      (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
      (Math.abs(col - emptyCol) === 1 && row === emptyRow);
    
    if (isAdjacent) {
      const newGrid = grid.map(r => [...r]);
      newGrid[emptyRow][emptyCol] = newGrid[row][col];
      newGrid[row][col] = null;
      setGrid(newGrid);
      setMoves(m => m + 1);
    }
  }, [grid]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameEndedRef.current) return;
      
      const [emptyRow, emptyCol] = findEmptyPosition(grid);
      let targetRow = emptyRow;
      let targetCol = emptyCol;
      
      switch (e.key) {
        case 'ArrowUp':
          targetRow = emptyRow + 1; // Move tile from below into empty
          break;
        case 'ArrowDown':
          targetRow = emptyRow - 1; // Move tile from above into empty
          break;
        case 'ArrowLeft':
          targetCol = emptyCol + 1; // Move tile from right into empty
          break;
        case 'ArrowRight':
          targetCol = emptyCol - 1; // Move tile from left into empty
          break;
        default:
          return;
      }
      
      if (targetRow >= 0 && targetRow < GRID_SIZE && targetCol >= 0 && targetCol < GRID_SIZE) {
        e.preventDefault();
        handleTileClick(targetRow, targetCol);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grid, handleTileClick]);

  const correctTiles = countCorrectTiles(grid);
  const progress = (correctTiles / 16) * 100;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 ${timeLeft <= 10 ? 'text-destructive animate-pulse' : 'text-neon-cyan'}`}>
          <Clock className="w-5 h-5" />
          <span className="font-gaming text-xl">{timeLeft}s</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-neon-magenta" />
            <span className="font-gaming text-lg">{moves} moves</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-neon-yellow" />
            <span className="font-gaming text-lg">{correctTiles}/16</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-neon-yellow to-neon-green transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {correctTiles === 16 ? '✓ Puzzle solved!' : `Arrange tiles 1-15 in order`}
      </p>

      {/* Puzzle Grid */}
      <div className="aspect-square w-full max-w-sm mx-auto p-3 rounded-2xl bg-card border-2 border-border">
        <div className="grid grid-cols-4 gap-2 h-full">
          {grid.map((row, i) =>
            row.map((tile, j) => (
              <button
                key={`${i}-${j}`}
                onClick={() => handleTileClick(i, j)}
                disabled={tile === null || gameEndedRef.current}
                className={`rounded-lg flex items-center justify-center font-gaming font-bold text-2xl sm:text-3xl transition-all duration-150 ${
                  tile === null
                    ? 'bg-muted/20'
                    : tile === (i * GRID_SIZE + j + 1) || (i === GRID_SIZE - 1 && j === GRID_SIZE - 1 && tile === null)
                    ? 'bg-neon-green/30 text-neon-green border-2 border-neon-green/50 hover:scale-105'
                    : 'bg-neon-yellow/20 text-neon-yellow border-2 border-neon-yellow/30 hover:bg-neon-yellow/30 hover:scale-105 cursor-pointer'
                }`}
              >
                {tile}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">
          Tap tiles adjacent to the empty space to move them
        </p>
        <p className="text-xs text-muted-foreground">
          Or use arrow keys to slide tiles
        </p>
      </div>
    </div>
  );
}
