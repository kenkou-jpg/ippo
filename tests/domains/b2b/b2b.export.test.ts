import { describe, it, expect, vi, beforeEach } from "vitest";
import { B2BExportService } from "../../../domains/b2b/b2b.export.service";
import { B2BCohortBuilder } from "../../../domains/b2b/b2b.cohort.builder";
import { B2BQueryEngine, type B2BCaseView, type CaseViewRepository } from "../../../domains/b2b/b2b.query.engine";
import { B2BAudit, type AuditLogger, type AuditEntry } from "../../../domains/b2b/b2b.audit";
import { anonymizeCase, buildCohortStats } from "../../../domains/b2b/b2b.anonymizer";
import {
  B2BAccessDeniedError,
  CohortTooSmallError,
  KAnonymityViolationError,
  B2B_POLICY,
  type B2BRequester,
} from "../../../domains/b2b/b2b.policy";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAuditLogger(): { logger: AuditLogger; entries: AuditEntry[] } {
  const entries: AuditEntry[] = [];
  const logger: AuditLogger = {
    async log(e) { entries.push(e); },
    async findByRequester(id) { return entries.filter((e) => e.requesterId === id); },
  };
  return { logger, entries };
}

function makeCaseView(overrides: Partial<B2BCaseView> = {}, index = 0): B2BCaseView {
  return {
    caseId: `CASE-ENDO-202601-${String(index).padStart(8, "0")}`,
    diseaseKey: "endometriosis",
    tier: "TIER2",
    qualityScore: 70,
    durationDays: 120,
    experimentIds: ["exp_1"],
    consentLevel: 2,
    similarityEdgeCount: 3,
    ...overrides,
  };
}

/** Build a repository with `n` identical cases (consent ≥ 2 by default). */
function makeCaseRepo(cases: B2BCaseView[]): CaseViewRepository {
  return {
    async findEligibleCases(minConsent) {
      return cases.filter((c) => c.consentLevel >= minConsent);
    },
  };
}

/** Build 100+ cases of a given disease for a passing cohort. */
function largeEnoughCohort(diseaseKey = "endometriosis", n = 150): B2BCaseView[] {
  // Spread across tier×duration combinations so k-anonymity ≥ 5
  const tiers = ["TIER1", "TIER2", "TIER3"];
  const durations = [60, 120, 200, 400];
  return Array.from({ length: n }, (_, i) => makeCaseView({
    diseaseKey,
    tier: tiers[i % tiers.length],
    durationDays: durations[i % durations.length],
  }, i));
}

function makeServices(cases: B2BCaseView[]) {
  const repo = makeCaseRepo(cases);
  const engine = new B2BQueryEngine(repo);
  const cohortBuilder = new B2BCohortBuilder(engine);
  const { logger, entries } = makeAuditLogger();
  const audit = new B2BAudit(logger);
  const svc = new B2BExportService(engine, cohortBuilder, audit);
  return { svc, entries, engine, cohortBuilder };
}

const FULL_REQUESTER: B2BRequester = {
  requesterId: "req_001",
  organizationId: "org_pharma",
  scopes: ["cohort_read", "dataset_export", "report_read"],
};

const READ_ONLY_REQUESTER: B2BRequester = {
  requesterId: "req_002",
  organizationId: "org_research",
  scopes: ["cohort_read", "report_read"],
};

// ── Anonymization Correctness ─────────────────────────────────────────────────

