// research-assistance-types.js — SSOT for Research Assistance domain.
// BD-031: rule-based statistical computation only — no LLM.
// BD-038: causal inference language auto-blocked by ForbiddenWordValidator.
// BD-032: all returned objects must be frozen.
// PR-061: Research Assistance (Phase D-5 / admin:research)

/** Statistical measure types reported in descriptiveStats. */
export const STAT_MEASURES = Object.freeze({
  MEAN:   'mean',
  STD:    'std',
  MIN:    'min',
  MAX:    'max',
  MEDIAN: 'median',
  COUNT:  'count',
});

/**
 * Signal types that can appear in dataset signal records.
 * Mirrors SEARCH_SIGNAL_TYPES from PR-060 — kept as local SSOT to avoid cross-domain coupling.
 */
export const RESEARCH_SIGNAL_TYPES = Object.freeze([
  'PAIN', 'SLEEP', 'SYMPTOM', 'EMOTION', 'MENSTRUAL', 'ENVIRONMENTAL',
]);

/** Minimum number of values required to compute statistics for a signal type. */
export const MIN_STAT_SAMPLE_SIZE = 3;

/**
 * Maximum number of signal pairs to compute Pearson r for.
 * Guards against combinatorial explosion with many signal types.
 */
export const MAX_SIGNAL_PAIRS = 50;

/** Schema version for ResearchResult — bump on structural changes. */
export const RESEARCH_RESULT_SCHEMA_VERSION = '1';

/**
 * Correlation strength classification thresholds.
 * Matches CORRELATION_THRESHOLDS from PR-058 (PatternDiscovery) for consistency.
 */
export const CORRELATION_STRENGTH = Object.freeze({
  STRONG:   'STRONG',   // |r| >= 0.6
  MODERATE: 'MODERATE', // |r| >= 0.3
  WEAK:     'WEAK',     // |r| < 0.3
});

export const CORRELATION_THRESHOLD_STRONG   = 0.6;
export const CORRELATION_THRESHOLD_MODERATE = 0.3;
