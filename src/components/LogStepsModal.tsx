import React, { useState } from 'react';
import { X, Footprints } from 'lucide-react';
import {
  calculateActiveCalories,
  calculateDistanceMeters,
  formatDistance,
  toLocalDateKey,
} from '../lib/healthCalculations';
import { BLUEPRINT_LIMITS, UserProfile } from '../types/health';

interface LogStepsModalProps {
  isOpen: boolean;
  initialDateKey: string;
  profile: UserProfile;
  onClose: () => void;
  onSave: (payload: {
    dateKey: string;
    hourIndex: number;
    steps: number;
    durationSeconds: number;
    avgCadenceSpm: number;
    note: string;
  }) => Promise<void>;
}

const QUICK_PRESETS = [
  { label: '+1,000', steps: 1000, mins: 10 },
  { label: '+2,500', steps: 2500, mins: 24 },
  { label: '+5,000', steps: 5000, mins: 46 },
];

export const LogStepsModal: React.FC<LogStepsModalProps> = ({
  isOpen,
  initialDateKey,
  profile,
  onClose,
  onSave,
}) => {
  const [dateKey, setDateKey] = useState(initialDateKey);
  const [stepsInput, setStepsInput] = useState('2500');
  const [minutesInput, setMinutesInput] = useState('24');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const stepsNum = Math.min(
    BLUEPRINT_LIMITS.SESSION_STEPS_MAX,
    Math.max(0, Math.round(Number(stepsInput) || 0))
  );
  const minsNum = Math.min(1440, Math.max(1, Math.round(Number(minutesInput) || 1)));
  const cadenceSpm = stepsNum > 0 ? Math.min(260, Math.max(40, Math.round(stepsNum / minsNum))) : 105;
  const previewMeters = calculateDistanceMeters(stepsNum, profile.strideLengthCm);
  const previewDist = formatDistance(previewMeters, profile.unitSystem);
  const previewKcal = calculateActiveCalories(stepsNum, profile.weightKg, cadenceSpm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stepsNum < 1) {
      setError('Enter at least 1 step to log.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const now = new Date();
      await onSave({
        dateKey: dateKey || toLocalDateKey(now),
        hourIndex: now.getHours(),
        steps: stepsNum,
        durationSeconds: minsNum * 60,
        avgCadenceSpm: cadenceSpm,
        note: note.trim() || 'Logged walk',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save activity.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-steps-title"
    >
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#14161B] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF5A36]/10 text-[#FF5A36]">
              <Footprints className="h-4 w-4" />
            </div>
            <div>
              <h2 id="log-steps-title" className="text-lg font-bold text-slate-900 dark:text-white">
                Log Steps
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Calibrated to {profile.strideLengthCm} cm stride
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="flex gap-2">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setStepsInput(String(preset.steps));
                  setMinutesInput(String(preset.mins));
                }}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-[#FF5A36] hover:text-[#FF5A36] transition-colors min-h-[40px]"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="log-steps-count" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Step count
              </label>
              <input
                id="log-steps-count"
                type="number"
                min={1}
                max={BLUEPRINT_LIMITS.SESSION_STEPS_MAX}
                value={stepsInput}
                onChange={(e) => setStepsInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 font-mono text-sm font-semibold text-slate-900 dark:text-white focus:border-[#FF5A36] focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="log-steps-duration" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Duration (min)
              </label>
              <input
                id="log-steps-duration"
                type="number"
                min={1}
                max={1440}
                value={minutesInput}
                onChange={(e) => setMinutesInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 font-mono text-sm font-semibold text-slate-900 dark:text-white focus:border-[#FF5A36] focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="log-steps-date" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Date
              </label>
              <input
                id="log-steps-date"
                type="date"
                max={toLocalDateKey(new Date())}
                value={dateKey}
                onChange={(e) => setDateKey(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FF5A36] focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="log-steps-note" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Activity label
              </label>
              <input
                id="log-steps-note"
                type="text"
                maxLength={BLUEPRINT_LIMITS.NOTE_MAX}
                placeholder="Morning walk"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FF5A36] focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-900/70 px-4 py-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Est. Distance</span>
              <p className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                {previewDist.value} {previewDist.unit}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Active Energy</span>
              <p className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                {previewKcal} kcal
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Cadence</span>
              <p className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                {cadenceSpm} spm
              </p>
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-[#FF5A36] py-3 text-sm font-semibold text-white hover:bg-[#e84b28] disabled:opacity-60 transition-colors min-h-[44px]"
            >
              {submitting ? 'Saving...' : 'Add Steps'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
