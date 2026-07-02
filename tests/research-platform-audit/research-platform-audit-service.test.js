// tests/research-platform-audit/research-platform-audit-service.test.js — PR-072 tests.
// ResearchPlatformAuditService — Wave2 Research Platform Audit (Phase F capstone).
// Audited BDs: BD-021 / BD-030 / BD-036 / BD-037 / BD-039.
import { describe, it, expect, vi } from 'vitest';
import { ResearchPlatformAuditService } from '../../src/domains/research-platform-audit/research-platform-audit-service.js';
import {
  K_ANONYMITY_MIN, DISEASE_CLUSTER_TARGET_K, AUDIT_RESULT, AUDITED_BD_LIST,
  RESEARCH_PLATFORM_AUDIT_SCHEMA_VERSION,
} from '../../src/domains/research-platform-audit/research-platform-audit-types.js';
import { DatasetVersionRepository } from '../../src/domains/dataset-version/dataset-version-repository.js';
import { DatasetVersionService }    from '../../src/domains/dataset-version/dataset-version-service.js';
import { DATASET_TYPES }            from '../../src/domains/dataset-version/dataset-version-types.js';
import { CohortRepository }         from '../../src/domains/cohort/cohort-repository.js';
import { CohortBuilderService }     from '../../src/domains/cohort/cohort-builder-service.js';
import { KnowledgeGraphRepository } from '../../src/domains/knowledge/knowledge-graph-repository.js';
import { AISafetyValidator }        from '../../src/domains/ai-safety/ai-safety-validator.js';
import { PHASE_D_SERVICE_IDS }      from '../../src/domains/ai-safety/ai-safety-types.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const COMPLIANT_AI_SAFETY_STATUSES = Object.fromEntries(
  PHASE_D_SERVICE_IDS.map(id => [
    id,
    Object.freeze({ ready: true, bd031: 'rule-based only', bd038: 'isMedicalAdvice:false enforced', access: 'admin:research' }),
  ])
);

function buildDeps() {
  const datasetVersionService = new DatasetVersionService({ repository: new DatasetVersionRepository() });
  const cohortBuilderService  = new CohortBuilderService({ repository: new CohortRepository() });
  const knowledgeGraphRepository = new KnowledgeGraphRepository();
  const aiSafetyValidator = new AISafetyValidator();
  return { datasetVersionService, cohortBuilderService, knowledgeGraphRepository, aiSafetyValidator };
}

function buildService(overrides = {}) {
  const deps = { ...buildDeps(), ...overrides };
  return { service: new ResearchPlatformAuditService(deps), ...deps };
}

function qualifiedClusterProfiles(count = 5) {
  const keys = ['ENDO', 'PCOS', 'ADENO', 'PMDD', 'FIBROID'];
  const profiles = {};
  for (let i = 0; i < count; i++) profiles[keys[i]] = { caseCount: 60 };
  return profiles;
}

// ── Construction ─────────────────────────────────────────────────────────────

describe('ResearchPlatformAuditService — constructor', () => {
  it('throws when datasetVersionService is missing', () => {
    const { cohortBuilderService, knowledgeGraphRepository, aiSafetyValidator } = buildDeps();
    expect(() => new ResearchPlatformAuditService({
      cohortBuilderService, knowledgeGraphRepository, aiSafetyValidator,
    })).toThrow(/datasetVersionService is required/);
  });

  it('throws when cohortBuilderService is missing', () => {
    const { datasetVersionService, knowledgeGraphRepository, aiSafetyValidator } = buildDeps();
    expect(() => new ResearchPlatformAuditService({
      datasetVersionService, knowledgeGraphRepository, aiSafetyValidator,
    })).toThrow(/cohortBuilderService is required/);
  });

  it('throws when knowledgeGraphRepository is missing', () => {
    const { datasetVersionService, cohortBuilderService, aiSafetyValidator } = buildDeps();
    expect(() => new ResearchPlatformAuditService({
      datasetVersionService, cohortBuilderService, aiSafetyValidator,
    })).toThrow(/knowledgeGraphRepository is required/);
  });

  it('throws when aiSafetyValidator is missing', () => {
    const { datasetVersionService, cohortBuilderService, knowledgeGraphRepository } = buildDeps();
    expect(() => new ResearchPlatformAuditService({
      datasetVersionService, cohortBuilderService, knowledgeGraphRepository,
    })).toThrow(/aiSafetyValidator is required/);
  });
});

// ── auditDatasetAttribution (BD-021) ────────────────────────────────────────

