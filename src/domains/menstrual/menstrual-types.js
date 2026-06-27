// menstrual-types.js — SSOT for Menstrual domain type registries.
// BD-003: Menstrual Cycle data is a core health asset under LEGACY_ASSET_INVENTORY.
// BD-005: Menstrual is a Research Asset.
// NAC-01: MENSTRUAL signal type is registered in SIGNAL_TYPES.
// NAC-04: Longitudinal analysis covers cycle patterns.
// BD-022: Wave1 in-memory only — no Supabase.
// PR-039: Menstrual Intelligence Foundation

export const MENSTRUAL_PHASES = Object.freeze({
  MENSTRUAL:  'MENSTRUAL',   // Day 1–5: bleeding phase
  FOLLICULAR: 'FOLLICULAR',  // Day 6–12: follicular growth
  OVULATION:  'OVULATION',   // Day 13–16: ovulation window
  LUTEAL:     'LUTEAL',      // Day 17–28: luteal phase
  UNKNOWN:    'UNKNOWN',
});

export const FLOW_LEVEL = Object.freeze({
  NONE:    'NONE',
  LIGHT:   'LIGHT',
  MEDIUM:  'MEDIUM',
  HEAVY:   'HEAVY',
  UNKNOWN: 'UNKNOWN',
});

export const PAIN_LEVEL = Object.freeze({
  NONE:    'NONE',
  LOW:     'LOW',
  MEDIUM:  'MEDIUM',
  HIGH:    'HIGH',
  UNKNOWN: 'UNKNOWN',
});

export const CYCLE_STATUS = Object.freeze({
  REGULAR:   'REGULAR',
  IRREGULAR: 'IRREGULAR',
  UNKNOWN:   'UNKNOWN',
});

export const MENSTRUAL_PHASE_VALUES = Object.freeze(new Set(Object.values(MENSTRUAL_PHASES)));
export const FLOW_LEVEL_VALUES       = Object.freeze(new Set(Object.values(FLOW_LEVEL)));
export const PAIN_LEVEL_VALUES       = Object.freeze(new Set(Object.values(PAIN_LEVEL)));
export const CYCLE_STATUS_VALUES     = Object.freeze(new Set(Object.values(CYCLE_STATUS)));

/** Typical cycle length bounds for regularity detection (Wave1 fixed). */
export const CYCLE_LENGTH_MIN = 21;
export const CYCLE_LENGTH_MAX = 35;
export const CYCLE_LENGTH_TYPICAL = 28;
export const PERIOD_LENGTH_TYPICAL = 5;
