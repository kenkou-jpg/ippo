// tests/similarity-domain/similarity-engine-v2.test.js — PR-063 tests.
// SimilarityEngineV2 — 12-dim FeatureVector V2 cosine similarity → V2 edges.
// BD-042: V1/V2 non-mixing. BD-001: V1 edges never touched. BD-011: vectorVersion on all edges.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SimilarityEngineV2, _resetEdgeCounterV2,
} from '../../src/domains/similarity/similarity-engine-v2.js';
import { SimilarityRepositoryImpl } from '../../src/repositories/similarity/similarity-repository.js';
import { buildFeatureVectorV2 }    from '../../src/domains/similarity/feature-vector-v2-entity.js';
import { FV_V2_DIMENSION_COUNT, VECTOR_VERSION_V2 } from '../../src/domains/similarity/feature-vector-v2-types.js';
import { DEFAULT_THRESHOLD, _resetEdgeCounter } from '../../src/domains/similarity/edge-generator.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem:    (k)    => store[k] ?? null,
    setItem:    (k, v) => { store[k] = v; },
    removeItem: (k)    => { delete store[k]; },
  };
}

function makeVec(overrides = {}) {
  const dims = overrides.dimensions ?? new Array(FV_V2_DIMENSION_COUNT).fill(0.5);
  return buildFeatureVectorV2({
    userId:     overrides.userId     ?? 'u1',
    caseId:     overrides.caseId     ?? 'CASE-1',
    diseaseKey: overrides.diseaseKey ?? 'ENDO',
    dimensions: dims,
  });
}

function makeV1Vec() {
  return {
    userId: 'u1', caseId: 'CASE-9', diseaseKey: 'ENDO',
    vectorVersion: '1', dimensions: new Array(8).fill(0.5),
  };
}

function makeEngine(threshold = DEFAULT_THRESHOLD) {
  const repo = new SimilarityRepositoryImpl(makeStorage());
  return { engine: new SimilarityEngineV2({ repository: repo, threshold }), repo };
}

beforeEach(() => {
  _resetEdgeCounterV2();
  _resetEdgeCounter();
});

// ── Constructor ────────────────────────────────────────────────────────────

describe('SimilarityEngineV2 constructor', () => {
  it('throws when repository is missing', () => {
    expect(() => new SimilarityEngineV2({})).toThrow(TypeError);
  });

  it('defaults threshold to EdgeGenerator.DEFAULT_THRESHOLD (parity with V1)', () => {
    const { engine } = makeEngine();
    expect(engine.threshold).toBe(DEFAULT_THRESHOLD);
    expect(engine.threshold).toBe(0.5);
  });

  it('accepts a custom threshold', () => {
    const { engine } = makeEngine(0.9);
    expect(engine.threshold).toBe(0.9);
  });
});

// ── computeSimilarity ──────────────────────────────────────────────────────

describe('SimilarityEngineV2.computeSimilarity()', () => {
  it('identical vectors score 1', () => {
    const { engine } = makeEngine();
    const v = makeVec();
    expect(engine.computeSimilarity(v, v).score).toBeCloseTo(1, 4);
  });

  it('orthogonal vectors score 0', () => {
    const { engine } = makeEngine();
    const a = new Array(FV_V2_DIMENSION_COUNT).fill(0); a[0] = 1;
    const b = new Array(FV_V2_DIMENSION_COUNT).fill(0); b[1] = 1;
    const result = engine.computeSimilarity(makeVec({ dimensions: a }), makeVec({ dimensions: b }));
    expect(result.score).toBeCloseTo(0, 4);
  });

  it('result carries vectorVersion="2"', () => {
    const { engine } = makeEngine();
    const v = makeVec();
    expect(engine.computeSimilarity(v, v).vectorVersion).toBe(VECTOR_VERSION_V2);
  });

  it('sameDiseaseKey=true when diseaseKeys match', () => {
    const { engine } = makeEngine();
    const a = makeVec({ diseaseKey: 'ENDO' });
    const b = makeVec({ diseaseKey: 'ENDO' });
    expect(engine.computeSimilarity(a, b).sameDiseaseKey).toBe(true);
  });

  it('sameDiseaseKey=false when diseaseKeys differ', () => {
    const { engine } = makeEngine();
    const a = makeVec({ diseaseKey: 'ENDO' });
    const b = makeVec({ diseaseKey: 'PCOS' });
    expect(engine.computeSimilarity(a, b).sameDiseaseKey).toBe(false);
  });

  it('BD-042: throws when vecA is vectorVersion="1"', () => {
    const { engine } = makeEngine();
    expect(() => engine.computeSimilarity(makeV1Vec(), makeVec())).toThrow(/BD-042/);
  });

  it('BD-042: throws when vecB is vectorVersion="1"', () => {
    const { engine } = makeEngine();
    expect(() => engine.computeSimilarity(makeVec(), makeV1Vec())).toThrow(/BD-042/);
  });

  it('throws when dimensions length is wrong', () => {
    const { engine } = makeEngine();
    const bad = { ...makeVec(), dimensions: [0.5, 0.5] };
    expect(() => engine.computeSimilarity(bad, makeVec())).toThrow(RangeError);
  });
});

