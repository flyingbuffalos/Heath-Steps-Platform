import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { Activity, BarChart3, Footprints, Plus, User as UserIcon } from 'lucide-react';
import { AuthView } from './components/AuthView';
import { LogStepsModal } from './components/LogStepsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ProfileView } from './components/ProfileView';
import { SensorView } from './components/SensorView';
import { SummaryView } from './components/SummaryView';
import { TrendsView } from './components/TrendsView';
import { useStepSensor } from './hooks/useStepSensor';
import { auth, googleProvider } from './lib/firebase';
import { ImportedDailySteps, toLocalDateKey } from './lib/healthCalculations';
import {
  addStepsToDay,
  deleteStepSession,
  ensureUserProfile,
  importDailyStepRecords,
  subscribeToDailySteps,
  subscribeToStepSessions,
  subscribeToUserProfile,
  updateUserProfileSettings,
} from './services/firestoreSteps';
import { AppTab, DailyStepRecord, StepSession, UserProfile } from './types/health';

const NAV_TABS: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'summary', label: 'Summary', icon: Footprints },
  { id: 'trends', label: 'Trends', icon: BarChart3 },
  { id: 'sensor', label: 'Pedometer', icon: Activity },
  { id: 'profile', label: 'Profile', icon: UserIcon },
];

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [records, setRecords] = useState<DailyStepRecord[]>([]);
  const [sessions, setSessions] = useState<StepSession[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AppTab>('summary');
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => toLocalDateKey(new Date()));
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('stridepulse_theme') === 'dark';
  });

  const sensor = useStepSensor();

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('stridepulse_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('stridepulse_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const prof = await ensureUserProfile(user);
          setProfile(prof);
          setDataError(null);
        } catch (err) {
          setDataError(err instanceof Error ? err.message : 'Unable to initialize user profile.');
        }
      } else {
        setProfile(null);
        setRecords([]);
        setSessions([]);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const unsubProfile = subscribeToUserProfile(firebaseUser.uid, (prof) => {
      if (prof) setProfile(prof);
    });
    const unsubSteps = subscribeToDailySteps(firebaseUser.uid, (items) => {
      setRecords(items);
    });
    const unsubSessions = subscribeToStepSessions(firebaseUser.uid, (items) => {
      setSessions(items);
    });

    return () => {
      unsubProfile();
      unsubSteps();
      unsubSessions();
    };
  }, [authReady, firebaseUser]);

  const recordsByDate = useMemo(() => {
    const map: Record<string, DailyStepRecord> = {};
    for (const r of records) {
      map[r.date] = r;
    }
    return map;
  }, [records]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Sign-in was cancelled or blocked. Please allow popups and try again.'
      );
    }
  };

  const handleSignOut = async () => {
    sensor.stopTracking();
    await signOut(auth);
  };

  const handleManualLog = async (payload: {
    dateKey: string;
    hourIndex: number;
    steps: number;
    durationSeconds: number;
    avgCadenceSpm: number;
    note: string;
  }) => {
    if (!firebaseUser || !profile) return;
    await addStepsToDay({
      uid: firebaseUser.uid,
      profile,
      dateKey: payload.dateKey,
      hourIndex: payload.hourIndex,
      stepsToAdd: payload.steps,
      durationSeconds: payload.durationSeconds,
      avgCadenceSpm: payload.avgCadenceSpm,
      source: 'manual',
      note: payload.note,
    });
    setSelectedDateKey(payload.dateKey);
  };

  const handleSaveSensorSession = async (payload: {
    steps: number;
    durationSeconds: number;
    avgCadenceSpm: number;
    note: string;
  }) => {
    if (!firebaseUser || !profile) return;
    const now = new Date();
    const todayKey = toLocalDateKey(now);
    await addStepsToDay({
      uid: firebaseUser.uid,
      profile,
      dateKey: todayKey,
      hourIndex: now.getHours(),
      stepsToAdd: payload.steps,
      durationSeconds: payload.durationSeconds,
      avgCadenceSpm: payload.avgCadenceSpm,
      source: 'pedometer',
      note: payload.note,
    });
    setSelectedDateKey(todayKey);
  };

  const handleImportRecords = async (imported: ImportedDailySteps[]) => {
    if (!firebaseUser || !profile) return 0;
    return importDailyStepRecords(firebaseUser.uid, profile, imported);
  };

  const handleDeleteSession = async (session: StepSession) => {
    if (!firebaseUser) return;
    await deleteStepSession(firebaseUser.uid, session);
  };

  const handleUpdateProfile = async (updates: Parameters<typeof updateUserProfileSettings>[1]) => {
    if (!firebaseUser) return;
    await updateUserProfileSettings(firebaseUser.uid, updates);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0A0B0E] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-xl bg-[#FF5A36] flex items-center justify-center text-white font-display font-bold">
            S
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Loading StridePulse...
          </p>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !profile) {
    return (
      <>
        <AuthView onSignIn={handleSignIn} authError={authError} />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0A0B0E] pb-24 lg:pb-12">
      {/* Sticky Top Bar (3-zone contract on desktop, compact bar on mobile) */}
      <header className="sticky top-0 z-30 pt-safe bg-[#F5F5F7]/90 dark:bg-[#0A0B0E]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="mx-auto flex h-14 lg:h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
          {/* Zone 1: Brand wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            StridePulse
          </button>

          {/* Zone 2: Desktop single-line nav links */}
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-6">
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                    isActive
                      ? 'border-[#FF5A36] text-slate-900 dark:text-white font-semibold'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsLogModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-slate-900 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Walk</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {dataError && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300"
          >
            {dataError}
          </div>
        )}

        {activeTab === 'summary' && (
          <SummaryView
            profile={profile}
            recordsByDate={recordsByDate}
            sessions={sessions}
            selectedDateKey={selectedDateKey}
            onSelectDateKey={setSelectedDateKey}
            onOpenLogModal={() => setIsLogModalOpen(true)}
            onGoToSensor={() => setActiveTab('sensor')}
            onGoToTrends={() => setActiveTab('trends')}
            onDeleteSession={handleDeleteSession}
            isSensorTracking={sensor.isTracking}
            liveSessionSteps={sensor.sessionSteps}
          />
        )}

        {activeTab === 'trends' && (
          <TrendsView
            profile={profile}
            records={records}
            recordsByDate={recordsByDate}
            selectedDateKey={selectedDateKey}
            onSelectDate={(dateKey) => {
              setSelectedDateKey(dateKey);
              setActiveTab('summary');
            }}
            onImportRecords={handleImportRecords}
          />
        )}

        {activeTab === 'sensor' && (
          <SensorView
            profile={profile}
            sensor={sensor}
            onSaveSession={handleSaveSensorSession}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={profile}
            isDark={isDark}
            onToggleDark={() => setIsDark((prev) => !prev)}
            onUpdateProfile={handleUpdateProfile}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Tab Bar (Thumb-Zone Ergonomics for iOS & Android) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#14161B]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-4 items-center h-14">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                  isActive
                    ? 'text-[#FF5A36]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="mt-0.5 text-[10px] font-semibold tracking-tight">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <LogStepsModal
        isOpen={isLogModalOpen}
        initialDateKey={selectedDateKey}
        profile={profile}
        onClose={() => setIsLogModalOpen(false)}
        onSave={handleManualLog}
      />

      <OfflineIndicator />
    </div>
  );
}
