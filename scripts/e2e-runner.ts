/**
 * E2E Pipeline Runner
 *
 * 1. Seeds test data across all domains
 * 2. Runs representative flows end-to-end
 * 3. Validates system integrity
 * 4. Outputs a release gate report
 *
 * Usage: npx tsx scripts/e2e-runner.ts [--debug]
 */

import { SystemIntegrityChecker } from "../infrastructure/validation/system-integrity-checker";
import { evaluateReleaseGate, formatReleaseReport, type E2ESuiteResult } from "../release/gate";
import { generateCase } from "../domains/case/case.factory";
import { createExperiment } from "../domains/experiment/experiment.factory";
import { isAllowed } from "../domains/consent/consent.policy";
import { scoreProfiles, SIMILARITY_THRESHOLD } from "../domains/similarity/similarity.scorer";
import { AnalyticsService } from "../domains/analytics/analytics.service";
import { EVENTS } from "../shared/events";
import type { ConsentLevel } from "../policies";
import type { CaseScoringProfile } from "../domains/similarity/similarity.scorer";
import type { EventStore, AnalyticsEvent, EventFilter } from "../domains/analytics/event.collector";

const DEBUG = process.argv.includes("--debug");

function log(msg: string) {
  if (DEBUG) console.log(`[e2e] ${msg}`);
}

function makeEventStore(): EventStore {
  const rows: AnalyticsEvent[] = [];
  return {
    async append(e) { rows.push(e); },
    async query(filter: EventFilter) {
      return rows.filter((e) => {
        if (filter.types && !filter.types.includes(e.type)) return false;
        if (filter.userId && e.userId !== filter.userId) return false;
        if (filter.from && e.occurredAt < filter.from) return false;
        if (filter.to && e.occurredAt > filter.to) return false;
        return true;
      });
    },
  };
}

// ── Individual flow runners ────────────────────────────────────────────────────

type FlowResult = { name: string; passed: boolean; error?: string };

