// disease-service.js — Disease domain entry point for ApiGateway.
// Responsible for validate / create / list / findActive / findResolved.
// Wave1: no Diagnosis Engine, no Recommendation, no Network Search, no AI.
// All UI access must go through ApiGateway → DiseaseService.
// IPPO-GOV-001 BD-004 / BD-007 / BD-008 compliance.
// PR-029: Disease Entity Foundation

import { buildDiseaseEntry } from './disease-entity.js';
import {
  DISEASE_CATEGORIES,
  DISEASE_SEVERITY,
  DISEASE_CONFIDENCE,
  DISEASE_CATEGORY_VALUES,
  DISEASE_SEVERITY_VALUES,
  DISEASE_CONFIDENCE_VALUES,
} from './disease-types.js';

export class DiseaseService {
  #validator;
  #repository;

  /**
   * @param {{
   *   validator:  import('./disease-validator.js').DiseaseValidator,
   *   repository: import('./disease-repository.js').DiseaseRepository,
   * }} deps
   */
  constructor({ validator, repository }) {
    this.#validator  = validator;
    this.#repository = repository;
  }

  /**
   * Validate disease input including duplicate name check.
   * @param {object} data
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(data) {
    const result = this.#validator.validate(data);
    if (!result.valid) return result;

    if (data.name) {
      const name = data.name.trim();
      const dup  = this.#repository.findAll().find(e => e.name === name);
      if (dup) {
        return { valid: false, errors: [`Disease with name "${name}" already exists (id: ${dup.id})`] };
      }
    }
    return { valid: true, errors: [] };
  }

  /**
   * Create and store a new disease entry.
   * Throws if validation fails.
   * @param {object} data
   * @returns {import('./disease-entity.js').DiseaseEntry}
   */
  create(data) {
    const validation = this.validate(data);
    if (!validation.valid) {
      throw new Error(`[DiseaseService] Validation failed: ${validation.errors.join('; ')}`);
    }
    const entry = buildDiseaseEntry(data);
    return this.#repository.append(entry);
  }

  /**
   * Return all disease entries.
   * @returns {import('./disease-entity.js').DiseaseEntry[]}
   */
  list() {
    return this.#repository.findAll();
  }

  /**
   * Return all active disease entries.
   * @returns {import('./disease-entity.js').DiseaseEntry[]}
   */
  findActive() {
    return this.#repository.findActive();
  }

  /**
   * Return all resolved disease entries.
   * @returns {import('./disease-entity.js').DiseaseEntry[]}
   */
  findResolved() {
    return this.#repository.findResolved();
  }

  /**
   * Return the Disease Category registry.
   * @returns {{ values: string[], registry: object }}
   */
  getDiseaseCategories() {
    return {
      values:   [...DISEASE_CATEGORY_VALUES],
      registry: { ...DISEASE_CATEGORIES },
    };
  }

  /**
   * Return the Disease Severity registry.
   * @returns {{ values: string[], registry: object }}
   */
  getDiseaseSeverities() {
    return {
      values:   [...DISEASE_SEVERITY_VALUES],
      registry: { ...DISEASE_SEVERITY },
    };
  }

  /**
   * Return the Disease Confidence registry.
   * @returns {{ values: string[], registry: object }}
   */
  getDiseaseConfidenceLevels() {
    return {
      values:   [...DISEASE_CONFIDENCE_VALUES],
      registry: { ...DISEASE_CONFIDENCE },
    };
  }
}
