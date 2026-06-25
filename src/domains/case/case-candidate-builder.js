// CaseCandidateBuilder — builds a CaseCandidate value object from Records + Experiment.
// Does NOT save anything. The candidate is a pure data structure for eligibility evaluation.
// Case generation (persist to repository) is deferred to PR-017.
import { computeQualityScore, checkEligibility } from './case-eligibility.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const COMPLETENESS_FIELDS = ['painLevel', 'energy', 'sleepQuality', 'wellnessScore'];

/**
 * Compute average field fill rate across all records for the tracked completeness fields.
 * @param {object[]} records  domain-shape records
 * @returns {number}  0-1
 */
function _avgFieldFillRate(records) {
  if (!records.length) return 0;
  let filled = 0;
  let total  = 0;
  for (const r of records) {
    for (const f of COMPLETENESS_FIELDS) {
      total++;
      if (r[f] != null) filled++;
    }
  }
  return total > 0 ? filled / total : 0;
}

/**
 * Collect all disease keys (non-null, non-empty) from records.
 * @param {object[]} records
 * @returns {string[]}
 */
function _collectDiseaseKeys(records) {
  const keys = new Set();
  for (const r of records) {
    if (r.diseaseKey && typeof r.diseaseKey === 'string') keys.add(r.diseaseKey);
    if (Array.isArray(r.diseases)) r.diseases.forEach(d => d && keys.add(String(d)));
  }
  return [...keys];
}

/**
 * Count records whose recordDate falls within [startDate, endDate].
 * @param {object[]} records
 * @param {string}   startDate  YYYY-MM-DD
 * @param {string}   endDate    YYYY-MM-DD
 * @returns {number}
 */
function _countRecordsInRange(records, startDate, endDate) {
  const start = new Date(startDate).getTime();
  const end   = new Date(endDate).getTime();
  return records.filter(r => {
    const d = new Date(r.recordDate ?? '').getTime();
    return !isNaN(d) && d >= start && d <= end;
  }).length;
}

/**
 * Duration in days between two YYYY-MM-DD dates (inclusive).
 * @param {string} startDate
 * @param {string} endDate
 * @returns {number}
 */
function _durationDays(startDate, endDate) {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

// ── Public API ────────────────────────────────────────────────────────────────

export class CaseCandidateBuilder {
  /**
   * Build a CaseCandidate from a set of records and an (optional) completed experiment.
   *
   * @param {{
   *   records:              object[],   domain-shape RecordEntity[]
   *   experiment?:          object|null, domain-shape ExperimentEntity (COMPLETED|ABANDONED)
   *   consentLevel?:        number,      0-3, default 0
   *   completedExperimentsCount?: number default derived from experiment param
   * }} params
   * @returns {object}  CaseCandidate (not yet persisted)
   */
  build({ records, experiment = null, consentLevel = 0, completedExperimentsCount = null }) {
    if (!Array.isArray(records)) throw new TypeError('[CaseCandidateBuilder] records must be an array');

    // Date range: experiment window if available, else full record span
    const sorted = [...records]
      .filter(r => r.recordDate)
      .sort((a, b) => a.recordDate.localeCompare(b.recordDate));

    const startDate = experiment?.startDate
      ?? sorted[0]?.recordDate
      ?? new Date().toISOString().slice(0, 10);
    const endDate   = experiment?.actualEndDate
      ?? experiment?.plannedEndDate
      ?? sorted[sorted.length - 1]?.recordDate
      ?? startDate;

    const durationDays   = _durationDays(startDate, endDate);
    const recordsInRange = _countRecordsInRange(records, startDate, endDate);
    const coverageRate   = durationDays > 0 ? Math.min(1, recordsInRange / durationDays) : 0;
    const avgFillRate    = _avgFieldFillRate(records);
    const diseaseKeys    = experiment?.diseaseKey
      ? [experiment.diseaseKey, ..._collectDiseaseKeys(records).filter(k => k !== experiment.diseaseKey)]
      : _collectDiseaseKeys(records);

    const experimentCount = completedExperimentsCount ??
      (experiment?.status === 'COMPLETED' ? 1 : 0);

    const scoreInput = {
      coverageRate,
      daysRecorded:         recordsInRange,
      avgFieldFillRate:     avgFillRate,
      completedExperiments: experimentCount,
      avgOutcomeQuality:    0,  // outcomeId resolution deferred to PR-017
      consentLevel,
    };
    const qualityScore = computeQualityScore(scoreInput);

    const eligibility = checkEligibility({
      daysRecorded:    recordsInRange,
      coverageRate,
      diseaseKeyCount: diseaseKeys.length,
    });

    return Object.freeze({
      // Identity
      userId:       experiment?.userId ?? null,
      experimentId: experiment?.id     ?? null,
      diseaseKeys,
      primaryDiseaseKey: diseaseKeys[0] ?? null,

      // Window
      startDate,
      endDate,
      durationDays,

      // Coverage
      recordsTotal:  records.length,
      recordsInRange,
      coverageRate,

      // Scores
      qualityScore,      // { total, coverage, duration, completeness, outcome, consent }
      consentLevel,

      // Eligibility (Tier判定は PR-017)
      eligible:      eligibility.eligible,
      missingFields: eligibility.missingFields,

      // Metadata
      builtAt: new Date().toISOString(),
    });
  }
}
