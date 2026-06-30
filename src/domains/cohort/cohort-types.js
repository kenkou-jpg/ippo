// cohort-types.js — SSOT for Cohort domain type registries.
// BD-039: k-anonymity minimum threshold — cohorts with < K_ANONYMITY_MIN cases
//         must NOT be published or used for Dataset generation.
// PR-054: Cohort Builder

/**
 * Minimum k-anonymity count for cohort publication (BD-039).
 * A cohort with fewer than K_ANONYMITY_MIN verified cases cannot be published.
 */
export const K_ANONYMITY_MIN = 5;

/** Current cohort schema version. */
export const COHORT_SCHEMA_VERSION = '1';

/** Cohort status values. */
export const COHORT_STATUS = Object.freeze({
  DRAFT:    'DRAFT',    // defined but not k-anonymity verified
  VERIFIED: 'VERIFIED', // kAnonymityVerified = true, ready for Dataset generation
  ARCHIVED: 'ARCHIVED', // no longer active
});

/** Valid signal filter operators. */
export const SIGNAL_FILTER_OPS = Object.freeze(['gte', 'lte', 'eq', 'between']);
