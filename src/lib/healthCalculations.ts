import { BLUEPRINT_LIMITS, DailyStepRecord, UnitSystem } from '../types/health';

/**
 * Computes default walking stride length in centimeters using the standard
 * Apple Health anthropometric ratio (0.415 * height), scaled smoothly when
 * running/brisk cadence exceeds 120 SPM.
 */
export function calculateDefaultStrideCm(heightCm: number, cadenceSpm = 100): number {
  const clampedHeight = Math.min(BLUEPRINT_LIMITS.HEIGHT_MAX, Math.max(BLUEPRINT_LIMITS.HEIGHT_MIN, heightCm));
  const baseFactor = 0.415;
  const speedBoost = cadenceSpm > 120 ? Math.min(0.2, ((cadenceSpm - 120) / 60) * 0.2) : 0;
  const stride = Math.round(clampedHeight * (baseFactor + speedBoost));
  return Math.min(BLUEPRINT_LIMITS.STRIDE_MAX, Math.max(BLUEPRINT_LIMITS.STRIDE_MIN, stride));
}

export function calculateDistanceMeters(steps: number, strideLengthCm: number): number {
  const safeSteps = Math.max(0, steps);
  const meters = Math.round((safeSteps * strideLengthCm) / 100);
  return Math.min(BLUEPRINT_LIMITS.DISTANCE_MAX, meters);
}

/**
 * Estimates active energy expenditure (kcal) from step count, body mass (kg),
 * and average cadence using an Ainsworth Compendium MET-scaled walking/running model.
 */
export function calculateActiveCalories(
  steps: number,
  weightKg: number,
  cadenceSpm = 105
): number {
  const safeSteps = Math.max(0, steps);
  const clampedWeight = Math.min(BLUEPRINT_LIMITS.WEIGHT_MAX, Math.max(BLUEPRINT_LIMITS.WEIGHT_MIN, weightKg));
  const intensityFactor = cadenceSpm >= 140 ? 1.45 : cadenceSpm >= 115 ? 1.18 : 1.0;
  const kcal = Math.round(safeSteps * 0.04 * (clampedWeight / 70) * intensityFactor);
  return Math.min(BLUEPRINT_LIMITS.CALORIES_MAX, kcal);
}

export function calculateActiveMinutes(steps: number, cadenceSpm = 105): number {
  if (steps <= 0) return 0;
  const safeCadence = Math.max(60, Math.min(200, cadenceSpm));
  return Math.min(BLUEPRINT_LIMITS.ACTIVE_MINUTES_MAX, Math.max(1, Math.round(steps / safeCadence)));
}

export function formatDistance(meters: number, unitSystem: UnitSystem): { value: string; unit: string } {
  if (unitSystem === 'imperial') {
    const miles = meters / 1609.344;
    return { value: miles.toFixed(2), unit: 'mi' };
  }
  const km = meters / 1000;
  return { value: km.toFixed(2), unit: 'km' };
}

export function toLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatDateLabel(dateKey: string): string {
  const d = parseDateKey(dateKey);
  const today = toLocalDateKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toLocalDateKey(yesterdayDate);

  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function getRecentDateKeys(daysCount: number, endDate: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    keys.push(toLocalDateKey(d));
  }
  return keys;
}

export function computeStreak(recordsByDate: Record<string, DailyStepRecord>, fallbackGoal: number): number {
  let streak = 0;
  const cursor = new Date();

  // If today hasn't met goal yet, check starting from yesterday so active streaks don't vanish mid-day
  const todayKey = toLocalDateKey(cursor);
  const todayRec = recordsByDate[todayKey];
  if (todayRec && todayRec.steps >= (todayRec.goal || fallbackGoal)) {
    streak = 1;
    cursor.setDate(cursor.getDate() - 1);
  } else {
    cursor.setDate(cursor.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const key = toLocalDateKey(cursor);
    const rec = recordsByDate[key];
    if (rec && rec.steps >= (rec.goal || fallbackGoal)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function createEmptyHourlyArray(): number[] {
  return Array.from({ length: 24 }, () => 0);
}

export interface ImportedDailySteps {
  date: string;
  steps: number;
  hourlySteps: number[];
}

/**
 * Parses Apple Health export.xml (HKQuantityTypeIdentifierStepCount) OR a CSV
 * with columns like date,steps into aggregated daily & hourly step buckets.
 */
export function parseHealthImportFile(content: string): ImportedDailySteps[] {
  const byDate: Record<string, number[]> = {};
  const trimmed = content.trim();

  if (trimmed.startsWith('<')) {
    const recordRegex = /<Record\b[^>]*type="HKQuantityTypeIdentifierStepCount"[^>]*>/g;
    let match: RegExpExecArray | null;
    while ((match = recordRegex.exec(trimmed)) !== null) {
      const tag = match[0];
      const startMatch = tag.match(/startDate="(\d{4}-\d{2}-\d{2})[ T](\d{2})/);
      const valueMatch = tag.match(/value="([0-9.]+)"/);
      if (startMatch && valueMatch) {
        const dateKey = startMatch[1];
        const hour = Math.min(23, Math.max(0, parseInt(startMatch[2], 10)));
        const val = Math.round(parseFloat(valueMatch[1]));
        if (val > 0) {
          if (!byDate[dateKey]) byDate[dateKey] = createEmptyHourlyArray();
          byDate[dateKey][hour] += val;
        }
      }
    }
  } else {
    const lines = trimmed.split(/\r?\n/);
    for (const line of lines) {
      const parts = line.split(/[,\t;]/).map((s) => s.trim().replace(/^"|"$/g, ''));
      if (parts.length < 2) continue;
      const dateMatch = parts[0].match(/^(\d{4}-\d{2}-\d{2})/);
      const stepsVal = Math.round(Number(parts[1]));
      if (dateMatch && Number.isFinite(stepsVal) && stepsVal > 0) {
        const dateKey = dateMatch[1];
        if (!byDate[dateKey]) byDate[dateKey] = createEmptyHourlyArray();
        // Distribute across daytime hours (8am-6pm) if no hourly granularity in CSV
        const perHour = Math.floor(stepsVal / 10);
        const remainder = stepsVal - perHour * 10;
        for (let h = 8; h < 18; h++) {
          byDate[dateKey][h] += perHour + (h === 12 ? remainder : 0);
        }
      }
    }
  }

  return Object.entries(byDate)
    .map(([date, hourlySteps]) => ({
      date,
      steps: Math.min(
        BLUEPRINT_LIMITS.DAILY_STEPS_MAX,
        hourlySteps.reduce((acc, v) => acc + v, 0)
      ),
      hourlySteps,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function exportDailyRecordsToCsv(records: DailyStepRecord[]): string {
  const header = 'date,steps,goal,distance_meters,calories,active_minutes,flights_climbed,source';
  const rows = [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (r) =>
        `${r.date},${r.steps},${r.goal},${r.distanceMeters},${r.calories},${r.activeMinutes},${r.flightsClimbed},${r.source}`
    );
  return [header, ...rows].join('\n');
}
