import { LucideIcon, Lock } from 'lucide-react';

interface GameCardProps {
  id: string;
  title: string;
  icon: LucideIcon;
  color: 'cyan' | 'magenta' | 'purple' | 'yellow' | 'green';
  isAvailable: boolean;
  description: string;
  entryFee?: number;
  prizePool?: number;
  onClick: () => void;
}

const colorClasses = {
  cyan: {
    bg: 'from-neon-cyan/20 to-neon-cyan/5',
    border: 'border-neon-cyan/40 hover:border-neon-cyan',
    glow: 'box-glow-cyan',
    text: 'text-neon-cyan',
    iconBg: 'bg-neon-cyan/20',
  },
  magenta: {
    bg: 'from-neon-magenta/20 to-neon-magenta/5',
    border: 'border-neon-magenta/40 hover:border-neon-magenta',
    glow: 'box-glow-magenta',
    text: 'text-neon-magenta',
    iconBg: 'bg-neon-magenta/20',
  },
  purple: {
    bg: 'from-neon-purple/20 to-neon-purple/5',
    border: 'border-neon-purple/40 hover:border-neon-purple',
    glow: 'box-glow-purple',
    text: 'text-neon-purple',
    iconBg: 'bg-neon-purple/20',
  },
  yellow: {
    bg: 'from-neon-yellow/20 to-neon-yellow/5',
    border: 'border-neon-yellow/40 hover:border-neon-yellow',
    glow: 'shadow-[0_0_15px_hsl(45_100%_60%/0.5),0_0_30px_hsl(45_100%_60%/0.3)]',
    text: 'text-neon-yellow',
    iconBg: 'bg-neon-yellow/20',
  },
  green: {
    bg: 'from-neon-green/20 to-neon-green/5',
    border: 'border-neon-green/40 hover:border-neon-green',
    glow: 'shadow-[0_0_15px_hsl(150_100%_50%/0.5),0_0_30px_hsl(150_100%_50%/0.3)]',
    text: 'text-neon-green',
    iconBg: 'bg-neon-green/20',
  },
};

export default function GameCard({
  title,
  icon: Icon,
  color,
  isAvailable,
  description,
  entryFee,
  prizePool,
  onClick,
}: GameCardProps) {
  const colors = colorClasses[color];

  return (
    <button
      onClick={onClick}
      disabled={!isAvailable}
      className={`
        group relative w-full p-5 rounded-2xl border-2 transition-all duration-300
        bg-gradient-to-br ${colors.bg} ${colors.border}
        ${isAvailable ? `hover:scale-[1.02] hover:${colors.glow}` : 'opacity-60 cursor-not-allowed'}
      `}
    >
      {/* Coming Soon Badge */}
      {!isAvailable && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-muted/80 text-xs font-medium text-muted-foreground">
          <Lock className="w-3 h-3" />
          <span>Coming Soon</span>
        </div>
      )}

      {/* Icon */}
      <div className={`w-16 h-16 mx-auto mb-4 rounded-xl ${colors.iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
        <Icon className={`w-8 h-8 ${colors.text}`} />
      </div>

      {/* Title */}
      <h3 className={`font-gaming font-semibold text-lg ${colors.text} mb-2`}>
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

      {/* Entry/Win Info */}
      {isAvailable && entryFee && prizePool && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-neon-yellow/20 text-neon-yellow font-semibold">
            Entry: ₹{entryFee}
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="px-2 py-1 rounded bg-neon-green/20 text-neon-green font-semibold">
            Win: ₹{prizePool}
          </span>
        </div>
      )}

      {/* Play indicator */}
      {isAvailable && (
        <div className={`mt-4 py-2 px-4 rounded-lg bg-gradient-to-r ${colors.bg} border ${colors.border} inline-flex items-center gap-2 text-sm font-medium ${colors.text}`}>
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors.text.replace('text', 'bg')}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${colors.text.replace('text', 'bg')}`}></span>
          </span>
          Play Now
        </div>
      )}
    </button>
  );
}
