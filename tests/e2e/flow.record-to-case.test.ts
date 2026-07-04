/**
 * E2E Flow: Record → Case Generation
 *
 * Verifies that the record ingestion pipeline deterministically produces
 * a Case with the correct quality score and tier when pre-conditions are met.
 */
import { describe, it, expect } from "vitest";
import { generateCase, CaseGenerationError, CASE_GENERATION_RULES, type CaseGenerationInput } from "../../domains/case/case.factory";
import { computeQualityScore } from "../../domains/case/case.scoring";
import { classifyTier } from "../../domains/case/case.tier";
import { EVENTS } from "../../shared/events";
import type { ConsentLevel } from "../../policies";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<CaseGenerationInput> = {}): CaseGenerationInput {
  return {
    userId: "user_e2e_001",
    diseaseKey: "endometriosis",
    startDate: "2026-01-01",
    endDate: "2026-04-01",
    recordCount: 30,
    experimentIds: ["exp_001"],
    completedExperimentsCount: 1,
    recordedDays: 75,
    durationDays: 90,
    completenessRate: 0.80,
    hasOutcome: true,
    outcomeCount: 1,
    consentLevel: 1 as ConsentLevel,
    ...overrides,
  };
}

function addDays(date: string, n: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── Flow: 21-day minimum ──────────────────────────────────────────────────────

describe("Record → Case Generation Flow", () => {
  it("generates a case after 21-day minimum with ≥7 records and ≥1 outcome", () => {
    const input = makeInput({
      durationDays: 21,
      recordCount: 7,
      recordedDays: 21,
      outcomeCount: 1,
    });
    const result = generateCase(input);
    expect(result.caseEntity).toBeDefined();
    expect(result.caseEntity.userId).toBe("user_e2e_001");
    expect(result.caseEntity.diseaseKey).toBe("endometriosis");
  });

  it("case ID follows CASE-{PREFIX}-{YYYYMM}-{RANDOM8} format", () => {
    const result = generateCase(makeInput());
    expect(result.caseEntity.id).toMatch(/^CASE-[A-Z]{4}-\d{6}-[A-Z0-9]{8}$/);
  });

  it("quality score is deterministic for the same input", () => {
    const input = makeInput();
    const r1 = generateCase(input);
    const r2 = generateCase(input);
    expect(r1.caseEntity.qualityScore).toBe(r2.caseEntity.qualityScore);
  });

  it("quality score components sum to total (FD-001 SSOT check)", () => {
    const input = makeInput();
    const { qualityScore } = generateCase(input);
    const expectedTotal =
      qualityScore.coverageScore +
      qualityScore.durationScore +
      qualityScore.completenessScore +
      qualityScore.outcomeScore +
      qualityScore.consentScore;
    expect(qualityScore.total).toBe(expectedTotal);
  });

  it("quality score total does not exceed 100", () => {
    const input = makeInput({
      durationDays: 365,
      recordedDays: 365,
      completenessRate: 1.0,
      hasOutcome: true,
      consentLevel: 3 as ConsentLevel,
    });
    const { qualityScore } = generateCase(input);
    expect(qualityScore.total).toBeLessThanOrEqual(100);
  });

  it("tier classification matches quality score (FD-002 SSOT check)", () => {
    const input = makeInput({
      durationDays: 90,
      recordedDays: 70,
      completenessRate: 0.8,
      hasOutcome: true,
      consentLevel: 1 as ConsentLevel,
      completedExperimentsCount: 1,
    });
    const { caseEntity, qualityScore } = generateCase(input);
    const coverageRatio = 70 / 90;
    const expectedTier = classifyTier({
      qualityScore: qualityScore.total,
      durationDays: 90,
      coverageRatio,
      hasDiseaseTag: true,
      completedExperimentsCount: 1,
      consentLevel: 1 as ConsentLevel,
    });
    expect(caseEntity.tier).toBe(expectedTier ?? "CANDIDATE");
  });

  it("emits case_generated event", () => {
    const { event } = generateCase(makeInput());
    expect(event.type).toBe(EVENTS.CASE_GENERATED);
    expect(event.payload).toMatchObject({
      userId: "user_e2e_001",
      diseaseKey: "endometriosis",
    });
  });

  // ── Failure scenarios ──────────────────────────────────────────────────────

  it("FAILURE: throws CaseGenerationError when durationDays < 21", () => {
    const input = makeInput({ durationDays: 20 });
    expect(() => generateCase(input)).toThrow(CaseGenerationError);
  });

  it("FAILURE: throws CaseGenerationError when recordCount < 7", () => {
    const input = makeInput({ recordCount: 6 });
    expect(() => generateCase(input)).toThrow(CaseGenerationError);
  });

  it("FAILURE: throws CaseGenerationError when outcomeCount = 0", () => {
    const input = makeInput({ outcomeCount: 0, hasOutcome: false });
    expect(() => generateCase(input)).toThrow(CaseGenerationError);
  });

  it("FAILURE: throws CaseGenerationError when userId is empty", () => {
    const input = makeInput({ userId: "" });
    expect(() => generateCase(input)).toThrow(CaseGenerationError);
  });

  it("FAILURE: case without diseaseKey is rejected", () => {
    const input = makeInput({ diseaseKey: "" });
    expect(() => generateCase(input)).toThrow(CaseGenerationError);
  });

  // ── Tier boundary E2E ──────────────────────────────────────────────────────

  it("TIER2 requires consent ≥ 1, duration ≥ 90 days, 1 completed experiment", () => {
    const t2 = makeInput({
      durationDays: 90,
      recordedDays: 70,
      completenessRate: 0.8,
      hasOutcome: true,
      consentLevel: 1 as ConsentLevel,
      completedExperimentsCount: 1,
    });
    const { caseEntity } = generateCase(t2);
    expect(["TIER2", "TIER1"]).toContain(caseEntity.tier);
  });

  it("TIER1 requires consent ≥ 2, duration ≥ 180 days, 2 completed experiments", () => {
    const t1 = makeInput({
      durationDays: 180,
      recordedDays: 150,
      completenessRate: 0.9,
      hasOutcome: true,
      consentLevel: 2 as ConsentLevel,
      completedExperimentsCount: 2,
    });
    const { caseEntity } = generateCase(t1);
    expect(caseEntity.tier).toBe("TIER1");
  });

  it("CANDIDATE when quality is too low for any tier", () => {
    const candidate = makeInput({
      durationDays: 21,
      recordedDays: 13,
      completenessRate: 0.5,
      hasOutcome: true,
      consentLevel: 0 as ConsentLevel,
      completedExperimentsCount: 0,
    });
    const { caseEntity } = generateCase(candidate);
    expect(["CANDIDATE", "TIER3"]).toContain(caseEntity.tier);
  });

  // ── Performance smoke ──────────────────────────────────────────────────────

  it("PERF: generates 1000 cases in < 5 seconds", () => {
    const input = makeInput();
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      generateCase({ ...input, userId: `user_perf_${i}` });
    }
    expect(Date.now() - start).toBeLessThan(5000);
  });
});
