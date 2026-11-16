import React, { useState } from 'react';
import { Play, Square, RotateCcw, Save, Smartphone, Footprints } from 'lucide-react';
import {
  calculateActiveCalories,
  calculateDistanceMeters,
  formatDistance,
} from '../lib/healthCalculations';
import { StepSensorState } from '../hooks/useStepSensor';
import { UserProfile } from '../types/health';

interface SensorViewProps {
  profile: UserProfile;
  sensor: StepSensorState & {
    startSensor: () => Promise<boolean>;
    stopTracking: () => void;
    startWalkTestSimulation: (cadenceSpm?: number) => void;
    resetSession: () => void;
  };
  onSaveSession: (payload: {
    steps: number;
    durationSeconds: number;
    avgCadenceSpm: number;
    note: string;
  }) => Promise<void>;
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const SensorView: React.FC<SensorViewProps> = ({
  profile,
  sensor,
  onSaveSession,
}) => {
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [sessionNote, setSessionNote] = useState('Live Walk');

  const distMeters = calculateDistanceMeters(sensor.sessionSteps, profile.strideLengthCm);
  const distDisplay = formatDistance(distMeters, profile.unitSystem);
  const kcal = calculateActiveCalories(sensor.sessionSteps, profile.weightKg, sensor.cadenceSpm || 105);
  const accelGaugePct = Math.min(100, Math.round((sensor.liveMagnitude / 6) * 100));

  const handleSave = async () => {
    if (sensor.sessionSteps < 1) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await onSaveSession({
        steps: sensor.sessionSteps,
        durationSeconds: sensor.elapsedSeconds,
        avgCadenceSpm: sensor.cadenceSpm || 105,
        note: sessionNote.trim() || 'Live Walk',
      });
      sensor.resetSession();
      setSaveMessage('Walk saved to your daily step ring and cloud history.');
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Unable to save session.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
      {/* Primary Pedometer Console */}
      <section className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              iOS & Android Motion Accelerometer
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-bold text-slate-900 dark:text-white">
              Live Pedometer
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span
              className={`h-2 w-2 rounded-full ${
                sensor.isTracking ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            />
            <span>
              {sensor.isTracking
                ? sensor.isSimulating
                  ? 'Walk Test Active'
                  : 'Sensor Active'
                : 'Standby'}
            </span>
          </div>
        </div>

        {/* Big Live Step Readout */}
        <div className="my-8 rounded-2xl bg-slate-50 dark:bg-slate-900/70 p-6 text-center border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Session Steps</p>
          <p className="mt-1 font-mono text-6xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {sensor.sessionSteps.toLocaleString()}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-200/70 dark:border-slate-800 pt-4">
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Duration</p>
              <p className="mt-0.5 font-mono text-base font-bold text-slate-900 dark:text-white tabular-nums">
                {formatDuration(sensor.elapsedSeconds)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Cadence</p>
              <p className="mt-0.5 font-mono text-base font-bold text-slate-900 dark:text-white tabular-nums">
                {sensor.cadenceSpm} <span className="text-xs font-normal text-slate-500">spm</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Distance</p>
              <p className="mt-0.5 font-mono text-base font-bold text-slate-900 dark:text-white tabular-nums">
                {distDisplay.value} <span className="text-xs font-normal text-slate-500">{distDisplay.unit}</span>
              </p>
            </div>
          </div>

          {/* Real-time Acceleration Magnitude Meter */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
              <span>Linear Gait Acceleration</span>
              <span className="font-mono tabular-nums">{sensor.liveMagnitude.toFixed(2)} m/s² · {kcal} kcal</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-[#FF5A36] transition-all duration-150"
                style={{ width: `${accelGaugePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {!sensor.isTracking ? (
              <button
                type="button"
                onClick={sensor.startSensor}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF5A36] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#e84b28] active:scale-[0.98] transition-all min-h-[48px]"
              >
                <Play className="h-4 w-4" />
                <span>Start Motion Pedometer</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={sensor.stopTracking}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-5 py-3.5 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 active:scale-[0.98] transition-all min-h-[48px]"
              >
                <Square className="h-4 w-4" />
                <span>Pause Sensor</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => sensor.startWalkTestSimulation(114)}
              disabled={sensor.isTracking && sensor.isSimulating}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 min-h-[48px]"
            >
              <Footprints className="h-4 w-4" />
              <span>Walk Test (Desktop)</span>
            </button>

            <button
              type="button"
              onClick={sensor.resetSession}
              disabled={sensor.sessionSteps === 0 && sensor.elapsedSeconds === 0}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 min-h-[48px]"
              aria-label="Reset session counter"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Save Session Form */}
          {sensor.sessionSteps > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <input
                type="text"
                maxLength={140}
                value={sessionNote}
                onChange={(e) => setSessionNote(e.target.value)}
                placeholder="Session note (e.g. Evening walk)"
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FF5A36] focus:outline-none min-h-[44px]"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors min-h-[44px]"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : `Save ${sensor.sessionSteps.toLocaleString()} Steps`}</span>
              </button>
            </div>
          )}

          {sensor.errorMessage && (
            <p className="text-xs text-amber-600 dark:text-amber-400 pt-1" role="alert">
              {sensor.errorMessage}
            </p>
          )}
          {saveMessage && (
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 pt-1" role="status">
              {saveMessage}
            </p>
          )}
        </div>
      </section>

      {/* How Apple Health Calculation Works */}
      <aside className="lg:col-span-5 space-y-4 rounded-3xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-[#FF5A36]">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Apple Health Calculation Model
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cross-platform CoreMotion-style pipeline
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2 text-sm text-slate-600 dark:text-slate-400">
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <p className="font-semibold text-slate-900 dark:text-white">
              1. Gravity & Rhythmic Gait Filter
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              A low-pass filter separates Earth&apos;s gravity vector from linear acceleration. Steps only commit after 3 rhythmic peaks inside a 41–187 spm human gait window, preventing false pocket shakes.
            </p>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <p className="font-semibold text-slate-900 dark:text-white">
              2. Anthropometric Stride Length
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              Using your configured height ({profile.heightCm} cm) and calibrated stride ({profile.strideLengthCm} cm), distance adapts automatically as cadence rises from casual walking to brisk jogging.
            </p>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <p className="font-semibold text-slate-900 dark:text-white">
              3. iOS & Android Compatibility
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              On iPhone/iPad, tapping Start Motion Pedometer requests Safari&apos;s native iOS Motion & Fitness permission. On Android Chrome, hardware accelerometer tracking activates immediately.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
};
