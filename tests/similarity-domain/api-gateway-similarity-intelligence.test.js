// tests/similarity-domain/api-gateway-similarity-intelligence.test.js
// ApiGateway — PR-036 Similarity Intelligence methods
import { describe, it, expect } from 'vitest';
import { ApiGateway }              from '../../src/application/api-gateway.js';
import { SignalSimilarityService } from '../../src/domains/similarity/signal-similarity-service.js';
import { FeatureVectorService }    from '../../src/domains/similarity/feature-vector-service.js';
import { FeatureVectorRepository } from '../../src/domains/similarity/feature-vector-repository.js';

const makePermission = (userId = 'u1') => ({
  require: async () => ({ userId, isAdmin: false }),
});

function makeSignalSimilarityService() {
  return new SignalSimilarityService({
    featureVectorService: new FeatureVectorService({ repository: new FeatureVectorRepository() }),
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
    signalSimilarityService:   makeSignalSimilarityService(),
    ...overrides,
  });
}

// ── buildFeatureVector() ──────────────────────────────────────────────────────
describe('ApiGateway.buildFeatureVector()', () => {
  it('returns a FeatureVector with vectorVersion (BD-010)', async () => {
    const v = await makeGateway().buildFeatureVector({});
    expect(v.vectorVersion).toBe('1');
  });

  it('returns a FeatureVector with generatedAt (BD-018)', async () => {
    const v = await makeGateway().buildFeatureVector({});
    expect(v.generatedAt).toMatch(/^\d{4}/);
  });

  it('dimensions has length 12', async () => {
    const v = await makeGateway().buildFeatureVector({});
    expect(v.dimensions).toHaveLength(12);
  });

  it('requires record:read permission', async () => {
    let perm = null;
    const gw = makeGateway({
      permissionService: { require: async (p) => { perm = p; return { userId: 'u1' }; } },
    });
    await gw.buildFeatureVector({});
    expect(perm).toBe('record:read');
  });

  it('throws when SignalSimilarityService not wired', async () => {
    await expect(makeGateway({ signalSimilarityService: null }).buildFeatureVector({}))
      .rejects.toThrow('[ApiGateway] SignalSimilarityService not wired');
  });
});

// ── getFeatureVectors() ───────────────────────────────────────────────────────
describe('ApiGateway.getFeatureVectors()', () => {
  it('returns [] initially', async () => {
    expect(await makeGateway().getFeatureVectors()).toEqual([]);
  });

  it('returns vectors after buildFeatureVector', async () => {
    const gw = makeGateway();
    await gw.buildFeatureVector({});
    const vecs = await gw.getFeatureVectors();
    expect(vecs).toHaveLength(1);
  });

  it('throws when SignalSimilarityService not wired', async () => {
    await expect(makeGateway({ signalSimilarityService: null }).getFeatureVectors())
      .rejects.toThrow('[ApiGateway] SignalSimilarityService not wired');
  });
});

// ── calculateSimilarity() ─────────────────────────────────────────────────────
describe('ApiGateway.calculateSimilarity()', () => {
  it('returns similarity result with score', async () => {
    const gw = makeGateway();
    const v1 = await gw.buildFeatureVector({});
    const v2 = await gw.buildFeatureVector({});
    const result = await gw.calculateSimilarity(v1, v2);
    expect(typeof result.score).toBe('number');
  });

  it('throws when SignalSimilarityService not wired', async () => {
    const gw  = makeGateway({ signalSimilarityService: null });
    await expect(gw.calculateSimilarity({}, {}))
      .rejects.toThrow('[ApiGateway] SignalSimilarityService not wired');
  });
});

// ── compareUsers() ────────────────────────────────────────────────────────────
describe('ApiGateway.compareUsers()', () => {
  it('returns null when users have no vectors', async () => {
    expect(await makeGateway().compareUsers('u1', 'u2')).toBeNull();
  });

  it('throws when SignalSimilarityService not wired', async () => {
    await expect(makeGateway({ signalSimilarityService: null }).compareUsers('u1', 'u2'))
      .rejects.toThrow('[ApiGateway] SignalSimilarityService not wired');
  });
});

// ── findTopMatches() ──────────────────────────────────────────────────────────
describe('ApiGateway.findTopMatches()', () => {
  it('returns [] when no candidates', async () => {
    const gw = makeGateway();
    await gw.buildFeatureVector({});
    expect(await gw.findTopMatches(5)).toEqual([]);
  });

  it('throws when SignalSimilarityService not wired', async () => {
    await expect(makeGateway({ signalSimilarityService: null }).findTopMatches())
      .rejects.toThrow('[ApiGateway] SignalSimilarityService not wired');
  });
});

// ── getSimilaritySummary() ────────────────────────────────────────────────────
describe('ApiGateway.getSimilaritySummary()', () => {
  it('returns object with vectorVersion and generatedAt', async () => {
    const summary = await makeGateway().getSimilaritySummary();
    expect(summary.vectorVersion).toBeDefined();
    expect(summary.generatedAt).toMatch(/^\d{4}/);
  });

  it('reports bd018Compliant: true', async () => {
    expect((await makeGateway().getSimilaritySummary()).bd018Compliant).toBe(true);
  });

  it('throws when SignalSimilarityService not wired', async () => {
    await expect(makeGateway({ signalSimilarityService: null }).getSimilaritySummary())
      .rejects.toThrow('[ApiGateway] SignalSimilarityService not wired');
  });
});
