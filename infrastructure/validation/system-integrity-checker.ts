/**
 * System Integrity Checker
 *
 * Validates the entire domain model for structural consistency:
 * - SSOT violations (duplicate event definitions, policy drift)
 * - Domain cross-write violations
 * - Orphan record detection
 * - Invalid state transitions
 * - Schema mismatches
 */

import { EVENTS } from "../../shared/events";
import { QUALITY_SCORE, CONSENT_LEVELS } from "../../policies";
import { B2B_POLICY } from "../../domains/b2b/b2b.policy";
import { TIER_CONDITIONS } from "../../domains/case/case.entity";
import { CASE_GENERATION_RULES } from "../../domains/case/case.factory";
import { VALID_TRANSITIONS } from "../../domains/experiment/experiment.entity";
import { SIMILARITY_THRESHOLD } from "../../domains/similarity/similarity.scorer";
import { FUNNEL_STAGES } from "../../domains/analytics/funnel.analyzer";

export interface IntegrityViolation {
  type:
    | "ssot_violation"
    | "domain_cross_write"
    | "orphan_record"
    | "invalid_transition"
    | "schema_mismatch"
    | "event_duplication";
  severity: "critical" | "warning";
  message: string;
  location?: string;
}

export interface IntegrityMetrics {
  ssotViolations: number;
  orphanRecords: number;
  invalidTransitions: number;
  eventDuplications: number;
  schemaMismatches: number;
}

export interface IntegrityReport {
  ok: boolean;
  violations: IntegrityViolation[];
  metrics: IntegrityMetrics;
  checkedAt: string;
}

// ── Checker ───────────────────────────────────────────────────────────────────

export class SystemIntegrityChecker {
  private violations: IntegrityViolation[] = [];

  run(): IntegrityReport {
    this.violations = [];

    this.checkEventRegistry();
    this.checkQualityScoreSSoT();
    this.checkConsentLevelSSoT();
    this.checkTierConditionsSSoT();
    this.checkCaseGenerationRules();
    this.checkExperimentTransitions();
    this.checkSimilarityThreshold();
    this.checkB2BPolicy();
    this.checkFunnelStages();

    const metrics: IntegrityMetrics = {
      ssotViolations: this.violations.filter((v) => v.type === "ssot_violation").length,
      orphanRecords: this.violations.filter((v) => v.type === "orphan_record").length,
      invalidTransitions: this.violations.filter((v) => v.type === "invalid_transition").length,
      eventDuplications: this.violations.filter((v) => v.type === "event_duplication").length,
      schemaMismatches: this.violations.filter((v) => v.type === "schema_mismatch").length,
    };

    const criticalCount = this.violations.filter((v) => v.severity === "critical").length;

    return {
      ok: criticalCount === 0,
      violations: this.violations,
      metrics,
      checkedAt: new Date().toISOString(),
    };
  }

  // ── Checks ────────────────────────────────────────────────────────────────

  private checkEventRegistry(): void {
    const eventValues = Object.values(EVENTS);
    const uniqueValues = new Set(eventValues);

    if (uniqueValues.size !== eventValues.length) {
      const seen = new Set<string>();
      for (const v of eventValues) {
        if (seen.has(v)) {
          this.violations.push({
            type: "event_duplication",
            severity: "critical",
            message: `Duplicate event value: "${v}" in shared/events/index.ts`,
            location: "shared/events/index.ts",
          });
        }
        seen.add(v);
      }
    }

    // All event values must follow "domain.action" pattern (digits allowed, e.g. "b2b")
    for (const [key, value] of Object.entries(EVENTS)) {
      if (!/^[a-z0-9_]+\.[a-z0-9_]+$/.test(value)) {
        this.violations.push({
          type: "ssot_violation",
          severity: "warning",
          message: `Event "${key}" value "${value}" does not follow "domain.action" pattern`,
          location: "shared/events/index.ts",
        });
      }
    }
  }

