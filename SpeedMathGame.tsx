import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Calculator, Check, X } from 'lucide-react';

interface SpeedMathGameProps {
  timeLimit: number;
  onComplete: (won: boolean, score: number, timeTaken: number) => void;
  onScoreUpdate?: (score: number) => void;
}

type Operator = '+' | '-' | '×' | '÷';

interface Problem {
  num1: number;
  num2: number;
  operator: Operator;
  answer: number;
  display: string;
}

// Generate random math problems with varying difficulty
function generateProblem(difficulty: number): Problem {
  const operators: Operator[] = ['+', '-', '×'];
  if (difficulty > 3) operators.push('÷'); // Add division for higher difficulty
  
  const operator = operators[Math.floor(Math.random() * operators.length)];
  
  let num1: number, num2: number, answer: number;
  
  // Scale difficulty based on streak/progress
  const maxNum = Math.min(15 + difficulty * 5, 100);
  const minNum = Math.max(1, difficulty);
  
  switch (operator) {
    case '+':
      num1 = Math.floor(Math.random() * maxNum) + minNum;
      num2 = Math.floor(Math.random() * maxNum) + minNum;
      answer = num1 + num2;
      break;
    case '-':
      // Ensure positive result
      num1 = Math.floor(Math.random() * maxNum) + minNum + 10;
      num2 = Math.floor(Math.random() * Math.min(num1 - 1, maxNum)) + 1;
      answer = num1 - num2;
      break;
    case '×':
      num1 = Math.floor(Math.random() * 12) + 2;
      num2 = Math.floor(Math.random() * 12) + 2;
      answer = num1 * num2;
      break;
    case '÷':
      // Generate division with clean integer result
      num2 = Math.floor(Math.random() * 10) + 2;
      answer = Math.floor(Math.random() * 10) + 1;
      num1 = num2 * answer;
      break;
    default:
      num1 = 1;
      num2 = 1;
      answer = 2;
  }
  
  return { 
    num1, 
    num2, 
    operator, 
    answer,
    display: `${num1} ${operator} ${num2}`
  };
}

const WIN_SCORE = 50;

