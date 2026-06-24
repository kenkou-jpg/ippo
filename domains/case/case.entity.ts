import type { Timestamp } from "../../shared/types/base";
import type { ConsentLevel } from "../../policies";

// Case ID format: CASE-{DISEASE_PREFIX}-{YYYYMM}-{RANDOM8}
// Example: CASE-ENDO-202607-A3X9M2KP
// Frozen — format change = all case IDs must be reissued
export type CaseID = string;

export type CaseTier = "CANDIDATE" | "TIER3" | "TIER2" | "TIER1";

export interface CaseEntity {
  id: CaseID;
  userId: string;          // obfuscated via anonymized_user_map
  diseaseKey: string;
  tier: CaseTier;
  qualityScore: number;    // 0-100
  recordCount: number;
  experimentIds: string[];
  consentLevel: ConsentLevel;
  startDate: string;       // YYYY-MM-DD
  endDate: string | null;  // YYYY-MM-DD
  searchVector: string | null;
  diseaseKeys: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isDeleted: false;        // physical delete is forbidden
}

// Quality score breakdown (FD-001 — frozen)
export interface QualityScore {
  total: number;           // 0-100
  coverageScore: number;   // max 30
  durationScore: number;   // max 30
  completenessScore: number; // max 15
  outcomeScore: number;    // max 15
  consentScore: number;    // max 10
}

// Tier conditions (FD-002 — frozen, do not modify)
export const TIER_CONDITIONS = {
  CANDIDATE: { minDurationDays: 30, minCoverage: 0.60, requiresDiseaseTag: true },
  TIER3:     { minQualityScore: 30, minDurationDays: 30,  minCoverage: 0.60, requiresDiseaseTag: true, minConsent: 0 as ConsentLevel },
  TIER2:     { minQualityScore: 55, minDurationDays: 90,  minCoverage: 0.70, requiresDiseaseTag: true, minExperimentsCompleted: 1, minConsent: 1 as ConsentLevel },
  TIER1:     { minQualityScore: 75, minDurationDays: 180, minCoverage: 0.80, requiresDiseaseTag: true, minExperimentsCompleted: 2, minConsent: 2 as ConsentLevel },
} as const;
