import type { RecordDate } from "./record.entity";

// Pure domain functions — no side effects, no I/O, no window/DOM

export interface StreakState {
  streak: number;
  totalDays: number;
}

export interface MinimalRecord {
  recordDate?: RecordDate;
  /** ISO string fallback used by legacy records */
  date?: string;
}

/**
 * Returns the YYYY-MM-DD key for a record, handling both legacy and new formats.
 */
function toDateKey(r: MinimalRecord): RecordDate {
  if (r.recordDate) return r.recordDate;
  if (r.date) return r.date.slice(0, 10);
  return "";
}

/**
 * Determines whether the given recordDate is new (not already present in records).
 */
export function isNewRecord(
  existingRecords: MinimalRecord[],
  recordDate: RecordDate,
): boolean {
  return !existingRecords.some((r) => toDateKey(r) === recordDate);
}

/**
 * Calculates the next streak value after saving a record.
 *
 * Rules:
 *  - If not a new record: streak unchanged.
 *  - If new and yesterday was recorded (or streak was 0): streak + 1.
 *  - Otherwise: streak resets to 1.
 */
export function calculateStreak(
  existingRecords: MinimalRecord[],
  currentStreak: number,
  recordDate: RecordDate,
  isNew: boolean,
): number {
  if (!isNew) return currentStreak;

  const yesterday = new Date(recordDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const hadYesterday = existingRecords.some((r) => toDateKey(r) === yesterdayStr);

  if (hadYesterday || currentStreak === 0) {
    return currentStreak + 1;
  }
  return 1;
}

/**
 * Applies a new record save to streak state. Pure — returns new state object.
 */
export function applyRecordToStreakState(
  existingRecords: MinimalRecord[],
  state: StreakState,
  recordDate: RecordDate,
): StreakState {
  const isNew = isNewRecord(existingRecords, recordDate);
  if (!isNew) return state;

  const nextStreak = calculateStreak(existingRecords, state.streak, recordDate, true);
  return {
    streak: nextStreak,
    totalDays: state.totalDays + 1,
  };
}
