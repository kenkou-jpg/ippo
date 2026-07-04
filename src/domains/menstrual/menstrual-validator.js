// menstrual-validator.js — Full error-collecting validator for Menstrual input.
// BD-009: validation is a leaf node (no repository/UI imports).
// PR-039: Menstrual Intelligence Foundation

import {
  MENSTRUAL_PHASE_VALUES,
  FLOW_LEVEL_VALUES,
  PAIN_LEVEL_VALUES,
} from './menstrual-types.js';

/**
 * Validate raw MenstrualRecord input.
 * Collects ALL errors rather than failing on the first.
 *
 * @param {object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateMenstrual(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Menstrual data must be an object'] };
  }

  if (data.cycleDay === undefined || data.cycleDay === null) {
    errors.push('cycleDay is required');
  } else if (typeof data.cycleDay !== 'number' || !Number.isInteger(data.cycleDay) || data.cycleDay < 1) {
    errors.push('cycleDay must be a positive integer');
  }

  if (data.phase !== undefined && !MENSTRUAL_PHASE_VALUES.has(data.phase)) {
    errors.push(`Unknown phase: "${data.phase}"`);
  }

  if (data.flow !== undefined && !FLOW_LEVEL_VALUES.has(data.flow)) {
    errors.push(`Unknown flow: "${data.flow}"`);
  }

  if (data.painLevel !== undefined && !PAIN_LEVEL_VALUES.has(data.painLevel)) {
    errors.push(`Unknown painLevel: "${data.painLevel}"`);
  }

  if (data.symptoms !== undefined && !Array.isArray(data.symptoms)) {
    errors.push('symptoms must be an array');
  }

  if (data.recordId !== undefined && data.recordId !== null && typeof data.recordId !== 'string') {
    errors.push('recordId must be a string or null');
  }

  if (data.startedAt !== undefined) {
    const d = new Date(data.startedAt);
    if (isNaN(d.getTime())) errors.push('startedAt must be a valid ISO date string');
  }

  if (data.endedAt !== undefined && data.endedAt !== null) {
    const d = new Date(data.endedAt);
    if (isNaN(d.getTime())) errors.push('endedAt must be a valid ISO date string or null');
  }

  return { valid: errors.length === 0, errors };
}
