import type { CaseEntity, CaseTier } from "./case.entity";
import type { QualityScore } from "./case.entity";
import { computeQualityScore } from "./case.scoring";
import { classifyTier } from "./case.tier";
import { buildCaseGeneratedEvent, type CaseDomainEvent } from "./case.events";
import type { ConsentLevel } from "../../policies";

// PR-005 generation pre-conditions
export const CASE_GENERATION_RULES = {
  minRecordCount: 7,
  minDurationDays: 21,
  minOutcomeCount: 1,
} as const;

export class CaseGenerationError extends Error {
  constructor(
    message: string,
    public readonly reasons: string[],
  ) {
    super(message);
    this.name = "CaseGenerationError";
  }
}

export interface CaseGenerationInput {
  userId: string;
  diseaseKey: string;
  startDate: string;         // YYYY-MM-DD
  endDate: string | null;    // YYYY-MM-DD
  recordCount: number;
  experimentIds: string[];
  completedExperimentsCount: number;
  recordedDays: number;      // distinct days with records
  durationDays: number;      // endDate - startDate in days
  completenessRate: number;  // 0-1, avg field fill
  hasOutcome: boolean;
  outcomeCount: number;
  consentLevel: ConsentLevel;
}

export interface CaseGenerationResult {
  caseEntity: CaseEntity;
  qualityScore: QualityScore;
  event: CaseDomainEvent;
}

let _counter = 0;

function generateCaseId(diseaseKey: string, startDate: string): string {
  const prefix = diseaseKey.toUpperCase().slice(0, 4);
  const yyyymm = startDate.slice(0, 7).replace("-", "");
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  _counter++;
  return `CASE-${prefix}-${yyyymm}-${rand}`;
}

function validatePreConditions(input: CaseGenerationInput): string[] {
  const reasons: string[] = [];

  if (!input.userId) reasons.push("userId is required");
  if (!input.diseaseKey) reasons.push("diseaseKey is required");
  if (input.recordCount < CASE_GENERATION_RULES.minRecordCount) {
    reasons.push(
      `recordCount must be ≥ ${CASE_GENERATION_RULES.minRecordCount}, got ${input.recordCount}`,
    );
  }
  if (input.durationDays < CASE_GENERATION_RULES.minDurationDays) {
    reasons.push(
      `durationDays must be ≥ ${CASE_GENERATION_RULES.minDurationDays}, got ${input.durationDays}`,
    );
  }
  if (input.outcomeCount < CASE_GENERATION_RULES.minOutcomeCount) {
    reasons.push(
      `outcomeCount must be ≥ ${CASE_GENERATION_RULES.minOutcomeCount}, got ${input.outcomeCount}`,
    );
  }

  return reasons;
}

export function generateCase(input: CaseGenerationInput): CaseGenerationResult {
  const reasons = validatePreConditions(input);
  if (reasons.length > 0) {
    throw new CaseGenerationError("Case generation pre-conditions not met", reasons);
  }

  const qualityScore = computeQualityScore({
    recordedDays: input.recordedDays,
    durationDays: input.durationDays,
    completenessRate: input.completenessRate,
    hasOutcome: input.hasOutcome,
    consentLevel: input.consentLevel,
  });

  const coverageRatio =
    input.durationDays > 0 ? Math.min(1, input.recordedDays / input.durationDays) : 0;

  const tier: CaseTier =
    classifyTier({
      qualityScore: qualityScore.total,
      durationDays: input.durationDays,
      coverageRatio,
      hasDiseaseTag: !!input.diseaseKey,
      completedExperimentsCount: input.completedExperimentsCount,
      consentLevel: input.consentLevel,
    }) ?? "CANDIDATE";

  const now = new Date().toISOString();
  const id = generateCaseId(input.diseaseKey, input.startDate);

  const caseEntity: CaseEntity = {
    id,
    userId: input.userId,
    diseaseKey: input.diseaseKey,
    tier,
    qualityScore: qualityScore.total,
    recordCount: input.recordCount,
    experimentIds: input.experimentIds,
    consentLevel: input.consentLevel,
    startDate: input.startDate,
    endDate: input.endDate,
    searchVector: null,
    diseaseKeys: [input.diseaseKey],
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  const event = buildCaseGeneratedEvent({
    caseId: id,
    userId: input.userId,
    diseaseKey: input.diseaseKey,
    tier,
    qualityScore: qualityScore.total,
    timestamp: now,
  });

  return { caseEntity, qualityScore, event };
}
