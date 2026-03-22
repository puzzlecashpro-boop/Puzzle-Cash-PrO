import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Trophy } from 'lucide-react';

interface Game2048Props {
  timeLimit: number;
  onComplete: (won: boolean, score: number, timeTaken: number) => void;
  onScoreUpdate?: (score: number) => void;
}

type Grid = number[][];

const GRID_SIZE = 4;
const WIN_SCORE = 500;

function createEmptyGrid(): Grid {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
}

function addRandomTile(grid: Grid): Grid {
  const newGrid = grid.map(row => [...row]);
  const emptyCells: [number, number][] = [];
  
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (newGrid[i][j] === 0) {
        emptyCells.push([i, j]);
      }
    }
  }
  
  if (emptyCells.length > 0) {
    const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    newGrid[row][col] = Math.random() < 0.9 ? 2 : 4;
  }
  
  return newGrid;
}

function initializeGrid(): Grid {
  let grid = createEmptyGrid();
  grid = addRandomTile(grid);
  grid = addRandomTile(grid);
  return grid;
}

function rotateGrid(grid: Grid, times: number): Grid {
  let result = grid.map(row => [...row]);
  for (let t = 0; t < times; t++) {
    const newGrid = createEmptyGrid();
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        newGrid[j][GRID_SIZE - 1 - i] = result[i][j];
      }
    }
    result = newGrid;
  }
  return result;
}

function moveLeft(grid: Grid): { grid: Grid; score: number; moved: boolean } {
  let score = 0;
  let moved = false;
  const newGrid = createEmptyGrid();
  
  for (let i = 0; i < GRID_SIZE; i++) {
    const row = grid[i].filter(cell => cell !== 0);
    const newRow: number[] = [];
    
    for (let j = 0; j < row.length; j++) {
      if (j + 1 < row.length && row[j] === row[j + 1]) {
        const merged = row[j] * 2;
        newRow.push(merged);
        score += merged;
        j++;
      } else {
        newRow.push(row[j]);
      }
    }
    
    while (newRow.length < GRID_SIZE) {
      newRow.push(0);
    }
    
    for (let j = 0; j < GRID_SIZE; j++) {
      newGrid[i][j] = newRow[j];
      if (newGrid[i][j] !== grid[i][j]) {
        moved = true;
      }
    }
  }
  
  return { grid: newGrid, score, moved };
}

function move(grid: Grid, direction: 'up' | 'down' | 'left' | 'right'): { grid: Grid; score: number; moved: boolean } {
  const rotations: Record<string, number> = { up: 1, down: 3, left: 0, right: 2 };
  const reverseRotations: Record<string, number> = { up: 3, down: 1, left: 0, right: 2 };
  
  let rotated = rotateGrid(grid, rotations[direction]);
  const result = moveLeft(rotated);
  result.grid = rotateGrid(result.grid, reverseRotations[direction]);
  
  return result;
}

function canMove(grid: Grid): boolean {
  // Check for empty cells
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j] === 0) return true;
    }
  }
  
  // Check for possible merges
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (j + 1 < GRID_SIZE && grid[i][j] === grid[i][j + 1]) return true;
      if (i + 1 < GRID_SIZE && grid[i][j] === grid[i + 1][j]) return true;
    }
  }
  
  return false;
}

function getMaxTile(grid: Grid): number {
  let max = 0;
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j] > max) max = grid[i][j];
    }
  }
  return max;
}

const TILE_COLORS: Record<number, string> = {
  0: 'bg-muted/30',
  2: 'bg-amber-100 text-amber-900',
  4: 'bg-amber-200 text-amber-900',
  8: 'bg-orange-300 text-white',
  16: 'bg-orange-400 text-white',
  32: 'bg-orange-500 text-white',
  64: 'bg-red-500 text-white',
  128: 'bg-yellow-400 text-white',
  256: 'bg-yellow-500 text-white',
  512: 'bg-yellow-600 text-white',
  1024: 'bg-neon-green text-black',
  2048: 'bg-neon-cyan text-black',
};

export default function Game2048({ timeLimit, onComplete, onScoreUpdate }: Game2048Props) {
  const [grid, setGrid] = useState<Grid>(() => initializeGrid());
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [startTime] = useState(Date.now());
  const gameEndedRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Report score updates
  useEffect(() => {
    onScoreUpdate?.(score);
  }, [score, onScoreUpdate]);

  // Timer
  useEffect(() => {
    if (gameEndedRef.current) return;
    
    if (timeLeft <= 0) {
      gameEndedRef.current = true;
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const won = score >= WIN_SCORE;
      onComplete(won, score, timeTaken);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, score, startTime, onComplete]);

  // Check for game over (no moves left)
  useEffect(() => {
    if (!canMove(grid) && !gameEndedRef.current) {
      gameEndedRef.current = true;
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const won = score >= WIN_SCORE;
      onComplete(won, score, timeTaken);
    }
  }, [grid, score, startTime, onComplete]);

  const handleMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameEndedRef.current) return;
    
    const result = move(grid, direction);
    if (result.moved) {
      const newGrid = addRandomTile(result.grid);
      setGrid(newGrid);
      setScore(s => s + result.score);
    }
  }, [grid]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const direction = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
        handleMove(direction);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]);

  // Touch/swipe controls
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const minSwipe = 30;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipe) {
        handleMove(deltaX > 0 ? 'right' : 'left');
      }
    } else {
      if (Math.abs(deltaY) > minSwipe) {
        handleMove(deltaY > 0 ? 'down' : 'up');
      }
    }
    
    touchStartRef.current = null;
  };

  const maxTile = getMaxTile(grid);

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
            <Trophy className="w-5 h-5 text-neon-yellow" />
            <span className="font-gaming text-lg">{score} pts</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-neon-green/20 text-neon-green text-sm font-medium">
            Max: {maxTile}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-neon-cyan to-neon-green transition-all duration-300"
          style={{ width: `${Math.min((score / WIN_SCORE) * 100, 100)}%` }}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {score >= WIN_SCORE ? '✓ Win secured! Keep merging!' : `${WIN_SCORE - score} points to win`}
      </p>

      {/* Game Grid */}
      <div 
        className="aspect-square w-full max-w-sm mx-auto p-3 rounded-2xl bg-card border-2 border-border"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-4 gap-2 h-full">
          {grid.map((row, i) =>
            row.map((cell, j) => (
              <div
                key={`${i}-${j}`}
                className={`rounded-lg flex items-center justify-center font-gaming font-bold transition-all duration-150 ${
                  TILE_COLORS[cell] || 'bg-neon-magenta text-white'
                } ${cell >= 1024 ? 'text-xl' : cell >= 128 ? 'text-2xl' : 'text-3xl'}`}
              >
                {cell > 0 ? cell : ''}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mobile direction buttons */}
      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        <div />
        <button
          onClick={() => handleMove('up')}
          className="p-4 rounded-xl bg-muted hover:bg-muted/80 font-gaming text-xl transition-colors"
        >
          ↑
        </button>
        <div />
        <button
          onClick={() => handleMove('left')}
          className="p-4 rounded-xl bg-muted hover:bg-muted/80 font-gaming text-xl transition-colors"
        >
          ←
        </button>
        <button
          onClick={() => handleMove('down')}
          className="p-4 rounded-xl bg-muted hover:bg-muted/80 font-gaming text-xl transition-colors"
        >
          ↓
        </button>
        <button
          onClick={() => handleMove('right')}
          className="p-4 rounded-xl bg-muted hover:bg-muted/80 font-gaming text-xl transition-colors"
        >
          →
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Swipe or use arrow keys to merge tiles
      </p>
    </div>
  );
}