// ── generateEdge ───────────────────────────────────────────────────────────

describe('SimilarityEngineV2.generateEdge()', () => {
  it('returns an edge when score >= threshold and same diseaseKey', () => {
    const { engine } = makeEngine(0.0);
    const edge = engine.generateEdge(makeVec({ caseId: 'CA' }), makeVec({ caseId: 'CB' }));
    expect(edge).not.toBeNull();
    expect(edge.sourceCaseId).toBe('CA');
    expect(edge.targetCaseId).toBe('CB');
  });

  it('returns null when score < threshold', () => {
    const { engine } = makeEngine(1); // threshold=1 (max) — near-orthogonal pair will score < 1
    const a = makeVec({ dimensions: [1, ...new Array(FV_V2_DIMENSION_COUNT - 1).fill(0)] });
    const b = makeVec({ dimensions: [0, 1, ...new Array(FV_V2_DIMENSION_COUNT - 2).fill(0)] });
    expect(engine.generateEdge(a, b)).toBeNull();
  });

  it('returns null when diseaseKeys differ', () => {
    const { engine } = makeEngine(0.0);
    const edge = engine.generateEdge(
      makeVec({ diseaseKey: 'ENDO' }),
      makeVec({ diseaseKey: 'PCOS' }),
    );
    expect(edge).toBeNull();
  });

  it('edge is frozen', () => {
    const { engine } = makeEngine(0.0);
    const edge = engine.generateEdge(makeVec({ caseId: 'CA' }), makeVec({ caseId: 'CB' }));
    expect(Object.isFrozen(edge)).toBe(true);
  });

  it('edgeId starts with "EDGEV2-" (distinguishable from V1 "EDGE-")', () => {
    const { engine } = makeEngine(0.0);
    const edge = engine.generateEdge(makeVec({ caseId: 'CA' }), makeVec({ caseId: 'CB' }));
    expect(edge.edgeId).toMatch(/^EDGEV2-/);
  });

  it('edge.vectorVersion is "2" (BD-011)', () => {
    const { engine } = makeEngine(0.0);
    const edge = engine.generateEdge(makeVec({ caseId: 'CA' }), makeVec({ caseId: 'CB' }));
    expect(edge.vectorVersion).toBe('2');
  });
});

// ── run() ──────────────────────────────────────────────────────────────────

