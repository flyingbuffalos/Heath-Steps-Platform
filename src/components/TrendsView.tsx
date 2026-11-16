import React, { useMemo, useRef, useState } from 'react';
import { Calendar, Download, Upload, Award, CheckCircle2 } from 'lucide-react';
import {
  computeStreak,
  exportDailyRecordsToCsv,
  formatDateLabel,
  formatDistance,
  parseHealthImportFile,
} from '../lib/healthCalculations';
import { DailyStepRecord, TimeRange, UserProfile } from '../types/health';
import { StepCharts } from './StepCharts';

interface TrendsViewProps {
  profile: UserProfile;
  records: DailyStepRecord[];
  recordsByDate: Record<string, DailyStepRecord>;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  onImportRecords: (imported: ReturnType<typeof parseHealthImportFile>) => Promise<number>;
}

export const TrendsView: React.FC<TrendsViewProps> = ({
  profile,
  records,
  recordsByDate,
  selectedDateKey,
  onSelectDate,
  onImportRecords,
}) => {
  const [range, setRange] = useState<TimeRange>('W');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stats = useMemo(() => {
    const totalSteps = records.reduce((acc, r) => acc + r.steps, 0);
    const totalMeters = records.reduce((acc, r) => acc + r.distanceMeters, 0);
    const activeDays = records.filter((r) => r.steps > 0).length;
    const goalDays = records.filter((r) => r.steps >= (r.goal || profile.dailyGoal)).length;
    const avgSteps = activeDays > 0 ? Math.round(totalSteps / activeDays) : 0;
    const bestDay = records.reduce<DailyStepRecord | null>(
      (best, cur) => (!best || cur.steps > best.steps ? cur : best),
      null
    );
    const streak = computeStreak(recordsByDate, profile.dailyGoal);
    return { totalSteps, totalMeters, activeDays, goalDays, avgSteps, bestDay, streak };
  }, [records, recordsByDate, profile.dailyGoal]);

  const totalDist = formatDistance(stats.totalMeters, profile.unitSystem);

  const handleExportCsv = () => {
    const csv = exportDailyRecordsToCsv(records);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stridepulse-steps-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportStatus(null);
    try {
      const text = await file.text();
      const parsed = parseHealthImportFile(text);
      if (parsed.length === 0) {
        setImportStatus('No valid step records found. Upload Apple Health export.xml or a CSV (YYYY-MM-DD,steps).');
      } else {
        const savedCount = await onImportRecords(parsed);
        setImportStatus(`Imported ${savedCount} days of step history into your cloud archive.`);
      }
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : 'Failed to import file.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top KPI Row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Daily Average</p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {stats.avgSteps.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            Across {stats.activeDays} active days
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Lifetime Distance</p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {totalDist.value}
            <span className="ml-1 text-xs font-medium text-slate-500">{totalDist.unit}</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {stats.totalSteps.toLocaleString()} total steps
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Goal Streak</p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {stats.streak}
            <span className="ml-1 text-xs font-medium text-slate-500">days</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {stats.goalDays} goals hit overall
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Personal Best</p>
            <Award className="h-4 w-4 text-[#FF5A36]" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {stats.bestDay ? stats.bestDay.steps.toLocaleString() : '0'}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            {stats.bestDay ? stats.bestDay.date : 'No records yet'}
          </p>
        </div>
      </section>

      {/* Main Apple Health Range Chart */}
      <section className="rounded-3xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Step Trends & History
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Switch between Day, Week, Month, 6-Month, and Year cadences
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.csv,.txt"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              type="button"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px]"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{importing ? 'Importing...' : 'Import Apple Health / CSV'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={records.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 min-h-[40px]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {importStatus && (
          <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300">
            {importStatus}
          </div>
        )}

        <StepCharts
          recordsByDate={recordsByDate}
          selectedDateKey={selectedDateKey}
          dailyGoal={profile.dailyGoal}
          range={range}
          onRangeChange={setRange}
        />
      </section>

      {/* Complete Historical Daily Archive */}
      <section className="rounded-3xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Daily Step Archive
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select any day to inspect its 24-hour breakdown in Summary
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {records.length} {records.length === 1 ? 'day' : 'days'} stored
          </span>
        </div>

        {records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 px-6 py-10 text-center">
            <Calendar className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-700" />
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Your persistent step archive is ready
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Start walking with the live pedometer, log steps manually, or import an Apple Health export.xml / CSV file above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {records.map((rec) => {
              const dist = formatDistance(rec.distanceMeters, profile.unitSystem);
              const metGoal = rec.steps >= (rec.goal || profile.dailyGoal);
              const pct = Math.min(100, Math.round((rec.steps / (rec.goal || profile.dailyGoal)) * 100));

              return (
                <button
                  key={rec.date}
                  type="button"
                  onClick={() => onSelectDate(rec.date)}
                  className="flex w-full items-center justify-between gap-4 py-3.5 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40 px-2 -mx-2 rounded-xl transition-colors min-h-[56px]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {formatDateLabel(rec.date)}
                      </span>
                      {metGoal && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-label="Goal reached" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {rec.date} · {dist.value} {dist.unit} · {rec.calories} kcal · {rec.activeMinutes} min
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                      {rec.steps.toLocaleString()}
                    </p>
                    <p className={`font-mono text-xs tabular-nums ${metGoal ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {pct}% of goal
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
