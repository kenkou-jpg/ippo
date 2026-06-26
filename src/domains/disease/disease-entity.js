// disease-entity.js — Disease domain entity definition.
// Pure value object. No persistence logic here.
// IPPO-GOV-001 BD-004: Disease Entity is Wave2 target; Wave1 foundation only.
// PR-029: Disease Entity Foundation

import { DISEASE_CATEGORIES, DISEASE_SEVERITY, DISEASE_CONFIDENCE } from './disease-types.js';

let _idCounter = 0;

/**
 * @typedef {{
 *   id:          string,
 *   name:        string,
 *   category:    string,
 *   severity:    string,
 *   confidence:  string,
 *   diagnosedAt: string|null,
 *   resolvedAt:  string|null,
 *   active:      boolean,
 *   metadata:    object,
 *   createdAt:   string,
 * }} DiseaseEntry
 */

/**
 * Build a new DiseaseEntry value object.
 * Does not persist. Caller must validate before calling (use DiseaseValidator).
 *
 * @param {{
 *   name:         string,
 *   category:     string,
 *   severity?:    string,
 *   confidence?:  string,
 *   diagnosedAt?: string|null,
 *   resolvedAt?:  string|null,
 *   active?:      boolean,
 *   metadata?:    object,
 * }} params
 * @returns {DiseaseEntry}
 */
export function buildDiseaseEntry({
  name,
  category,
  severity   = DISEASE_SEVERITY.UNKNOWN,
  confidence = DISEASE_CONFIDENCE.USER_REPORTED,
  diagnosedAt = null,
  resolvedAt  = null,
  active      = true,
  metadata    = {},
}) {
  return Object.freeze({
    id:          `dis_${Date.now()}_${++_idCounter}`,
    name,
    category,
    severity,
    confidence,
    diagnosedAt:  diagnosedAt ?? null,
    resolvedAt:   resolvedAt ?? null,
    active,
    metadata:     Object.freeze({ ...metadata }),
    createdAt:    new Date().toISOString(),
  });
}

/** Expose registry values for external consumers. */
export const DiseaseCategories = DISEASE_CATEGORIES;
export const DiseaseSeverity   = DISEASE_SEVERITY;
export const DiseaseConfidence = DISEASE_CONFIDENCE;
