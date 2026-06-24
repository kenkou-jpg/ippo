import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateCase,
  CaseGenerationError,
  CASE_GENERATION_RULES,
  type CaseGenerationInput,
} from "../../../domains/case/case.factory";
import { computeQualityScore } from "../../../domains/case/case.scoring";
import { classifyTier } from "../../../domains/case/case.tier";
import { CaseService, type CaseRepository } from "../../../domains/case/case.service";
import { EVENTS } from "../../../shared/events";
import type { CaseEntity } from "../../../domains/case/case.entity";

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_INPUT: CaseGenerationInput = {
  userId: "user_1",
  diseaseKey: "endometriosis",
  startDate: "2026-01-01",
  endDate: "2026-04-15",
  recordCount: 10,
  experimentIds: ["exp_1"],
  completedExperimentsCount: 1,
  recordedDays: 90,
  durationDays: 104,
  completenessRate: 0.8,
  hasOutcome: true,
  outcomeCount: 1,
  consentLevel: 1,
};

function makeRepo(caseEntity: CaseEntity): CaseRepository {
  return {
    findById: vi.fn().mockResolvedValue(caseEntity),
    findAllByUser: vi.fn().mockResolvedValue([caseEntity]),
    save: vi.fn().mockImplementation(async (c: CaseEntity) => c),
  };
}

// ── Generation pre-conditions ─────────────────────────────────────────────────

