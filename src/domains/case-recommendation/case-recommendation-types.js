// case-recommendation-types.js — SSOT for Case Recommendation domain type registries.
// BD-029: Case Recommendation is admin:research only until Phase 3 completion (BD-026).
// BD-030: k-anonymity k≥5 is ZERO TOLERANCE — k < 5 groups must never be returned.
// PR-059: Case Recommendation Foundation

/**
 * Minimum k-anonymity group size (BD-030 ZERO TOLERANCE).
 * Any diseaseKey group with fewer than K_ANONYMITY_MIN cases is blocked.
 */
export const K_ANONYMITY_MIN = 5;

/**
 * Similarity score threshold — candidates below this are excluded.
 * Uses cosine similarity on 12-dim FeatureVector V2.
 */
export const SIMILARITY_THRESHOLD = 0.5;

/**
 * Maximum number of anonymized cases returned per recommendation request.
 * Limits response size and reduces re-identification risk.
 */
export const MAX_RECOMMENDATIONS = 20;

/**
 * Phase 3 completion sentinel.
 * BD-026: user-facing Case Recommendation is blocked until Phase 3 is verified by Founder.
 * Set to true only after Founder confirms Phase 3 exit conditions (≥50 cases per cluster).
 *
 * Current state: false — Phase 3 not yet verified.
 */
export const PHASE3_COMPLETE = false;

/**
 * Personal identifier fields that must NEVER appear in AnonymizedCase output (BD-030).
 * @readonly
 */
export const PERSONAL_IDENTIFIER_FIELDS = Object.freeze([
  'userId', 'userName', 'email', 'name', 'birthDate',
  'address', 'phone', 'profileId', 'patientId',
]);

/**
 * Fields that ARE allowed on AnonymizedCase output.
 * Anything not in this allowlist is stripped.
 * @readonly
 */
export const ANONYMIZED_CASE_ALLOWED_FIELDS = Object.freeze([
  'caseId', 'diseaseKey', 'qualityScore', 'durationDays', 'hasOutcome',
  'experimentCount', 'symptomCount', 'consentLevel', 'vectorVersion',
  'similarityScore', 'matchedFeatures',
]);

/** Current schema version for CaseRecommendation records. */
export const CASE_RECOMMENDATION_SCHEMA_VERSION = '1';
