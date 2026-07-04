// network-signal-validator.js — validates NetworkSignal input against SSOT registries.
// NETWORK ASSET COUNCIL (IPPO-COUNCIL-002) NAC-01.
// BD-013: validation rules are derived from network-signal-types.js SSOT.
// PR-030: Network Signal Foundation

import { SIGNAL_TYPE_VALUES, MENSTRUAL_PHASE_VALUES, VECTOR_VERSION } from './network-signal-types.js';

/**
 * @typedef {{ valid: boolean, errors: string[] }} ValidationResult
 */

export class NetworkSignalValidator {
  /**
   * Validate a raw NetworkSignal input object.
   * Returns { valid: true, errors: [] } on success.
   * Returns { valid: false, errors: [...] } with all violations listed.
   *
   * @param {{
   *   signalType?:      string,
   *   normalizedValue?: number,
   *   rawValue?:        number,
   *   unit?:            string,
   *   timestamp?:       string,
   *   vectorVersion?:   string,
   *   metadata?:        object,
   *   menstrualPhase?:  string,
   * }} data
   * @returns {ValidationResult}
   */
  validate(data = {}) {
    const errors = [];

    // signalType — required, must be in SSOT registry
    if (data.signalType === undefined || data.signalType === null) {
      errors.push('signalType is required');
    } else if (!SIGNAL_TYPE_VALUES.has(data.signalType)) {
      errors.push(`signalType "${data.signalType}" is not in registry. Allowed: ${[...SIGNAL_TYPE_VALUES].join(', ')}`);
    }

    // normalizedValue — required, must be number in [0, 1]
    if (data.normalizedValue === undefined || data.normalizedValue === null) {
      errors.push('normalizedValue is required');
    } else if (typeof data.normalizedValue !== 'number' || isNaN(data.normalizedValue)) {
      errors.push('normalizedValue must be a number');
    } else if (data.normalizedValue < 0 || data.normalizedValue > 1) {
      errors.push(`normalizedValue ${data.normalizedValue} must be in [0, 1]`);
    }

    // rawValue — required, must be a finite number
    if (data.rawValue === undefined || data.rawValue === null) {
      errors.push('rawValue is required');
    } else if (typeof data.rawValue !== 'number' || !isFinite(data.rawValue)) {
      errors.push('rawValue must be a finite number');
    }

    // unit — required non-empty string
    if (!data.unit || typeof data.unit !== 'string' || data.unit.trim() === '') {
      errors.push('unit is required');
    }

    // timestamp — optional; if provided must be a parseable ISO date string
    if (data.timestamp !== undefined && data.timestamp !== null) {
      if (typeof data.timestamp !== 'string' || isNaN(Date.parse(data.timestamp))) {
        errors.push(`timestamp "${data.timestamp}" is not a valid date`);
      }
    }

    // vectorVersion — optional; if provided must match current VECTOR_VERSION
    if (data.vectorVersion !== undefined && data.vectorVersion !== null) {
      if (data.vectorVersion !== VECTOR_VERSION) {
        errors.push(`vectorVersion "${data.vectorVersion}" is not the current version "${VECTOR_VERSION}"`);
      }
    }

    // metadata — optional; if provided must be a plain object
    if (data.metadata !== undefined && data.metadata !== null) {
      if (typeof data.metadata !== 'object' || Array.isArray(data.metadata)) {
        errors.push('metadata must be a plain object');
      }
    }

    // menstrualPhase — optional; if provided must be in registry
    if (data.menstrualPhase !== undefined && data.menstrualPhase !== null) {
      if (!MENSTRUAL_PHASE_VALUES.has(data.menstrualPhase)) {
        errors.push(`menstrualPhase "${data.menstrualPhase}" is not in registry. Allowed: ${[...MENSTRUAL_PHASE_VALUES].join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
