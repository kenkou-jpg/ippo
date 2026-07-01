// similar-case-search-types.js — SSOT for Similar Case Search domain type registries.
// BD-030: k-anonymity k≥5 ZERO TOLERANCE — individual cases never returned without group.
// PR-060: Similar Case Search (admin:research only)

/**
 * Valid signal type filters for SearchQuery.
 * @readonly
 */
export const SEARCH_SIGNAL_TYPES = Object.freeze([
  'PAIN', 'SLEEP', 'SYMPTOM', 'EMOTION', 'MENSTRUAL', 'ENVIRONMENTAL',
]);

/**
 * Valid menstrual phase filter values for SearchQuery.
 * @readonly
 */
export const SEARCH_PHASE_FILTERS = Object.freeze([
  'MENSTRUAL', 'FOLLICULAR', 'OVULATION', 'LUTEAL',
]);

/**
 * Minimum k-anonymity group size (BD-030 ZERO TOLERANCE).
 * Imported from case-recommendation for consistency — single source of truth.
 */
export { K_ANONYMITY_MIN } from '../case-recommendation/case-recommendation-types.js';

/**
 * Personal identifier fields that must NEVER appear in search results (BD-030).
 * Shared allowlist from case-recommendation domain.
 */
export {
  PERSONAL_IDENTIFIER_FIELDS,
  ANONYMIZED_CASE_ALLOWED_FIELDS,
} from '../case-recommendation/case-recommendation-types.js';

/** Default minimum quality/signal score when not specified in SearchQuery. */
export const DEFAULT_MIN_SCORE = 0;

/** Maximum cases returned in a single search result. */
export const MAX_SEARCH_RESULTS = 50;

/** Current schema version for SearchResult records. */
export const SEARCH_RESULT_SCHEMA_VERSION = '1';
