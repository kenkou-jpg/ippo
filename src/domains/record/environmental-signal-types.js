// environmental-signal-types.js — SSOT for Environmental Signal domain (PR-049).
// BD-003: Lunar Calendar UI implementation is FORBIDDEN — background data collection only.
// BD-043: Environmental Signal UI display is FORBIDDEN — Wave3+ scope for UI disclosure.
// BD-038: Rule-based only — no AI, no LLM.
// PR-049: Environmental Signal Collector Foundation

/**
 * Lunar phase names — 8 standard phases based on lunar age.
 * These are stored as metadata; NEVER displayed in UI (BD-003 / BD-043).
 * @readonly
 */
export const LUNAR_PHASES = Object.freeze({
  NEW_MOON:        'NEW_MOON',        // Day  0.0 –  1.85
  WAXING_CRESCENT: 'WAXING_CRESCENT', // Day  1.85–  7.38
  FIRST_QUARTER:   'FIRST_QUARTER',   // Day  7.38– 11.08
  WAXING_GIBBOUS:  'WAXING_GIBBOUS',  // Day 11.08– 14.77
  FULL_MOON:       'FULL_MOON',       // Day 14.77– 16.62
  WANING_GIBBOUS:  'WANING_GIBBOUS',  // Day 16.62– 22.15
  LAST_QUARTER:    'LAST_QUARTER',    // Day 22.15– 25.85
  WANING_CRESCENT: 'WANING_CRESCENT', // Day 25.85– 29.53
  UNKNOWN:         'UNKNOWN',         // Cannot be determined
});

/**
 * Environmental signal types collected at Record-save time.
 * @readonly
 */
export const ENVIRONMENTAL_SIGNAL_TYPES = Object.freeze({
  LUNAR_PHASE: 'LUNAR_PHASE',
});

/** Lunar cycle length in days (mean synodic month). */
export const LUNAR_CYCLE_DAYS = 29.53058867;

/**
 * Known new-moon epoch: 2000-01-06T18:14:00Z (J2000.0 reference).
 * Used as anchor for deterministic lunar-age calculation.
 */
export const LUNAR_EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

/** Convenience set for O(1) membership check. */
export const LUNAR_PHASE_VALUES = Object.freeze(new Set(Object.values(LUNAR_PHASES)));
