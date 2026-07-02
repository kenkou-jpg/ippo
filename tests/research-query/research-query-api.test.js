import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ResearchQueryApiService, KAnonymityError, QUERY_TYPES, K_ANONYMITY_MIN,
} from '../../src/domains/research-query/research-query-api-service.js';
import { EvidenceLayerService }      from '../../src/domains/evidence/evidence-layer-service.js';
import { ResearchAssistanceService } from '../../src/domains/research-assistance/research-assistance-service.js';
import { CohortRepository }          from '../../src/domains/cohort/cohort-repository.js';
import { CohortBuilderService }      from '../../src/domains/cohort/cohort-builder-service.js';
import { KnowledgeGraphRepository }  from '../../src/domains/knowledge/knowledge-graph-repository.js';
import { KnowledgeGraphService }     from '../../src/domains/knowledge/knowledge-graph-service.js';

function buildService() {
  const evidenceLayerService      = new EvidenceLayerService({});
  const researchAssistanceService = new ResearchAssistanceService({ evidenceLayerService });
  const cohortBuilderService      = new CohortBuilderService({ repository: new CohortRepository() });
  const knowledgeGraphService     = new KnowledgeGraphService({ repository: new KnowledgeGraphRepository() });

  const service = new ResearchQueryApiService({
    evidenceLayerService,
    researchAssistanceService,
    cohortBuilderService,
    knowledgeGraphService,
  });

  return { service, evidenceLayerService, researchAssistanceService, cohortBuilderService, knowledgeGraphService };
}

describe('ResearchQueryApiService — constructor', () => {
  it('throws when evidenceLayerService is missing', () => {
    expect(() => new ResearchQueryApiService({
      researchAssistanceService: {}, cohortBuilderService: {}, knowledgeGraphService: {},
    })).toThrow(/evidenceLayerService is required/);
  });

  it('throws when researchAssistanceService is missing', () => {
    expect(() => new ResearchQueryApiService({
      evidenceLayerService: {}, cohortBuilderService: {}, knowledgeGraphService: {},
    })).toThrow(/researchAssistanceService is required/);
  });

  it('throws when cohortBuilderService is missing', () => {
    expect(() => new ResearchQueryApiService({
      evidenceLayerService: {}, researchAssistanceService: {}, knowledgeGraphService: {},
    })).toThrow(/cohortBuilderService is required/);
  });

  it('throws when knowledgeGraphService is missing', () => {
    expect(() => new ResearchQueryApiService({
      evidenceLayerService: {}, researchAssistanceService: {}, cohortBuilderService: {},
    })).toThrow(/knowledgeGraphService is required/);
  });
});

describe('ResearchQueryApiService.executeQuery() — dispatch', () => {
  it('throws when queryType is missing', () => {
    const { service } = buildService();
    expect(() => service.executeQuery({})).toThrow(/queryType is required/);
  });

  it('throws on unknown queryType', () => {
    const { service } = buildService();
    expect(() => service.executeQuery({ queryType: 'NOT_A_TYPE' })).toThrow(/unknown queryType/);
  });
});

describe('ResearchQueryApiService — QueryType: COHORT_STATS', () => {
  let ctx;
  beforeEach(() => { ctx = buildService(); });

  it('throws when cohortId is missing', () => {
    expect(() => ctx.service.executeQuery({ queryType: QUERY_TYPES.COHORT_STATS, params: {} }))
      .toThrow(/params.cohortId is required/);
  });

  it('throws when cohort is not found', () => {
    expect(() => ctx.service.executeQuery({
      queryType: QUERY_TYPES.COHORT_STATS, params: { cohortId: 'missing' },
    })).toThrow(/cohort not found/);
  });

  it('BD-030: throws when cohort has not been k-anonymity verified', () => {
    const cohort = ctx.cohortBuilderService.defineCohort({ name: 'Endo Cohort', createdBy: 'admin' });
    expect(() => ctx.service.executeQuery({
      queryType: QUERY_TYPES.COHORT_STATS, params: { cohortId: cohort.cohortId },
    })).toThrow(/not been k-anonymity verified/);
  });

  it('BD-030: throws when verifiedCount < K_ANONYMITY_MIN', () => {
    const cohort = ctx.cohortBuilderService.defineCohort({ name: 'Small Cohort', createdBy: 'admin' });
    expect(() => ctx.cohortBuilderService.confirmKAnonymity(cohort.cohortId, K_ANONYMITY_MIN - 1)).toThrow();
  });

  it('completion condition: returns cohort stats + evidenceSummary when eligible', () => {
    const cohort = ctx.cohortBuilderService.defineCohort({ name: 'Endo Cohort', createdBy: 'admin' });
    ctx.cohortBuilderService.confirmKAnonymity(cohort.cohortId, K_ANONYMITY_MIN);

    const result = ctx.service.executeQuery({
      queryType: QUERY_TYPES.COHORT_STATS, params: { cohortId: cohort.cohortId },
    });

    expect(result.queryType).toBe(QUERY_TYPES.COHORT_STATS);
    expect(result.result.cohortId).toBe(cohort.cohortId);
    expect(result.result.kAnonymityVerified).toBe(true);
    expect(result.result.verifiedCount).toBe(K_ANONYMITY_MIN);
    expect(result.result.evidenceSummary).toBeDefined();
    expect(result.isMedicalAdvice).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
  });
});