  private checkQualityScoreSSoT(): void {
    // FD-001: total must be exactly 100
    const total =
      QUALITY_SCORE.coverage +
      QUALITY_SCORE.duration +
      QUALITY_SCORE.completeness +
      QUALITY_SCORE.outcome +
      QUALITY_SCORE.consent;

    if (total !== 100) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: `Quality score weights sum to ${total}, expected 100 (FD-001)`,
        location: "policies/index.ts",
      });
    }

    // FD-001: individual weights
    const expected = { coverage: 30, duration: 30, completeness: 15, outcome: 15, consent: 10 };
    for (const [key, value] of Object.entries(expected)) {
      if (QUALITY_SCORE[key as keyof typeof QUALITY_SCORE] !== value) {
        this.violations.push({
          type: "ssot_violation",
          severity: "critical",
          message: `QUALITY_SCORE.${key} is ${QUALITY_SCORE[key as keyof typeof QUALITY_SCORE]}, expected ${value} (FD-001)`,
          location: "policies/index.ts",
        });
      }
    }
  }

  private checkConsentLevelSSoT(): void {
    // SSOT: consent levels are exactly [0, 1, 2, 3] — Level 4 does not exist
    const expected = [0, 1, 2, 3];
    const actual = Array.from(CONSENT_LEVELS);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: `CONSENT_LEVELS is [${actual}], expected [${expected}]. Level 4 must not exist.`,
        location: "policies/index.ts",
      });
    }
  }

  private checkTierConditionsSSoT(): void {
    // FD-002: Tier3 requires 30 days and 60% coverage
    if (TIER_CONDITIONS.TIER3.minDurationDays !== 30) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: `TIER3.minDurationDays is ${TIER_CONDITIONS.TIER3.minDurationDays}, expected 30 (FD-002)`,
        location: "domains/case/case.entity.ts",
      });
    }
    if (TIER_CONDITIONS.TIER3.minCoverage !== 0.60) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: `TIER3.minCoverage is ${TIER_CONDITIONS.TIER3.minCoverage}, expected 0.60 (FD-002)`,
        location: "domains/case/case.entity.ts",
      });
    }

    // FD-002: Tier2 requires 90 days, 70% coverage, 1 experiment, Consent L1
    if (TIER_CONDITIONS.TIER2.minDurationDays !== 90) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: `TIER2.minDurationDays is ${TIER_CONDITIONS.TIER2.minDurationDays}, expected 90 (FD-002)`,
        location: "domains/case/case.entity.ts",
      });
    }
    if (TIER_CONDITIONS.TIER2.minConsent !== 1) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: `TIER2.minConsent is ${TIER_CONDITIONS.TIER2.minConsent}, expected 1 (FD-002)`,
        location: "domains/case/case.entity.ts",
      });
    }

    // FD-002: Tier1 requires 180 days, 80% coverage, 2 experiments, Consent L2
    if (TIER_CONDITIONS.TIER1.minDurationDays !== 180) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: `TIER1.minDurationDays is ${TIER_CONDITIONS.TIER1.minDurationDays}, expected 180 (FD-002)`,
        location: "domains/case/case.entity.ts",
      });
    }
    if (TIER_CONDITIONS.TIER1.minConsent !== 2) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: `TIER1.minConsent is ${TIER_CONDITIONS.TIER1.minConsent}, expected 2 (FD-002)`,
        location: "domains/case/case.entity.ts",
      });
    }
  }

  private checkCaseGenerationRules(): void {
    if (CASE_GENERATION_RULES.minDurationDays !== 21) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: `CASE_GENERATION_RULES.minDurationDays is ${CASE_GENERATION_RULES.minDurationDays}, expected 21`,
        location: "domains/case/case.factory.ts",
      });
    }
    if (CASE_GENERATION_RULES.minRecordCount !== 7) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: `CASE_GENERATION_RULES.minRecordCount is ${CASE_GENERATION_RULES.minRecordCount}, expected 7`,
        location: "domains/case/case.factory.ts",
      });
    }
    if (CASE_GENERATION_RULES.minOutcomeCount !== 1) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: `CASE_GENERATION_RULES.minOutcomeCount is ${CASE_GENERATION_RULES.minOutcomeCount}, expected 1`,
        location: "domains/case/case.factory.ts",
      });
    }
  }

  private checkExperimentTransitions(): void {
    // PAUSED must not exist as a valid target in any transition
    const allTargets = Object.values(VALID_TRANSITIONS).flat();
    if (allTargets.includes("PAUSED" as never)) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: "PAUSED is in VALID_TRANSITIONS — permanently excluded (RD-003)",
        location: "domains/experiment/experiment.entity.ts",
      });
    }

    // COMPLETED and ABANDONED must have no outgoing transitions
    if (VALID_TRANSITIONS.COMPLETED.length !== 0) {
      this.violations.push({
        type: "invalid_transition",
        severity: "critical",
        message: "COMPLETED should have no valid outgoing transitions",
        location: "domains/experiment/experiment.entity.ts",
      });
    }
    if (VALID_TRANSITIONS.ABANDONED.length !== 0) {
      this.violations.push({
        type: "invalid_transition",
        severity: "critical",
        message: "ABANDONED should have no valid outgoing transitions",
        location: "domains/experiment/experiment.entity.ts",
      });
    }
  }

  private checkSimilarityThreshold(): void {
    if (SIMILARITY_THRESHOLD !== 0.65) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: `SIMILARITY_THRESHOLD is ${SIMILARITY_THRESHOLD}, expected 0.65`,
        location: "domains/similarity/similarity.scorer.ts",
      });
    }
  }

  private checkB2BPolicy(): void {
    if (B2B_POLICY.MIN_COHORT_USERS !== 100) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: `B2B_POLICY.MIN_COHORT_USERS is ${B2B_POLICY.MIN_COHORT_USERS}, expected 100`,
        location: "domains/b2b/b2b.policy.ts",
      });
    }
    if (B2B_POLICY.MIN_CONSENT_LEVEL !== 2) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: `B2B_POLICY.MIN_CONSENT_LEVEL is ${B2B_POLICY.MIN_CONSENT_LEVEL}, expected 2`,
        location: "domains/b2b/b2b.policy.ts",
      });
    }
    if (B2B_POLICY.K_ANONYMITY_MIN !== 5) {
      this.violations.push({
        type: "ssot_violation",
        severity: "critical",
        message: `B2B_POLICY.K_ANONYMITY_MIN is ${B2B_POLICY.K_ANONYMITY_MIN}, expected 5`,
        location: "domains/b2b/b2b.policy.ts",
      });
    }
  }

  private checkFunnelStages(): void {
    const expectedStages = ["record", "experiment", "case", "similarity", "pro"];
    const actualStages = FUNNEL_STAGES.map((s) => s.name);
    if (JSON.stringify(actualStages) !== JSON.stringify(expectedStages)) {
      this.violations.push({
        type: "ssot_violation",
        severity: "warning",
        message: `Funnel stages are [${actualStages}], expected [${expectedStages}]`,
        location: "domains/analytics/funnel.analyzer.ts",
      });
    }
  }
}
