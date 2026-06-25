// CaseEligibility — Quality Score 計算と最低資格チェック。
// SSOT: FD-001 (Quality Score), FD-002 (Tier条件) — Tier判定は PR-017。
// この層では Tier判定禁止。eligible/ineligible と Quality Score のみ返す。
//
// 配点 (FD-001 確定版):
//   Coverage     max 30
//   Duration     max 30
//   Completeness max 15
//   Outcome      max 15
//   Consent      max 10
//   合計          max 100

// ── Sub-scorers ───────────────────────────────────────────────────────────────

/**
 * @param {number} coverageRate  0-1
 * @returns {number}
 */
function _coverageScore(coverageRate) {
  if (coverageRate >= 0.85) return 30;
  if (coverageRate >= 0.70) return 23;
  if (coverageRate >= 0.60) return 18;
  if (coverageRate >= 0.40) return 10;
  return 0;
}

/**
 * @param {number} daysRecorded
 * @returns {number}
 */
function _durationScore(daysRecorded) {
  if (daysRecorded >= 360) return 30;
  if (daysRecorded >= 180) return 25;
  if (daysRecorded >= 90)  return 18;
  if (daysRecorded >= 30)  return 10;
  return 0;
}

/**
 * @param {number} avgFieldFillRate  0-1
 * @returns {number}
 */
function _completenessScore(avgFieldFillRate) {
  if (avgFieldFillRate >= 0.90) return 15;
  if (avgFieldFillRate >= 0.70) return 11;
  if (avgFieldFillRate >= 0.50) return 8;
  return 4;
}

/**
 * @param {number} outcomeCount
 * @param {number} avgOutcomeQuality  0-100
 * @returns {number}
 */
function _outcomeScore(outcomeCount, avgOutcomeQuality = 0) {
  if (outcomeCount === 0) return 0;
  if (outcomeCount === 1) return Math.min(8 + (avgOutcomeQuality * 0.07), 15);
  return Math.min(12 + (avgOutcomeQuality * 0.03), 15);
}

/**
 * @param {number} consentLevel  0-3
 * @returns {number}
 */
function _consentScore(consentLevel) {
  if (consentLevel >= 3) return 10;
  if (consentLevel >= 2) return 7;
  if (consentLevel >= 1) return 4;
  return 0;
}

// ── Minimum eligibility thresholds (Tier3 floor — FD-002) ─────────────────────

const MIN_DAYS_RECORDED  = 30;
const MIN_COVERAGE_RATE  = 0.60;
const MIN_DISEASE_KEYS   = 1;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute the Quality Score breakdown.
 * @param {{
 *   coverageRate:       number,
 *   daysRecorded:       number,
 *   avgFieldFillRate:   number,
 *   completedExperiments: number,
 *   avgOutcomeQuality?: number,
 *   consentLevel:       number,
 * }} params
 * @returns {{
 *   total:       number,
 *   coverage:    number,
 *   duration:    number,
 *   completeness:number,
 *   outcome:     number,
 *   consent:     number,
 * }}
 */
export function computeQualityScore({
  coverageRate,
  daysRecorded,
  avgFieldFillRate,
  completedExperiments,
  avgOutcomeQuality = 0,
  consentLevel,
}) {
  const coverage     = _coverageScore(coverageRate);
  const duration     = _durationScore(daysRecorded);
  const completeness = _completenessScore(avgFieldFillRate);
  const outcome      = _outcomeScore(completedExperiments, avgOutcomeQuality);
  const consent      = _consentScore(consentLevel);
  return {
    total: Math.round((coverage + duration + completeness + outcome + consent) * 100) / 100,
    coverage,
    duration,
    completeness,
    outcome,
    consent,
  };
}

/**
 * Check minimum eligibility to become a Case Candidate.
 * Returns eligible=true when the candidate meets the Tier3 floor requirements.
 * Tier assignment itself is deferred to PR-017.
 *
 * @param {{
 *   daysRecorded:    number,
 *   coverageRate:    number,
 *   diseaseKeyCount: number,
 * }} params
 * @returns {{ eligible: boolean, missingFields: string[] }}
 */
export function checkEligibility({ daysRecorded, coverageRate, diseaseKeyCount }) {
  const missingFields = [];
  if (daysRecorded < MIN_DAYS_RECORDED)   missingFields.push(`daysRecorded < ${MIN_DAYS_RECORDED}`);
  if (coverageRate  < MIN_COVERAGE_RATE)  missingFields.push(`coverageRate < ${MIN_COVERAGE_RATE}`);
  if (diseaseKeyCount < MIN_DISEASE_KEYS) missingFields.push('diseaseKey missing');
  return { eligible: missingFields.length === 0, missingFields };
}
