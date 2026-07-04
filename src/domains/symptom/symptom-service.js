// symptom-service.js — Symptom domain entry point for ApiGateway.
// Exposes type registries and validation. No persistence in Wave1.
// All UI access must go through ApiGateway → SymptomService.
// PR-028: Symptom Intelligence Foundation

import { SYMPTOM_CATEGORIES, PAIN_TYPES, SYMPTOM_CATEGORY_VALUES, PAIN_TYPE_VALUES } from './symptom-types.js';

export class SymptomService {
  #validator;

  /** @param {{ validator: import('./symptom-validator.js').SymptomValidator }} deps */
  constructor({ validator }) {
    this.#validator = validator;
  }

  /**
   * Return the full Symptom Category registry.
   * @returns {{ values: string[], registry: object }}
   */
  getSymptomTypes() {
    return {
      values:   [...SYMPTOM_CATEGORY_VALUES],
      registry: { ...SYMPTOM_CATEGORIES },
    };
  }

  /**
   * Return the full Pain Type registry.
   * @returns {{ values: string[], registry: object }}
   */
  getPainTypes() {
    return {
      values:   [...PAIN_TYPE_VALUES],
      registry: { ...PAIN_TYPES },
    };
  }

  /**
   * Validate a symptom input object against all SSOT registries.
   * Returns { valid, errors }.
   * @param {object} data
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateSymptom(data) {
    return this.#validator.validate(data);
  }
}
