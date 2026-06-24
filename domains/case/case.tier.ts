import type { CaseTier } from "./case.entity";
import { TIER_CONDITIONS } from "./case.entity";
import type { ConsentLevel } from "../../policies";

export interface TierInput {
  qualityScore: number;
  durationDays: number;
  coverageRatio: number;     // 0-1
  hasDiseaseTag: boolean;
  completedExperimentsCount: number;
  consentLevel: ConsentLevel;
}

/**
 * Classifies a case into its highest achievable tier.
 * Evaluates TIER1 → TIER2 → TIER3 → CANDIDATE → null (ineligible).
 * Returns null when even CANDIDATE conditions are not met.
 */
export function classifyTier(input: TierInput): CaseTier | null {
  if (!input.hasDiseaseTag) return null;

  const c = TIER_CONDITIONS;

  if (
    input.qualityScore >= c.TIER1.minQualityScore &&
    input.durationDays >= c.TIER1.minDurationDays &&
    input.coverageRatio >= c.TIER1.minCoverage &&
    input.completedExperimentsCount >= c.TIER1.minExperimentsCompleted &&
    input.consentLevel >= c.TIER1.minConsent
  ) {
    return "TIER1";
  }

  if (
    input.qualityScore >= c.TIER2.minQualityScore &&
    input.durationDays >= c.TIER2.minDurationDays &&
    input.coverageRatio >= c.TIER2.minCoverage &&
    input.completedExperimentsCount >= c.TIER2.minExperimentsCompleted &&
    input.consentLevel >= c.TIER2.minConsent
  ) {
    return "TIER2";
  }

  if (
    input.qualityScore >= c.TIER3.minQualityScore &&
    input.durationDays >= c.TIER3.minDurationDays &&
    input.coverageRatio >= c.TIER3.minCoverage
  ) {
    return "TIER3";
  }

  if (
    input.durationDays >= c.CANDIDATE.minDurationDays &&
    input.coverageRatio >= c.CANDIDATE.minCoverage
  ) {
    return "CANDIDATE";
  }

  return null;
}
