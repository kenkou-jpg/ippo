// anonymization-service.js — Anonymization pipeline for Research Datasets.
// Wave1: k-anonymity (k>=5) only.
// BD-019: all anonymization steps are auditable.
// BD-021: source data is never deleted.
// PR-040: Research Dataset Foundation

import { ANONYMIZATION_LEVEL, K_ANONYMITY_MIN_K } from './research-dataset-types.js';
import { validateKAnonymity }                       from './research-dataset-validator.js';

/** Fields considered personal identifiers in Wave1. */
const PERSONAL_ID_FIELDS = Object.freeze(['userId', 'recordId', 'email', 'name', 'deviceId']);

export class AnonymizationService {

  /**
   * Remove direct personal identifiers from an array of records.
   * Returns new objects — originals are not mutated.
   * @param {object[]} records
   * @returns {object[]}
   */
  removePersonalIdentifiers(records) {
    if (!Array.isArray(records)) throw new Error('[AnonymizationService] records must be an array');
    return records.map(record => {
      const cleaned = { ...record };
      for (const field of PERSONAL_ID_FIELDS) {
        if (field in cleaned) {
          delete cleaned[field];
        }
      }
      return Object.freeze(cleaned);
    });
  }

  /**
   * Apply k-anonymity grouping (Wave1: k >= K_ANONYMITY_MIN_K).
   * Groups records by signalType (the quasi-identifier). Groups smaller than k are suppressed.
   * @param {object[]} records
   * @param {number}   [k=5]
   * @returns {{ anonymized: object[], suppressed: number, groups: object }}
   */
  applyKAnonymity(records, k = K_ANONYMITY_MIN_K) {
    if (!Array.isArray(records)) throw new Error('[AnonymizationService] records must be an array');
    const validation = validateKAnonymity(k);
    if (!validation.valid) throw new Error(`[AnonymizationService] ${validation.errors.join(', ')}`);

    // Group by quasi-identifier (signalType)
    const groups = {};
    for (const rec of records) {
      const key = rec.signalType ?? rec.type ?? 'UNKNOWN';
      if (!groups[key]) groups[key] = [];
      groups[key].push(rec);
    }

    // Suppress groups smaller than k
    const anonymized = [];
    let suppressed   = 0;
    for (const [key, group] of Object.entries(groups)) {
      if (group.length >= k) {
        anonymized.push(...group);
      } else {
        suppressed += group.length;
      }
    }

    return {
      anonymized,
      suppressed,
      groups: Object.fromEntries(
        Object.entries(groups).map(([k2, v]) => [k2, v.length])
      ),
    };
  }

  /**
   * Verify that the dataset contains no personal identifiers.
   * @param {object[]} records
   * @returns {{ verified: boolean, violations: string[] }}
   */
  verifyAnonymous(records) {
    if (!Array.isArray(records)) throw new Error('[AnonymizationService] records must be an array');
    const violations = [];
    for (let i = 0; i < records.length; i++) {
      for (const field of PERSONAL_ID_FIELDS) {
        if (records[i][field] !== undefined) {
          violations.push(`record[${i}] contains personal field "${field}"`);
        }
      }
    }
    return { verified: violations.length === 0, violations };
  }

  /**
   * Return a summary report of the anonymization pipeline.
   * BD-018: includes generatedAt.
   * @param {{ original: object[], anonymized: object[], suppressed: number, level: string }} params
   * @returns {Readonly<object>}
   */
  getAnonymizationReport({ original = [], anonymized = [], suppressed = 0, level = ANONYMIZATION_LEVEL.NONE }) {
    const verification = this.verifyAnonymous(anonymized);
    return Object.freeze({
      generatedAt:        new Date().toISOString(), // BD-018
      level,
      originalCount:      original.length,
      anonymizedCount:    anonymized.length,
      suppressedCount:    suppressed,
      retentionRate:      original.length > 0 ? (anonymized.length / original.length) : 1,
      verified:           verification.verified,
      violations:         verification.violations,
    });
  }
}
