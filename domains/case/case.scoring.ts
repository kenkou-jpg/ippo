import type { QualityScore } from "./case.entity";
import type { ConsentLevel } from "../../policies";
import { QUALITY_SCORE } from "../../policies";

export interface ScoringInput {
  // coverage: recorded days / duration days
  recordedDays: number;
  durationDays: number;
  // completeness: average field-fill rate per record (0-1)
  completenessRate: number;
  // outcome: whether a completed experiment with outcome exists
  hasOutcome: boolean;
  // consent level (0-3)
  consentLevel: ConsentLevel;
}

/** coverage ratio clamped to [0, 1] */
function coverageRatio(input: ScoringInput): number {
  if (input.durationDays <= 0) return 0;
  return Math.min(1, input.recordedDays / input.durationDays);
}

/** duration score: 30pts max, linear up to 180 days */
function durationScore(durationDays: number): number {
  const max = QUALITY_SCORE.duration;
  return Math.round(Math.min(max, (durationDays / 180) * max));
}

/** coverage score: 30pts max at 100% coverage */
function coverageScore(ratio: number): number {
  return Math.round(ratio * QUALITY_SCORE.coverage);
}

/** completeness score: 15pts max based on avg field fill rate */
function completenessScore(rate: number): number {
  return Math.round(Math.min(1, rate) * QUALITY_SCORE.completeness);
}

/** outcome score: 15pts if at least one outcome exists */
function outcomeScore(hasOutcome: boolean): number {
  return hasOutcome ? QUALITY_SCORE.outcome : 0;
}

/** consent score: 0=0, 1=4, 2=7, 3=10 */
function consentScore(level: ConsentLevel): number {
  const map: Record<ConsentLevel, number> = { 0: 0, 1: 4, 2: 7, 3: 10 };
  return map[level];
}

export function computeQualityScore(input: ScoringInput): QualityScore {
  const ratio = coverageRatio(input);

  const cs = coverageScore(ratio);
  const ds = durationScore(input.durationDays);
  const comps = completenessScore(input.completenessRate);
  const os = outcomeScore(input.hasOutcome);
  const cons = consentScore(input.consentLevel);

  return {
    total: cs + ds + comps + os + cons,
    coverageScore: cs,
    durationScore: ds,
    completenessScore: comps,
    outcomeScore: os,
    consentScore: cons,
  };
}
