// symptom-entity.js — Symptom domain entity definition.
// Pure data structure. No persistence logic here.
// PR-028: Symptom Intelligence Foundation

import { SYMPTOM_CATEGORIES, PAIN_TYPES, SEVERITY } from './symptom-types.js';

let _idCounter = 0;

/**
 * @typedef {{
 *   id:         string,
 *   recordId:   string,
 *   category:   string,
 *   severity:   number,
 *   painType:   string|null,
 *   bodyPart:   string|null,
 *   startedAt:  string,
 *   endedAt:    string|null,
 *   memo:       string|null,
 *   createdAt:  string,
 * }} SymptomEntry
 */

/**
 * Build a new SymptomEntry value object.
 * Does not persist. Caller must validate before calling (use SymptomValidator).
 *
 * @param {{
 *   recordId:  string,
 *   category:  string,
 *   severity:  number,
 *   painType?: string|null,
 *   bodyPart?: string|null,
 *   startedAt: string,
 *   endedAt?:  string|null,
 *   memo?:     string|null,
 * }} params
 * @returns {SymptomEntry}
 */
export function buildSymptomEntry({
  recordId,
  category,
  severity,
  painType  = null,
  bodyPart  = null,
  startedAt,
  endedAt   = null,
  memo      = null,
}) {
  return Object.freeze({
    id:        `sym_${Date.now()}_${++_idCounter}`,
    recordId,
    category,
    severity,
    painType:  painType ?? null,
    bodyPart:  bodyPart ?? null,
    startedAt,
    endedAt:   endedAt ?? null,
    memo:      memo ?? null,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Expose registry values for external consumers who need to enumerate them.
 */
export const SymptomCategories = SYMPTOM_CATEGORIES;
export const PainTypes         = PAIN_TYPES;
export const SeverityRange     = SEVERITY;