export default function SpeedMathGame({ timeLimit, onComplete, onScoreUpdate }: SpeedMathGameProps) {
  const [problem, setProblem] = useState<Problem>(() => generateProblem(1));
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [startTime] = useState(Date.now());
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const gameEndedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Report score updates
  useEffect(() => {
    onScoreUpdate?.(score);
  }, [score, onScoreUpdate]);

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

  // Auto-focus input on mount and after each problem
  useEffect(() => {
    inputRef.current?.focus();
  }, [problem]);

  const handleSubmit = useCallback(() => {
    if (!userAnswer || feedback) return;
    
    const parsedAnswer = parseInt(userAnswer, 10);
    const isCorrect = parsedAnswer === problem.answer;
    setTotalAnswered(t => t + 1);
    
    if (isCorrect) {
      const points = 10 + Math.min(streak, 5) * 2; // Cap streak bonus at 10 extra points
      setScore(s => s + points);
      setStreak(s => s + 1);
      setTotalCorrect(t => t + 1);
      setFeedback('correct');
    } else {
      setStreak(0);
      setFeedback('wrong');
    }
    
    setTimeout(() => {
      setFeedback(null);
      // Increase difficulty based on correct answers
      setProblem(generateProblem(Math.floor(totalCorrect / 3) + 1));
      setUserAnswer('');
      inputRef.current?.focus();
    }, 400);
  }, [userAnswer, problem.answer, streak, totalCorrect, feedback]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleNumberClick = (num: string) => {
    if (feedback) return; // Disable input during feedback
    
    if (num === 'clear') {
      setUserAnswer('');
    } else if (num === 'backspace') {
      setUserAnswer(prev => prev.slice(0, -1));
    } else if (num === 'submit') {
      handleSubmit();
    } else if (num === '-') {
      // Toggle negative sign
      setUserAnswer(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
    } else {
      setUserAnswer(prev => prev + num);
    }
    inputRef.current?.focus();
  };

  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

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
            <Calculator className="w-5 h-5 text-neon-magenta" />
            <span className="font-gaming text-lg">{score} pts</span>
          </div>
          {streak > 1 && (
            <div className="px-3 py-1 rounded-full bg-neon-yellow/20 text-neon-yellow text-sm font-medium animate-pulse">
              🔥 {streak}x
            </div>
          )}
        </div>
      </div>

      {/* Progress bar to winning */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-neon-cyan to-neon-green transition-all duration-300"
          style={{ width: `${Math.min((score / WIN_SCORE) * 100, 100)}%` }}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {score >= WIN_SCORE ? '✓ Win secured! Keep going for bonus!' : `${WIN_SCORE - score} points to win`}
      </p>

      {/* Problem Display */}
      <div className={`p-6 sm:p-8 rounded-2xl bg-card border-2 transition-all duration-200 ${
        feedback === 'correct' 
          ? 'border-neon-green bg-neon-green/10' 
          : feedback === 'wrong' 
          ? 'border-destructive bg-destructive/10' 
          : 'border-border'
      }`}>
        <div className="text-center">
          <div className="font-gaming text-3xl sm:text-5xl text-foreground mb-6">
            {problem.display} = ?
          </div>
          
          {/* Answer Input */}
          <div className="relative max-w-xs mx-auto">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value.replace(/[^0-9-]/g, ''))}
              onKeyDown={handleKeyDown}
              placeholder="Your answer"
              className="w-full px-6 py-4 text-center text-2xl font-gaming bg-muted border-2 border-primary/30 rounded-xl focus:border-primary focus:outline-none"
              autoFocus
              disabled={!!feedback}
            />
            {feedback && (
              <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                feedback === 'correct' ? 'text-neon-green' : 'text-destructive'
              }`}>
                {feedback === 'correct' ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
              </div>
            )}
          </div>
          
          {feedback === 'wrong' && (
            <p className="mt-2 text-sm text-destructive">
              Correct answer: {problem.answer}
            </p>
          )}
        </div>
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-4 gap-2">
        {['7', '8', '9', 'backspace'].map(key => (
          <button
            key={key}
            onClick={() => handleNumberClick(key)}
            disabled={!!feedback}
            className="p-3 sm:p-4 rounded-xl bg-muted hover:bg-muted/80 font-gaming text-lg sm:text-xl transition-colors disabled:opacity-50"
          >
            {key === 'backspace' ? '⌫' : key}
          </button>
        ))}
        {['4', '5', '6', 'clear'].map(key => (
          <button
            key={key}
            onClick={() => handleNumberClick(key)}
            disabled={!!feedback}
            className="p-3 sm:p-4 rounded-xl bg-muted hover:bg-muted/80 font-gaming text-lg sm:text-xl transition-colors disabled:opacity-50"
          >
            {key === 'clear' ? 'C' : key}
          </button>
        ))}
        {['1', '2', '3', 'submit'].map(key => (
          <button
            key={key}
            onClick={() => handleNumberClick(key)}
            disabled={!!feedback}
            className={`p-3 sm:p-4 rounded-xl font-gaming text-lg sm:text-xl transition-colors disabled:opacity-50 ${
              key === 'submit' 
                ? 'bg-primary text-primary-foreground hover:opacity-90' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {key === 'submit' ? '✓' : key}
          </button>
        ))}
        <button
          onClick={() => handleNumberClick('0')}
          disabled={!!feedback}
          className="col-span-2 p-3 sm:p-4 rounded-xl bg-muted hover:bg-muted/80 font-gaming text-lg sm:text-xl transition-colors disabled:opacity-50"
        >
          0
        </button>
        <button
          onClick={() => handleNumberClick('-')}
          disabled={!!feedback}
          className="p-3 sm:p-4 rounded-xl bg-muted hover:bg-muted/80 font-gaming text-lg sm:text-xl transition-colors disabled:opacity-50"
        >
          ±
        </button>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Solved: {totalCorrect}/{totalAnswered}</span>
        <span>Accuracy: {accuracy}%</span>
      </div>
    </div>
  );
}
