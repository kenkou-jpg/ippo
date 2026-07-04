// emotion-types.js — SSOT for Emotion domain type registries.
// BD-005: Emotion is a Research Asset managed under LEGACY_ASSET_INVENTORY.
// NAC-01: Emotion maps to SIGNAL_TYPES.EMOTION in the NetworkSignal schema.
// BD-022: Wave1 in-memory only — no Supabase.
// PR-038: Emotion Signal Foundation

export const EMOTION_TYPES = Object.freeze({
  HAPPY:    'HAPPY',
  CALM:     'CALM',
  ENERGETIC:'ENERGETIC',
  NEUTRAL:  'NEUTRAL',
  TIRED:    'TIRED',
  ANXIOUS:  'ANXIOUS',
  SAD:      'SAD',
  ANGRY:    'ANGRY',
  STRESSED: 'STRESSED',
  UNKNOWN:  'UNKNOWN',
});

export const EMOTION_INTENSITY = Object.freeze({
  LOW:     'LOW',
  MEDIUM:  'MEDIUM',
  HIGH:    'HIGH',
  UNKNOWN: 'UNKNOWN',
});

export const EMOTION_SOURCE = Object.freeze({
  USER_INPUT: 'USER_INPUT',
  INFERRED:   'INFERRED',
  UNKNOWN:    'UNKNOWN',
});

export const EMOTION_TYPE_VALUES     = Object.freeze(new Set(Object.values(EMOTION_TYPES)));
export const EMOTION_INTENSITY_VALUES = Object.freeze(new Set(Object.values(EMOTION_INTENSITY)));
export const EMOTION_SOURCE_VALUES    = Object.freeze(new Set(Object.values(EMOTION_SOURCE)));
