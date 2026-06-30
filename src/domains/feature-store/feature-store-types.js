// feature-store-types.js — SSOT for Feature Store domain type registries.
// BD-037: Feature Store 入力は Supabase 永続化済み Signal のみ（in-memory Signal 禁止）。
// BD-018: All FeatureMatrix snapshots must carry computedAt ISO string.
// PR-053: Feature Store V1

/**
 * Feature key registry — 6 Wave2 features.
 * @readonly
 */
export const FEATURE_KEYS = Object.freeze({
  AVG_PAIN_30D:             'avg_pain_30d',
  AVG_SLEEP_30D:            'avg_sleep_30d',
  AVG_SYMPTOM_30D:          'avg_symptom_30d',
  MENSTRUAL_REGULARITY:     'menstrual_regularity',
  LONGITUDINAL_DELTA_PAIN:  'longitudinal_delta_pain',
  PHASE_PAIN_DISTRIBUTION:  'phase_pain_distribution',
});

/** Set of all valid feature key strings for fast validation. */
export const FEATURE_KEY_SET = Object.freeze(new Set(Object.values(FEATURE_KEYS)));

/** Sliding window in days for avg_*_30d features. */
export const WINDOW_DAYS = 30;

/** Short window for longitudinal delta comparison (days). */
export const DELTA_WINDOW_DAYS = 7;

/** Current feature schema version. Bump on structural changes. */
export const FEATURE_STORE_SCHEMA_VERSION = '1';

/** Menstrual phase keys used in phase_pain_distribution. */
export const PHASE_KEYS = Object.freeze(['MENSTRUAL', 'FOLLICULAR', 'OVULATION', 'LUTEAL']);
