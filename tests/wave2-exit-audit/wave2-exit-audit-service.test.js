// tests/wave2-exit-audit/wave2-exit-audit-service.test.js — PR-075 tests.
// Wave2ExitAuditService — Wave2 Exit Audit (Phase G capstone, Wave2正式完了).
// Aggregates: ResearchPlatformAuditService (BD-021/030/036/037/039) / Phase3CompletionValidator
// (BD-026) / AISafetyValidator (BD-031/038). EC-01〜14 are evidenced by tests/wave2/ (PR-074).
import { describe, it, expect, vi } from 'vitest';
import {
  Wave2ExitAuditService, Wave2ExitCriteriaNotMetError,
  AUDIT_RESULT, BD_STATUS, EC_LIST, QC_LIST, BD_SCOPE_LIST, MECHANICALLY_AUDITED_BDS,
  WAVE2_EXIT_AUDIT_SCHEMA_VERSION,
} from '../../src/domains/wave2-exit-audit/wave2-exit-audit-service.js';
import { Wave2ExitAuditRepository } from '../../src/domains/wave2-exit-audit/wave2-exit-audit-repository.js';
import { _resetWave2ExitApprovalCounter } from '../../src/domains/wave2-exit-audit/wave2-exit-audit-entity.js';

import { ResearchPlatformAuditService } from '../../src/domains/research-platform-audit/research-platform-audit-service.js';
import { DatasetVersionRepository } from '../../src/domains/dataset-version/dataset-version-repository.js';
import { DatasetVersionService }    from '../../src/domains/dataset-version/dataset-version-service.js';
import { DATASET_TYPES }            from '../../src/domains/dataset-version/dataset-version-types.js';
import { CohortRepository }         from '../../src/domains/cohort/cohort-repository.js';
import { CohortBuilderService }     from '../../src/domains/cohort/cohort-builder-service.js';
import { KnowledgeGraphRepository } from '../../src/domains/knowledge/knowledge-graph-repository.js';
import { Phase3CompletionValidator } from '../../src/domains/network-evolution/phase3-completion-validator.js';
import { AISafetyValidator }        from '../../src/domains/ai-safety/ai-safety-validator.js';
import { PHASE_D_SERVICE_IDS }      from '../../src/domains/ai-safety/ai-safety-types.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const COMPLIANT_AI_SAFETY_STATUSES = Object.fromEntries(
  PHASE_D_SERVICE_IDS.map(id => [
    id,
    Object.freeze({ ready: true, bd031: 'rule-based only', bd038: 'isMedicalAdvice:false enforced', access: 'admin:research' }),
  ])
);

const PASSING_TEST_SUITE_STATUS = Object.freeze({
  wave2ExitCriteriaSuitePassed: true,
  wave2IntegrationSuitePassed:  true,
  totalTests: 5028, failedTests: 39, knownPreExistingFailureCount: 39, newFailureFiles: [],
});

/** Cluster profiles that satisfy BOTH k-anonymity (k>=5) AND Phase3 confidence (signalPercentiles). */
function qualifiedClusterProfiles(count = 5) {
  const keys = ['ENDO', 'PCOS', 'ADENO', 'PMDD', 'FIBROID'];
  const profiles = {};
  for (let i = 0; i < count; i++) {
    profiles[keys[i]] = Object.freeze({
      caseCount: 60,
      signalPercentiles: Object.freeze({ PAIN: Object.freeze({ p25: 0.2, p50: 0.4, p75: 0.6, p90: 0.8 }) }),
    });
  }
  return profiles;
}

