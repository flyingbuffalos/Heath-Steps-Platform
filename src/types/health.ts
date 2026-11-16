import { Timestamp } from 'firebase/firestore';

export type UnitSystem = 'metric' | 'imperial';
export type StepSource = 'sensor' | 'manual' | 'import' | 'hybrid';
export type SessionSource = 'pedometer' | 'manual' | 'apple_health_import';
export type TimeRange = 'D' | 'W' | 'M' | '6M' | 'Y';
export type AppTab = 'summary' | 'trends' | 'sensor' | 'profile';

export const BLUEPRINT_LIMITS = {
  UID_MAX: 128,
  UID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  DATE_PATTERN: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
  DISPLAY_NAME_MIN: 1,
  DISPLAY_NAME_MAX: 80,
  EMAIL_MIN: 3,
  EMAIL_MAX: 160,
  PHOTO_URL_MAX: 500,
  GOAL_MIN: 1000,
  GOAL_MAX: 100000,
  HEIGHT_MIN: 100,
  HEIGHT_MAX: 250,
  WEIGHT_MIN: 30,
  WEIGHT_MAX: 250,
  STRIDE_MIN: 30,
  STRIDE_MAX: 150,
  DAILY_STEPS_MAX: 250000,
  SESSION_STEPS_MAX: 200000,
  DISTANCE_MAX: 300000,
  CALORIES_MAX: 20000,
  ACTIVE_MINUTES_MAX: 1440,
  FLIGHTS_MAX: 500,
  NOTE_MAX: 140,
} as const;

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  dailyGoal: number;
  heightCm: number;
  weightKg: number;
  strideLengthCm: number;
  unitSystem: UnitSystem;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DailyStepRecord {
  uid: string;
  date: string; // YYYY-MM-DD
  steps: number;
  goal: number;
  distanceMeters: number;
  calories: number;
  activeMinutes: number;
  flightsClimbed: number;
  hourlySteps: number[]; // 24 hours
  source: StepSource;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StepSession {
  id: string;
  uid: string;
  date: string; // YYYY-MM-DD
  steps: number;
  durationSeconds: number;
  distanceMeters: number;
  calories: number;
  avgCadenceSpm: number;
  source: SessionSource;
  note: string;
  createdAt: Timestamp;
}
