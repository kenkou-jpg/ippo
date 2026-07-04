// research-dataset-validator.js — Dataset build parameter validation.
// BD-022: Wave1 in-memory only.
// PR-040: Research Dataset Foundation

import {
  ANONYMIZATION_LEVEL_VALUES,
  K_ANONYMITY_MIN_K,
} from './research-dataset-types.js';

/**
 * Validate ResearchDataset build parameters.
 * @param {object} params
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateDatasetParams(params = {}) {
  const errors = [];

  if (params.anonymizationLevel !== undefined) {
    if (!ANONYMIZATION_LEVEL_VALUES.has(params.anonymizationLevel)) {
      errors.push(`anonymizationLevel must be one of: ${[...ANONYMIZATION_LEVEL_VALUES].join(', ')}`);
    }
  }

  if (params.recordCount !== undefined && (typeof params.recordCount !== 'number' || params.recordCount < 0)) {
    errors.push('recordCount must be a non-negative number');
  }
  if (params.signalCount !== undefined && (typeof params.signalCount !== 'number' || params.signalCount < 0)) {
    errors.push('signalCount must be a non-negative number');
  }
  if (params.diseaseCount !== undefined && (typeof params.diseaseCount !== 'number' || params.diseaseCount < 0)) {
    errors.push('diseaseCount must be a non-negative number');
  }
  if (params.snapshotCount !== undefined && (typeof params.snapshotCount !== 'number' || params.snapshotCount < 0)) {
    errors.push('snapshotCount must be a non-negative number');
  }
  if (params.eventCount !== undefined && (typeof params.eventCount !== 'number' || params.eventCount < 0)) {
    errors.push('eventCount must be a non-negative number');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate k-anonymity parameters for Wave1.
 * @param {number} k
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateKAnonymity(k) {
  const errors = [];
  if (typeof k !== 'number' || !Number.isInteger(k)) {
    errors.push('k must be an integer');
  } else if (k < K_ANONYMITY_MIN_K) {
    errors.push(`k must be >= ${K_ANONYMITY_MIN_K} (Wave1 minimum)`);
  }
  return { valid: errors.length === 0, errors };
}