function buildDeps() {
  const datasetVersionService = new DatasetVersionService({ repository: new DatasetVersionRepository() });
  const cohortBuilderService  = new CohortBuilderService({ repository: new CohortRepository() });
  const knowledgeGraphRepository = new KnowledgeGraphRepository();
  const aiSafetyValidator = new AISafetyValidator();
  const researchPlatformAuditService = new ResearchPlatformAuditService({
    datasetVersionService, cohortBuilderService, knowledgeGraphRepository, aiSafetyValidator,
  });
  const phase3CompletionValidator = new Phase3CompletionValidator();
  const repository = new Wave2ExitAuditRepository();
  return {
    researchPlatformAuditService, phase3CompletionValidator, aiSafetyValidator, repository,
    datasetVersionService, cohortBuilderService, knowledgeGraphRepository,
  };
}

function buildService(overrides = {}) {
  const deps = { ...buildDeps(), ...overrides };
  return { service: new Wave2ExitAuditService(deps), ...deps };
}

function passingSetup() {
  const built = buildDeps();
  built.cohortBuilderService.defineCohort({ name: 'c', createdBy: 'f', cohortId: 'coh-1' });
  built.cohortBuilderService.confirmKAnonymity('coh-1', 10);
  built.datasetVersionService.publish({ type: DATASET_TYPES.FULL, createdBy: 'founder-1' });
  const service = new Wave2ExitAuditService(built);
  return { service, ...built };
}

// ── Construction ─────────────────────────────────────────────────────────────

describe('Wave2ExitAuditService — constructor', () => {
  it('throws when researchPlatformAuditService is missing', () => {
    const { phase3CompletionValidator, aiSafetyValidator, repository } = buildDeps();
    expect(() => new Wave2ExitAuditService({ phase3CompletionValidator, aiSafetyValidator, repository }))
      .toThrow(/researchPlatformAuditService is required/);
  });

  it('throws when phase3CompletionValidator is missing', () => {
    const { researchPlatformAuditService, aiSafetyValidator, repository } = buildDeps();
    expect(() => new Wave2ExitAuditService({ researchPlatformAuditService, aiSafetyValidator, repository }))
      .toThrow(/phase3CompletionValidator is required/);
  });

  it('throws when aiSafetyValidator is missing', () => {
    const { researchPlatformAuditService, phase3CompletionValidator, repository } = buildDeps();
    expect(() => new Wave2ExitAuditService({ researchPlatformAuditService, phase3CompletionValidator, repository }))
      .toThrow(/aiSafetyValidator is required/);
  });

  it('throws when repository is missing', () => {
    const { researchPlatformAuditService, phase3CompletionValidator, aiSafetyValidator } = buildDeps();
    expect(() => new Wave2ExitAuditService({ researchPlatformAuditService, phase3CompletionValidator, aiSafetyValidator }))
      .toThrow(/repository is required/);
  });
});

// ── auditExitCriteria (EC-01〜EC-15) ─────────────────────────────────────────

