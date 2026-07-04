// cohort-definition-entity.js — CohortDefinition frozen value object.
// BD-018: createdAt ISO string is required (auto-generated).
// BD-039: kAnonymityVerified tracks whether k >= K_ANONYMITY_MIN has been confirmed.
// BD-032: Append-Only — each update returns a NEW frozen object; original is never mutated.
// PR-054: Cohort Builder

import { COHORT_SCHEMA_VERSION, COHORT_STATUS, K_ANONYMITY_MIN } from './cohort-types.js';

let _idCounter = 0;

/**
 * Build a new frozen CohortDefinition.
 *
 * @param {{
 *   name:                string,
 *   filters:             {
 *     diseaseKeys?:      string[],
 *     signalFilters?:    { signalType: string, min?: number, max?: number }[],
 *     phaseFilters?:     string[],
 *     dateRange?:        { from: string, to: string } | null,
 *     minRecordCount?:   number,
 *   },
 *   createdBy:           string,
 *   cohortId?:           string,
 *   kAnonymityVerified?: boolean,
 *   verifiedCount?:      number|null,
 *   status?:             string,
 * }} params
 * @returns {Readonly<object>}
 */
export function buildCohortDefinition({
  name,
  filters = {},
  createdBy,
  cohortId,
  kAnonymityVerified = false,
  verifiedCount      = null,
  status,
}) {
  if (!name || typeof name !== 'string') {
    throw new Error('[CohortDefinition] name is required (string)');
  }
  if (!createdBy || typeof createdBy !== 'string') {
    throw new Error('[CohortDefinition] createdBy is required (string)');
  }
  if (filters.diseaseKeys !== undefined && !Array.isArray(filters.diseaseKeys)) {
    throw new Error('[CohortDefinition] filters.diseaseKeys must be an array');
  }
  if (typeof filters.minRecordCount === 'number' && filters.minRecordCount < 0) {
    throw new Error('[CohortDefinition] filters.minRecordCount must be >= 0');
  }

  const resolvedStatus = status ?? (kAnonymityVerified ? COHORT_STATUS.VERIFIED : COHORT_STATUS.DRAFT);

  const normalizedFilters = Object.freeze({
    diseaseKeys:     Object.freeze([...(filters.diseaseKeys  ?? [])]),
    signalFilters:   Object.freeze([...(filters.signalFilters ?? [])]),
    phaseFilters:    Object.freeze([...(filters.phaseFilters  ?? [])]),
    dateRange:       filters.dateRange ? Object.freeze({ ...filters.dateRange }) : null,
    minRecordCount:  filters.minRecordCount ?? 1,
  });

  return Object.freeze({
    cohortId:          cohortId ?? `coh_${Date.now()}_${++_idCounter}`,
    name,
    filters:           normalizedFilters,
    createdBy,
    kAnonymityVerified,
    verifiedCount:     verifiedCount ?? null,
    kAnonymityMin:     K_ANONYMITY_MIN,
    status:            resolvedStatus,
    createdAt:         new Date().toISOString(),
    schemaVersion:     COHORT_SCHEMA_VERSION,
  });
}

/**
 * Create a new CohortDefinition with kAnonymityVerified = true.
 * BD-039: returns a new frozen object — original is NOT mutated (BD-032).
 *
 * @param {Readonly<object>} cohort
 * @param {number} verifiedCount
 * @returns {Readonly<object>}
 */
export function verifyKAnonymity(cohort, verifiedCount) {
  if (typeof verifiedCount !== 'number' || verifiedCount < 0) {
    throw new Error('[CohortDefinition] verifiedCount must be a non-negative number');
  }
  if (verifiedCount < K_ANONYMITY_MIN) {
    throw new Error(
      `[CohortDefinition] BD-039 violation: verifiedCount (${verifiedCount}) < K_ANONYMITY_MIN (${K_ANONYMITY_MIN}). ` +
      'Cannot verify k-anonymity — cohort must not be published.'
    );
  }
  return Object.freeze({
    ...cohort,
    kAnonymityVerified: true,
    verifiedCount,
    status: COHORT_STATUS.VERIFIED,
  });
}
