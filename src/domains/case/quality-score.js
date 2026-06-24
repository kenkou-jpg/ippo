// ============================================================
//  src/domains/case/quality-score.js
//  SSOT: Case Quality Score 計算（FD-001確定版）
//  CONSTITUTION_RECONCILIATION_V1 §CANONICAL DEFINITIONS
//
//  配点:
//    Coverage Score     max 30
//    Duration Score     max 30
//    Completeness Score max 15
//    Outcome Score      max 15
//    Consent Score      max 10
//    合計               max 100
//
//  diseaseTagMultiplier: 廃止（RD-005）
// ============================================================

/**
 * Coverage Score (max 30)
 * coverage_rate = 実記録日数 / case期間日数
 * @param {number} coverageRate - 0.0 〜 1.0
 * @returns {number}
 */
export function calcCoverageScore(coverageRate) {
  if (coverageRate >= 0.85) return 30;
  if (coverageRate >= 0.70) return 23;
  if (coverageRate >= 0.60) return 18;
  if (coverageRate >= 0.40) return 10;
  return 0;
}

/**
 * Duration Score (max 30)
 * @param {number} daysRecorded - 実記録日数
 * @returns {number}
 */
export function calcDurationScore(daysRecorded) {
  if (daysRecorded >= 360) return 30;
  if (daysRecorded >= 180) return 25;
  if (daysRecorded >= 90)  return 18;
  if (daysRecorded >= 30)  return 10;
  return 0;
}

/**
 * Completeness Score (max 15)
 * 対象フィールド: pain_level, energy, sleep_quality, wellness_score
 * @param {number} avgFieldFillRate - 0.0 〜 1.0
 * @returns {number}
 */
export function calcCompletenessScore(avgFieldFillRate) {
  if (avgFieldFillRate >= 0.90) return 15;
  if (avgFieldFillRate >= 0.70) return 11;
  if (avgFieldFillRate >= 0.50) return 8;
  return 4;
}

/**
 * Outcome Score (max 15)
 * @param {number} outcomeCount - Outcome件数（COMPLETED experiment + outcome存在）
 * @param {number} avgOutcomeQuality - 平均 Outcome Quality Score (0-100)
 * @returns {number}
 */
export function calcOutcomeScore(outcomeCount, avgOutcomeQuality = 0) {
  if (outcomeCount === 0) return 0;
  if (outcomeCount === 1) {
    return Math.min(8 + (avgOutcomeQuality * 0.07), 15);
  }
  return Math.min(12 + (avgOutcomeQuality * 0.03), 15);
}

/**
 * Consent Score (max 10)
 * @param {number} consentLevel - 0 〜 3
 * @returns {number}
 */
export function calcConsentScore(consentLevel) {
  if (consentLevel >= 3) return 10;
  if (consentLevel >= 2) return 7;
  if (consentLevel >= 1) return 4;
  return 0;
}

/**
 * Case Quality Score 合計 (max 100)
 * @param {{
 *   coverageRate: number,
 *   daysRecorded: number,
 *   avgFieldFillRate: number,
 *   completedExperiments: number,
 *   avgOutcomeQuality: number,
 *   consentLevel: number
 * }} params
 * @returns {{
 *   total: number,
 *   coverage: number,
 *   duration: number,
 *   completeness: number,
 *   outcome: number,
 *   consent: number
 * }}
 */
export function calcCaseQualityScore({
  coverageRate,
  daysRecorded,
  avgFieldFillRate,
  completedExperiments,
  avgOutcomeQuality = 0,
  consentLevel,
}) {
  const coverage     = calcCoverageScore(coverageRate);
  const duration     = calcDurationScore(daysRecorded);
  const completeness = calcCompletenessScore(avgFieldFillRate);
  const outcome      = calcOutcomeScore(completedExperiments, avgOutcomeQuality);
  const consent      = calcConsentScore(consentLevel);

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
 * Tier判定（FD-002確定版）
 * @param {{
 *   qualityScore: number,
 *   daysRecorded: number,
 *   coverageRate: number,
 *   diseaseKeyCount: number,
 *   completedExperiments: number,
 *   consentLevel: number
 * }} params
 * @returns {'PRE_CANDIDATE'|'CANDIDATE'|'TIER3'|'TIER2'|'TIER1'}
 */
export function evalTier({
  qualityScore,
  daysRecorded,
  coverageRate,
  diseaseKeyCount,
  completedExperiments,
  consentLevel,
}) {
  // TIER1
  if (
    qualityScore >= 75 &&
    daysRecorded >= 180 &&
    coverageRate >= 0.80 &&
    diseaseKeyCount >= 1 &&
    completedExperiments >= 2 &&
    consentLevel >= 2
  ) return 'TIER1';

  // TIER2
  if (
    qualityScore >= 55 &&
    daysRecorded >= 90 &&
    coverageRate >= 0.70 &&
    diseaseKeyCount >= 1 &&
    completedExperiments >= 1 &&
    consentLevel >= 1
  ) return 'TIER2';

  // TIER3: ユーザー承認済みが前提（この関数では質的条件のみ評価）
  if (
    qualityScore >= 30 &&
    daysRecorded >= 30 &&
    coverageRate >= 0.60 &&
    diseaseKeyCount >= 1
  ) return 'TIER3';

  // CANDIDATE: 質的条件は満たすが未承認
  if (
    daysRecorded >= 30 &&
    coverageRate >= 0.60 &&
    diseaseKeyCount >= 1
  ) return 'CANDIDATE';

  return 'PRE_CANDIDATE';
}
