// symptom-types.js — SSOT for all Symptom domain type registries.
// All enumerations are frozen. Free-text entry is forbidden for controlled fields.
// PR-028: Symptom Intelligence Foundation

/**
 * Symptom category registry.
 * Add new categories here only — never in feature/screen code.
 * @readonly
 */
export const SYMPTOM_CATEGORIES = Object.freeze({
  PAIN:      'Pain',
  BLEEDING:  'Bleeding',
  NAUSEA:    'Nausea',
  FATIGUE:   'Fatigue',
  HEADACHE:  'Headache',
  BLOATING:  'Bloating',
  MOOD:      'Mood',
  SLEEP:     'Sleep',
  OTHER:     'Other',
});

/**
 * Pain type registry.
 * Free-text pain description is forbidden. Must use these values.
 * @readonly
 */
export const PAIN_TYPES = Object.freeze({
  SHARP:     'Sharp',
  DULL:      'Dull',
  CRAMPING:  'Cramping',
  BURNING:   'Burning',
  PRESSURE:  'Pressure',
  THROBBING: 'Throbbing',
  OTHER:     'Other',
});

/**
 * Severity scale: integer 0–10 inclusive.
 * 0 = none, 10 = worst imaginable.
 * @readonly
 */
export const SEVERITY = Object.freeze({
  MIN: 0,
  MAX: 10,
  /** @param {number} v */
  isValid: (v) => Number.isInteger(v) && v >= 0 && v <= 10,
});

/** Convenience sets for O(1) membership checks. */
export const SYMPTOM_CATEGORY_VALUES = Object.freeze(new Set(Object.values(SYMPTOM_CATEGORIES)));
export const PAIN_TYPE_VALUES        = Object.freeze(new Set(Object.values(PAIN_TYPES)));
