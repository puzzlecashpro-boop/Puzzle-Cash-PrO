import { useState, useEffect, useCallback } from 'react';
import { Play, X } from 'lucide-react';

interface VideoAdModalProps {
  open: boolean;
  onComplete: () => void;

}

export default function VideoAdModal({ open, onComplete }: VideoAdModalProps) {
  const [countdown, setCountdown] = useState(5);
  const [showSkip, setShowSkip] = useState(false);

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!open) {
      setCountdown(5);
      setShowSkip(false);
      return;
    }

    // Show skip button after 3 seconds
    const skipTimer = setTimeout(() => {
      setShowSkip(true);
    }, 3000);

    // Countdown timer
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(skipTimer);
      clearInterval(interval);
    };
  }, [open, handleComplete]);

  if (!open) return null;

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-md mx-4">
        {/* Ad Container */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-black/50 border-b border-gray-700">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Sponsored</span>
            <div className="flex items-center gap-2">
              {showSkip ? (
                <button
                  onClick={handleSkip}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  Skip Ad
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-xs text-gray-500">Skip in {3 - (5 - countdown)}s</span>
              )}
            </div>
          </div>

          {/* Video Placeholder */}
          <div className="aspect-video bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 flex flex-col items-center justify-center gap-4 relative">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:20px_20px] animate-pulse" />
            </div>
            
            {/* Play icon with pulse */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
              <div className="relative p-4 rounded-full bg-white/10 border border-white/20">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
            </div>

            <div className="text-center z-10">
              <p className="text-white font-semibold text-lg">Video Ad Playing...</p>
              <p className="text-gray-400 text-sm mt-1">Your game will start automatically</p>
            </div>

            {/* Countdown circle */}
            <div className="relative w-16 h-16">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="url(#gradient)"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={176}
                  strokeDashoffset={176 - (176 * (5 - countdown)) / 5}
                  className="transition-all duration-1000 ease-linear"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00f5ff" />
                    <stop offset="100%" stopColor="#ff00ff" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white font-gaming">{countdown}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-black/50 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Ad by Puzzle Cash Partners</span>
              <span className="text-xs text-neon-cyan">Practice Mode Loading...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
