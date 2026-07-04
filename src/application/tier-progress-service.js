// TierProgressService — computes Case-generation progress from a CaseCandidate.
// Delegates tier logic entirely to TierEvaluator + getTierThresholds — no duplication.
// PR-021: UX Foundation — R-07 (Tier3進捗可視化基盤)
import { evaluateTier, getTierThresholds } from '../domains/case/tier-evaluator.js';

export class TierProgressService {
  /**
   * Compute progress toward Tier3 (primary target for Wave1).
   *
   * @param {{
   *   recordsInRange?: number,
   *   coverageRate?:   number,
   *   diseaseKeys?:    string[],
   *   hasOutcome?:     boolean,
   * }} candidate  CaseCandidate or equivalent shape
   *
   * @returns {{
   *   currentCoverage:    number,
   *   requiredCoverage:   number,
   *   currentDays:        number,
   *   requiredDays:       number,
   *   daysRemaining:      number,
   *   progressPercent:    number,
   *   estimatedTier:      string,
   *   missingRequirements: Array<{type:string, required:number, current:number, remaining?:number}>,
   * }}
   */
  getProgress(candidate) {
    const thresholds     = getTierThresholds();
    const t3             = thresholds.TIER3;

    const daysRecorded   = candidate.recordsInRange ?? candidate.daysRecorded ?? 0;
    const coverageRate   = candidate.coverageRate   ?? 0;
    const diseaseKeys    = candidate.diseaseKeys    ?? [];
    const hasOutcome     = candidate.hasOutcome     ?? false;

    const { tier: estimatedTier } = evaluateTier({
      daysRecorded,
      coverageRate,
      diseaseKeyCount: diseaseKeys.length,
      hasOutcome,
    });

    // Per-dimension progress (0–1)
    const dayProgress = Math.min(1, daysRecorded / t3.minDurationDays);
    const covProgress = Math.min(1, coverageRate  / t3.minCoverage);

    // Missing requirements list
    const missingRequirements = [];

    if (diseaseKeys.length === 0) {
      missingRequirements.push({ type: 'DISEASE_TAG', required: 1, current: 0 });
    }
    if (daysRecorded < t3.minDurationDays) {
      missingRequirements.push({
        type:      'DAYS',
        required:  t3.minDurationDays,
        current:   daysRecorded,
        remaining: t3.minDurationDays - daysRecorded,
      });
    }
    if (coverageRate < t3.minCoverage) {
      missingRequirements.push({
        type:      'COVERAGE',
        required:  t3.minCoverage,
        current:   coverageRate,
        remaining: Math.max(0, t3.minCoverage - coverageRate),
      });
    }

    // Weighted progress: days 60%, coverage 40%
    const rawProgress    = missingRequirements.length === 0
      ? 1
      : dayProgress * 0.6 + covProgress * 0.4;

    const progressPercent = Math.min(100, Math.round(rawProgress * 1000) / 10);
    const daysRemaining   = Math.max(0, t3.minDurationDays - daysRecorded);

    return {
      currentCoverage:    coverageRate,
      requiredCoverage:   t3.minCoverage,
      currentDays:        daysRecorded,
      requiredDays:       t3.minDurationDays,
      daysRemaining,
      progressPercent,
      estimatedTier,
      missingRequirements,
    };
  }
}