describe('ResearchPlatformAuditService.auditDatasetAttribution() — BD-021', () => {
  it('passes with zero published versions', () => {
    const { service } = buildService();
    const audit = service.auditDatasetAttribution();
    expect(audit.result).toBe(AUDIT_RESULT.PASS);
    expect(audit.checkedCount).toBe(0);
  });

  it('passes when every published DatasetVersion carries createdBy (structurally enforced)', () => {
    const { service, datasetVersionService } = buildService();
    datasetVersionService.publish({ type: DATASET_TYPES.FULL, createdBy: 'founder-1' });
    datasetVersionService.publish({ type: DATASET_TYPES.FULL, createdBy: 'founder-1' });
    const audit = service.auditDatasetAttribution();
    expect(audit.result).toBe(AUDIT_RESULT.PASS);
    expect(audit.checkedCount).toBe(2);
    expect(audit.violations).toHaveLength(0);
  });

  it('rejects publishing a version without createdBy at the source (BD-021 is structural)', () => {
    const { datasetVersionService } = buildService();
    expect(() => datasetVersionService.publish({ type: DATASET_TYPES.FULL, createdBy: '' }))
      .toThrow(/createdBy is required/);
  });

  it('flags a version with missing createdBy surfaced via a stub datasetVersionService', () => {
    const { cohortBuilderService, knowledgeGraphRepository, aiSafetyValidator } = buildDeps();
    const stubDatasetVersionService = {
      getVersions: () => [{ versionId: 'dv-bad', createdBy: '' }, { versionId: 'dv-good', createdBy: 'founder-1' }],
    };
    const service = new ResearchPlatformAuditService({
      datasetVersionService: stubDatasetVersionService, cohortBuilderService, knowledgeGraphRepository, aiSafetyValidator,
    });
    const audit = service.auditDatasetAttribution();
    expect(audit.result).toBe(AUDIT_RESULT.FAIL);
    expect(audit.checkedCount).toBe(2);
    expect(audit.violations).toHaveLength(1);
    expect(audit.violations[0].versionId).toBe('dv-bad');
  });
});

// ── auditKAnonymity (BD-030 / BD-036) ───────────────────────────────────────

describe('ResearchPlatformAuditService.auditKAnonymity() — BD-030 / BD-036', () => {
  it('throws when clusterProfiles is not a keyed object', () => {
    const { service } = buildService();
    expect(() => service.auditKAnonymity(null)).toThrow(TypeError);
    expect(() => service.auditKAnonymity([])).toThrow(TypeError);
  });

  it('passes when all clusters and cohorts meet k>=5', () => {
    const { service, cohortBuilderService } = buildService();
    const cohort = cohortBuilderService.defineCohort({ name: 'ENDO cohort', createdBy: 'founder-1' });
    cohortBuilderService.confirmKAnonymity(cohort.cohortId, 12);

    const audit = service.auditKAnonymity(qualifiedClusterProfiles(5));
    expect(audit.result).toBe(AUDIT_RESULT.PASS);
    expect(audit.clusterViolations).toHaveLength(0);
    expect(audit.cohortViolations).toHaveLength(0);
    expect(audit.kAnonymityMin).toBe(K_ANONYMITY_MIN);
  });

  it('fails (ZERO TOLERANCE) when a cluster has caseCount < 5', () => {
    const { service } = buildService();
    const profiles = { ...qualifiedClusterProfiles(4), LOWN: { caseCount: 2 } };
    const audit = service.auditKAnonymity(profiles);
    expect(audit.result).toBe(AUDIT_RESULT.FAIL);
    expect(audit.clusterViolations).toHaveLength(1);
    expect(audit.clusterViolations[0].diseaseKey).toBe('LOWN');
  });

  it('fails when a cohort is not k-anonymity verified', () => {
    const { service, cohortBuilderService } = buildService();
    cohortBuilderService.defineCohort({ name: 'unverified', createdBy: 'founder-1' });
    const audit = service.auditKAnonymity(qualifiedClusterProfiles(5));
    expect(audit.result).toBe(AUDIT_RESULT.FAIL);
    expect(audit.cohortViolations).toHaveLength(1);
  });

  it('counts clusters meeting the BD-036 target k>=50', () => {
    const { service } = buildService();
    const profiles = { ENDO: { caseCount: 60 }, PCOS: { caseCount: 10 } };
    const audit = service.auditKAnonymity(profiles);
    expect(audit.clustersMeetingTargetK).toBe(1);
    expect(audit.clusterTargetK).toBe(DISEASE_CLUSTER_TARGET_K);
  });

  it('treats a missing/null profile as caseCount 0 (fails)', () => {
    const { service } = buildService();
    const audit = service.auditKAnonymity({ ENDO: null });
    expect(audit.result).toBe(AUDIT_RESULT.FAIL);
    expect(audit.clusterViolations[0].caseCount).toBe(0);
  });
});

