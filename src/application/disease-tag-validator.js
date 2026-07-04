// DiseaseTagValidator — pre-save WARNING for records missing disease tags.
// Severity: WARNING only. Does NOT block saves.
// Purpose: measure DiseaseTagCoverage in Wave1 (R-03).
// PR-021: UX Foundation

/**
 * @typedef {{ valid: boolean, severity?: 'WARNING', message?: string }} ValidationResult
 */

export class DiseaseTagValidator {
  /**
   * Validate that a record has at least one disease tag.
   * Returns a WARNING (non-blocking) if diseaseKeys is empty or absent.
   *
   * @param {object} record
   * @returns {ValidationResult}
   */
  validate(record) {
    const diseaseKeys = record.diseaseKeys ?? record.diseases ?? [];
    const hasTag = Array.isArray(diseaseKeys) && diseaseKeys.length > 0;

    if (!hasTag) {
      console.warn(
        '[DiseaseTagValidator] WARNING: record has no disease tags. ' +
        'This record will not qualify for Tier3. ' +
        `recordDate=${record.recordDate ?? 'unknown'}`,
      );
      return {
        valid:    false,
        severity: 'WARNING',
        message:  'No disease tags — record will not contribute to Tier3 qualification',
      };
    }

    return { valid: true };
  }
}
