import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Search, CheckCircle } from 'lucide-react';

interface WordSearchGameProps {
  timeLimit: number;
  onComplete: (won: boolean, score: number, timeTaken: number) => void;
  onScoreUpdate?: (score: number) => void;
}

// Large word pool for infinite replayability
const WORD_POOL = [
  'CODE', 'GAME', 'WIN', 'PLAY', 'CASH', 'LUCK', 'COIN', 'GOLD',
  'PRIZE', 'SCORE', 'BONUS', 'LEVEL', 'QUEST', 'POWER', 'SPEED',
  'SKILL', 'RANK', 'STAR', 'HERO', 'EPIC', 'MEGA', 'ULTRA', 'SUPER',
  'FAST', 'JUMP', 'RUSH', 'SPIN', 'FLIP', 'DASH', 'ZOOM', 'BLITZ',
  'FIRE', 'ICE', 'BOLT', 'WAVE', 'GLOW', 'BEAM', 'FURY', 'BLAZE',
  'ACE', 'PRO', 'MAX', 'TOP', 'BEST', 'KING', 'BOSS', 'CHAMP'
];

const GRID_SIZE = 8;
const WORDS_PER_GAME = 5;

// Fisher-Yates shuffle for true randomization
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Get random words from pool
function getRandomWords(): string[] {
  const shuffled = shuffleArray(WORD_POOL);
  return shuffled.slice(0, WORDS_PER_GAME);
}

function generateGrid(words: string[]): string[][] {
  const grid: string[][] = Array(GRID_SIZE).fill(null).map(() => 
    Array(GRID_SIZE).fill('')
  );
  
  const directions = [
    { dr: 0, dc: 1 },   // horizontal
    { dr: 1, dc: 0 },   // vertical
    { dr: 1, dc: 1 },   // diagonal down-right
    { dr: 1, dc: -1 },  // diagonal down-left
  ];
  
  // Place words with random directions
  words.forEach((word) => {
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 100) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const reverse = Math.random() > 0.5;
      const wordToPlace = reverse ? word.split('').reverse().join('') : word;
      
      const maxRow = GRID_SIZE - (dir.dr > 0 ? word.length : 1);
      const maxCol = GRID_SIZE - (dir.dc > 0 ? word.length : (dir.dc < 0 ? 0 : 1));
      const minCol = dir.dc < 0 ? word.length - 1 : 0;
      
      if (maxRow < 0 || maxCol < minCol) {
        attempts++;
        continue;
      }
      
      const startRow = Math.floor(Math.random() * (maxRow + 1));
      const startCol = minCol + Math.floor(Math.random() * (maxCol - minCol + 1));
      
      let canPlace = true;
      for (let i = 0; i < word.length; i++) {
        const r = startRow + i * dir.dr;
        const c = startCol + i * dir.dc;
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
          canPlace = false;
          break;
        }
        if (grid[r][c] !== '' && grid[r][c] !== wordToPlace[i]) {
          canPlace = false;
          break;
        }
      }
      
      if (canPlace) {
        for (let i = 0; i < word.length; i++) {
          const r = startRow + i * dir.dr;
          const c = startCol + i * dir.dc;
          grid[r][c] = wordToPlace[i];
        }
        placed = true;
      }
      attempts++;
    }
  });
  
  // Fill empty cells with random letters
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (grid[i][j] === '') {
        grid[i][j] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }
  
  return grid;
}

