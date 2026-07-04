/**
 * Release Gate
 *
 * Aggregates E2E results, integrity check, and SSOT compliance
 * into a single APPROVED / BLOCKED verdict.
 */
import type { IntegrityReport } from "../infrastructure/validation/system-integrity-checker";

export interface E2ESuiteResult {
  passed: number;
  failed: number;
  total: number;
  failedTests: string[];
}

export interface ArchitectureHealthScore {
  dataIntegrity: number;     // 0-100
  domainIsolation: number;   // 0-100
  ssotCompliance: number;    // 0-100
  e2eStability: number;      // 0-100
}

export interface ReleaseGateResult {
  verdict: "APPROVED" | "BLOCKED";
  blockingIssues: string[];
  healthScore: ArchitectureHealthScore;
  summary: {
    e2ePassed: number;
    e2eTotal: number;
    ssotViolations: number;
    integrityOk: boolean;
  };
  evaluatedAt: string;
}

export function evaluateReleaseGate(
  e2e: E2ESuiteResult,
  integrity: IntegrityReport,
): ReleaseGateResult {
  const blockingIssues: string[] = [];

  const allE2EPassed = e2e.failed === 0;
  if (!allE2EPassed) {
    blockingIssues.push(
      `${e2e.failed} E2E test(s) failed: ${e2e.failedTests.join(", ")}`,
    );
  }

  if (!integrity.ok) {
    blockingIssues.push("System integrity check failed");
  }

  const criticalSsotViolations = integrity.violations.filter(
    (v) => v.severity === "critical" && v.type === "ssot_violation",
  ).length;
  if (criticalSsotViolations > 0) {
    blockingIssues.push(
      `${criticalSsotViolations} critical SSOT violation(s) detected`,
    );
  }

  const criticalViolations = integrity.violations.filter((v) => v.severity === "critical");
  for (const v of criticalViolations) {
    blockingIssues.push(`[${v.type}] ${v.message}`);
  }

  // Health scoring — ssot compliance counts only critical violations
  const criticalSsotCount = integrity.violations.filter(
    (v) => v.severity === "critical" && v.type === "ssot_violation",
  ).length;
  const ssotScore = criticalSsotCount === 0 ? 100
    : Math.max(0, 100 - criticalSsotCount * 20);

  const e2eScore = e2e.total === 0 ? 0
    : Math.round((e2e.passed / e2e.total) * 100);

  const integrityScore = integrity.ok ? 100
    : Math.max(0, 100 - integrity.violations.filter((v) => v.severity === "critical").length * 25);

  const isolationScore = integrity.metrics.orphanRecords === 0
    && integrity.metrics.invalidTransitions === 0 ? 100
    : Math.max(0, 100 - (integrity.metrics.orphanRecords + integrity.metrics.invalidTransitions) * 15);

  const healthScore: ArchitectureHealthScore = {
    dataIntegrity: integrityScore,
    domainIsolation: isolationScore,
    ssotCompliance: ssotScore,
    e2eStability: e2eScore,
  };

  const verdict: "APPROVED" | "BLOCKED" = blockingIssues.length === 0 ? "APPROVED" : "BLOCKED";

  return {
    verdict,
    blockingIssues,
    healthScore,
    summary: {
      e2ePassed: e2e.passed,
      e2eTotal: e2e.total,
      ssotViolations: integrity.metrics.ssotViolations,
      integrityOk: integrity.ok,
    },
    evaluatedAt: new Date().toISOString(),
  };
}

export function formatReleaseReport(result: ReleaseGateResult): string {
  const lines: string[] = [
    "═══════════════════════════════════════════════════",
    "  IPPO RELEASE GATE — PR-010 FINAL VERDICT",
    "═══════════════════════════════════════════════════",
    "",
    "E2E RESULT SUMMARY",
    `  passed:           ${result.summary.e2ePassed} / ${result.summary.e2eTotal}`,
    `  failed:           ${result.summary.e2eTotal - result.summary.e2ePassed}`,
    `  ssot violations:  ${result.summary.ssotViolations}`,
    `  integrity ok:     ${result.summary.integrityOk}`,
    "",
    "ARCHITECTURE HEALTH SCORE",
    `  data_integrity:   ${result.healthScore.dataIntegrity}/100`,
    `  domain_isolation: ${result.healthScore.domainIsolation}/100`,
    `  ssot_compliance:  ${result.healthScore.ssotCompliance}/100`,
    `  e2e_stability:    ${result.healthScore.e2eStability}/100`,
    "",
  ];

  if (result.blockingIssues.length > 0) {
    lines.push("BLOCKING ISSUES");
    for (const issue of result.blockingIssues) {
      lines.push(`  ✗ ${issue}`);
    }
    lines.push("");
  }

  lines.push(
    "═══════════════════════════════════════════════════",
    `  READY_FOR_RELEASE: ${result.verdict === "APPROVED"}`,
    `  VERDICT: ${result.verdict}`,
    "═══════════════════════════════════════════════════",
  );

  return lines.join("\n");
}
