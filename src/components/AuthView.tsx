import React, { useState } from 'react';
import { Activity, BarChart3, ShieldCheck, Smartphone } from 'lucide-react';
import { StepRing } from './StepRing';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthViewProps {
  onSignIn: () => Promise<void>;
  authError: string | null;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSignIn, authError }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onSignIn();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0A0B0E] flex flex-col justify-between px-4 py-8 sm:px-6 lg:px-8">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF5A36] text-white font-display font-bold text-base">
            S
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            StridePulse
          </span>
        </div>
        <PWAInstallButton variant="header" />
      </header>

      <main className="mx-auto my-auto w-full max-w-5xl py-10">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-6">
            <p className="text-sm font-medium text-[#FF5A36]">
              Android · iOS · Web Cloud Sync
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white text-balance leading-[1.1]">
              Every step measured with Apple Health precision.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-400">
              Track daily steps using your phone&apos;s motion accelerometer, calculate stride-calibrated distance and active calories, and preserve your full history across Android, iOS, and desktop.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                type="button"
                onClick={handleClick}
                disabled={loading}
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-slate-900 dark:bg-white px-6 py-3.5 text-sm font-semibold text-white dark:text-slate-900 shadow-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60 min-h-[48px]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81"
                  />
                </svg>
                <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
              </button>
            </div>

            {authError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300"
              >
                {authError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Activity className="h-4 w-4 text-[#FF5A36]" />
                  <span>Gait-Filtered Sensor</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  4-step rhythmic cadence buffer filters pocket jitter on iOS and Android.
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <BarChart3 className="h-4 w-4 text-[#FF5A36]" />
                  <span>D · W · M · 6M · Y</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hourly breakdown and Apple Health XML / CSV import & export.
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <ShieldCheck className="h-4 w-4 text-[#FF5A36]" />
                  <span>Private History</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Encrypted cloud persistence tied strictly to your authenticated account.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-3xl bg-white dark:bg-[#14161B] border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Daily Activity Target</p>
                  <p className="font-display text-lg font-bold text-slate-900 dark:text-white">Today&apos;s Ring</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Smartphone className="h-4 w-4" />
                  <span>iOS & Android</span>
                </div>
              </div>

              <div className="my-6 flex justify-center">
                <StepRing steps={7840} goal={10000} size={200} strokeWidth={16} />
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Distance</p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    5.59 km
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    314 kcal
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Move Time</p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    74 min
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-5xl text-xs text-slate-500 dark:text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>StridePulse Cross-Platform Step Tracker</span>
        <span>Compatible with iOS Safari, Android Chrome & Desktop</span>
      </footer>
    </div>
  );
};