describe('Wave2ExitAuditService.auditExitCriteria()', () => {
  it('all 15 EC pass when both PR-074 suites passed and no new failures', () => {
    const { service } = buildService();
    const audit = service.auditExitCriteria({ testSuiteStatus: PASSING_TEST_SUITE_STATUS });
    expect(audit.allPass).toBe(true);
    expect(audit.passCount).toBe(EC_LIST.length);
    expect(Object.keys(audit.results)).toHaveLength(15);
  });

  it('EC-01〜EC-12 fail when wave2ExitCriteriaSuitePassed is false', () => {
    const { service } = buildService();
    const audit = service.auditExitCriteria({
      testSuiteStatus: { ...PASSING_TEST_SUITE_STATUS, wave2ExitCriteriaSuitePassed: false },
    });
    expect(audit.results['EC-01'].result).toBe(AUDIT_RESULT.FAIL);
    expect(audit.results['EC-12'].result).toBe(AUDIT_RESULT.FAIL);
    expect(audit.results['EC-13'].result).toBe(AUDIT_RESULT.PASS); // unaffected — different suite
    expect(audit.allPass).toBe(false);
  });

  it('EC-13/EC-14 fail when wave2IntegrationSuitePassed is false', () => {
    const { service } = buildService();
    const audit = service.auditExitCriteria({
      testSuiteStatus: { ...PASSING_TEST_SUITE_STATUS, wave2IntegrationSuitePassed: false },
    });
    expect(audit.results['EC-13'].result).toBe(AUDIT_RESULT.FAIL);
    expect(audit.results['EC-14'].result).toBe(AUDIT_RESULT.FAIL);
    expect(audit.results['EC-01'].result).toBe(AUDIT_RESULT.PASS);
  });

  it('EC-15 fails when failedTests exceeds the known pre-existing baseline', () => {
    const { service } = buildService();
    const audit = service.auditExitCriteria({
      testSuiteStatus: { ...PASSING_TEST_SUITE_STATUS, failedTests: 40 },
    });
    expect(audit.results['EC-15'].result).toBe(AUDIT_RESULT.FAIL);
  });

  it('EC-15 fails when a new failing file appears, even with the same failure count', () => {
    const { service } = buildService();
    const audit = service.auditExitCriteria({
      testSuiteStatus: { ...PASSING_TEST_SUITE_STATUS, newFailureFiles: ['tests/some-new.test.js'] },
    });
    expect(audit.results['EC-15'].result).toBe(AUDIT_RESULT.FAIL);
  });

  it('defaults to all-FAIL when no testSuiteStatus is given (never fabricate a PASS)', () => {
    const { service } = buildService();
    const audit = service.auditExitCriteria({});
    expect(audit.allPass).toBe(false);
    expect(audit.passCount).toBe(0);
  });
});

// ── auditBDCompliance (BD-001〜BD-043) ───────────────────────────────────────

describe('Wave2ExitAuditService.auditBDCompliance()', () => {
  it('covers all 43 BD-001〜043 entries', () => {
    const { service } = buildService();
    const audit = service.auditBDCompliance({
      researchPlatformReport: { bd021: { result: AUDIT_RESULT.PASS }, bd030_036: { result: AUDIT_RESULT.PASS }, bd037: { result: AUDIT_RESULT.PASS }, bd039: { result: AUDIT_RESULT.PASS } },
      phase3Report: { phase3Complete: true },
      aiSafetyReport: { phaseDComplete: true, totalViolations: 0 },
    });
    expect(audit.items).toHaveLength(BD_SCOPE_LIST.length);
    expect(audit.items).toHaveLength(43);
  });

  it('mechanically-audited BDs PASS when all sub-reports pass', () => {
    const { service } = buildService();
    const audit = service.auditBDCompliance({
      researchPlatformReport: { bd021: { result: AUDIT_RESULT.PASS }, bd030_036: { result: AUDIT_RESULT.PASS }, bd037: { result: AUDIT_RESULT.PASS }, bd039: { result: AUDIT_RESULT.PASS } },
      phase3Report: { phase3Complete: true },
      aiSafetyReport: { phaseDComplete: true, totalViolations: 0 },
    });
    expect(audit.mechanicalPassCount).toBe(MECHANICALLY_AUDITED_BDS.length);
    expect(audit.mechanicalFailCount).toBe(0);
    expect(audit.mechanicallyCompliant).toBe(true);
    for (const bd of MECHANICALLY_AUDITED_BDS) {
      expect(audit.items.find(i => i.bd === bd).status).toBe(BD_STATUS.PASS);
    }
  });

  it('non-mechanically-audited BDs are FOUNDER_REVIEW_REQUIRED, never fabricated PASS', () => {
    const { service } = buildService();
    const audit = service.auditBDCompliance({
      researchPlatformReport: { bd021: { result: AUDIT_RESULT.PASS }, bd030_036: { result: AUDIT_RESULT.PASS }, bd037: { result: AUDIT_RESULT.PASS }, bd039: { result: AUDIT_RESULT.PASS } },
      phase3Report: { phase3Complete: true },
      aiSafetyReport: { phaseDComplete: true, totalViolations: 0 },
    });
    expect(audit.founderReviewCount).toBe(BD_SCOPE_LIST.length - MECHANICALLY_AUDITED_BDS.length);
    expect(audit.items.find(i => i.bd === 'BD-003').status).toBe(BD_STATUS.FOUNDER_REVIEW_REQUIRED);
  });

  it('mechanicallyCompliant is false when any mechanical BD fails (e.g. BD-021)', () => {
    const { service } = buildService();
    const audit = service.auditBDCompliance({
      researchPlatformReport: { bd021: { result: AUDIT_RESULT.FAIL }, bd030_036: { result: AUDIT_RESULT.PASS }, bd037: { result: AUDIT_RESULT.PASS }, bd039: { result: AUDIT_RESULT.PASS } },
      phase3Report: { phase3Complete: true },
      aiSafetyReport: { phaseDComplete: true, totalViolations: 0 },
    });
    expect(audit.items.find(i => i.bd === 'BD-021').status).toBe(BD_STATUS.FAIL);
    expect(audit.mechanicallyCompliant).toBe(false);
  });

  it('BD-027 is always PASS (structural — confirmWave3Migration() requires founderId)', () => {
    const { service } = buildService();
    const audit = service.auditBDCompliance({
      researchPlatformReport: { bd021: { result: AUDIT_RESULT.FAIL }, bd030_036: { result: AUDIT_RESULT.FAIL }, bd037: { result: AUDIT_RESULT.FAIL }, bd039: { result: AUDIT_RESULT.FAIL } },
      phase3Report: { phase3Complete: false },
      aiSafetyReport: { phaseDComplete: false, totalViolations: 5 },
    });
    expect(audit.items.find(i => i.bd === 'BD-027').status).toBe(BD_STATUS.PASS);
  });
});