describe('SimilarityEngineV2.run()', () => {
  it('throws when vectors is not an array', async () => {
    const { engine } = makeEngine();
    await expect(engine.run(null)).rejects.toThrow(TypeError);
  });

  it('returns empty result when fewer than 2 vectors', async () => {
    const { engine } = makeEngine();
    const result = await engine.run([makeVec()]);
    expect(result.edgesGenerated).toBe(0);
    expect(result.pairsEvaluated).toBe(0);
    expect(result.vectorVersion).toBe('2');
  });

  it('BD-042: throws immediately if any input vector is vectorVersion="1"', async () => {
    const { engine } = makeEngine();
    await expect(engine.run([makeVec(), makeV1Vec()])).rejects.toThrow(/BD-042/);
  });

  it('generates edges for eligible similar vectors', async () => {
    const { engine } = makeEngine(0.0);
    const result = await engine.run([
      makeVec({ caseId: 'C1' }),
      makeVec({ caseId: 'C2' }),
    ]);
    expect(result.edgesGenerated).toBeGreaterThanOrEqual(1);
    expect(result.vectorsCompared).toBe(2);
  });

  it('cross-disease vectors do not generate edges', async () => {
    const { engine } = makeEngine(0.0);
    const result = await engine.run([
      makeVec({ caseId: 'C1', diseaseKey: 'ENDO' }),
      makeVec({ caseId: 'C2', diseaseKey: 'PCOS' }),
    ]);
    expect(result.edgesGenerated).toBe(0);
    expect(result.pairsEvaluated).toBe(1);
  });

  it('all generated edges carry vectorVersion="2"', async () => {
    const { engine } = makeEngine(0.0);
    const result = await engine.run([
      makeVec({ caseId: 'C1' }),
      makeVec({ caseId: 'C2' }),
      makeVec({ caseId: 'C3' }),
    ]);
    for (const edge of result.edges) {
      expect(edge.vectorVersion).toBe('2');
    }
  });

  it('persists edges to the SAME similarity_edges store as V1 (BD-001: additive only)', async () => {
    const storage = makeStorage();
    const repo    = new SimilarityRepositoryImpl(storage);
    // Pre-existing V1 edge in the same store
    await repo.save({
      edgeId: 'EDGE-V1-EXISTING', sourceCaseId: 'CX', targetCaseId: 'CY',
      score: 0.7, diseaseKey: 'ENDO', threshold: 0.5, vectorVersion: '1',
      createdAt: new Date().toISOString(),
    });
    const engine = new SimilarityEngineV2({ repository: repo, threshold: 0.0 });
    await engine.run([makeVec({ caseId: 'C1' }), makeVec({ caseId: 'C2' })]);

    const all = await repo.findAll();
    expect(all.some(e => e.edgeId === 'EDGE-V1-EXISTING')).toBe(true); // V1 row untouched
    expect(all.some(e => e.vectorVersion === '2')).toBe(true);          // V2 row added
  });

  it('returns networkDensity in [0,1]', async () => {
    const { engine } = makeEngine(0.0);
    const result = await engine.run([
      makeVec({ caseId: 'C1' }),
      makeVec({ caseId: 'C2' }),
      makeVec({ caseId: 'C3' }),
    ]);
    expect(result.networkDensity).toBeGreaterThanOrEqual(0);
    expect(result.networkDensity).toBeLessThanOrEqual(1);
  });

  it('returns avgScore of generated edges', async () => {
    const { engine } = makeEngine(0.0);
    const result = await engine.run([makeVec({ caseId: 'C1' }), makeVec({ caseId: 'C2' })]);
    expect(result.avgScore).toBeGreaterThan(0);
  });

  it('publishes SIMILARITY_V2_EDGE_GENERATED per edge (best-effort)', async () => {
    const published = [];
    const publisher = { publish: (e) => published.push(e) };
    const repo   = new SimilarityRepositoryImpl(makeStorage());
    const engine = new SimilarityEngineV2({ repository: repo, threshold: 0.0, eventPublisher: publisher });
    await engine.run([makeVec({ caseId: 'C1' }), makeVec({ caseId: 'C2' })]);
    expect(published).toHaveLength(1);
    expect(published[0].eventType).toBe('SIMILARITY_V2_EDGE_GENERATED');
    expect(published[0].payload.vectorVersion).toBe('2');
  });

  it('survives if eventPublisher.publish throws (best-effort)', async () => {
    const repo   = new SimilarityRepositoryImpl(makeStorage());
    const engine = new SimilarityEngineV2({
      repository: repo, threshold: 0.0,
      eventPublisher: { publish: () => { throw new Error('bus error'); } },
    });
    await expect(engine.run([makeVec({ caseId: 'C1' }), makeVec({ caseId: 'C2' })])).resolves.toBeTruthy();
  });
});
