// phase3-completion-validator-types.js — SSOT for Phase 3 Completion Validator.
// NETWORK_EVOLUTION_COUNCIL Section 1-A / Section 2-C / BD-026.
// PR-066: Phase 3 Completion Validator

/** Per-disease Case count threshold for statistical confidence (Section 2-C). */
export const PHASE3_CASE_COUNT_THRESHOLD = 50;

/** Minimum number of qualifying disease clusters for Phase 3 completion (Section 1-A: "5疾患以上"). */
export const PHASE3_REQUIRED_DISEASE_COUNT = 5;

/** Schema version for Phase3ValidationReport. */
export const PHASE3_VALIDATION_SCHEMA_VERSION = '1';

/** Validation result values. */
export const VALIDATION_RESULT = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
});
