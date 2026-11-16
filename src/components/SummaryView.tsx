import React from 'react';
import {
  Activity,
  ChevronRight,
  Flame,
  Footprints,
  MapPin,
  Plus,
  Timer,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  computeStreak,
  formatDateLabel,
  formatDistance,
  getRecentDateKeys,
  parseDateKey,
  toLocalDateKey,
} from '../lib/healthCalculations';
import { DailyStepRecord, StepSession, UserProfile } from '../types/health';
import { StepCharts } from './StepCharts';
import { StepRing } from './StepRing';

interface SummaryViewProps {
  profile: UserProfile;
  recordsByDate: Record<string, DailyStepRecord>;
  sessions: StepSession[];
  selectedDateKey: string;
  onSelectDateKey: (dateKey: string) => void;
  onOpenLogModal: () => void;
  onGoToSensor: () => void;
  onGoToTrends: () => void;
  onDeleteSession: (session: StepSession) => Promise<void>;
  isSensorTracking: boolean;
  liveSessionSteps: number;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  profile,
  recordsByDate,
  sessions,
  selectedDateKey,
  onSelectDateKey,
  onOpenLogModal,
  onGoToSensor,
  onGoToTrends,
  onDeleteSession,
  isSensorTracking,
  liveSessionSteps,
}) => {
  const weekKeys = getRecentDateKeys(7);
  const todayKey = toLocalDateKey(new Date());
  const selectedRecord = recordsByDate[selectedDateKey];

  const baseSteps = selectedRecord?.steps || 0;
  const activeTodayPending = selectedDateKey === todayKey && isSensorTracking ? liveSessionSteps : 0;
  const displaySteps = baseSteps + activeTodayPending;
  const goal = selectedRecord?.goal || profile.dailyGoal;

  const distanceMeters = selectedRecord?.distanceMeters || Math.round((displaySteps * profile.strideLengthCm) / 100);
  const distDisplay = formatDistance(distanceMeters, profile.unitSystem);
  const calories = selectedRecord?.calories || Math.round(displaySteps * 0.04 * (profile.weightKg / 70));
  const activeMinutes = selectedRecord?.activeMinutes || (displaySteps > 0 ? Math.max(1, Math.round(displaySteps / 105)) : 0);
  const flights = selectedRecord?.flightsClimbed || Math.floor(displaySteps / 2200);
  const streakDays = computeStreak(recordsByDate, profile.dailyGoal);

  const daySessions = sessions.filter((s) => s.date === selectedDateKey);

  return (
    <div className="space-y-6">
      {/* Horizontal 7-Day Date Scroller */}
      <section aria-label="Select day" className="rounded-2xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-3">
        <div className="grid grid-cols-7 gap-1.5">
          {weekKeys.map((key) => {
            const d = parseDateKey(key);
            const isSelected = key === selectedDateKey;
            const rec = recordsByDate[key];
            const pct = rec ? Math.min(100, Math.round((rec.steps / (rec.goal || profile.dailyGoal)) * 100)) : 0;
            const metGoal = pct >= 100;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDateKey(key)}
                className={`flex flex-col items-center justify-center rounded-xl py-2 transition-colors min-h-[58px] ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className={`text-[11px] font-medium ${isSelected ? 'opacity-80' : 'text-slate-400 dark:text-slate-500'}`}>
                  {d.toLocaleDateString(undefined, { weekday: 'narrow' })}
                </span>
                <span className="mt-0.5 font-mono text-sm font-bold tabular-nums">
                  {d.getDate()}
                </span>
                <span
                  className={`mt-1 h-1 w-5 rounded-full ${
                    metGoal
                      ? 'bg-emerald-500'
                      : pct > 0
                        ? 'bg-[#FF5A36]'
                        : isSelected
                          ? 'bg-white/25 dark:bg-slate-900/25'
                          : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* Main 2-column Responsive Dashboard Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Hero Ring + Quick Actions */}
        <section className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {formatDateLabel(selectedDateKey)} · {selectedDateKey}
              </p>
              <h1 className="mt-0.5 font-display text-xl font-bold text-slate-900 dark:text-white">
                Step Activity
              </h1>
            </div>
            <button
              type="button"
              onClick={onOpenLogModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF5A36] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#e84b28] active:scale-[0.98] transition-all min-h-[40px]"
            >
              <Plus className="h-4 w-4" />
              <span>Log Steps</span>
            </button>
          </div>

          <div className="my-7 flex justify-center">
            <StepRing steps={displaySteps} goal={goal} size={224} strokeWidth={18} />
          </div>

          {/* Live Sensor Banner / Trigger */}
          <button
            type="button"
            onClick={onGoToSensor}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors min-h-[56px]"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isSensorTracking ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-[#FF5A36]/10 text-[#FF5A36]'}`}>
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isSensorTracking ? 'Live Pedometer Active' : 'Start Live Pedometer'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isSensorTracking
                    ? `${liveSessionSteps.toLocaleString()} unsaved live steps captured`
                    : 'Use iOS / Android motion sensor to count steps automatically'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
          </button>
        </section>

        {/* Right Column: Apple Health Metrics + 24-Hour Distribution */}
        <div className="lg:col-span-7 space-y-6">
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Distance</span>
                <MapPin className="h-4 w-4 text-[#FF5A36]" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {distDisplay.value}
                <span className="ml-1 text-xs font-medium text-slate-500">{distDisplay.unit}</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                {profile.strideLengthCm} cm stride
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Active Energy</span>
                <Flame className="h-4 w-4 text-[#FF5A36]" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {calories.toLocaleString()}
                <span className="ml-1 text-xs font-medium text-slate-500">kcal</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                {profile.weightKg} kg profile
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Move Time</span>
                <Timer className="h-4 w-4 text-[#FF5A36]" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {activeMinutes}
                <span className="ml-1 text-xs font-medium text-slate-500">min</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                Est. {flights} flights
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Goal Streak</span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {streakDays}
                <span className="ml-1 text-xs font-medium text-slate-500">days</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                Target {goal.toLocaleString()}
              </p>
            </div>
          </section>

          {/* Today's Hourly Chart */}
          <section className="rounded-3xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Hourly Activity
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tap or hover bars to inspect hourly step counts
                </p>
              </div>
              <button
                type="button"
                onClick={onGoToTrends}
                className="text-xs font-semibold text-[#FF5A36] hover:underline whitespace-nowrap"
              >
                All Trends
              </button>
            </div>

            <StepCharts
              recordsByDate={recordsByDate}
              selectedDateKey={selectedDateKey}
              dailyGoal={goal}
              range="D"
              onRangeChange={() => {}}
              showRangeSelector={false}
            />
          </section>
        </div>
      </div>

      {/* Recorded Sessions for Selected Date */}
      <section className="rounded-3xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Recorded Walks & Sessions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatDateLabel(selectedDateKey)} · {daySessions.length} {daySessions.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenLogModal}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#FF5A36] transition-colors"
          >
            + Add Entry
          </button>
        </div>

        {daySessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 px-6 py-8 text-center">
            <Footprints className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-700" />
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              No recorded sessions for {formatDateLabel(selectedDateKey)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Start the live pedometer while walking or tap Log Steps to add activity manually.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {daySessions.map((session) => {
              const dist = formatDistance(session.distanceMeters, profile.unitSystem);
              const mins = Math.max(1, Math.round(session.durationSeconds / 60));
              const timeStr = session.createdAt?.toDate
                ? session.createdAt.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                : '';

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-4 py-3.5 first:pt-1 last:pb-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-[#FF5A36]">
                      <Footprints className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {session.note || 'Walk Session'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {session.source === 'pedometer'
                          ? 'Motion Sensor'
                          : session.source === 'apple_health_import'
                            ? 'Apple Health Import'
                            : 'Manual Entry'}
                        {timeStr ? ` · ${timeStr}` : ''} · {mins} min · {session.avgCadenceSpm} spm
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                        {session.steps.toLocaleString()} steps
                      </p>
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {dist.value} {dist.unit} · {session.calories} kcal
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteSession(session)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                      aria-label={`Delete ${session.note || 'walk session'}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
