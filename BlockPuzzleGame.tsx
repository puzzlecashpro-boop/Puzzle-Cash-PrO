import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Trophy, Box } from 'lucide-react';

interface BlockPuzzleGameProps {
  timeLimit: number;
  onComplete: (won: boolean, score: number, timeTaken: number) => void;
  onScoreUpdate?: (score: number) => void;
}

const GRID_ROWS = 8;
const GRID_COLS = 8;
const WIN_SCORE = 300;

type Grid = boolean[][];
type Block = boolean[][];

// Block shapes (various Tetris-like pieces)
const BLOCK_SHAPES: Block[] = [
  // Single
  [[true]],
  // Line 2
  [[true, true]],
  // Line 3
  [[true, true, true]],
  // Line 4
  [[true, true, true, true]],
  // Square 2x2
  [[true, true], [true, true]],
  // L shape
  [[true, false], [true, false], [true, true]],
  // Reverse L
  [[false, true], [false, true], [true, true]],
  // T shape
  [[true, true, true], [false, true, false]],
  // S shape
  [[false, true, true], [true, true, false]],
  // Z shape
  [[true, true, false], [false, true, true]],
  // Corner
  [[true, true], [true, false]],
  // Vertical 3
  [[true], [true], [true]],
];

function createEmptyGrid(): Grid {
  return Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(false));
}

function getRandomBlocks(): Block[] {
  const blocks: Block[] = [];
  for (let i = 0; i < 3; i++) {
    blocks.push(BLOCK_SHAPES[Math.floor(Math.random() * BLOCK_SHAPES.length)]);
  }
  return blocks;
}

function canPlaceBlock(grid: Grid, block: Block, startRow: number, startCol: number): boolean {
  for (let i = 0; i < block.length; i++) {
    for (let j = 0; j < block[i].length; j++) {
      if (block[i][j]) {
        const r = startRow + i;
        const c = startCol + j;
        if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS || grid[r][c]) {
          return false;
        }
      }
    }
  }
  return true;
}

function placeBlock(grid: Grid, block: Block, startRow: number, startCol: number): Grid {
  const newGrid = grid.map(row => [...row]);
  for (let i = 0; i < block.length; i++) {
    for (let j = 0; j < block[i].length; j++) {
      if (block[i][j]) {
        newGrid[startRow + i][startCol + j] = true;
      }
    }
  }
  return newGrid;
}

function clearLines(grid: Grid): { grid: Grid; linesCleared: number } {
  let newGrid = grid.map(row => [...row]);
  let linesCleared = 0;
  
  // Check rows
  const rowsToClear: number[] = [];
  for (let i = 0; i < GRID_ROWS; i++) {
    if (newGrid[i].every(cell => cell)) {
      rowsToClear.push(i);
    }
  }
  
  // Check columns
  const colsToClear: number[] = [];
  for (let j = 0; j < GRID_COLS; j++) {
    if (newGrid.every(row => row[j])) {
      colsToClear.push(j);
    }
  }
  
  // Clear rows
  for (const row of rowsToClear) {
    for (let j = 0; j < GRID_COLS; j++) {
      newGrid[row][j] = false;
    }
    linesCleared++;
  }
  
  // Clear columns
  for (const col of colsToClear) {
    for (let i = 0; i < GRID_ROWS; i++) {
      newGrid[i][col] = false;
    }
    linesCleared++;
  }
  
  return { grid: newGrid, linesCleared };
}

function canPlaceAnyBlock(grid: Grid, blocks: Block[]): boolean {
  for (const block of blocks) {
    for (let i = 0; i <= GRID_ROWS - block.length; i++) {
      for (let j = 0; j <= GRID_COLS - (block[0]?.length || 0); j++) {
        if (canPlaceBlock(grid, block, i, j)) {
          return true;
        }
      }
    }
  }
  return false;
}

const BLOCK_COLORS = [
  'bg-neon-cyan',
  'bg-neon-magenta',
  'bg-neon-yellow',
  'bg-neon-green',
  'bg-orange-500',
  'bg-purple-500',
];

