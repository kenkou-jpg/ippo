// symptom-validator.js — validates Symptom domain input against SSOT registries.
// All controlled fields must match their registry. Free-text is forbidden for those fields.
// PR-028: Symptom Intelligence Foundation

import {
  SYMPTOM_CATEGORY_VALUES,
  PAIN_TYPE_VALUES,
  SEVERITY,
} from './symptom-types.js';

/**
 * @typedef {{ valid: boolean, errors: string[] }} ValidationResult
 */

export class SymptomValidator {
  /**
   * Validate a raw symptom input object.
   * Returns { valid: true, errors: [] } on success.
   * Returns { valid: false, errors: [...] } with all violations listed.
   *
   * @param {{
   *   recordId?:  string,
   *   category?:  string,
   *   severity?:  number,
   *   painType?:  string|null,
   *   startedAt?: string,
   * }} data
   * @returns {ValidationResult}
   */
  validate(data = {}) {
    const errors = [];

    // recordId — required string
    if (!data.recordId || typeof data.recordId !== 'string' || data.recordId.trim() === '') {
      errors.push('recordId is required');
    }

    // category — must be in SYMPTOM_CATEGORIES registry
    if (data.category === undefined || data.category === null) {
      errors.push('category is required');
    } else if (!SYMPTOM_CATEGORY_VALUES.has(data.category)) {
      errors.push(`category "${data.category}" is not in registry. Allowed: ${[...SYMPTOM_CATEGORY_VALUES].join(', ')}`);
    }

    // severity — integer 0–10
    if (data.severity === undefined || data.severity === null) {
      errors.push('severity is required');
    } else if (!SEVERITY.isValid(data.severity)) {
      errors.push(`severity must be an integer between ${SEVERITY.MIN} and ${SEVERITY.MAX}, got ${data.severity}`);
    }

    // painType — optional, but if provided must be in PAIN_TYPES registry
    if (data.painType !== undefined && data.painType !== null) {
      if (!PAIN_TYPE_VALUES.has(data.painType)) {
        errors.push(`painType "${data.painType}" is not in registry. Allowed: ${[...PAIN_TYPE_VALUES].join(', ')}`);
      }
    }

    // startedAt — required ISO8601 string
    if (!data.startedAt || typeof data.startedAt !== 'string') {
      errors.push('startedAt is required');
    } else if (isNaN(Date.parse(data.startedAt))) {
      errors.push(`startedAt "${data.startedAt}" is not a valid date`);
    }

    return { valid: errors.length === 0, errors };
  }
}