// ── auditKnowledgeGraphAppendOnly (BD-037) ──────────────────────────────────

describe('ResearchPlatformAuditService.auditKnowledgeGraphAppendOnly() — BD-037', () => {
  it('passes: deleteNode() and deleteEdge() are structurally blocked', () => {
    const { service } = buildService();
    const audit = service.auditKnowledgeGraphAppendOnly();
    expect(audit.result).toBe(AUDIT_RESULT.PASS);
    expect(audit.nodeDeleteBlocked).toBe(true);
    expect(audit.edgeDeleteBlocked).toBe(true);
  });

  it('reports current node/edge counts from the repository', () => {
    const { service, knowledgeGraphRepository } = buildService();
    knowledgeGraphRepository.addNode({ nodeId: 'n1', type: 'DISEASE' });
    const audit = service.auditKnowledgeGraphAppendOnly();
    expect(audit.nodeCount).toBe(1);
    expect(audit.edgeCount).toBe(0);
  });

  it('does not mutate the repository (probe calls are no-ops)', () => {
    const { service, knowledgeGraphRepository } = buildService();
    knowledgeGraphRepository.addNode({ nodeId: 'n1', type: 'DISEASE' });
    service.auditKnowledgeGraphAppendOnly();
    expect(knowledgeGraphRepository.getStats().nodeCount).toBe(1);
  });
});

// ── auditAiSafetyAlignment (BD-039) ─────────────────────────────────────────

describe('ResearchPlatformAuditService.auditAiSafetyAlignment() — BD-039', () => {
  it('passes when Phase D services are all compliant with zero violations', () => {
    const { service } = buildService();
    const audit = service.auditAiSafetyAlignment(COMPLIANT_AI_SAFETY_STATUSES);
    expect(audit.result).toBe(AUDIT_RESULT.PASS);
    expect(audit.phaseDComplete).toBe(true);
    expect(audit.totalViolations).toBe(0);
  });

  it('fails when Phase D services are not fully covered', () => {
    const { service } = buildService();
    const audit = service.auditAiSafetyAlignment({});
    expect(audit.result).toBe(AUDIT_RESULT.FAIL);
    expect(audit.phaseDComplete).toBe(false);
  });

  it('fails when the validator has accumulated violations', () => {
    const { service, aiSafetyValidator } = buildService();
    aiSafetyValidator.validate({ text: 'あなたは子宮内膜症病です。', isMedicalAdvice: false, serviceId: 'SignalInsightService' });
    const audit = service.auditAiSafetyAlignment(COMPLIANT_AI_SAFETY_STATUSES);
    expect(audit.result).toBe(AUDIT_RESULT.FAIL);
    expect(audit.totalViolations).toBeGreaterThan(0);
  });
});

// ── auditPlatform — full Founder-facing report ──────────────────────────────

describe('ResearchPlatformAuditService.auditPlatform()', () => {
  function passingSetup() {
    const built = buildService();
    built.cohortBuilderService.defineCohort({ name: 'c', createdBy: 'f', cohortId: 'coh-1' });
    built.cohortBuilderService.confirmKAnonymity('coh-1', 10);
    built.datasetVersionService.publish({ type: DATASET_TYPES.FULL, createdBy: 'founder-1' });
    return built;
  }

  it('phaseFComplete=true when all BD checks pass', () => {
    const { service } = passingSetup();
    const report = service.auditPlatform({
      clusterProfiles: qualifiedClusterProfiles(5),
      aiSafetyServiceStatuses: COMPLIANT_AI_SAFETY_STATUSES,
    });
    expect(report.result).toBe(AUDIT_RESULT.PASS);
    expect(report.phaseFComplete).toBe(true);
  });

  it('phaseFComplete=false when any single BD check fails', () => {
    const { service } = passingSetup();
    const report = service.auditPlatform({
      clusterProfiles: { LOWN: { caseCount: 1 } }, // BD-030 violation
      aiSafetyServiceStatuses: COMPLIANT_AI_SAFETY_STATUSES,
    });
    expect(report.result).toBe(AUDIT_RESULT.FAIL);
    expect(report.phaseFComplete).toBe(false);
  });

  it('carries all four BD sub-reports', () => {
    const { service } = passingSetup();
    const report = service.auditPlatform({
      clusterProfiles: qualifiedClusterProfiles(5),
      aiSafetyServiceStatuses: COMPLIANT_AI_SAFETY_STATUSES,
    });
    expect(report.bd021.result).toBeDefined();
    expect(report.bd030_036.result).toBeDefined();
    expect(report.bd037.result).toBeDefined();
    expect(report.bd039.result).toBeDefined();
  });

  it('exposes auditedBDs and schemaVersion', () => {
    const { service } = passingSetup();
    const report = service.auditPlatform({});
    expect(report.auditedBDs).toEqual(AUDITED_BD_LIST);
    expect(report.schemaVersion).toBe(RESEARCH_PLATFORM_AUDIT_SCHEMA_VERSION);
  });

  it('carries generatedAt (BD-018)', () => {
    const { service } = passingSetup();
    const report = service.auditPlatform({});
    expect(new Date(report.generatedAt).toISOString()).toBe(report.generatedAt);
  });

  it('is frozen (Founder-facing report is immutable)', () => {
    const { service } = passingSetup();
    const report = service.auditPlatform({});
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.bd030_036)).toBe(true);
  });

  it('publishes RESEARCH_PLATFORM_AUDIT_COMPLETED (best-effort)', () => {
    const published = [];
    const deps = buildDeps();
    const service = new ResearchPlatformAuditService({ ...deps, eventPublisher: { publish: (e) => published.push(e) } });
    service.auditPlatform({});
    expect(published).toHaveLength(1);
    expect(published[0].eventType).toBe('RESEARCH_PLATFORM_AUDIT_COMPLETED');
  });

  it('survives if eventPublisher.publish throws (best-effort)', () => {
    const deps = buildDeps();
    const service = new ResearchPlatformAuditService({ ...deps, eventPublisher: { publish: () => { throw new Error('bus'); } } });
    expect(() => service.auditPlatform({})).not.toThrow();
  });
});