describe("case.factory — generateCase pre-conditions", () => {
  it("succeeds with valid input", () => {
    const { caseEntity } = generateCase(BASE_INPUT);
    expect(caseEntity.userId).toBe("user_1");
    expect(caseEntity.diseaseKey).toBe("endometriosis");
    expect(caseEntity.isDeleted).toBe(false);
    expect(caseEntity.id).toMatch(/^CASE-/);
  });

  it("throws when recordCount < 7", () => {
    expect(() =>
      generateCase({ ...BASE_INPUT, recordCount: 6 }),
    ).toThrow(CaseGenerationError);
  });

  it("throws when durationDays < 21", () => {
    expect(() =>
      generateCase({ ...BASE_INPUT, durationDays: 20, recordedDays: 15 }),
    ).toThrow(CaseGenerationError);
  });

  it("throws when outcomeCount < 1", () => {
    expect(() =>
      generateCase({ ...BASE_INPUT, outcomeCount: 0, hasOutcome: false }),
    ).toThrow(CaseGenerationError);
  });

  it("includes all unmet reasons in CaseGenerationError", () => {
    try {
      generateCase({ ...BASE_INPUT, recordCount: 3, durationDays: 10, outcomeCount: 0 });
    } catch (e) {
      expect(e).toBeInstanceOf(CaseGenerationError);
      expect((e as CaseGenerationError).reasons.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("throws when userId is empty", () => {
    expect(() => generateCase({ ...BASE_INPUT, userId: "" })).toThrow(CaseGenerationError);
  });

  it("emits case_generated event", () => {
    const { event } = generateCase(BASE_INPUT);
    expect(event.type).toBe(EVENTS.CASE_GENERATED);
    const p = event.payload as { caseId: string; userId: string; qualityScore: number };
    expect(p.caseId).toMatch(/^CASE-/);
    expect(p.userId).toBe("user_1");
    expect(p.qualityScore).toBeGreaterThan(0);
  });

  it("two cases get distinct ids", () => {
    const { caseEntity: c1 } = generateCase(BASE_INPUT);
    const { caseEntity: c2 } = generateCase(BASE_INPUT);
    expect(c1.id).not.toBe(c2.id);
  });
});

// ── Scoring ───────────────────────────────────────────────────────────────────

describe("case.scoring — computeQualityScore", () => {
  it("total is sum of all components", () => {
    const qs = computeQualityScore({
      recordedDays: 90,
      durationDays: 180,
      completenessRate: 1.0,
      hasOutcome: true,
      consentLevel: 3,
    });
    expect(qs.total).toBe(
      qs.coverageScore + qs.durationScore + qs.completenessScore + qs.outcomeScore + qs.consentScore,
    );
  });

  it("perfect input yields score = 100", () => {
    const qs = computeQualityScore({
      recordedDays: 180,
      durationDays: 180,
      completenessRate: 1.0,
      hasOutcome: true,
      consentLevel: 3,
    });
    expect(qs.total).toBe(100);
  });

  it("no outcome gives outcomeScore = 0", () => {
    const qs = computeQualityScore({
      recordedDays: 90,
      durationDays: 180,
      completenessRate: 0.8,
      hasOutcome: false,
      consentLevel: 1,
    });
    expect(qs.outcomeScore).toBe(0);
  });

  it("consent 0 gives consentScore = 0", () => {
    const qs = computeQualityScore({
      recordedDays: 90,
      durationDays: 180,
      completenessRate: 0.8,
      hasOutcome: true,
      consentLevel: 0,
    });
    expect(qs.consentScore).toBe(0);
  });

  it("zero duration gives zero coverage and duration scores", () => {
    const qs = computeQualityScore({
      recordedDays: 0,
      durationDays: 0,
      completenessRate: 0,
      hasOutcome: false,
      consentLevel: 0,
    });
    expect(qs.coverageScore).toBe(0);
    expect(qs.durationScore).toBe(0);
    expect(qs.total).toBe(0);
  });

  it("coverageScore maxes at 30", () => {
    const qs = computeQualityScore({
      recordedDays: 9999,
      durationDays: 1,
      completenessRate: 0,
      hasOutcome: false,
      consentLevel: 0,
    });
    expect(qs.coverageScore).toBe(30);
  });
});

// ── Tier classification ───────────────────────────────────────────────────────

describe("case.tier — classifyTier", () => {
  const base = {
    hasDiseaseTag: true,
    coverageRatio: 0.85,
    completedExperimentsCount: 2,
    consentLevel: 2 as const,
  };

  it("classifies TIER1 for high-quality input", () => {
    expect(
      classifyTier({ ...base, qualityScore: 80, durationDays: 200 }),
    ).toBe("TIER1");
  });

  it("classifies TIER2 when qualityScore is 60 and 90 days", () => {
    expect(
      classifyTier({
        ...base,
        qualityScore: 60,
        durationDays: 95,
        completedExperimentsCount: 1,
        consentLevel: 1,
      }),
    ).toBe("TIER2");
  });

  it("classifies TIER3 when qualityScore is 35 and 30 days", () => {
    expect(
      classifyTier({
        ...base,
        qualityScore: 35,
        durationDays: 35,
        coverageRatio: 0.65,
        completedExperimentsCount: 0,
        consentLevel: 0,
      }),
    ).toBe("TIER3");
  });

  it("classifies CANDIDATE when quality is low but coverage/duration met", () => {
    expect(
      classifyTier({
        ...base,
        qualityScore: 10,
        durationDays: 31,
        coverageRatio: 0.62,
        completedExperimentsCount: 0,
        consentLevel: 0,
      }),
    ).toBe("CANDIDATE");
  });

  it("returns null when hasDiseaseTag is false", () => {
    expect(
      classifyTier({ ...base, qualityScore: 80, durationDays: 200, hasDiseaseTag: false }),
    ).toBeNull();
  });

  it("returns null when duration is too short", () => {
    expect(
      classifyTier({ ...base, qualityScore: 80, durationDays: 10, coverageRatio: 0.9 }),
    ).toBeNull();
  });
});

// ── CaseService ───────────────────────────────────────────────────────────────

describe("CaseService — updateCase", () => {
  let emitted: unknown[];
  let emit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    emitted = [];
    emit = vi.fn((e) => emitted.push(e));
  });

  function makeExistingCase(overrides: Partial<CaseEntity> = {}): CaseEntity {
    const { caseEntity } = generateCase(BASE_INPUT);
    return { ...caseEntity, ...overrides };
  }

  it("emits case_updated on update", async () => {
    const existing = makeExistingCase();
    const service = new CaseService(makeRepo(existing), emit);

    await service.updateCase(
      existing.id,
      { recordedDays: 90, durationDays: 180, completenessRate: 0.9, hasOutcome: true, consentLevel: 1 },
      { durationDays: 180, coverageRatio: 0.85, hasDiseaseTag: true, completedExperimentsCount: 1, consentLevel: 1 },
    );

    const types = emitted.map((e) => (e as { type: string }).type);
    expect(types).toContain(EVENTS.CASE_UPDATED);
  });

  it("emits case_reclassified when tier changes", async () => {
    const existing = makeExistingCase({ tier: "CANDIDATE" });
    const service = new CaseService(makeRepo(existing), emit);

    await service.updateCase(
      existing.id,
      { recordedDays: 180, durationDays: 180, completenessRate: 1.0, hasOutcome: true, consentLevel: 3 },
      { durationDays: 200, coverageRatio: 0.9, hasDiseaseTag: true, completedExperimentsCount: 2, consentLevel: 3 },
    );

    const types = emitted.map((e) => (e as { type: string }).type);
    expect(types).toContain(EVENTS.CASE_RECLASSIFIED);
    const reclass = emitted.find(
      (e) => (e as { type: string }).type === EVENTS.CASE_RECLASSIFIED,
    ) as { payload: { previousTier: string; newTier: string } };
    expect(reclass.payload.previousTier).toBe("CANDIDATE");
    expect(reclass.payload.newTier).toBe("TIER1");
  });

  it("does NOT emit case_reclassified when tier is unchanged", async () => {
    const existing = makeExistingCase({ tier: "CANDIDATE" });
    const service = new CaseService(makeRepo(existing), emit);

    await service.updateCase(
      existing.id,
      { recordedDays: 20, durationDays: 32, completenessRate: 0.2, hasOutcome: false, consentLevel: 0 },
      { durationDays: 32, coverageRatio: 0.62, hasDiseaseTag: true, completedExperimentsCount: 0, consentLevel: 0 },
    );

    const types = emitted.map((e) => (e as { type: string }).type);
    expect(types).not.toContain(EVENTS.CASE_RECLASSIFIED);
    expect(types).toContain(EVENTS.CASE_UPDATED);
  });

  it("throws when case not found", async () => {
    const repo: CaseRepository = {
      findById: vi.fn().mockResolvedValue(null),
      findAllByUser: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
    };
    const service = new CaseService(repo, emit);
    await expect(
      service.updateCase("bad_id", {} as never, {} as never),
    ).rejects.toThrow("Case not found");
  });
});

// ── Scoring consistency (generateCase round-trip) ─────────────────────────────

describe("generateCase — scoring consistency", () => {
  it("qualityScore in entity matches returned QualityScore.total", () => {
    const { caseEntity, qualityScore } = generateCase(BASE_INPUT);
    expect(caseEntity.qualityScore).toBe(qualityScore.total);
  });

  it("tier in entity reflects qualityScore", () => {
    const { caseEntity, qualityScore } = generateCase({
      ...BASE_INPUT,
      recordedDays: 180,
      durationDays: 180,
      completenessRate: 1.0,
      hasOutcome: true,
      consentLevel: 3,
      completedExperimentsCount: 2,
    });
    expect(qualityScore.total).toBe(100);
    expect(caseEntity.tier).toBe("TIER1");
  });
});
