import React, { useMemo, useState } from 'react';
import { getRecentDateKeys, parseDateKey } from '../lib/healthCalculations';
import { DailyStepRecord, TimeRange } from '../types/health';

interface ChartBarItem {
  key: string;
  label: string;
  sublabel: string;
  value: number;
  goalMet: boolean;
}

interface StepChartsProps {
  recordsByDate: Record<string, DailyStepRecord>;
  selectedDateKey: string;
  dailyGoal: number;
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  showRangeSelector?: boolean;
}

const RANGES: { id: TimeRange; label: string }[] = [
  { id: 'D', label: 'D' },
  { id: 'W', label: 'W' },
  { id: 'M', label: 'M' },
  { id: '6M', label: '6M' },
  { id: 'Y', label: 'Y' },
];

export const StepCharts: React.FC<StepChartsProps> = ({
  recordsByDate,
  selectedDateKey,
  dailyGoal,
  range,
  onRangeChange,
  showRangeSelector = true,
}) => {
  const [activeBarKey, setActiveBarKey] = useState<string | null>(null);

  const bars: ChartBarItem[] = useMemo(() => {
    if (range === 'D') {
      const rec = recordsByDate[selectedDateKey];
      const hourly = rec?.hourlySteps?.length === 24 ? rec.hourlySteps : Array.from({ length: 24 }, () => 0);
      return hourly.map((val, hour) => {
        const ampm = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
        const showAxis = hour === 0 || hour === 6 || hour === 12 || hour === 18;
        return {
          key: `h_${hour}`,
          label: showAxis ? ampm.replace(' ', '') : '',
          sublabel: `${ampm} – ${hour === 23 ? '12 AM' : hour + 1 < 12 ? `${hour + 1} AM` : hour + 1 === 12 ? '12 PM' : `${hour - 11} PM`}`,
          value: val,
          goalMet: false,
        };
      });
    }

    if (range === 'W') {
      const keys = getRecentDateKeys(7);
      return keys.map((k) => {
        const d = parseDateKey(k);
        const rec = recordsByDate[k];
        const val = rec?.steps || 0;
        const g = rec?.goal || dailyGoal;
        return {
          key: k,
          label: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
          sublabel: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
          value: val,
          goalMet: val >= g,
        };
      });
    }

    if (range === 'M') {
      const keys = getRecentDateKeys(30);
      return keys.map((k, idx) => {
        const d = parseDateKey(k);
        const rec = recordsByDate[k];
        const val = rec?.steps || 0;
        const g = rec?.goal || dailyGoal;
        return {
          key: k,
          label: idx % 5 === 0 || idx === keys.length - 1 ? String(d.getDate()) : '',
          sublabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
          value: val,
          goalMet: val >= g,
        };
      });
    }

    if (range === '6M') {
      // 26 weekly averages
      const keys = getRecentDateKeys(182);
      const weeks: ChartBarItem[] = [];
      for (let i = 0; i < keys.length; i += 7) {
        const slice = keys.slice(i, i + 7);
        const activeVals = slice.map((k) => recordsByDate[k]?.steps || 0);
        const avg = Math.round(activeVals.reduce((a, b) => a + b, 0) / slice.length);
        const startD = parseDateKey(slice[0]);
        const endD = parseDateKey(slice[slice.length - 1]);
        const monthTag = startD.getDate() <= 7 ? startD.toLocaleDateString(undefined, { month: 'short' }) : '';
        weeks.push({
          key: slice[0],
          label: monthTag,
          sublabel: `${startD.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${endD.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} (Avg)`,
          value: avg,
          goalMet: avg >= dailyGoal,
        });
      }
      return weeks;
    }

    // 'Y' -> 12 months daily average
    const now = new Date();
    const months: ChartBarItem[] = [];
    for (let mOffset = 11; mOffset >= 0; mOffset--) {
      const mDate = new Date(now.getFullYear(), now.getMonth() - mOffset, 1);
      const y = mDate.getFullYear();
      const m = String(mDate.getMonth() + 1).padStart(2, '0');
      const prefix = `${y}-${m}-`;
      const matching = Object.values(recordsByDate).filter((r) => r.date.startsWith(prefix));
      const daysInMonth = new Date(y, mDate.getMonth() + 1, 0).getDate();
      const total = matching.reduce((acc, r) => acc + r.steps, 0);
      const avg = matching.length > 0 ? Math.round(total / matching.length) : 0;
      months.push({
        key: prefix,
        label: mDate.toLocaleDateString(undefined, { month: 'narrow' }),
        sublabel: `${mDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} (${matching.length}/${daysInMonth} days)`,
        value: avg,
        goalMet: avg >= dailyGoal,
      });
    }
    return months;
  }, [recordsByDate, selectedDateKey, dailyGoal, range]);

  const maxVal = useMemo(() => {
    const dataMax = Math.max(...bars.map((b) => b.value), 0);
    if (range === 'D') return Math.max(1000, dataMax);
    return Math.max(dailyGoal * 1.15, dataMax * 1.1, 2000);
  }, [bars, dailyGoal, range]);

  const activeBar = bars.find((b) => b.key === activeBarKey) || null;
  const summaryTotal = bars.reduce((a, b) => a + b.value, 0);
  const nonZeroCount = bars.filter((b) => b.value > 0).length;
  const summaryAvg = nonZeroCount > 0 ? Math.round(summaryTotal / nonZeroCount) : 0;

  const goalLinePct = range !== 'D' ? Math.min(96, Math.max(4, (dailyGoal / maxVal) * 100)) : null;

  return (
    <div>
      {showRangeSelector && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="grid grid-cols-5 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 w-full max-w-xs">
            {RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveBarKey(null);
                  onRangeChange(item.id);
                }}
                className={`rounded-lg py-1.5 text-xs font-semibold transition-colors min-h-[36px] ${
                  range === item.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {range === 'D' ? 'Day Total' : range === '6M' || range === 'Y' ? 'Daily Average' : 'Active Avg'}
            </p>
            <p className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
              {(range === 'D' ? summaryTotal : summaryAvg).toLocaleString()} steps
            </p>
          </div>
        </div>
      )}

      {/* Selected bar readout */}
      <div className="mb-3 flex items-baseline justify-between min-h-[24px]">
        {activeBar ? (
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-bold text-[#FF5A36] tabular-nums">
              {activeBar.value.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              steps · {activeBar.sublabel}
            </span>
          </div>
        ) : (
          <div className="flex items-baseline gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {range === 'D'
                ? 'Hourly step distribution'
                : range === 'W'
                  ? '7-day daily step count'
                  : range === 'M'
                    ? '30-day step cadence'
                    : range === '6M'
                      ? '26-week daily average'
                      : '12-month daily average'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Goal {dailyGoal.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Bar chart area */}
      <div className="relative h-48 pt-2 pb-6 select-none">
        {/* Horizontal reference gridlines */}
        <div className="pointer-events-none absolute inset-x-0 top-2 bottom-6 flex flex-col justify-between">
          <div className="border-t border-dashed border-slate-200 dark:border-slate-800 relative">
            <span className="absolute -top-2.5 right-0 font-mono text-[10px] text-slate-400 tabular-nums">
              {Math.round(maxVal).toLocaleString()}
            </span>
          </div>
          <div className="border-t border-dashed border-slate-200 dark:border-slate-800 relative">
            <span className="absolute -top-2.5 right-0 font-mono text-[10px] text-slate-400 tabular-nums">
              {Math.round(maxVal / 2).toLocaleString()}
            </span>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-800" />
        </div>

        {/* Goal target line for W/M/6M/Y */}
        {goalLinePct !== null && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-emerald-500/70 z-10"
            style={{ bottom: `calc(24px + ${goalLinePct}% * 0.85)` }}
          >
            <span className="absolute -top-4 left-0 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-white/90 dark:bg-[#14161B]/90 px-1 rounded">
              Goal
            </span>
          </div>
        )}

        <div
          className="relative z-10 grid h-full items-end gap-1"
          style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
        >
          {bars.map((bar) => {
            const pct = bar.value > 0 ? Math.max(4, Math.min(100, (bar.value / maxVal) * 100)) : 2;
            const isSelected = activeBarKey === bar.key;
            return (
              <button
                key={bar.key}
                type="button"
                onClick={() => setActiveBarKey(isSelected ? null : bar.key)}
                onMouseEnter={() => setActiveBarKey(bar.key)}
                className="group relative flex h-full flex-col items-center justify-end focus:outline-none"
                aria-label={`${bar.sublabel}: ${bar.value.toLocaleString()} steps`}
              >
                <div
                  className={`w-full max-w-[18px] rounded-t-md transition-all duration-200 ${
                    bar.value === 0
                      ? 'bg-slate-200/70 dark:bg-slate-800/70'
                      : isSelected
                        ? 'bg-[#FF5A36] ring-2 ring-[#FF5A36]/30'
                        : bar.goalMet
                          ? 'bg-emerald-500 dark:bg-emerald-400'
                          : 'bg-[#FF5A36]/85 group-hover:bg-[#FF5A36]'
                  }`}
                  style={{ height: `${pct}%` }}
                />
                {bar.label && (
                  <span className="absolute -bottom-5 text-[10px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
                    {bar.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
