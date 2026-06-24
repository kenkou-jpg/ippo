import type { RecordDate, RecordDraft } from "./record.entity";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const RECORD_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateRecordDate(date: string): ValidationResult {
  const errors: string[] = [];
  if (!date || !RECORD_DATE_RE.test(date)) {
    errors.push(`record_date must be YYYY-MM-DD, got: "${date}"`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateDraft(draft: Partial<RecordDraft>): ValidationResult {
  const errors: string[] = [];

  if (!draft.recordDate) {
    errors.push("recordDate is required");
  } else {
    const dateResult = validateRecordDate(draft.recordDate);
    if (!dateResult.valid) errors.push(...dateResult.errors);
  }

  if (draft.painLevel != null && (draft.painLevel < 0 || draft.painLevel > 10)) {
    errors.push("painLevel must be 0-10");
  }

  if (draft.energy != null && (draft.energy < 0 || draft.energy > 5)) {
    errors.push("energy must be 0-5");
  }

  if (draft.mood != null && (draft.mood < 0 || draft.mood > 5)) {
    errors.push("mood must be 0-5");
  }

  if (draft.sleepQuality != null && (draft.sleepQuality < 0 || draft.sleepQuality > 5)) {
    errors.push("sleepQuality must be 0-5");
  }

  return { valid: errors.length === 0, errors };
}

export function normalizeRecordDate(isoStringOrDate: string): RecordDate {
  return isoStringOrDate.slice(0, 10);
}
