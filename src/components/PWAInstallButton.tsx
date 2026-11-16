import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="flex items-center justify-between py-2 text-sm text-slate-600 dark:text-slate-300">
          <span>Installed as standalone app</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">Active</span>
        </div>
      );
    }
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={handleAction}
          className="inline-flex items-center gap-2 rounded-xl bg-[#FF5A36] px-4 py-2 text-xs font-semibold text-white transition-transform hover:bg-[#e84b28] active:scale-[0.98] whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <Download className="h-3.5 w-3.5" />
          <span>{isIOS ? 'Add to iPhone' : 'Install App'}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleAction}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[48px]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF5A36]/10 text-[#FF5A36]">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isInstallable ? 'Install StridePulse App' : isIOS ? 'Install on iPhone / iPad' : 'Install on Android & iOS'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Works offline with home screen launch and motion tracking
              </p>
            </div>
          </div>
          <Download className="h-4 w-4 text-slate-400 shrink-0" />
        </button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#14161B] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="pwa-guide-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  Install on iOS & Android
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Run StridePulse like a native health app with full-screen launch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close install instructions"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-xs font-semibold text-[#FF5A36]">iPhone & iPad (Safari)</p>
                <ol className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <Share className="h-4 w-4 shrink-0 text-slate-500" />
                    <span>Tap the <strong>Share</strong> button in Safari&apos;s toolbar.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <PlusSquare className="h-4 w-4 shrink-0 text-slate-500" />
                    <span>Scroll down and select <strong>Add to Home Screen</strong>.</span>
                  </li>
                </ol>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-xs font-semibold text-[#FF5A36]">Android (Chrome / Edge)</p>
                <ol className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <Download className="h-4 w-4 shrink-0 text-slate-500" />
                    <span>Open the browser menu and tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span>
                  </li>
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-slate-900 dark:bg-white py-3 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 transition-opacity min-h-[44px]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
