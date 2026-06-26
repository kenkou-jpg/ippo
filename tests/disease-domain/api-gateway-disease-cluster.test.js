// tests/disease-domain/api-gateway-disease-cluster.test.js
// ApiGateway — PR-034 disease cluster methods
import { describe, it, expect } from 'vitest';
import { ApiGateway }               from '../../src/application/api-gateway.js';
import { DiseaseClusterRepository } from '../../src/domains/disease/disease-cluster-repository.js';
import { DiseaseClusterService }    from '../../src/domains/disease/disease-cluster-service.js';
import { DiseaseSignalMapper }      from '../../src/domains/disease/disease-signal-mapper.js';
import { ClusterSimilarityAdapter } from '../../src/domains/disease/cluster-similarity-adapter.js';

const makePermission = () => ({
  require: async () => ({ userId: 'u1', isAdmin: false }),
});

function makeClusterSvc() {
  return new DiseaseClusterService({
    repository: new DiseaseClusterRepository(),
    mapper:     new DiseaseSignalMapper(),
  });
}

function makeGateway(overrides = {}) {
  return new ApiGateway({
    permissionService:         makePermission(),
    similarityAccessGuard:     { assertAccess: () => {}, filterEdges: (e) => e },
    consentEnforcementService: { validate: () => {} },
    recordQueryService:        { findByUser: async () => [] },
    recordCommandService:      { save: async (d) => d },
    experimentQueryService:    { findByUser: async () => [] },
    experimentCommandService:  { create: async (d) => d },
    caseGenerationService:     { generate: async () => ({}) },
    similarityEngine:          { findSimilar: async () => [] },
    diseaseClusterService:     makeClusterSvc(),
    diseaseSignalMapper:       new DiseaseSignalMapper(),
    clusterSimilarityAdapter:  new ClusterSimilarityAdapter(),
    ...overrides,
  });
}

function baseCluster(overrides = {}) {
  return { clusterKey: 'endometriosis', diseaseCategory: 'Gynecology', ...overrides };
}

// ── createDiseaseCluster() ────────────────────────────────────────────────────
describe('ApiGateway.createDiseaseCluster()', () => {
  it('creates and returns a cluster', async () => {
    const gw = makeGateway();
    const c = await gw.createDiseaseCluster(baseCluster());
    expect(c.clusterKey).toBe('endometriosis');
  });

  it('throws if DiseaseClusterService not wired', async () => {
    const gw = makeGateway({ diseaseClusterService: null });
    await expect(gw.createDiseaseCluster(baseCluster())).rejects.toThrow('[ApiGateway] DiseaseClusterService not wired');
  });

  it('requires record:read permission', async () => {
    let called = false;
    const gw = makeGateway({
      permissionService: { require: async (p) => { called = true; expect(p).toBe('record:read'); return {}; } },
    });
    await gw.createDiseaseCluster(baseCluster()).catch(() => {});
    expect(called).toBe(true);
  });
});

// ── getDiseaseClusters() ──────────────────────────────────────────────────────
describe('ApiGateway.getDiseaseClusters()', () => {
  it('returns [] when empty', async () => {
    expect(await makeGateway().getDiseaseClusters()).toEqual([]);
  });

  it('returns created clusters', async () => {
    const gw = makeGateway();
    await gw.createDiseaseCluster(baseCluster());
    const result = await gw.getDiseaseClusters();
    expect(result).toHaveLength(1);
  });

  it('throws if DiseaseClusterService not wired', async () => {
    await expect(makeGateway({ diseaseClusterService: null }).getDiseaseClusters())
      .rejects.toThrow('[ApiGateway] DiseaseClusterService not wired');
  });
});

// ── getClusterStatistics() ────────────────────────────────────────────────────
describe('ApiGateway.getClusterStatistics()', () => {
  it('returns statistics object', async () => {
    const stats = await makeGateway().getClusterStatistics();
    expect(typeof stats).toBe('object');
    expect(stats.totalClusters).toBe(0);
  });

  it('counts after createDiseaseCluster', async () => {
    const gw = makeGateway();
    await gw.createDiseaseCluster(baseCluster());
    const stats = await gw.getClusterStatistics();
    expect(stats.totalClusters).toBe(1);
  });

  it('throws if DiseaseClusterService not wired', async () => {
    await expect(makeGateway({ diseaseClusterService: null }).getClusterStatistics())
      .rejects.toThrow('[ApiGateway] DiseaseClusterService not wired');
  });
});

// ── findDiseaseCluster() ──────────────────────────────────────────────────────
describe('ApiGateway.findDiseaseCluster()', () => {
  it('returns null when not found', async () => {
    expect(await makeGateway().findDiseaseCluster('nonexistent')).toBeNull();
  });

  it('returns cluster when found', async () => {
    const gw = makeGateway();
    await gw.createDiseaseCluster(baseCluster({ clusterKey: 'pcos' }));
    const found = await gw.findDiseaseCluster('pcos');
    expect(found?.clusterKey).toBe('pcos');
  });

  it('throws if DiseaseClusterService not wired', async () => {
    await expect(makeGateway({ diseaseClusterService: null }).findDiseaseCluster('x'))
      .rejects.toThrow('[ApiGateway] DiseaseClusterService not wired');
  });
});

// ── getDiseaseSignalMapping() ─────────────────────────────────────────────────
describe('ApiGateway.getDiseaseSignalMapping()', () => {
  it('returns an object with signal type keys', async () => {
    const mapping = await makeGateway().getDiseaseSignalMapping();
    expect(typeof mapping).toBe('object');
    expect(Object.keys(mapping)).toContain('PAIN');
    expect(Object.keys(mapping)).toContain('MENSTRUAL');
  });

  it('throws if DiseaseSignalMapper not wired', async () => {
    await expect(makeGateway({ diseaseSignalMapper: null }).getDiseaseSignalMapping())
      .rejects.toThrow('[ApiGateway] DiseaseSignalMapper not wired');
  });
});