describe("anonymization correctness", () => {
  it("anonymized record contains no caseId or userId", () => {
    const raw = { qualityScore: 75, durationDays: 120, tier: "TIER2", diseaseKey: "endo", experimentIds: ["e1"], index: 0 };
    const anon = anonymizeCase(raw);
    expect(anon).not.toHaveProperty("caseId");
    expect(anon).not.toHaveProperty("userId");
    expect(anon).not.toHaveProperty("occurredAt");
  });

  it("qualityBucket is correct", () => {
    expect(anonymizeCase({ qualityScore: 0,   durationDays: 30,  tier: "TIER3", diseaseKey: "d", experimentIds: [], index: 0 }).qualityBucket).toBe("0-24");
    expect(anonymizeCase({ qualityScore: 25,  durationDays: 30,  tier: "TIER3", diseaseKey: "d", experimentIds: [], index: 1 }).qualityBucket).toBe("25-49");
    expect(anonymizeCase({ qualityScore: 50,  durationDays: 30,  tier: "TIER3", diseaseKey: "d", experimentIds: [], index: 2 }).qualityBucket).toBe("50-74");
    expect(anonymizeCase({ qualityScore: 75,  durationDays: 30,  tier: "TIER3", diseaseKey: "d", experimentIds: [], index: 3 }).qualityBucket).toBe("75-100");
  });

  it("durationBucket is correct", () => {
    expect(anonymizeCase({ qualityScore: 50, durationDays: 90,  tier: "TIER2", diseaseKey: "d", experimentIds: [], index: 0 }).durationBucket).toBe("0-90d");
    expect(anonymizeCase({ qualityScore: 50, durationDays: 91,  tier: "TIER2", diseaseKey: "d", experimentIds: [], index: 1 }).durationBucket).toBe("91-180d");
    expect(anonymizeCase({ qualityScore: 50, durationDays: 181, tier: "TIER2", diseaseKey: "d", experimentIds: [], index: 2 }).durationBucket).toBe("181-365d");
    expect(anonymizeCase({ qualityScore: 50, durationDays: 366, tier: "TIER2", diseaseKey: "d", experimentIds: [], index: 3 }).durationBucket).toBe("365d+");
  });

  it("noisy quality score stays within [0, 100]", () => {
    for (let i = 0; i < 50; i++) {
      const anon = anonymizeCase({ qualityScore: i * 2, durationDays: 90, tier: "TIER2", diseaseKey: "d", experimentIds: [], index: i });
      expect(anon.noisyQualityScore).toBeGreaterThanOrEqual(0);
      expect(anon.noisyQualityScore).toBeLessThanOrEqual(100);
    }
  });

  it("cohortStats contains no individual identifiers", () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      anonymizeCase({ qualityScore: 70, durationDays: 120, tier: "TIER2", diseaseKey: "endo", experimentIds: [], index: i }),
    );
    const stats = buildCohortStats(records, "endo", 20);
    expect(stats).not.toHaveProperty("caseId");
    expect(stats).not.toHaveProperty("userId");
    expect(stats).toHaveProperty("totalCases", 10);
  });
});

// ── Access Control ────────────────────────────────────────────────────────────

describe("access control enforcement", () => {
  it("throws B2BAccessDeniedError when scope is missing for queryCohort", async () => {
    const { svc } = makeServices(largeEnoughCohort());
    const noScope: B2BRequester = { requesterId: "r", organizationId: "o", scopes: [] };
    await expect(svc.queryCohort(noScope, "endometriosis")).rejects.toThrow(B2BAccessDeniedError);
  });

  it("throws B2BAccessDeniedError when scope is missing for exportDataset", async () => {
    const { svc } = makeServices(largeEnoughCohort());
    await expect(svc.exportDataset(READ_ONLY_REQUESTER)).rejects.toThrow(B2BAccessDeniedError);
  });

  it("throws B2BAccessDeniedError when scope is missing for generateReport", async () => {
    const { svc } = makeServices(largeEnoughCohort());
    const noReport: B2BRequester = { requesterId: "r", organizationId: "o", scopes: ["cohort_read", "dataset_export"] };
    await expect(svc.generateReport(noReport)).rejects.toThrow(B2BAccessDeniedError);
  });

  it("logs b2b_access_denied when scope check fails", async () => {
    const { svc, entries } = makeServices(largeEnoughCohort());
    const noScope: B2BRequester = { requesterId: "r", organizationId: "o", scopes: [] };
    try { await svc.queryCohort(noScope, "endometriosis"); } catch {}
    const denied = entries.filter((e) => e.outcome === "denied");
    expect(denied.length).toBeGreaterThan(0);
  });

  it("consent < 2 cases are excluded from query results", async () => {
    const lowConsent = Array.from({ length: 10 }, (_, i) => makeCaseView({ consentLevel: 1 }, i));
    const { engine } = makeServices(lowConsent);
    const results = await engine.query();
    expect(results).toHaveLength(0);
  });

  it("allows queryCohort with correct scope", async () => {
    const { svc } = makeServices(largeEnoughCohort());
    await expect(svc.queryCohort(FULL_REQUESTER, "endometriosis")).resolves.toBeDefined();
  });
});

// ── Cohort Threshold Validation ───────────────────────────────────────────────

