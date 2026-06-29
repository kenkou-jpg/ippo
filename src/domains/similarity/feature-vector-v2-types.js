// feature-vector-v2-types.js — SSOT for FeatureVector V2 (12-dim) type registry.
// PR-047: FeatureVector V2 — BD-010 / BD-011 / BD-018 / BD-035 / BD-042.
// BD-010: VECTOR_VERSION must be bumped when dimensions expand.
// BD-011: ALL edges carry vectorVersion — V1 and V2 must NOT be mixed.
// BD-035: FeatureVector V2 is 12-dimensional (VECTOR_VERSION='2').
// BD-042: V1 and V2 edges must be processed separately.

/**
 * FeatureVector V2 version string.
 * BD-010 / BD-035: Wave2 target version — 12 dimensions.
 * @readonly
 */
export const VECTOR_VERSION_V2 = '2';

/**
 * FeatureVector V1 version string — re-exported for guard comparisons.
 * BD-042: SimilarityEngine must reject cross-version mixing.
 */
export { VECTOR_VERSION as VECTOR_VERSION_V1 } from '../network/network-signal-types.js';

/**
 * V2 dimension indices (12 total).
 *
 * Dims 0–7: inherited from V1 VectorBuilder (SimilarityCandidate layer)
 * Dims 8–11: new in V2 — Signal + Longitudinal layer (BD-035)
 *
 * @readonly
 */
export const DIM_V2 = Object.freeze({
  // ── V1 dims (0–7) — SimilarityCandidate layer ────────────────────────────
  QUALITY_SCORE:         0,  // qualityScore / 100
  DURATION_DAYS:         1,  // durationDays / 365, clamped [0,1]
  HAS_OUTCOME:           2,  // 1 or 0
  EXPERIMENT_COUNT:      3,  // experimentCount / 10, clamped [0,1]
  RECORD_COUNT:          4,  // recordCount / 365, clamped [0,1]
  CONSENT_LEVEL:         5,  // consentLevel / 3
  SYMPTOM_COUNT:         6,  // symptoms.length / 20, clamped [0,1]
  FOOD_COUNT:            7,  // foods.length / 20, clamped [0,1]
  // ── V2 dims (8–11) — Signal + Longitudinal layer (BD-035) ─────────────────
  PAIN_SCORE:            8,  // avg normalizedValue of PAIN signals [0,1]
  MENSTRUAL_REGULARITY:  9,  // avg normalizedValue of MENSTRUAL signals [0,1]
  SLEEP_SCORE:          10,  // avg normalizedValue of SLEEP signals [0,1]
  LONGITUDINAL_DELTA:   11,  // longitudinal trend delta normalized to [0,1]
});

/** Total number of V2 dimensions. */
export const FV_V2_DIMENSION_COUNT = Object.keys(DIM_V2).length; // 12

/** Human-readable V2 dimension labels (for debugging). */
export const DIM_V2_LABELS = Object.freeze(
  Object.fromEntries(Object.entries(DIM_V2).map(([k, v]) => [v, k])),
);
