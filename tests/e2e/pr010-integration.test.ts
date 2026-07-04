/**
 * PR-010 Integration Validation
 *
 * Tests for the SystemIntegrityChecker and ReleaseGate, verifying
 * that the full domain stack passes all SSOT and consistency checks.
 */
import { describe, it, expect } from "vitest";
import { SystemIntegrityChecker } from "../../infrastructure/validation/system-integrity-checker";
import { evaluateReleaseGate, formatReleaseReport, type E2ESuiteResult } from "../../release/gate";
import { QUALITY_SCORE, CONSENT_LEVELS } from "../../policies";
import { VALID_TRANSITIONS } from "../../domains/experiment/experiment.entity";
import { SIMILARITY_THRESHOLD } from "../../domains/similarity/similarity.scorer";
import { B2B_POLICY } from "../../domains/b2b/b2b.policy";
import { EVENTS } from "../../shared/events";
import { CASE_GENERATION_RULES } from "../../domains/case/case.factory";
import { TIER_CONDITIONS } from "../../domains/case/case.entity";

// ── Integrity Checker ─────────────────────────────────────────────────────────

describe("SystemIntegrityChecker", () => {
  it("passes with zero critical violations on current codebase", () => {
    const checker = new SystemIntegrityChecker();
    const report = checker.run();

    const criticals = report.violations.filter((v) => v.severity === "critical");
    if (criticals.length > 0) {
      console.error("Critical SSOT violations detected:");
      criticals.forEach((v) => console.error(`  [${v.type}] ${v.message}`));
    }

    expect(criticals.length).toBe(0);
    expect(report.ok).toBe(true);
  });

  it("reports checkedAt timestamp", () => {
    const checker = new SystemIntegrityChecker();
    const report = checker.run();
    expect(report.checkedAt).toBeTruthy();
    expect(new Date(report.checkedAt).getTime()).not.toBeNaN();
  });

  it("metrics structure is present", () => {
    const checker = new SystemIntegrityChecker();
    const report = checker.run();
    expect(report.metrics).toHaveProperty("ssotViolations");
    expect(report.metrics).toHaveProperty("orphanRecords");
    expect(report.metrics).toHaveProperty("invalidTransitions");
    expect(report.metrics).toHaveProperty("eventDuplications");
    expect(report.metrics).toHaveProperty("schemaMismatches");
  });

  it("SSOT: quality score weights sum to 100 (FD-001)", () => {
    const total =
      QUALITY_SCORE.coverage +
      QUALITY_SCORE.duration +
      QUALITY_SCORE.completeness +
      QUALITY_SCORE.outcome +
      QUALITY_SCORE.consent;
    expect(total).toBe(100);
  });

  it("SSOT: consent levels are exactly [0,1,2,3] — no Level 4", () => {
    expect(Array.from(CONSENT_LEVELS)).toEqual([0, 1, 2, 3]);
  });

  it("SSOT: PAUSED is not in experiment transitions (RD-003)", () => {
    const allTargets = Object.values(VALID_TRANSITIONS).flat();
    expect(allTargets).not.toContain("PAUSED");
  });

  it("SSOT: COMPLETED and ABANDONED have no outgoing transitions", () => {
    expect(VALID_TRANSITIONS.COMPLETED).toHaveLength(0);
    expect(VALID_TRANSITIONS.ABANDONED).toHaveLength(0);
  });

  it("SSOT: similarity threshold is exactly 0.65", () => {
    expect(SIMILARITY_THRESHOLD).toBe(0.65);
  });

  it("SSOT: B2B min cohort = 100, min consent = 2, k-anon = 5", () => {
    expect(B2B_POLICY.MIN_COHORT_USERS).toBe(100);
    expect(B2B_POLICY.MIN_CONSENT_LEVEL).toBe(2);
    expect(B2B_POLICY.K_ANONYMITY_MIN).toBe(5);
  });

  it("SSOT: event registry has no duplicate values", () => {
    const values = Object.values(EVENTS) as string[];
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it("SSOT: case generation requires min 21 days, 7 records, 1 outcome", () => {
    expect(CASE_GENERATION_RULES.minDurationDays).toBe(21);
    expect(CASE_GENERATION_RULES.minRecordCount).toBe(7);
    expect(CASE_GENERATION_RULES.minOutcomeCount).toBe(1);
  });

  it("SSOT: Tier1 requires minDurationDays=180 and minConsent=2 (FD-002)", () => {
    expect(TIER_CONDITIONS.TIER1.minDurationDays).toBe(180);
    expect(TIER_CONDITIONS.TIER1.minConsent).toBe(2);
  });

  it("SSOT: Tier2 requires minDurationDays=90 and minConsent=1 (FD-002)", () => {
    expect(TIER_CONDITIONS.TIER2.minDurationDays).toBe(90);
    expect(TIER_CONDITIONS.TIER2.minConsent).toBe(1);
  });

  it("SSOT: Tier3 requires minDurationDays=30 and minCoverage=0.60 (FD-002)", () => {
    expect(TIER_CONDITIONS.TIER3.minDurationDays).toBe(30);
    expect(TIER_CONDITIONS.TIER3.minCoverage).toBe(0.60);
  });
});

// ── Release Gate ──────────────────────────────────────────────────────────────

describe("Release Gate", () => {
  function passingE2E(overrides: Partial<E2ESuiteResult> = {}): E2ESuiteResult {
    return { passed: 60, failed: 0, total: 60, failedTests: [], ...overrides };
  }

  it("APPROVED when all E2E pass and integrity is ok", () => {
    const checker = new SystemIntegrityChecker();
    const integrity = checker.run();
    const gate = evaluateReleaseGate(passingE2E(), integrity);
    expect(gate.verdict).toBe("APPROVED");
    expect(gate.blockingIssues).toHaveLength(0);
  });

  it("BLOCKED when E2E failures exist", () => {
    const checker = new SystemIntegrityChecker();
    const integrity = checker.run();
    const gate = evaluateReleaseGate(
      passingE2E({ passed: 58, failed: 2, total: 60, failedTests: ["flow.record-to-case", "flow.pro-conversion"] }),
      integrity,
    );
    expect(gate.verdict).toBe("BLOCKED");
    expect(gate.blockingIssues.some((i) => i.includes("E2E test(s) failed"))).toBe(true);
  });

  it("health score components are all 0-100", () => {
    const checker = new SystemIntegrityChecker();
    const integrity = checker.run();
    const gate = evaluateReleaseGate(passingE2E(), integrity);
    const { healthScore } = gate;
    for (const [, v] of Object.entries(healthScore)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("full pass yields 100% E2E stability score", () => {
    const checker = new SystemIntegrityChecker();
    const integrity = checker.run();
    const gate = evaluateReleaseGate(passingE2E(), integrity);
    expect(gate.healthScore.e2eStability).toBe(100);
  });

  it("SSOT compliance is 100 when no critical ssot violations", () => {
    const checker = new SystemIntegrityChecker();
    const integrity = checker.run();
    // No critical violations on current codebase
    const criticalSsot = integrity.violations.filter(
      (v) => v.severity === "critical" && v.type === "ssot_violation",
    ).length;
    expect(criticalSsot).toBe(0);
    const gate = evaluateReleaseGate(passingE2E(), integrity);
    expect(gate.healthScore.ssotCompliance).toBe(100);
  });

  it("formatReleaseReport contains READY_FOR_RELEASE and verdict", () => {
    const checker = new SystemIntegrityChecker();
    const integrity = checker.run();
    const gate = evaluateReleaseGate(passingE2E(), integrity);
    const report = formatReleaseReport(gate);
    expect(report).toContain("READY_FOR_RELEASE");
    expect(report).toContain(gate.verdict); // APPROVED or BLOCKED
    expect(report).toContain("e2e_stability");
  });

  it("summary contains correct e2e counts", () => {
    const checker = new SystemIntegrityChecker();
    const integrity = checker.run();
    const gate = evaluateReleaseGate(passingE2E({ passed: 55, total: 60 }), integrity);
    expect(gate.summary.e2ePassed).toBe(55);
    expect(gate.summary.e2eTotal).toBe(60);
  });
});