describe('ResearchQueryApiService — QueryType: SIGNAL_CORRELATION', () => {
  let ctx;
  beforeEach(() => { ctx = buildService(); });

  it('throws when datasets is missing', () => {
    expect(() => ctx.service.executeQuery({
      queryType: QUERY_TYPES.SIGNAL_CORRELATION, params: { caseCount: 10 },
    })).toThrow(/params.datasets is required/);
  });

  it('throws when caseCount is missing (BD-030 gate)', () => {
    expect(() => ctx.service.executeQuery({
      queryType: QUERY_TYPES.SIGNAL_CORRELATION,
      params: { datasets: [{ signalType: 'PAIN', values: [1, 2, 3] }] },
    })).toThrow(/params.caseCount is required/);
  });

  it('BD-030: throws KAnonymityError when 0 < caseCount < K_ANONYMITY_MIN', () => {
    expect(() => ctx.service.executeQuery({
      queryType: QUERY_TYPES.SIGNAL_CORRELATION,
      params: { datasets: [{ signalType: 'PAIN', values: [1, 2, 3] }], caseCount: K_ANONYMITY_MIN - 1 },
    })).toThrow(KAnonymityError);
  });

  it('completion condition: returns descriptiveStats + signalCorrelations when caseCount >= K_ANONYMITY_MIN', () => {
    const result = ctx.service.executeQuery({
      queryType: QUERY_TYPES.SIGNAL_CORRELATION,
      params: {
        datasets: [
          { signalType: 'PAIN',  values: [1, 2, 3, 4, 5] },
          { signalType: 'SLEEP', values: [5, 4, 3, 2, 1] },
        ],
        caseCount: K_ANONYMITY_MIN,
      },
    });

    expect(result.result.descriptiveStats.length).toBeGreaterThan(0);
    expect(result.result.signalCorrelations.length).toBeGreaterThan(0);
    expect(Object.isFrozen(result.result)).toBe(true);
  });
});

describe('ResearchQueryApiService — QueryType: DISEASE_CLUSTER_COMPARE', () => {
  let ctx;
  beforeEach(() => { ctx = buildService(); });

  it('returns empty comparison when no clusterStats/cohorts given', () => {
    const result = ctx.service.executeQuery({ queryType: QUERY_TYPES.DISEASE_CLUSTER_COMPARE, params: {} });
    expect(result.result.clusterComparison).toEqual([]);
  });

  it('BD-030: throws KAnonymityError when a diseaseKey group has 0 < count < K_ANONYMITY_MIN', () => {
    expect(() => ctx.service.executeQuery({
      queryType: QUERY_TYPES.DISEASE_CLUSTER_COMPARE,
      params: { clusterStats: [{ diseaseKey: 'endometriosis', caseCount: K_ANONYMITY_MIN - 1 }] },
    })).toThrow(KAnonymityError);
  });

  it('completion condition: returns per-diseaseKey comparison when count >= K_ANONYMITY_MIN', () => {
    const result = ctx.service.executeQuery({
      queryType: QUERY_TYPES.DISEASE_CLUSTER_COMPARE,
      params: { clusterStats: [{ diseaseKey: 'pcos', caseCount: K_ANONYMITY_MIN, avgQualityScore: 80 }] },
    });

    expect(result.result.clusterComparison).toHaveLength(1);
    expect(result.result.clusterComparison[0].diseaseKey).toBe('pcos');
    expect(result.result.clusterComparison[0].totalCaseCount).toBe(K_ANONYMITY_MIN);
  });
});

