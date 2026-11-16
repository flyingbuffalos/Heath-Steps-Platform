import React, { useState } from 'react';
import { LogOut, Moon, Sun, Check, Sliders } from 'lucide-react';
import { calculateDefaultStrideCm } from '../lib/healthCalculations';
import { BLUEPRINT_LIMITS, UnitSystem, UserProfile } from '../types/health';
import { PWAInstallButton } from './PWAInstallButton';

interface ProfileViewProps {
  profile: UserProfile;
  isDark: boolean;
  onToggleDark: () => void;
  onUpdateProfile: (updates: {
    displayName?: string;
    dailyGoal?: number;
    heightCm?: number;
    weightKg?: number;
    strideLengthCm?: number;
    unitSystem?: UnitSystem;
  }) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  isDark,
  onToggleDark,
  onUpdateProfile,
  onSignOut,
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [dailyGoal, setDailyGoal] = useState(String(profile.dailyGoal));
  const [heightCm, setHeightCm] = useState(String(profile.heightCm));
  const [weightKg, setWeightKg] = useState(String(profile.weightKg));
  const [strideLengthCm, setStrideLengthCm] = useState(String(profile.strideLengthCm));
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(profile.unitSystem);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const handleAutoStride = () => {
    const h = Number(heightCm) || profile.heightCm;
    setStrideLengthCm(String(calculateDefaultStrideCm(h)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedToast(false);
    try {
      await onUpdateProfile({
        displayName,
        dailyGoal: Number(dailyGoal) || 10000,
        heightCm: Number(heightCm) || 172,
        weightKg: Number(weightKg) || 70,
        strideLengthCm: Number(strideLengthCm) || 71,
        unitSystem,
      });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
      {/* Left: Account & Device App Card */}
      <div className="lg:col-span-5 space-y-6">
        <section className="rounded-3xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-6">
          <div className="flex items-center gap-4">
            {profile.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-800"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF5A36] text-white font-display text-xl font-bold">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-bold text-slate-900 dark:text-white">
                {profile.displayName}
              </h1>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {profile.email}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-5">
            <PWAInstallButton variant="card" />

            <button
              type="button"
              onClick={onToggleDark}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors min-h-[48px]"
            >
              <span className="flex items-center gap-2.5">
                {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-500" />}
                <span>{isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              </span>
              <span className="text-xs text-slate-400">{isDark ? 'Dark' : 'Light'}</span>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors min-h-[48px]"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </section>
      </div>

      {/* Right: Apple Health Biometric Calibration Form */}
      <section className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF5A36]/10 text-[#FF5A36]">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Biometric & Stride Calibration
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Used to compute distance, active calories, and daily targets
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-name" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Display Name
              </label>
              <input
                id="prof-name"
                type="text"
                maxLength={BLUEPRINT_LIMITS.DISPLAY_NAME_MAX}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#FF5A36] focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="prof-goal" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Daily Step Goal
              </label>
              <input
                id="prof-goal"
                type="number"
                min={BLUEPRINT_LIMITS.GOAL_MIN}
                max={BLUEPRINT_LIMITS.GOAL_MAX}
                step={500}
                value={dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 font-mono text-sm font-semibold text-slate-900 dark:text-white focus:border-[#FF5A36] focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="prof-height" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Height (cm)
              </label>
              <input
                id="prof-height"
                type="number"
                min={BLUEPRINT_LIMITS.HEIGHT_MIN}
                max={BLUEPRINT_LIMITS.HEIGHT_MAX}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 font-mono text-sm font-semibold text-slate-900 dark:text-white focus:border-[#FF5A36] focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="prof-weight" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Weight (kg)
              </label>
              <input
                id="prof-weight"
                type="number"
                min={BLUEPRINT_LIMITS.WEIGHT_MIN}
                max={BLUEPRINT_LIMITS.WEIGHT_MAX}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 font-mono text-sm font-semibold text-slate-900 dark:text-white focus:border-[#FF5A36] focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="prof-stride" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Stride (cm)
                </label>
                <button
                  type="button"
                  onClick={handleAutoStride}
                  className="text-[11px] font-semibold text-[#FF5A36] hover:underline"
                >
                  Auto-calc
                </button>
              </div>
              <input
                id="prof-stride"
                type="number"
                min={BLUEPRINT_LIMITS.STRIDE_MIN}
                max={BLUEPRINT_LIMITS.STRIDE_MAX}
                value={strideLengthCm}
                onChange={(e) => setStrideLengthCm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 font-mono text-sm font-semibold text-slate-900 dark:text-white focus:border-[#FF5A36] focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Distance Unit
            </span>
            <div className="grid grid-cols-2 gap-2 max-w-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1">
              <button
                type="button"
                onClick={() => setUnitSystem('metric')}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors min-h-[38px] ${
                  unitSystem === 'metric'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Metric (km)
              </button>
              <button
                type="button"
                onClick={() => setUnitSystem('imperial')}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors min-h-[38px] ${
                  unitSystem === 'imperial'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Imperial (mi)
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            {savedToast ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                Settings saved
              </span>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Synced to your account
              </span>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#FF5A36] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#e84b28] disabled:opacity-60 transition-colors min-h-[44px]"
            >
              {saving ? 'Saving...' : 'Save Calibration'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