describe("cohort threshold validation", () => {
  it("throws CohortTooSmallError when < 100 users", async () => {
    const small = Array.from({ length: 50 }, (_, i) => makeCaseView({}, i));
    const { svc } = makeServices(small);
    await expect(svc.queryCohort(FULL_REQUESTER, "endometriosis")).rejects.toThrow(CohortTooSmallError);
  });

  it("MIN_COHORT_USERS is exactly 100", () => {
    expect(B2B_POLICY.MIN_COHORT_USERS).toBe(100);
  });

  it("MIN_CONSENT_LEVEL is exactly 2", () => {
    expect(B2B_POLICY.MIN_CONSENT_LEVEL).toBe(2);
  });

  it("K_ANONYMITY_MIN is exactly 5", () => {
    expect(B2B_POLICY.K_ANONYMITY_MIN).toBe(5);
  });

  it("throws KAnonymityViolationError when all cases share one quasi-identifier group", async () => {
    // 100 cases all with same tier + duration bucket → k = 100, but let's force k < 5
    // by having only 1 case per group — actually all same group gives k=100
    // To get k < 5: have 4 cases in one group and rest in another, but total ≥ 100
    // Easiest: 100 cases all same tier+duration but only 4 of a different tier
    // Actually: all same tier+duration → k = 100 (passes). To force k < 5:
    // We need a group with < 5 members. Put 96 in group A, 4 in group B.
    const cases = [
      ...Array.from({ length: 96 }, (_, i) => makeCaseView({ tier: "TIER2", durationDays: 120 }, i)),
      ...Array.from({ length: 4  }, (_, i) => makeCaseView({ tier: "TIER1", durationDays: 400 }, 96 + i)),
    ];
    const { svc } = makeServices(cases);
    await expect(svc.queryCohort(FULL_REQUESTER, "endometriosis")).rejects.toThrow(KAnonymityViolationError);
  });

  it("cohort with ≥ 100 users and good k passes threshold checks", async () => {
    const { svc } = makeServices(largeEnoughCohort());
    const cohort = await svc.queryCohort(FULL_REQUESTER, "endometriosis");
    expect(cohort.recordCount).toBeGreaterThanOrEqual(B2B_POLICY.MIN_COHORT_USERS);
    expect(cohort.kAnonymity).toBeGreaterThanOrEqual(B2B_POLICY.K_ANONYMITY_MIN);
  });

  it("buildAllCohorts silently skips cohorts that are too small", async () => {
    const cases = [
      ...largeEnoughCohort("endometriosis", 150),
      // only 10 fibromyalgia cases — skipped silently
      ...Array.from({ length: 10 }, (_, i) => makeCaseView({ diseaseKey: "fibromyalgia" }, 200 + i)),
    ];
    const { svc } = makeServices(cases);
    const report = await svc.generateReport(FULL_REQUESTER);
    expect(report.summary.diseaseKeys).toContain("endometriosis");
    expect(report.summary.diseaseKeys).not.toContain("fibromyalgia");
  });
});

// ── Audit Logging ─────────────────────────────────────────────────────────────

describe("audit logging", () => {
  it("logs b2b_query_executed on successful queryCohort", async () => {
    const { svc, entries } = makeServices(largeEnoughCohort());
    await svc.queryCohort(FULL_REQUESTER, "endometriosis");
    expect(entries.some((e) => e.eventType === "b2b.query_executed" && e.outcome === "allowed")).toBe(true);
  });

  it("logs b2b_export_generated on successful exportDataset", async () => {
    const { svc, entries } = makeServices(largeEnoughCohort());
    await svc.exportDataset(FULL_REQUESTER);
    expect(entries.some((e) => e.eventType === "b2b.export_generated" && e.outcome === "allowed")).toBe(true);
  });

  it("logs b2b_export_generated on successful generateReport", async () => {
    const { svc, entries } = makeServices(largeEnoughCohort());
    await svc.generateReport(FULL_REQUESTER);
    expect(entries.some((e) => e.eventType === "b2b.export_generated")).toBe(true);
  });

  it("every audit entry has requesterId and organizationId", async () => {
    const { svc, entries } = makeServices(largeEnoughCohort());
    await svc.queryCohort(FULL_REQUESTER, "endometriosis");
    for (const e of entries) {
      expect(e.requesterId).toBeTruthy();
      expect(e.organizationId).toBeTruthy();
    }
  });
});

// ── Export API ────────────────────────────────────────────────────────────────

describe("export API", () => {
  it("exportDataset returns anonymized records with no raw IDs", async () => {
    const { svc } = makeServices(largeEnoughCohort());
    const ds = await svc.exportDataset(FULL_REQUESTER);
    for (const r of ds.records) {
      expect(r).not.toHaveProperty("caseId");
      expect(r).not.toHaveProperty("userId");
    }
  });

  it("exportDataset respects diseaseKey filter", async () => {
    const cases = [
      ...largeEnoughCohort("endometriosis", 150),
      ...largeEnoughCohort("fibromyalgia", 150),
    ];
    const { svc } = makeServices(cases);
    const ds = await svc.exportDataset(FULL_REQUESTER, { diseaseKey: "endometriosis" });
    expect(ds.records.every((r) => r.diseaseKey === "endometriosis")).toBe(true);
  });

  it("generateReport summary has correct total cohort count", async () => {
    const { svc } = makeServices(largeEnoughCohort("endometriosis", 150));
    const report = await svc.generateReport(FULL_REQUESTER);
    expect(report.summary.totalCohorts).toBe(report.cohorts.length);
    expect(report.summary.totalCases).toBeGreaterThan(0);
  });
});
