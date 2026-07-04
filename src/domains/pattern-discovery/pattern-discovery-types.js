// pattern-discovery-types.js — SSOT for Pattern Discovery domain type registries.
// BD-031: rule-based correlation only — no LLM/ML.
// BD-038: ALL outputs carry isMedicalAdvice:false; forbidden causal words auto-blocked.
// PR-058: Pattern Discovery Service

/**
 * Pattern type registry — 4 discovery categories.
 * @readonly
 */
export const PATTERN_TYPES = Object.freeze({
  PHASE_CORRELATION:    'PHASE_CORRELATION',    // Pain vs menstrual phase
  SIGNAL_CO_OCCURRENCE: 'SIGNAL_CO_OCCURRENCE', // Cross-signal lag correlation
  EXPERIMENT_RESPONSE:  'EXPERIMENT_RESPONSE',  // Signal change around experiment
  LONGITUDINAL_TREND:   'LONGITUDINAL_TREND',   // Long-term direction trend
});

/** Set of all valid pattern type strings. */
export const PATTERN_TYPE_SET = Object.freeze(new Set(Object.values(PATTERN_TYPES)));

/**
 * Confidence level registry.
 * LOW: evidence_count < MIN_EVIDENCE_COUNT — still returned, flagged LOW_CONFIDENCE.
 * @readonly
 */
export const PATTERN_CONFIDENCE = Object.freeze({
  HIGH:   'HIGH',
  MEDIUM: 'MEDIUM',
  LOW:    'LOW',
});

/** Set of all valid confidence strings. */
export const PATTERN_CONFIDENCE_SET = Object.freeze(new Set(Object.values(PATTERN_CONFIDENCE)));

/**
 * Minimum evidence count to achieve MEDIUM or HIGH confidence.
 * Below this threshold pattern is returned with confidence LOW.
 */
export const MIN_EVIDENCE_COUNT = 3;

/**
 * Correlation coefficient thresholds for confidence classification.
 * |r| >= STRONG → HIGH, |r| >= MODERATE → MEDIUM, else LOW.
 */
export const CORRELATION_THRESHOLDS = Object.freeze({
  STRONG:   0.6,
  MODERATE: 0.3,
});

/** Lag in days for SIGNAL_CO_OCCURRENCE (next-day lag). */
export const CO_OCCURRENCE_LAG_DAYS = 1;

/** Current schema version for DiscoveredPattern records. */
export const PATTERN_SCHEMA_VERSION = '1';
