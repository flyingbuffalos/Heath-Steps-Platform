import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  calculateActiveCalories,
  calculateActiveMinutes,
  calculateDefaultStrideCm,
  calculateDistanceMeters,
  createEmptyHourlyArray,
  ImportedDailySteps,
} from '../lib/healthCalculations';
import {
  BLUEPRINT_LIMITS,
  DailyStepRecord,
  SessionSource,
  StepSession,
  UnitSystem,
  UserProfile,
} from '../types/health';

function clampNumber(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, Math.round(val)));
}

function sanitizeNote(note: string): string {
  return note.trim().slice(0, BLUEPRINT_LIMITS.NOTE_MAX);
}

function sanitizeDisplayName(name: string | null | undefined, email: string | null | undefined): string {
  const base = (name || email?.split('@')[0] || 'Walker').trim();
  return base.slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || 'Walker';
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const userPath = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    const defaultHeight = 172;
    const defaultWeight = 70;
    const defaultProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
      createdAt: ReturnType<typeof serverTimestamp>;
      updatedAt: ReturnType<typeof serverTimestamp>;
    } = {
      uid: user.uid,
      displayName: sanitizeDisplayName(user.displayName, user.email),
      email: (user.email || '').slice(0, BLUEPRINT_LIMITS.EMAIL_MAX),
      ...(user.photoURL ? { photoURL: user.photoURL.slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX) } : {}),
      dailyGoal: 10000,
      heightCm: defaultHeight,
      weightKg: defaultWeight,
      strideLengthCm: calculateDefaultStrideCm(defaultHeight),
      unitSystem: 'metric',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, defaultProfile);
    const createdSnap = await getDoc(ref);
    return createdSnap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function updateUserProfileSettings(
  uid: string,
  updates: {
    displayName?: string;
    dailyGoal?: number;
    heightCm?: number;
    weightKg?: number;
    strideLengthCm?: number;
    unitSystem?: UnitSystem;
  }
): Promise<void> {
  const userPath = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.displayName !== undefined) {
    payload.displayName = updates.displayName.trim().slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX) || 'Walker';
  }
  if (updates.dailyGoal !== undefined) {
    payload.dailyGoal = clampNumber(updates.dailyGoal, BLUEPRINT_LIMITS.GOAL_MIN, BLUEPRINT_LIMITS.GOAL_MAX);
  }
  if (updates.heightCm !== undefined) {
    payload.heightCm = clampNumber(updates.heightCm, BLUEPRINT_LIMITS.HEIGHT_MIN, BLUEPRINT_LIMITS.HEIGHT_MAX);
  }
  if (updates.weightKg !== undefined) {
    payload.weightKg = clampNumber(updates.weightKg, BLUEPRINT_LIMITS.WEIGHT_MIN, BLUEPRINT_LIMITS.WEIGHT_MAX);
  }
  if (updates.strideLengthCm !== undefined) {
    payload.strideLengthCm = clampNumber(updates.strideLengthCm, BLUEPRINT_LIMITS.STRIDE_MIN, BLUEPRINT_LIMITS.STRIDE_MAX);
  }
  if (updates.unitSystem !== undefined) {
    payload.unitSystem = updates.unitSystem;
  }

  try {
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export function subscribeToUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void
): () => void {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserProfile) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToDailySteps(
  uid: string,
  onData: (records: DailyStepRecord[]) => void
): () => void {
  const path = `users/${uid}/dailySteps`;
  const q = query(
    collection(db, 'users', uid, 'dailySteps'),
    where('uid', '==', uid),
    orderBy('date', 'desc'),
    limit(365)
  );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as DailyStepRecord);
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToStepSessions(
  uid: string,
  onData: (sessions: StepSession[]) => void
): () => void {
  const path = `users/${uid}/stepSessions`;
  const q = query(
    collection(db, 'users', uid, 'stepSessions'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(60)
  );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<StepSession, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function addStepsToDay(params: {
  uid: string;
  profile: UserProfile;
  dateKey: string;
  hourIndex: number;
  stepsToAdd: number;
  durationSeconds: number;
  avgCadenceSpm: number;
  source: SessionSource;
  note: string;
  createSessionLog?: boolean;
}): Promise<void> {
  const {
    uid,
    profile,
    dateKey,
    hourIndex,
    stepsToAdd,
    durationSeconds,
    avgCadenceSpm,
    source,
    note,
    createSessionLog = true,
  } = params;

  const safeAdded = clampNumber(stepsToAdd, 1, BLUEPRINT_LIMITS.SESSION_STEPS_MAX);
  const safeHour = Math.min(23, Math.max(0, hourIndex));
  const dayPath = `users/${uid}/dailySteps/${dateKey}`;
  const dayRef = doc(db, 'users', uid, 'dailySteps', dateKey);

  try {
    const existingSnap = await getDoc(dayRef);
    const batch = writeBatch(db);

    if (existingSnap.exists()) {
      const existingData = existingSnap.data() as DailyStepRecord;
      const nextHourly = Array.isArray(existingData.hourlySteps) && existingData.hourlySteps.length === 24
        ? [...existingData.hourlySteps]
        : createEmptyHourlyArray();
      nextHourly[safeHour] = clampNumber(nextHourly[safeHour] + safeAdded, 0, BLUEPRINT_LIMITS.DAILY_STEPS_MAX);

      const nextSteps = clampNumber(existingData.steps + safeAdded, 0, BLUEPRINT_LIMITS.DAILY_STEPS_MAX);
      const nextDistance = calculateDistanceMeters(nextSteps, profile.strideLengthCm);
      const nextCalories = calculateActiveCalories(nextSteps, profile.weightKg, avgCadenceSpm || 105);
      const nextMinutes = calculateActiveMinutes(nextSteps, avgCadenceSpm || 105);
      const nextFlights = clampNumber(Math.floor(nextSteps / 2200), 0, BLUEPRINT_LIMITS.FLIGHTS_MAX);

      const mappedSource =
        existingData.source === 'sensor' && source === 'manual'
          ? 'hybrid'
          : existingData.source === 'manual' && source === 'pedometer'
            ? 'hybrid'
            : existingData.source;

      batch.update(dayRef, {
        steps: nextSteps,
        goal: clampNumber(profile.dailyGoal, BLUEPRINT_LIMITS.GOAL_MIN, BLUEPRINT_LIMITS.GOAL_MAX),
        distanceMeters: nextDistance,
        calories: nextCalories,
        activeMinutes: nextMinutes,
        flightsClimbed: nextFlights,
        hourlySteps: nextHourly,
        source: mappedSource,
        updatedAt: serverTimestamp(),
      });
    } else {
      const hourly = createEmptyHourlyArray();
      hourly[safeHour] = safeAdded;

      const daySource = source === 'pedometer' ? 'sensor' : source === 'apple_health_import' ? 'import' : 'manual';
      batch.set(dayRef, {
        uid,
        date: dateKey,
        steps: safeAdded,
        goal: clampNumber(profile.dailyGoal, BLUEPRINT_LIMITS.GOAL_MIN, BLUEPRINT_LIMITS.GOAL_MAX),
        distanceMeters: calculateDistanceMeters(safeAdded, profile.strideLengthCm),
        calories: calculateActiveCalories(safeAdded, profile.weightKg, avgCadenceSpm || 105),
        activeMinutes: calculateActiveMinutes(safeAdded, avgCadenceSpm || 105),
        flightsClimbed: clampNumber(Math.floor(safeAdded / 2200), 0, BLUEPRINT_LIMITS.FLIGHTS_MAX),
        hourlySteps: hourly,
        source: daySource,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    if (createSessionLog) {
      const sessionId = `ses_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const sessionRef = doc(db, 'users', uid, 'stepSessions', sessionId);
      batch.set(sessionRef, {
        uid,
        date: dateKey,
        steps: safeAdded,
        durationSeconds: clampNumber(durationSeconds, 0, 86400),
        distanceMeters: calculateDistanceMeters(safeAdded, profile.strideLengthCm),
        calories: calculateActiveCalories(safeAdded, profile.weightKg, avgCadenceSpm || 105),
        avgCadenceSpm: clampNumber(avgCadenceSpm, 0, 300),
        source,
        note: sanitizeNote(note),
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, dayPath);
  }
}

export async function importDailyStepRecords(
  uid: string,
  profile: UserProfile,
  imported: ImportedDailySteps[]
): Promise<number> {
  const recentSlice = imported.slice(-90);
  let count = 0;

  for (const item of recentSlice) {
    if (!BLUEPRINT_LIMITS.DATE_PATTERN.test(item.date)) continue;
    const dayPath = `users/${uid}/dailySteps/${item.date}`;
    const dayRef = doc(db, 'users', uid, 'dailySteps', item.date);

    try {
      const existingSnap = await getDoc(dayRef);
      const safeHourly =
        item.hourlySteps.length === 24
          ? item.hourlySteps.map((h) => clampNumber(h, 0, BLUEPRINT_LIMITS.DAILY_STEPS_MAX))
          : createEmptyHourlyArray();
      const safeSteps = clampNumber(item.steps, 0, BLUEPRINT_LIMITS.DAILY_STEPS_MAX);

      if (existingSnap.exists()) {
        await updateDoc(dayRef, {
          steps: safeSteps,
          goal: clampNumber(profile.dailyGoal, BLUEPRINT_LIMITS.GOAL_MIN, BLUEPRINT_LIMITS.GOAL_MAX),
          distanceMeters: calculateDistanceMeters(safeSteps, profile.strideLengthCm),
          calories: calculateActiveCalories(safeSteps, profile.weightKg, 105),
          activeMinutes: calculateActiveMinutes(safeSteps, 105),
          flightsClimbed: clampNumber(Math.floor(safeSteps / 2200), 0, BLUEPRINT_LIMITS.FLIGHTS_MAX),
          hourlySteps: safeHourly,
          source: 'import',
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(dayRef, {
          uid,
          date: item.date,
          steps: safeSteps,
          goal: clampNumber(profile.dailyGoal, BLUEPRINT_LIMITS.GOAL_MIN, BLUEPRINT_LIMITS.GOAL_MAX),
          distanceMeters: calculateDistanceMeters(safeSteps, profile.strideLengthCm),
          calories: calculateActiveCalories(safeSteps, profile.weightKg, 105),
          activeMinutes: calculateActiveMinutes(safeSteps, 105),
          flightsClimbed: clampNumber(Math.floor(safeSteps / 2200), 0, BLUEPRINT_LIMITS.FLIGHTS_MAX),
          hourlySteps: safeHourly,
          source: 'import',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      count++;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, dayPath);
    }
  }

  return count;
}

export async function deleteStepSession(uid: string, session: StepSession): Promise<void> {
  const sessionPath = `users/${uid}/stepSessions/${session.id}`;
  const sessionRef = doc(db, 'users', uid, 'stepSessions', session.id);

  try {
    await deleteDoc(sessionRef);

    // Adjust the parent daily record if it exists
    const dayRef = doc(db, 'users', uid, 'dailySteps', session.date);
    const daySnap = await getDoc(dayRef);
    if (daySnap.exists()) {
      const dayData = daySnap.data() as DailyStepRecord;
      const nextSteps = Math.max(0, dayData.steps - session.steps);
      const ratio = dayData.steps > 0 ? nextSteps / dayData.steps : 0;
      const nextHourly = dayData.hourlySteps.map((v) => Math.max(0, Math.round(v * ratio)));
      const diff = nextSteps - nextHourly.reduce((a, b) => a + b, 0);
      if (diff !== 0 && nextHourly.length === 24) {
        nextHourly[12] = Math.max(0, nextHourly[12] + diff);
      }

      await updateDoc(dayRef, {
        steps: nextSteps,
        distanceMeters: Math.max(0, Math.round(dayData.distanceMeters * ratio)),
        calories: Math.max(0, Math.round(dayData.calories * ratio)),
        activeMinutes: Math.max(0, Math.round(dayData.activeMinutes * ratio)),
        flightsClimbed: Math.floor(nextSteps / 2200),
        hourlySteps: nextHourly,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, sessionPath);
  }
}