export default function WordSearchGame({ timeLimit, onComplete, onScoreUpdate }: WordSearchGameProps) {
  const [words] = useState(() => getRandomWords());
  const [grid, setGrid] = useState<string[][]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set()); // Track found cell positions
  const [selectedCells, setSelectedCells] = useState<{row: number; col: number}[]>([]);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [startTime] = useState(Date.now());
  const [isSelecting, setIsSelecting] = useState(false);
  const [flashCells, setFlashCells] = useState<Set<string>>(new Set()); // For flash animation
  const gameEndedRef = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGrid(generateGrid(words));
  }, [words]);

  // Report score updates
  useEffect(() => {
    onScoreUpdate?.(foundWords.size * 20);
  }, [foundWords.size, onScoreUpdate]);

  // Timer effect
  useEffect(() => {
    if (gameEndedRef.current) return;
    
    if (timeLeft <= 0) {
      gameEndedRef.current = true;
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const won = foundWords.size >= Math.ceil(words.length / 2);
      onComplete(won, foundWords.size * 20, timeTaken);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, foundWords.size, words.length, startTime, onComplete]);

  // Win condition - trigger immediately when all words found
  useEffect(() => {
    if (gameEndedRef.current) return;
    
    if (foundWords.size === words.length && foundWords.size > 0) {
      gameEndedRef.current = true;
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      // Bonus points for finding all words + time bonus
      const score = words.length * 20 + (timeLeft * 2);
      onComplete(true, score, timeTaken);
    }
  }, [foundWords.size, words.length, timeLeft, startTime, onComplete]);

  const checkWord = useCallback(() => {
    if (selectedCells.length < 2) return;
    
    const selectedLetters = selectedCells.map(c => grid[c.row][c.col]).join('');
    const reversedLetters = selectedLetters.split('').reverse().join('');
    
    const foundWord = words.find(w => 
      (w === selectedLetters || w === reversedLetters) && !foundWords.has(w)
    );
    
    if (foundWord) {
      // Add word to found words
      setFoundWords(prev => new Set([...prev, foundWord]));
      
      // Save cell positions permanently
      const newFoundCells = new Set(foundCells);
      const newFlashCells = new Set<string>();
      selectedCells.forEach(cell => {
        const key = `${cell.row}-${cell.col}`;
        newFoundCells.add(key);
        newFlashCells.add(key);
      });
      setFoundCells(newFoundCells);
      
      // Flash animation for newly found cells
      setFlashCells(newFlashCells);
      setTimeout(() => setFlashCells(new Set()), 500);
    }
  }, [selectedCells, grid, foundWords, words, foundCells]);

  const handleCellMouseDown = (row: number, col: number) => {
    setIsSelecting(true);
    setSelectedCells([{ row, col }]);
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isSelecting) return;
    
    if (selectedCells.length > 0) {
      const first = selectedCells[0];
      const isHorizontal = row === first.row;
      const isVertical = col === first.col;
      const isDiagonal = Math.abs(row - first.row) === Math.abs(col - first.col);
      
      if (isHorizontal || isVertical || isDiagonal) {
        const newCells = [first];
        const rowStep = row === first.row ? 0 : (row > first.row ? 1 : -1);
        const colStep = col === first.col ? 0 : (col > first.col ? 1 : -1);
        
        let r = first.row + rowStep;
        let c = first.col + colStep;
        
        while (r !== row + rowStep || c !== col + colStep) {
          newCells.push({ row: r, col: c });
          r += rowStep;
          c += colStep;
        }
        
        setSelectedCells(newCells);
      }
    }
  };

  const handleCellTouchStart = (row: number, col: number, e: React.TouchEvent) => {
    e.preventDefault();
    setIsSelecting(true);
    setSelectedCells([{ row, col }]);
  };

  // Handle touch move - find which cell the finger is over
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSelecting || selectedCells.length === 0) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element && element.hasAttribute('data-cell')) {
      const cellData = element.getAttribute('data-cell');
      if (cellData) {
        const [rowStr, colStr] = cellData.split('-');
        const row = parseInt(rowStr, 10);
        const col = parseInt(colStr, 10);
        
        // Update selection from first cell to current cell
        const first = selectedCells[0];
        const isHorizontal = row === first.row;
        const isVertical = col === first.col;
        const isDiagonal = Math.abs(row - first.row) === Math.abs(col - first.col);
        
        if (isHorizontal || isVertical || isDiagonal) {
          const newCells = [first];
          const rowStep = row === first.row ? 0 : (row > first.row ? 1 : -1);
          const colStep = col === first.col ? 0 : (col > first.col ? 1 : -1);
          
          let r = first.row + rowStep;
          let c = first.col + colStep;
          
          while (r !== row + rowStep || c !== col + colStep) {
            newCells.push({ row: r, col: c });
            r += rowStep;
            c += colStep;
          }
          
          setSelectedCells(newCells);
        }
      }
    }
  }, [isSelecting, selectedCells]);

  const handleSelectionEnd = useCallback(() => {
    if (isSelecting) {
      checkWord();
      setSelectedCells([]);
      setIsSelecting(false);
    }
  }, [isSelecting, checkWord]);

  // Check cell states for styling
  const isCellSelected = (row: number, col: number) => {
    return selectedCells.some(c => c.row === row && c.col === col);
  };

  const isCellFound = (row: number, col: number) => {
    return foundCells.has(`${row}-${col}`);
  };

  const isCellFlashing = (row: number, col: number) => {
    return flashCells.has(`${row}-${col}`);
  };

  if (grid.length === 0) return null;

  return (
    <div 
      className="space-y-4" 
      onMouseUp={handleSelectionEnd} 
      onMouseLeave={handleSelectionEnd} 
      onTouchEnd={handleSelectionEnd}
      onTouchCancel={handleSelectionEnd}
    >
      {/* Timer */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 ${timeLeft <= 10 ? 'text-destructive animate-pulse' : 'text-neon-cyan'}`}>
          <Clock className="w-5 h-5" />
          <span className="font-gaming text-xl">{timeLeft}s</span>
        </div>
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-neon-magenta" />
          <span className="font-gaming text-lg">{foundWords.size}/{words.length}</span>
        </div>
      </div>

      {/* Word List - with visual feedback for found words */}
      <div className="flex flex-wrap gap-2">
        {words.map(word => (
          <span
            key={word}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-1 ${
              foundWords.has(word)
                ? 'bg-neon-green/30 text-neon-green border border-neon-green/50 line-through'
                : 'bg-muted text-muted-foreground border border-transparent'
            }`}
          >
            {foundWords.has(word) && <CheckCircle className="w-3 h-3" />}
            {word}
          </span>
        ))}
      </div>

      {/* Progress indicator */}
      {foundWords.size > 0 && foundWords.size < words.length && (
        <div className="text-center text-sm text-neon-green animate-pulse">
          🎉 {foundWords.size} word{foundWords.size > 1 ? 's' : ''} found! Keep going!
        </div>
      )}

      {/* Grid */}
      <div 
        ref={gridRef}
        className="grid gap-1 p-4 rounded-xl bg-card border border-border select-none touch-none"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        onTouchMove={handleTouchMove}
      >
        {grid.map((row, rowIdx) =>
          row.map((letter, colIdx) => {
            const isSelected = isCellSelected(rowIdx, colIdx);
            const isFound = isCellFound(rowIdx, colIdx);
            const isFlashing = isCellFlashing(rowIdx, colIdx);
            
            return (
              <button
                key={`${rowIdx}-${colIdx}`}
                data-cell={`${rowIdx}-${colIdx}`}
                onMouseDown={() => handleCellMouseDown(rowIdx, colIdx)}
                onMouseEnter={() => handleCellMouseEnter(rowIdx, colIdx)}
                onTouchStart={(e) => handleCellTouchStart(rowIdx, colIdx, e)}
                className={`aspect-square flex items-center justify-center rounded-lg font-gaming font-bold text-sm sm:text-lg transition-all duration-200 ${
                  isFlashing
                    ? 'bg-neon-green text-background scale-125 shadow-lg shadow-neon-green/50'
                    : isFound
                    ? 'bg-neon-green/30 text-neon-green border border-neon-green/50'
                    : isSelected
                    ? 'bg-primary text-primary-foreground scale-110'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                }`}
              >
                {letter}
              </button>
            );
          })
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {foundWords.size === 0 
          ? 'Drag across letters to find words!' 
          : foundWords.size >= Math.ceil(words.length / 2)
          ? `✓ Win secured! Find ${words.length - foundWords.size} more for bonus!`
          : `Find ${Math.ceil(words.length / 2) - foundWords.size} more to win!`
        }
      </p>
    </div>
  );
}