// ── generateExitReport — full Founder-facing report ─────────────────────────

describe('Wave2ExitAuditService.generateExitReport()', () => {
  it('wave3ReadyForFounderApproval=true when all EC/QC/mechanical-BD pass', () => {
    const { service } = passingSetup();
    const report = service.generateExitReport({
      clusterProfiles: qualifiedClusterProfiles(5),
      aiSafetyServiceStatuses: COMPLIANT_AI_SAFETY_STATUSES,
      testSuiteStatus: PASSING_TEST_SUITE_STATUS,
    });
    expect(report.result).toBe(AUDIT_RESULT.PASS);
    expect(report.wave3ReadyForFounderApproval).toBe(true);
    expect(report.ecSummary.passCount).toBe(EC_LIST.length);
    expect(report.qcSummary.passCount).toBe(QC_LIST.length);
    expect(report.bdSummary.mechanicallyCompliant).toBe(true);
  });

  it('wave3ReadyForFounderApproval=false when EC-15 (vitest) fails', () => {
    const { service } = passingSetup();
    const report = service.generateExitReport({
      clusterProfiles: qualifiedClusterProfiles(5),
      aiSafetyServiceStatuses: COMPLIANT_AI_SAFETY_STATUSES,
      testSuiteStatus: { ...PASSING_TEST_SUITE_STATUS, failedTests: 100 },
    });
    expect(report.wave3ReadyForFounderApproval).toBe(false);
  });

  it('wave3ReadyForFounderApproval=false when k-anonymity (QC-03) fails', () => {
    const { service } = passingSetup();
    const report = service.generateExitReport({
      clusterProfiles: { LOWN: { caseCount: 1, signalPercentiles: { PAIN: {} } } },
      aiSafetyServiceStatuses: COMPLIANT_AI_SAFETY_STATUSES,
      testSuiteStatus: PASSING_TEST_SUITE_STATUS,
    });
    expect(report.qcSummary.results['QC-03'].result).toBe(AUDIT_RESULT.FAIL);
    expect(report.wave3ReadyForFounderApproval).toBe(false);
  });

  it('wave3ReadyForFounderApproval=false when AI Safety (QC-04) fails', () => {
    const { service } = passingSetup();
    const report = service.generateExitReport({
      clusterProfiles: qualifiedClusterProfiles(5),
      aiSafetyServiceStatuses: {}, // missing coverage
      testSuiteStatus: PASSING_TEST_SUITE_STATUS,
    });
    expect(report.qcSummary.results['QC-04'].result).toBe(AUDIT_RESULT.FAIL);
    expect(report.wave3ReadyForFounderApproval).toBe(false);
  });

  it('is frozen (Founder-facing report is immutable)', () => {
    const { service } = passingSetup();
    const report = service.generateExitReport({ testSuiteStatus: PASSING_TEST_SUITE_STATUS });
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.ecSummary)).toBe(true);
    expect(Object.isFrozen(report.bdSummary)).toBe(true);
  });

  it('carries generatedAt (BD-018) and schemaVersion', () => {
    const { service } = passingSetup();
    const report = service.generateExitReport({ testSuiteStatus: PASSING_TEST_SUITE_STATUS });
    expect(new Date(report.generatedAt).toISOString()).toBe(report.generatedAt);
    expect(report.schemaVersion).toBe(WAVE2_EXIT_AUDIT_SCHEMA_VERSION);
  });
});

