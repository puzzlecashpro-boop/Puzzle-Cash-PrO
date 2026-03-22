import { useState, useEffect, useRef } from 'react';
import { Clock, Layers } from 'lucide-react';

interface MemoryMatchGameProps {
  timeLimit: number;
  onComplete: (won: boolean, score: number, timeTaken: number) => void;
  onScoreUpdate?: (score: number) => void;
}

// Large emoji pool for variety
const EMOJI_POOL = [
  '🎮', '🏆', '💰', '⚡', '🎯', '🔥', '💎', '🚀',
  '🎲', '🎪', '🎨', '🎭', '🎧', '🎸', '🎹', '🎺',
  '🌟', '🌈', '🌙', '🌸', '🍀', '🍎', '🍕', '🍦',
  '🦁', '🦊', '🦋', '🐬', '🦅', '🐉', '🦄', '🐺',
  '⚔️', '🛡️', '🗡️', '🏹', '💣', '🔮', '👑', '🎩',
  '🚗', '✈️', '🚁', '🛸', '🏰', '🗽', '🎡', '🎢'
];

const PAIRS_COUNT = 8;

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

// Fisher-Yates shuffle for true randomization
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function generateCards(): Card[] {
  // Randomly select emojis from pool
  const shuffledPool = shuffleArray(EMOJI_POOL);
  const selectedEmojis = shuffledPool.slice(0, PAIRS_COUNT);
  
  // Create pairs and shuffle them
  const pairs = shuffleArray([...selectedEmojis, ...selectedEmojis]);
  
  return pairs.map((emoji, idx) => ({
    id: idx,
    emoji,
    isFlipped: false,
    isMatched: false,
  }));
}

export default function MemoryMatchGame({ timeLimit, onComplete, onScoreUpdate }: MemoryMatchGameProps) {
  const [cards, setCards] = useState<Card[]>(() => generateCards());
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [startTime] = useState(Date.now());
  const [isChecking, setIsChecking] = useState(false);
  const gameEndedRef = useRef(false);

  // Report score updates
  useEffect(() => {
    const currentScore = Math.max(0, matches * 15 - moves);
    onScoreUpdate?.(currentScore);
  }, [matches, moves, onScoreUpdate]);

  useEffect(() => {
    if (gameEndedRef.current) return;
    
    if (timeLeft <= 0) {
      gameEndedRef.current = true;
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const won = matches >= Math.ceil(PAIRS_COUNT / 2);
      const score = Math.max(0, matches * 15 - moves);
      onComplete(won, score, timeTaken);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, matches, moves, startTime, onComplete]);

  useEffect(() => {
    if (gameEndedRef.current) return;
    
    if (matches === PAIRS_COUNT) {
      gameEndedRef.current = true;
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const score = Math.max(0, PAIRS_COUNT * 15 - moves + timeLeft * 2);
      onComplete(true, score, timeTaken);
    }
  }, [matches, moves, timeLeft, startTime, onComplete]);

  const handleCardClick = (cardId: number) => {
    if (isChecking) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    if (flippedCards.length >= 2) return;

    const newCards = cards.map(c =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);
    
    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setIsChecking(true);
      
      const [first, second] = newFlipped;
      const firstCard = newCards.find(c => c.id === first);
      const secondCard = newCards.find(c => c.id === second);

      if (firstCard && secondCard && firstCard.emoji === secondCard.emoji) {
        // Match found
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === first || c.id === second
              ? { ...c, isMatched: true }
              : c
          ));
          setMatches(m => m + 1);
          setFlippedCards([]);
          setIsChecking(false);
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === first || c.id === second
              ? { ...c, isFlipped: false }
              : c
          ));
          setFlippedCards([]);
          setIsChecking(false);
        }, 1000);
      }
    }
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
            <Layers className="w-5 h-5 text-neon-magenta" />
            <span className="font-gaming text-lg">{matches}/{PAIRS_COUNT}</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-muted text-sm">
            {moves} moves
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-4 gap-2 p-4 rounded-xl bg-card border border-border">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={card.isMatched || card.isFlipped}
            className={`aspect-square rounded-xl text-2xl sm:text-3xl flex items-center justify-center transition-all duration-300 transform ${
              card.isMatched
                ? 'bg-neon-green/20 border-2 border-neon-green scale-95'
                : card.isFlipped
                ? 'bg-primary/20 border-2 border-primary'
                : 'bg-gradient-to-br from-neon-magenta/30 to-neon-purple/30 border-2 border-neon-magenta/50 hover:scale-105 hover:border-neon-magenta active:scale-95'
            }`}
          >
            {card.isFlipped || card.isMatched ? (
              <span className="animate-in zoom-in duration-200">{card.emoji}</span>
            ) : (
              <span className="text-neon-magenta/50 text-xl sm:text-2xl">?</span>
            )}
          </button>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Match {Math.ceil(PAIRS_COUNT / 2)}+ pairs to win!
      </p>
    </div>
  );
}