export default function BlockPuzzleGame({ timeLimit, onComplete, onScoreUpdate }: BlockPuzzleGameProps) {
  const [grid, setGrid] = useState<Grid>(() => createEmptyGrid());
  const [availableBlocks, setAvailableBlocks] = useState<Block[]>(() => getRandomBlocks());
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [linesTotal, setLinesTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [startTime] = useState(Date.now());
  const [blockColors] = useState(() => [
    BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)],
    BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)],
    BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)],
  ]);
  const gameEndedRef = useRef(false);

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

  // Check if game is stuck (no valid moves)
  useEffect(() => {
    const remainingBlocks = availableBlocks.filter(b => b.length > 0);
    if (remainingBlocks.length > 0 && !canPlaceAnyBlock(grid, remainingBlocks) && !gameEndedRef.current) {
      gameEndedRef.current = true;
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const won = score >= WIN_SCORE;
      onComplete(won, score, timeTaken);
    }
  }, [grid, availableBlocks, score, startTime, onComplete]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameEndedRef.current || selectedBlockIndex === null) return;
    
    const block = availableBlocks[selectedBlockIndex];
    if (!block || block.length === 0) return;
    
    if (canPlaceBlock(grid, block, row, col)) {
      let newGrid = placeBlock(grid, block, row, col);
      
      // Clear completed lines
      const result = clearLines(newGrid);
      newGrid = result.grid;
      
      // Calculate score
      const blockCells = block.flat().filter(Boolean).length;
      const lineBonus = result.linesCleared * 50;
      const placementScore = blockCells * 5 + lineBonus;
      
      setGrid(newGrid);
      setScore(s => s + placementScore);
      setLinesTotal(l => l + result.linesCleared);
      
      // Remove used block
      const newBlocks = [...availableBlocks];
      newBlocks[selectedBlockIndex] = [];
      
      // If all blocks used, get new ones
      if (newBlocks.every(b => b.length === 0)) {
        setAvailableBlocks(getRandomBlocks());
      } else {
        setAvailableBlocks(newBlocks);
      }
      
      setSelectedBlockIndex(null);
    }
  }, [grid, selectedBlockIndex, availableBlocks]);

  const handleBlockSelect = (index: number) => {
    if (availableBlocks[index].length === 0) return;
    setSelectedBlockIndex(selectedBlockIndex === index ? null : index);
  };

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
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-neon-green" />
            <span className="font-gaming text-lg">{linesTotal} lines</span>
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
        {score >= WIN_SCORE ? '✓ Win secured! Keep clearing!' : `${WIN_SCORE - score} points to win`}
      </p>

      {/* Game Grid */}
      <div className="aspect-square w-full max-w-sm mx-auto p-2 rounded-2xl bg-card border-2 border-border">
        <div className="grid grid-cols-8 gap-0.5 h-full">
          {grid.map((row, i) =>
            row.map((cell, j) => (
              <button
                key={`${i}-${j}`}
                onClick={() => handleCellClick(i, j)}
                className={`rounded-sm transition-all duration-100 ${
                  cell
                    ? 'bg-neon-magenta/80 border border-neon-magenta'
                    : selectedBlockIndex !== null
                    ? 'bg-muted/30 hover:bg-neon-cyan/30 cursor-pointer'
                    : 'bg-muted/20'
                }`}
              />
            ))
          )}
        </div>
      </div>

      {/* Available Blocks */}
      <div className="flex justify-center gap-4">
        {availableBlocks.map((block, index) => (
          <button
            key={index}
            onClick={() => handleBlockSelect(index)}
            disabled={block.length === 0}
            className={`p-2 rounded-xl transition-all duration-200 ${
              block.length === 0
                ? 'opacity-30 cursor-not-allowed'
                : selectedBlockIndex === index
                ? 'bg-primary/30 border-2 border-primary scale-110'
                : 'bg-muted/50 border-2 border-transparent hover:border-muted'
            }`}
          >
            <div 
              className="grid gap-0.5"
              style={{ 
                gridTemplateColumns: `repeat(${block[0]?.length || 1}, 1fr)`,
              }}
            >
              {block.map((row, i) =>
                row.map((cell, j) => (
                  <div
                    key={`${i}-${j}`}
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-sm ${
                      cell ? blockColors[index] : 'bg-transparent'
                    }`}
                  />
                ))
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Instructions */}
      <p className="text-center text-xs text-muted-foreground">
        Select a block, then tap the grid to place it. Clear rows and columns!
      </p>
    </div>
  );
}