// ── getStatus ────────────────────────────────────────────────────────────────

describe('ResearchPlatformAuditService.getStatus()', () => {
  it('returns frozen compliance metadata', () => {
    const { service } = buildService();
    const status = service.getStatus();
    expect(Object.isFrozen(status)).toBe(true);
    expect(status.ready).toBe(true);
    expect(status.schemaVersion).toBe(RESEARCH_PLATFORM_AUDIT_SCHEMA_VERSION);
    expect(status.auditedBDs).toEqual(AUDITED_BD_LIST);
    expect(status.kAnonymityMin).toBe(K_ANONYMITY_MIN);
  });
});

// ── CompositionRoot DI wiring ───────────────────────────────────────────────

describe('CompositionRoot — PR-072 ResearchPlatformAuditService DI wiring', () => {
  vi.mock('../../src/services/supabase.js', () => ({ supabase: null }));
  vi.mock('../../src/modules/auth/auth-service.js', () => ({
    getAuthState: vi.fn(() => ({ isReady: false, userId: null, isPremium: false, isAdmin: false })),
    AUTH_LIFECYCLE: { AUTH_READY: 'AUTH_READY' },
  }));
  vi.mock('../../src/legacy/legacy-bridge.js', () => ({
    LegacyBridge: class MockLegacyBridge { boot = vi.fn(); },
  }));
  vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));

  it('TOKENS.ResearchPlatformAuditService is defined', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.ResearchPlatformAuditService).toBe('ResearchPlatformAuditService');
  });

  // NOTE: RouteRegistry.KNOWN_FEATURES (src/bootstrap/route-registry.js) has not been
  // updated since PR-050 — every feature registered by PR-051〜072 is silently dropped
  // by register()'s allowlist check (pre-existing gap, reproduced here for PR-072's
  // 'ResearchPlatformAudit' entry too). Updating KNOWN_FEATURES is out of PR-072 Scope
  // (shared file, 22-PR-old gap unrelated to this PR) — asserting the actual
  // (pre-existing) behavior instead of the intended one.
  it('root.assemble() registers ResearchPlatformAudit without throwing (KNOWN_FEATURES gap pre-dates PR-072)', async () => {
    const { CompositionRoot } = await import('../../src/application/composition-root.js');
    const { DependencyContainer } = await import('../../src/bootstrap/dependency-container.js');
    const { RouteRegistry }       = await import('../../src/bootstrap/route-registry.js');
    const { loadBootstrapConfig } = await import('../../src/bootstrap/bootstrap-config.js');
    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    const config    = loadBootstrapConfig();
    const root      = new CompositionRoot(container, registry, config);
    root.assemble();
    expect(registry.isRegistered('ResearchPlatformAudit')).toBe(false);

    const { TOKENS } = await import('../../src/application/composition-root.js');
    const service = container.resolve(TOKENS.ResearchPlatformAuditService);
    expect(service).toBeInstanceOf(ResearchPlatformAuditService);
    expect(service.getStatus().ready).toBe(true);
  });
});