async function runFlow(name: string, fn: () => Promise<void>): Promise<FlowResult> {
  try {
    await fn();
    log(`✓ ${name}`);
    return { name, passed: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log(`✗ ${name}: ${error}`);
    return { name, passed: false, error };
  }
}

async function flowRecordToCase(): Promise<void> {
  const result = generateCase({
    userId: "runner_user_001",
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
  });

  if (!result.caseEntity.id) throw new Error("Case ID not generated");
  if (result.caseEntity.qualityScore <= 0) throw new Error("Quality score is 0");

  const expectedTotal =
    result.qualityScore.coverageScore +
    result.qualityScore.durationScore +
    result.qualityScore.completenessScore +
    result.qualityScore.outcomeScore +
    result.qualityScore.consentScore;

  if (result.qualityScore.total !== expectedTotal) {
    throw new Error(`Quality score mismatch: ${result.qualityScore.total} ≠ ${expectedTotal}`);
  }

  if (result.event.type !== EVENTS.CASE_GENERATED) {
    throw new Error(`Expected event ${EVENTS.CASE_GENERATED}, got ${result.event.type}`);
  }
}

async function flowCaseToSimilarity(): Promise<void> {
  const profiles: CaseScoringProfile[] = [
    {
      caseId: "CASE-ENDO-202601-R1000001",
      diseaseKeys: ["endometriosis", "pelvic_pain"],
      durationDays: 180,
      outcomeScore: 12,
      experimentIds: ["exp_1", "exp_2"],
    },
    {
      caseId: "CASE-ENDO-202602-R2000002",
      diseaseKeys: ["endometriosis", "pelvic_pain", "fatigue"],
      durationDays: 190,
      outcomeScore: 11,
      experimentIds: ["exp_1", "exp_2", "exp_4"],
    },
    {
      caseId: "CASE-FIBR-202601-R3000003",
      diseaseKeys: ["fibromyalgia"],
      durationDays: 30,
      outcomeScore: 2,
      experimentIds: [],
    },
  ];

  const ab = scoreProfiles(profiles[0], profiles[1]);
  if (ab.total < SIMILARITY_THRESHOLD) {
    throw new Error(`Expected A↔B score ≥ ${SIMILARITY_THRESHOLD}, got ${ab.total}`);
  }

  const ac = scoreProfiles(profiles[0], profiles[2]);
  if (ac.total >= SIMILARITY_THRESHOLD) {
    throw new Error(`Expected A↔C score < ${SIMILARITY_THRESHOLD}, got ${ac.total}`);
  }
}

async function flowConsentToExport(): Promise<void> {
  const levels: ConsentLevel[] = [0, 1, 2, 3];
  const expected = {
    0: { analytics: false, similarity: false, research: false },
    1: { analytics: true,  similarity: false, research: false },
    2: { analytics: true,  similarity: true,  research: false },
    3: { analytics: true,  similarity: true,  research: true  },
  };

  for (const level of levels) {
    for (const [use, allowed] of Object.entries(expected[level])) {
      const actual = isAllowed(use as never, level, false);
      if (actual !== allowed) {
        throw new Error(`L${level}.${use}: expected ${allowed}, got ${actual}`);
      }
    }
  }
}

async function flowExperimentLifecycle(): Promise<void> {
  const { experiment, event } = createExperiment("runner_user_002", {
    title: "Test experiment",
    hypothesis: "Test hypothesis",
    originType: "user_initiated",
    startDate: "2026-01-01",
    plannedEndDate: "2026-04-01",
    interventionType: "diet",
  });

  if (experiment.status !== "ACTIVE") {
    throw new Error(`Expected ACTIVE status, got ${experiment.status}`);
  }
  if (event.type !== EVENTS.EXPERIMENT_STARTED) {
    throw new Error(`Expected ${EVENTS.EXPERIMENT_STARTED} event`);
  }
}

async function flowProConversion(): Promise<void> {
  const svc = new AnalyticsService(makeEventStore());
  const USER = "runner_pro_user";

  // Simulate full funnel
  await svc.track(EVENTS.RECORD_CREATED,     USER, {});
  await svc.track(EVENTS.EXPERIMENT_STARTED, USER, {});
  await svc.track(EVENTS.CASE_GENERATED,     USER, { qualityScore: 75 });
  await svc.track(EVENTS.SIMILARITY_CREATED, USER, {});
  await svc.track(EVENTS.PRO_PAYWALL_HIT,    USER, {});

  const W = { from: "2000-01-01T00:00:00.000Z", to: "2099-12-31T23:59:59.999Z" };
  const funnel = await svc.api.getExperimentFunnel(W.from, W.to);
  const proStage = funnel.stages.find((s) => s.stage === "pro");
  if (!proStage || proStage.users !== 1) {
    throw new Error(`PRO funnel stage expected 1 user, got ${proStage?.users}`);
  }
}

async function flowPerformanceSmoke(): Promise<void> {
  const start = Date.now();

  // 1000 records simulation (case generation)
  for (let i = 0; i < 1000; i++) {
    generateCase({
      userId: `perf_user_${i}`,
      diseaseKey: "endometriosis",
      startDate: "2026-01-01",
      endDate: "2026-04-01",
      recordCount: 30,
      experimentIds: [],
      completedExperimentsCount: 0,
      recordedDays: 75,
      durationDays: 90,
      completenessRate: 0.7,
      hasOutcome: true,
      outcomeCount: 1,
      consentLevel: 1 as ConsentLevel,
    });
  }

  // 100 similarity score computations
  const profileA: CaseScoringProfile = {
    caseId: "CASE-ENDO-202601-PERF0001",
    diseaseKeys: ["endometriosis", "pelvic_pain"],
    durationDays: 180,
    outcomeScore: 12,
    experimentIds: ["exp_1"],
  };
  for (let i = 0; i < 100; i++) {
    scoreProfiles(profileA, {
      caseId: `CASE-ENDO-202601-PERF${String(i).padStart(4, "0")}`,
      diseaseKeys: ["endometriosis"],
      durationDays: 90 + i,
      outcomeScore: 8,
      experimentIds: [],
    });
  }

  const elapsed = Date.now() - start;
  if (elapsed > 5000) {
    throw new Error(`Performance smoke test took ${elapsed}ms, expected < 5000ms`);
  }
}

// ── Main runner ───────────────────────────────────────────────────────────────

export async function runE2EPipeline(): Promise<void> {
  console.log("\n[PR-010] Starting E2E Pipeline Runner...\n");

  const flows = [
    runFlow("record → case generation",       flowRecordToCase),
    runFlow("case → similarity graph",         flowCaseToSimilarity),
    runFlow("consent → export control",        flowConsentToExport),
    runFlow("experiment lifecycle",            flowExperimentLifecycle),
    runFlow("PRO conversion flow",             flowProConversion),
    runFlow("performance smoke (1000 records + 100 similarity)", flowPerformanceSmoke),
  ];

  const results = await Promise.all(flows.map((f) => f));

  const e2eSuite: E2ESuiteResult = {
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    total: results.length,
    failedTests: results.filter((r) => !r.passed).map((r) => r.name),
  };

  // Run integrity checker
  const checker = new SystemIntegrityChecker();
  const integrity = checker.run();

  if (DEBUG && integrity.violations.length > 0) {
    console.log("\n[integrity] Violations:");
    for (const v of integrity.violations) {
      console.log(`  [${v.severity}] ${v.type}: ${v.message}`);
    }
  }

  const gate = evaluateReleaseGate(e2eSuite, integrity);
  console.log(formatReleaseReport(gate));

  process.exitCode = gate.verdict === "APPROVED" ? 0 : 1;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  runE2EPipeline().catch((err) => {
    console.error("[e2e-runner] Fatal:", err);
    process.exitCode = 1;
  });
}