// ── confirmWave3Migration — Founder approval gate (BD-027 / BD-040) ─────────

describe('Wave2ExitAuditService.confirmWave3Migration()', () => {
  it('throws Wave2ExitCriteriaNotMetError when exitReport is not ready', () => {
    const { service } = buildService();
    const exitReport = { wave3ReadyForFounderApproval: false, ecSummary: { passCount: 3 }, qcSummary: { passCount: 1 } };
    expect(() => service.confirmWave3Migration({ founderId: 'founder-1', exitReport }))
      .toThrow(Wave2ExitCriteriaNotMetError);
  });

  it('succeeds and records an ApprovalRecord when exitReport is ready', () => {
    _resetWave2ExitApprovalCounter();
    const { service } = passingSetup();
    const exitReport = service.generateExitReport({
      clusterProfiles: qualifiedClusterProfiles(5),
      aiSafetyServiceStatuses: COMPLIANT_AI_SAFETY_STATUSES,
      testSuiteStatus: PASSING_TEST_SUITE_STATUS,
    });
    expect(exitReport.wave3ReadyForFounderApproval).toBe(true);

    const record = service.confirmWave3Migration({ founderId: 'founder-1', exitReport, note: 'Wave3 GO' });
    expect(record.founderId).toBe('founder-1');
    expect(service.isWave3MigrationConfirmed()).toBe(true);
    expect(service.getApprovals()).toHaveLength(1);
  });

  it('rejects a missing founderId even with a ready exitReport (BD-027)', () => {
    const { service } = passingSetup();
    const exitReport = service.generateExitReport({
      clusterProfiles: qualifiedClusterProfiles(5),
      aiSafetyServiceStatuses: COMPLIANT_AI_SAFETY_STATUSES,
      testSuiteStatus: PASSING_TEST_SUITE_STATUS,
    });
    expect(() => service.confirmWave3Migration({ founderId: '', exitReport })).toThrow(/founderId is required/);
  });

  it('publishes WAVE2_EXIT_CONFIRMED (best-effort)', () => {
    const published = [];
    const built = buildDeps();
    built.cohortBuilderService.defineCohort({ name: 'c', createdBy: 'f', cohortId: 'coh-1' });
    built.cohortBuilderService.confirmKAnonymity('coh-1', 10);
    built.datasetVersionService.publish({ type: DATASET_TYPES.FULL, createdBy: 'founder-1' });
    const service = new Wave2ExitAuditService({ ...built, eventPublisher: { publish: (e) => published.push(e) } });
    const exitReport = service.generateExitReport({
      clusterProfiles: qualifiedClusterProfiles(5),
      aiSafetyServiceStatuses: COMPLIANT_AI_SAFETY_STATUSES,
      testSuiteStatus: PASSING_TEST_SUITE_STATUS,
    });
    service.confirmWave3Migration({ founderId: 'founder-1', exitReport });
    expect(published).toHaveLength(1);
    expect(published[0].eventType).toBe('WAVE2_EXIT_CONFIRMED');
  });
});