describe('ResearchQueryApiService — QueryType: KG_PATH_QUERY', () => {
  let ctx;
  beforeEach(() => { ctx = buildService(); });

  it('throws when fromNodeId/toNodeId are missing', () => {
    expect(() => ctx.service.executeQuery({ queryType: QUERY_TYPES.KG_PATH_QUERY, params: {} }))
      .toThrow(/fromNodeId is required/);
    expect(() => ctx.service.executeQuery({ queryType: QUERY_TYPES.KG_PATH_QUERY, params: { fromNodeId: 'a' } }))
      .toThrow(/toNodeId is required/);
  });

  it('throws when a node does not exist', () => {
    const a = ctx.knowledgeGraphService.addNode({ type: 'DISEASE', attributes: { diseaseKey: 'endometriosis' } });
    expect(() => ctx.service.executeQuery({
      queryType: QUERY_TYPES.KG_PATH_QUERY, params: { fromNodeId: a.nodeId, toNodeId: 'missing' },
    })).toThrow(/KG node not found/);
  });

  it('throws when maxDepth exceeds the structural limit', () => {
    const a = ctx.knowledgeGraphService.addNode({ type: 'DISEASE', attributes: {} });
    const b = ctx.knowledgeGraphService.addNode({ type: 'SYMPTOM', attributes: {} });
    expect(() => ctx.service.executeQuery({
      queryType: QUERY_TYPES.KG_PATH_QUERY,
      params: { fromNodeId: a.nodeId, toNodeId: b.nodeId, maxDepth: 999 },
    })).toThrow(/maxDepth exceeds limit/);
  });

  it('completion condition: finds a direct path (BD-036 read-only, no case-level data)', () => {
    const disease = ctx.knowledgeGraphService.addNode({ type: 'DISEASE', attributes: { diseaseKey: 'endometriosis' } });
    const symptom = ctx.knowledgeGraphService.addNode({ type: 'SYMPTOM', attributes: { symptomKey: 'pain' } });
    ctx.knowledgeGraphService.addEdge({
      fromNodeId: disease.nodeId, toNodeId: symptom.nodeId, relationType: 'HAS_SYMPTOM',
      evidenceCount: 10, confidence: 0.9,
    });

    const result = ctx.service.executeQuery({
      queryType: QUERY_TYPES.KG_PATH_QUERY,
      params: { fromNodeId: disease.nodeId, toNodeId: symptom.nodeId },
    });

    expect(result.result.found).toBe(true);
    expect(result.result.path).toEqual([disease.nodeId, symptom.nodeId]);
  });

  it('returns found:false when no path exists within maxDepth', () => {
    const a = ctx.knowledgeGraphService.addNode({ type: 'DISEASE', attributes: {} });
    const b = ctx.knowledgeGraphService.addNode({ type: 'SYMPTOM', attributes: {} });

    const result = ctx.service.executeQuery({
      queryType: QUERY_TYPES.KG_PATH_QUERY, params: { fromNodeId: a.nodeId, toNodeId: b.nodeId },
    });

    expect(result.result.found).toBe(false);
    expect(result.result.path).toBeNull();
  });
});

describe('ResearchQueryApiService.getStatus()', () => {
  it('reports readiness, all 4 QueryTypes, and admin:research access', () => {
    const { service } = buildService();
    const status = service.getStatus();

    expect(status.ready).toBe(true);
    expect(status.queryTypes).toEqual(expect.arrayContaining(Object.values(QUERY_TYPES)));
    expect(status.queryTypes).toHaveLength(4);
    expect(status.access).toBe('admin:research only');
    expect(Object.isFrozen(status)).toBe(true);
  });
});

describe('CompositionRoot — PR-071 ResearchQueryApiService DI wiring', () => {
  vi.mock('../../src/services/supabase.js', () => ({ supabase: null }));
  vi.mock('../../src/modules/auth/auth-service.js', () => ({
    getAuthState: vi.fn(() => ({ isReady: false, userId: null, isPremium: false, isAdmin: false })),
    AUTH_LIFECYCLE: { AUTH_READY: 'AUTH_READY' },
  }));
  vi.mock('../../src/legacy/legacy-bridge.js', () => ({
    LegacyBridge: class MockLegacyBridge { boot = vi.fn(); },
  }));
  vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));

  async function makeRoot() {
    const { TOKENS, CompositionRoot } = await import('../../src/application/composition-root.js');
    const { DependencyContainer }     = await import('../../src/bootstrap/dependency-container.js');
    const { RouteRegistry }           = await import('../../src/bootstrap/route-registry.js');
    const { loadBootstrapConfig }     = await import('../../src/bootstrap/bootstrap-config.js');
    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    const config    = loadBootstrapConfig();
    const root      = new CompositionRoot(container, registry, config);
    root.assemble();
    return { container, registry, TOKENS };
  }

  it('TOKENS.ResearchQueryApiService is defined', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.ResearchQueryApiService).toBe('ResearchQueryApiService');
  });

  it('resolves a working ResearchQueryApiService instance from the container', async () => {
    const { container, TOKENS } = await makeRoot();
    const service = container.resolve(TOKENS.ResearchQueryApiService);
    expect(service).toBeInstanceOf(ResearchQueryApiService);
    expect(service.getStatus().ready).toBe(true);
  });

  // RouteRegistry.KNOWN_FEATURES (src/bootstrap/route-registry.js) was extended to cover
  // PR-051〜072 in PR-073 (Architecture Guard Wave2 Complete) — ResearchQueryAPI now
  // registers successfully instead of being silently dropped.
  it('root.assemble() registers ResearchQueryAPI (KNOWN_FEATURES gap closed in PR-073)', async () => {
    const { registry } = await makeRoot();
    expect(registry.isRegistered('ResearchQueryAPI')).toBe(true);
  });

  it('ApiGateway exposes executeResearchQuery / getResearchQueryStatus wired to ResearchQueryApiService', async () => {
    const { container, TOKENS } = await makeRoot();
    const apiGateway = container.resolve(TOKENS.ApiGateway);
    expect(typeof apiGateway.executeResearchQuery).toBe('function');
    expect(typeof apiGateway.getResearchQueryStatus).toBe('function');
  });
});
