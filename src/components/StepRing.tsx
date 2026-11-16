import React from 'react';

interface StepRingProps {
  steps: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}

export const StepRing: React.FC<StepRingProps> = ({
  steps,
  goal,
  size = 216,
  strokeWidth = 18,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const rawPct = goal > 0 ? steps / goal : 0;
  const clampedPct = Math.min(1, Math.max(0, rawPct));
  const strokeDashoffset = circumference * (1 - clampedPct);
  const percentDisplay = Math.round(rawPct * 100);
  const remaining = Math.max(0, goal - steps);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200/80 dark:text-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#FF5A36"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 450ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Steps
        </span>
        <span className="mt-0.5 font-mono text-4xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
          {steps.toLocaleString()}
        </span>
        <span className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
          {percentDisplay}% of {goal.toLocaleString()}
        </span>
        {remaining > 0 ? (
          <span className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {remaining.toLocaleString()} to go
          </span>
        ) : (
          <span className="mt-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            Goal Reached
          </span>
        )}
      </div>
    </div>
  );
};
