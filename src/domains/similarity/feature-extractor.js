// FeatureExtractor — extracts a feature vector stub from a CaseEntity.
// Extracts: diseaseKey, symptoms, foods, experiments, qualityScore, duration, outcome.
// Does NOT compute similarity scores. Does NOT save anything.

/**
 * @typedef {{
 *   diseaseKey:        string,
 *   diseaseKeys:       string[],
 *   symptoms:          string[],
 *   foods:             string[],
 *   experimentCount:   number,
 *   qualityScore:      number,
 *   durationDays:      number,
 *   hasOutcome:        boolean,
 *   consentLevel:      number,
 *   recordCount:       number,
 * }} FeatureVector
 */

/**
 * Extract duration in days from startDate/endDate on a CaseEntity.
 * @param {object} caseEntity
 * @returns {number}
 */
function _durationDays(caseEntity) {
  const start = caseEntity.startDate ? new Date(caseEntity.startDate).getTime() : NaN;
  const end   = caseEntity.endDate   ? new Date(caseEntity.endDate).getTime()   : NaN;
  if (isNaN(start) || isNaN(end)) return caseEntity.recordCount ?? 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export class FeatureExtractor {
  /**
   * Extract a FeatureVector from a CaseEntity.
   * @param {object} caseEntity  domain CaseEntity (from CaseRepositoryImpl)
   * @returns {FeatureVector}
   */
  extract(caseEntity) {
    if (!caseEntity) throw new TypeError('[FeatureExtractor] caseEntity must not be null');

    return Object.freeze({
      diseaseKey:      caseEntity.diseaseKey   ?? 'UNKNOWN',
      diseaseKeys:     Array.isArray(caseEntity.diseaseKeys) ? [...caseEntity.diseaseKeys] : [],

      // Symptom features — sourced from qualityBreakdown or empty stub
      symptoms:        Array.isArray(caseEntity.symptoms)    ? [...caseEntity.symptoms]    : [],

      // Food/diet features — not yet populated until record-level data is attached
      foods:           Array.isArray(caseEntity.foods)       ? [...caseEntity.foods]       : [],

      // Experiment features
      experimentCount: Array.isArray(caseEntity.experimentIds)
        ? caseEntity.experimentIds.length
        : 0,

      // Quantitative features
      qualityScore:    caseEntity.qualityScore  ?? 0,
      durationDays:    _durationDays(caseEntity),
      hasOutcome:      caseEntity.hasOutcome    ?? false,
      consentLevel:    caseEntity.consentLevel  ?? 0,
      recordCount:     caseEntity.recordCount   ?? 0,
    });
  }
}
