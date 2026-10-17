import { Sun, Moon } from 'lucide-react';
import type { ReactNode } from 'react';

interface ShiftBadgeProps {
  shift?: string | null;
  className?: string;
  children?: ReactNode;
}

/** Day / Night duty badge shown for emergency department contacts. */
const ShiftBadge = ({ shift, className = '', children }: ShiftBadgeProps) => {
  if (shift !== 'day' && shift !== 'night') {
    if (children) return <>{children}</>;
    return null;
  }

  const isDay = shift === 'day';
  const badge = (
    <>
      <style>{`
        @keyframes pulse-border {
          0%, 100% {
            box-shadow:
              0 0 0 1px rgba(255,255,255,0.12),
              0 0 0 1px ${isDay ? 'rgba(251,191,36,0.95)' : 'rgba(99,102,241,0.95)'} inset,
              0 0 0 rgba(0,0,0,0),
              0 0 0 rgba(0,0,0,0);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(255,255,255,0.3),
              0 0 0 1px ${isDay ? 'rgba(251,191,36,1)' : 'rgba(99,102,241,1)'} inset,
              0 0 8px ${isDay ? 'rgba(251,191,36,0.7)' : 'rgba(99,102,241,0.7)'},
              0 0 18px ${isDay ? 'rgba(251,191,36,0.3)' : 'rgba(99,102,241,0.3)'};
          }
        }
      `}</style>
      <span
        className={`relative inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-bold capitalize tracking-wide ${isDay
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
          }`}
        style={{
          boxShadow: isDay
            ? '0 0 0 1px rgba(251,191,36,0.8), 0 0 0 1px rgba(251,191,36,0.25) inset, 0 0 8px rgba(251,191,36,0.25)'
            : '0 0 0 1px rgba(99,102,241,0.8), 0 0 0 1px rgba(99,102,241,0.25) inset, 0 0 8px rgba(99,102,241,0.25)',
          animation: 'pulse-border 1.4s ease-in-out infinite',
        }}
      >
        <span
          className="absolute inset-0 rounded-md"
          style={{
            boxShadow: isDay
              ? '0 0 0 1px rgba(251,191,36,0.9), 0 0 14px rgba(251,191,36,0.5)'
              : '0 0 0 1px rgba(99,102,241,0.9), 0 0 14px rgba(99,102,241,0.5)',
            animation: 'pulse-border 1.4s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
        <span className="relative z-10 inline-flex items-center gap-1">
          {isDay ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {isDay ? 'Day' : 'Night'}
        </span>
      </span>
    </>
  );

  if (!children) {
    return <span className={`inline-flex items-center ${className}`}>{badge}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="text-inherit">{children}</span>
      {badge}
    </span>
  );
};

export default ShiftBadge;
