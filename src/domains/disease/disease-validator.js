// disease-validator.js — validates Disease domain input against SSOT registries.
// Controlled fields must match their registry. Free-text is forbidden for those fields.
// Duplicate name prevention is enforced at the service layer (requires repo access).
// PR-029: Disease Entity Foundation

import {
  DISEASE_CATEGORY_VALUES,
  DISEASE_SEVERITY_VALUES,
  DISEASE_CONFIDENCE_VALUES,
} from './disease-types.js';

/**
 * @typedef {{ valid: boolean, errors: string[] }} ValidationResult
 */

export class DiseaseValidator {
  /**
   * Validate a raw disease input object.
   * Returns { valid: true, errors: [] } on success.
   * Returns { valid: false, errors: [...] } with all violations listed.
   * Note: duplicate name check is performed at DiseaseService level.
   *
   * @param {{
   *   name?:        string,
   *   category?:    string,
   *   severity?:    string,
   *   confidence?:  string,
   *   diagnosedAt?: string|null,
   *   resolvedAt?:  string|null,
   * }} data
   * @returns {ValidationResult}
   */
  validate(data = {}) {
    const errors = [];

    // name — required non-empty string
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push('name is required');
    }

    // category — required, must be in registry
    if (data.category === undefined || data.category === null) {
      errors.push('category is required');
    } else if (!DISEASE_CATEGORY_VALUES.has(data.category)) {
      errors.push(`category "${data.category}" is not in registry. Allowed: ${[...DISEASE_CATEGORY_VALUES].join(', ')}`);
    }

    // severity — optional; if provided must be in registry
    if (data.severity !== undefined && data.severity !== null) {
      if (!DISEASE_SEVERITY_VALUES.has(data.severity)) {
        errors.push(`severity "${data.severity}" is not in registry. Allowed: ${[...DISEASE_SEVERITY_VALUES].join(', ')}`);
      }
    }

    // confidence — optional; if provided must be in registry
    if (data.confidence !== undefined && data.confidence !== null) {
      if (!DISEASE_CONFIDENCE_VALUES.has(data.confidence)) {
        errors.push(`confidence "${data.confidence}" is not in registry. Allowed: ${[...DISEASE_CONFIDENCE_VALUES].join(', ')}`);
      }
    }

    // diagnosedAt — optional; if provided must be a parseable date string
    if (data.diagnosedAt !== undefined && data.diagnosedAt !== null) {
      if (typeof data.diagnosedAt !== 'string' || isNaN(Date.parse(data.diagnosedAt))) {
        errors.push(`diagnosedAt "${data.diagnosedAt}" is not a valid date`);
      }
    }

    // resolvedAt — optional; if provided must be a parseable date string
    if (data.resolvedAt !== undefined && data.resolvedAt !== null) {
      if (typeof data.resolvedAt !== 'string' || isNaN(Date.parse(data.resolvedAt))) {
        errors.push(`resolvedAt "${data.resolvedAt}" is not a valid date`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