// ── generateWave3MigrationDocument ───────────────────────────────────────────

describe('Wave2ExitAuditService.generateWave3MigrationDocument()', () => {
  it('throws without an approvalRecord', () => {
    const { service } = buildService();
    expect(() => service.generateWave3MigrationDocument({ exitReport: {}, approvalRecord: null }))
      .toThrow(/approvalRecord is required/);
  });

  it('produces a Founder-facing document referencing the approval and exit report', () => {
    const { service } = passingSetup();
    const exitReport = service.generateExitReport({
      clusterProfiles: qualifiedClusterProfiles(5),
      aiSafetyServiceStatuses: COMPLIANT_AI_SAFETY_STATUSES,
      testSuiteStatus: PASSING_TEST_SUITE_STATUS,
    });
    const approvalRecord = service.confirmWave3Migration({ founderId: 'founder-1', exitReport });
    const doc = service.generateWave3MigrationDocument({ exitReport, approvalRecord });
    expect(doc.approvedBy).toBe('founder-1');
    expect(doc.ecSummary).toBe(exitReport.ecSummary);
    expect(doc.qcSummary).toBe(exitReport.qcSummary);
    expect(Object.isFrozen(doc)).toBe(true);
  });
});

// ── getStatus ────────────────────────────────────────────────────────────────

describe('Wave2ExitAuditService.getStatus()', () => {
  it('returns frozen status metadata', () => {
    const { service } = buildService();
    const status = service.getStatus();
    expect(Object.isFrozen(status)).toBe(true);
    expect(status.ready).toBe(true);
    expect(status.ecCount).toBe(15);
    expect(status.qcCount).toBe(4);
    expect(status.bdScopeCount).toBe(43);
    expect(status.wave3MigrationConfirmed).toBe(false);
  });
});

// ── CompositionRoot DI wiring ───────────────────────────────────────────────

describe('CompositionRoot — PR-075 Wave2ExitAuditService DI wiring', () => {
  vi.mock('../../src/services/supabase.js', () => ({ supabase: null }));
  vi.mock('../../src/modules/auth/auth-service.js', () => ({
    getAuthState: vi.fn(() => ({ isReady: false, userId: null, isPremium: false, isAdmin: false })),
    AUTH_LIFECYCLE: { AUTH_READY: 'AUTH_READY' },
  }));
  vi.mock('../../src/legacy/legacy-bridge.js', () => ({
    LegacyBridge: class MockLegacyBridge { boot = vi.fn(); },
  }));
  vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));

  it('TOKENS.Wave2ExitAuditService is defined', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.Wave2ExitAuditService).toBe('Wave2ExitAuditService');
  });

  it('root.assemble() registers Wave2ExitAudit and resolves a working service', async () => {
    const { CompositionRoot }     = await import('../../src/application/composition-root.js');
    const { DependencyContainer } = await import('../../src/bootstrap/dependency-container.js');
    const { RouteRegistry }       = await import('../../src/bootstrap/route-registry.js');
    const { loadBootstrapConfig } = await import('../../src/bootstrap/bootstrap-config.js');
    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    const config    = loadBootstrapConfig();
    const root      = new CompositionRoot(container, registry, config);
    root.assemble();
    expect(registry.isRegistered('Wave2ExitAudit')).toBe(true);

    const { TOKENS } = await import('../../src/application/composition-root.js');
    const service = container.resolve(TOKENS.Wave2ExitAuditService);
    expect(service).toBeInstanceOf(Wave2ExitAuditService);
    expect(service.getStatus().ready).toBe(true);
  });
});
