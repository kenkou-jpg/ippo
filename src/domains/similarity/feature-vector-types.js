// feature-vector-types.js — SSOT for Signal-based FeatureVector 12-dim registry.
// BD-010: VECTOR_VERSION must be bumped on dimension expansion.
// BD-011: ALL edges/snapshots carry vectorVersion.
// BD-018: generatedAt required on every FeatureVector.
// PR-036: Similarity Intelligence Foundation

// Re-export from the established SSOT (network-signal-types.js)
export { VECTOR_VERSION } from '../network/network-signal-types.js';

/**
 * 12-dimensional Signal-based FeatureVector dimension indices.
 * Wave1 fixed. Wave2 target: 14-16 dims.
 *
 * Dim 0–5  : NetworkSignal layer (one per signal type, NETWORK_ASSET_COUNCIL Section 3)
 * Dim 6–7  : Disease layer
 * Dim 8–9  : Longitudinal layer
 * Dim 10–11: Snapshot layer
 *
 * @readonly
 */
export const FV_DIM = Object.freeze({
  SYMPTOM_SCORE:      0,  // avg normalized SYMPTOM signal [0,1]
  PAIN_SCORE:         1,  // avg normalized PAIN signal [0,1]
  MENSTRUAL_REG:      2,  // MENSTRUAL signal regularity [0,1]
  SLEEP_QUALITY:      3,  // avg normalized SLEEP signal [0,1]
  EXPOSURE_RATE:      4,  // EXPOSURE frequency [0,1]
  EMOTION_SCORE:      5,  // EMOTION [0,1] — Wave1: always 0 (Wave2 activation)
  DISEASE_BURDEN:     6,  // active disease count / 10 clamped [0,1]
  CLUSTER_COVERAGE:   7,  // disease cluster signal coverage [0,1]
  TREND_DIRECTION:    8,  // trend (-1→0, +1→1) normalized to [0,1]
  BASELINE_STABLE:    9,  // baseline stability [0,1]
  SIGNAL_DENSITY:    10,  // total signals / 100 clamped [0,1]
  SNAPSHOT_AGE:      11,  // recency score [0,1]; 1 = very fresh
});

/** Total number of dimensions. */
export const FV_DIMENSION_COUNT = Object.keys(FV_DIM).length; // 12

/** Human-readable dimension labels (for debugging/visualization). */
export const FV_DIM_LABELS = Object.freeze(Object.fromEntries(
  Object.entries(FV_DIM).map(([k, v]) => [v, k])
));
