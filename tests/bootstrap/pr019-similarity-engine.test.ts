import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted) ────────────────────────────────────────────────────
vi.mock('../../src/legacy/legacy-bridge.js',   () => ({ LegacyBridge: class { boot = vi.fn(); } }));
vi.mock('../../src/modules/app-bootstrap.js',  () => ({ bootstrap: vi.fn() }));
vi.mock('../../src/services/supabase.js',      () => ({ supabase: null }));

import { SimilarityRepositoryImpl }  from '../../src/repositories/similarity/similarity-repository.js';
import { VectorBuilder, DIM, VECTOR_DIM } from '../../src/domains/similarity/vector-builder.js';
import { SimilarityCalculator }       from '../../src/domains/similarity/similarity-calculator.js';
import { ConsentFilter }              from '../../src/domains/similarity/consent-filter.js';
import { EdgeGenerator, DEFAULT_THRESHOLD, _resetEdgeCounter } from '../../src/domains/similarity/edge-generator.js';
import { SimilarityEngine }           from '../../src/domains/similarity/similarity-engine.js';
import {
  logComparison, getLog, getSummary, resetLog as resetAuditLog,
} from '../../src/domains/similarity/similarity-audit-log.js';
import { DependencyContainer }        from '../../src/bootstrap/dependency-container.js';
import { RouteRegistry }              from '../../src/bootstrap/route-registry.js';
import { CompositionRoot, TOKENS }    from '../../src/application/composition-root.js';
import { runArchitectureGuard }       from '../../src/application/architecture-guard.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem:    (k)    => store[k] ?? null,
    setItem:    (k, v) => { store[k] = v; },
    removeItem: (k)    => { delete store[k]; },
  };
}

function makeCaseEntity(overrides = {}) {
  return {
    id:           overrides.id            ?? 'CASE-ENDO-202606-AAAAAAAA',
    userId:       overrides.userId        ?? 'u1',
    diseaseKey:   overrides.diseaseKey    ?? 'ENDO',
    diseaseKeys:  overrides.diseaseKeys   ?? ['ENDO'],
    tier:         overrides.tier          ?? 'TIER2',
    qualityScore: overrides.qualityScore  ?? 70,
    recordCount:  overrides.recordCount   ?? 90,
    experimentIds: overrides.experimentIds ?? ['exp-1'],
    consentLevel: overrides.consentLevel  ?? 2,
    startDate:    overrides.startDate     ?? '2026-01-01',
    endDate:      overrides.endDate       ?? '2026-04-01',
    hasOutcome:   overrides.hasOutcome    ?? true,
    symptoms:     overrides.symptoms      ?? [],
    foods:        overrides.foods         ?? [],
    isDeleted:    false,
    createdAt:    '2026-06-01T00:00:00.000Z',
    updatedAt:    '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── SimilarityRepository ──────────────────────────────────────────────────────

describe('SimilarityRepository', () => {
  let repo;
  beforeEach(() => {
    repo = new SimilarityRepositoryImpl(makeStorage());
    _resetEdgeCounter();
  });

  function makeEdge(id = 'EDGE-AA-BB-CC-0001') {
    return {
      edgeId:       id,
      sourceCaseId: 'CASE-A',
      targetCaseId: 'CASE-B',
      score:        0.85,
      diseaseKey:   'ENDO',
      threshold:    0.5,
      createdAt:    new Date().toISOString(),
    };
  }

  it('save: persists a new edge', async () => {
    const saved = await repo.save(makeEdge());
    expect(saved.edgeId).toBe('EDGE-AA-BB-CC-0001');
    expect(saved.savedAt).toBeTruthy();
  });

  it('save: throws when edgeId already exists', async () => {
    await repo.save(makeEdge());
    await expect(repo.save(makeEdge())).rejects.toThrow('already exists');
  });

  it('saveMany: skips duplicates silently', async () => {
    await repo.save(makeEdge('E1'));
    const saved = await repo.saveMany([makeEdge('E1'), makeEdge('E2')]);
    expect(saved).toHaveLength(1);
    expect(saved[0].edgeId).toBe('E2');
  });

  it('findById: returns edge by edgeId', async () => {
    await repo.save(makeEdge('EX'));
    const found = await repo.findById('EX');
    expect(found?.edgeId).toBe('EX');
  });

  it('findById: returns null when not found', async () => {
    expect(await repo.findById('MISSING')).toBeNull();
  });

  it('findByCaseId: returns edges where case appears as source or target', async () => {
    await repo.save({ ...makeEdge('E1'), sourceCaseId: 'CA', targetCaseId: 'CB' });
    await repo.save({ ...makeEdge('E2'), sourceCaseId: 'CC', targetCaseId: 'CA' });
    await repo.save({ ...makeEdge('E3'), sourceCaseId: 'CX', targetCaseId: 'CY' });
    const edges = await repo.findByCaseId('CA');
    expect(edges).toHaveLength(2);
  });

  it('findByMinScore: filters by threshold', async () => {
    await repo.save({ ...makeEdge('E1'), score: 0.9 });
    await repo.save({ ...makeEdge('E2'), score: 0.4 });
    const edges = await repo.findByMinScore(0.5);
    expect(edges).toHaveLength(1);
    expect(edges[0].edgeId).toBe('E1');
  });

  it('getStats: returns correct aggregates', async () => {
    await repo.save({ ...makeEdge('E1'), score: 0.8 });
    await repo.save({ ...makeEdge('E2'), score: 0.6 });
    const stats = await repo.getStats();
    expect(stats.edgeCount).toBe(2);
    expect(stats.avgScore).toBeCloseTo(0.7);
    expect(stats.maxScore).toBe(0.8);
    expect(stats.minScore).toBe(0.6);
  });

  it('getStats: returns zeros for empty store', async () => {
    const stats = await repo.getStats();
    expect(stats.edgeCount).toBe(0);
    expect(stats.avgScore).toBe(0);
  });

  it('DELETE is not a method on the repository', () => {
    expect(typeof (repo as any).delete).toBe('undefined');
    expect(typeof (repo as any).deleteById).toBe('undefined');
  });
});

// ── VectorBuilder ─────────────────────────────────────────────────────────────

describe('VectorBuilder', () => {
  const builder = new VectorBuilder();

  function makeCandidate(overrides = {}) {
    return {
      caseId:    'CASE-ENDO-202606-AAAAAAAA',
      diseaseKey: 'ENDO',
      consentLevel: 2,
      eligibleForSimilarity: true,
      featureVectorStub: {
        qualityScore:    70,
        durationDays:    90,
        hasOutcome:      true,
        experimentCount: 2,
        recordCount:     90,
        consentLevel:    2,
        symptoms:        ['bloating', 'pain'],
        foods:           ['gluten'],
        ...overrides.featureVectorStub,
      },
      ...overrides,
    };
  }

  it('build: returns a ComputedFeatureVector with correct dimension', () => {
    const vec = builder.build(makeCandidate());
    expect(vec.values).toHaveLength(VECTOR_DIM);
  });

  it('build: qualityScore dimension is normalized to [0,1]', () => {
    const vec = builder.build(makeCandidate({ featureVectorStub: { qualityScore: 50 } }));
    expect(vec.values[DIM.QUALITY_SCORE]).toBeCloseTo(0.5);
  });

  it('build: durationDays is clamped at 1', () => {
    const vec = builder.build(makeCandidate({ featureVectorStub: { durationDays: 1000 } }));
    expect(vec.values[DIM.DURATION_DAYS]).toBe(1);
  });

  it('build: hasOutcome maps to 1', () => {
    const vec = builder.build(makeCandidate({ featureVectorStub: { hasOutcome: true } }));
    expect(vec.values[DIM.HAS_OUTCOME]).toBe(1);
  });

  it('build: hasOutcome false maps to 0', () => {
    const vec = builder.build(makeCandidate({ featureVectorStub: { hasOutcome: false } }));
    expect(vec.values[DIM.HAS_OUTCOME]).toBe(0);
  });

  it('build: magnitude is computed', () => {
    const vec = builder.build(makeCandidate());
    expect(vec.magnitude).toBeGreaterThan(0);
  });

  it('build: returns frozen object', () => {
    const vec = builder.build(makeCandidate());
    expect(Object.isFrozen(vec)).toBe(true);
  });

  it('build: throws when candidate is null', () => {
    expect(() => builder.build(null)).toThrow(TypeError);
  });

  it('buildAll: skips ineligible candidates', () => {
    const c1 = makeCandidate({ eligibleForSimilarity: true });
    const c2 = makeCandidate({ eligibleForSimilarity: false });
    const vecs = builder.buildAll([c1, c2]);
    expect(vecs).toHaveLength(1);
  });
});

// ── SimilarityCalculator ──────────────────────────────────────────────────────

describe('SimilarityCalculator', () => {
  const calc    = new SimilarityCalculator();
  const builder = new VectorBuilder();

  function makeCandidate(qs: number, duration: number, diseaseKey = 'ENDO') {
    return {
      caseId: `CASE-${diseaseKey}-TEST`,
      diseaseKey,
      consentLevel: 2,
      eligibleForSimilarity: true,
      featureVectorStub: {
        qualityScore: qs, durationDays: duration, hasOutcome: true,
        experimentCount: 1, recordCount: 60, consentLevel: 2, symptoms: [], foods: [],
      },
    };
  }

  it('compute: identical vectors produce score=1', () => {
    const v = builder.build(makeCandidate(70, 90));
    const result = calc.compute(v, v);
    expect(result.score).toBeCloseTo(1);
  });

  it('compute: zero vector produces score=0', () => {
    const zero = { values: new Array(VECTOR_DIM).fill(0), magnitude: 0, caseId: 'Z', diseaseKey: 'ENDO' };
    const v    = builder.build(makeCandidate(70, 90));
    const result = calc.compute(zero, v);
    expect(result.score).toBe(0);
  });

  it('compute: sameDiseaseKey=true when diseaseKeys match', () => {
    const vA = builder.build(makeCandidate(70, 90, 'ENDO'));
    const vB = builder.build(makeCandidate(60, 80, 'ENDO'));
    const result = calc.compute(vA, vB);
    expect(result.sameDiseaseKey).toBe(true);
  });

  it('compute: sameDiseaseKey=false when diseaseKeys differ', () => {
    const vA = builder.build(makeCandidate(70, 90, 'ENDO'));
    const vB = builder.build(makeCandidate(70, 90, 'PCOS'));
    const result = calc.compute(vA, vB);
    expect(result.sameDiseaseKey).toBe(false);
  });

  it('compute: score is between 0 and 1', () => {
    const vA = builder.build(makeCandidate(80, 120));
    const vB = builder.build(makeCandidate(40,  30));
    const result = calc.compute(vA, vB);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('compute: throws when vectors have wrong dimension', () => {
    const bad = { values: [0.5, 0.5], magnitude: 0.707, caseId: 'X', diseaseKey: 'ENDO' };
    const v   = builder.build(makeCandidate(70, 90));
    expect(() => calc.compute(bad, v)).toThrow(RangeError);
  });

  it('computeAllPairs: returns n*(n-1)/2 pairs for n vectors', () => {
    const vecs = [
      builder.build(makeCandidate(70, 90)),
      builder.build(makeCandidate(60, 80)),
      builder.build(makeCandidate(50, 60)),
    ];
    const pairs = calc.computeAllPairs(vecs);
    expect(pairs).toHaveLength(3); // C(3,2) = 3
  });
});

// ── ConsentFilter ─────────────────────────────────────────────────────────────

describe('ConsentFilter', () => {
  const filter = new ConsentFilter();

  function makeCandidate(consentLevel: number, eligible = true) {
    return { caseId: 'C', diseaseKey: 'ENDO', consentLevel, eligibleForSimilarity: eligible };
  }

  it('filter: accepts candidates with consentLevel >= 2', () => {
    const { accepted } = filter.filter([makeCandidate(2), makeCandidate(3)]);
    expect(accepted).toHaveLength(2);
  });

  it('filter: rejects candidates with consentLevel < 2', () => {
    const { rejected, rejectedCount } = filter.filter([makeCandidate(0), makeCandidate(1)]);
    expect(rejected).toHaveLength(2);
    expect(rejectedCount).toBe(2);
  });

  it('filter: rejects non-eligible candidates even with high consent', () => {
    const { rejected } = filter.filter([makeCandidate(3, false)]);
    expect(rejected).toHaveLength(1);
  });

  it('filterAccepted: returns only accepted', () => {
    const result = filter.filterAccepted([makeCandidate(2), makeCandidate(1)]);
    expect(result).toHaveLength(1);
    expect(result[0].consentLevel).toBe(2);
  });

  it('passes: returns true for valid candidate', () => {
    expect(filter.passes(makeCandidate(2))).toBe(true);
  });

  it('passes: returns false for low consent', () => {
    expect(filter.passes(makeCandidate(1))).toBe(false);
  });

  it('filter: throws on non-array input', () => {
    expect(() => filter.filter(null as any)).toThrow(TypeError);
  });
});

// ── EdgeGenerator ─────────────────────────────────────────────────────────────

describe('EdgeGenerator', () => {
  beforeEach(() => _resetEdgeCounter());

  const gen = new EdgeGenerator(0.5);

  function makePair(score: number, sameDiseaseKey = true) {
    return {
      vecA:   { caseId: 'CA', diseaseKey: 'ENDO', values: [], magnitude: 1 },
      vecB:   { caseId: 'CB', diseaseKey: sameDiseaseKey ? 'ENDO' : 'PCOS', values: [], magnitude: 1 },
      result: { score, sameDiseaseKey, dotProduct: score, magnitudeA: 1, magnitudeB: 1 },
    };
  }

  it('generateFromPair: returns edge when score >= threshold and same diseaseKey', () => {
    const edge = gen.generateFromPair(makePair(0.8));
    expect(edge).not.toBeNull();
    expect(edge?.score).toBe(0.8);
    expect(edge?.sourceCaseId).toBe('CA');
    expect(edge?.targetCaseId).toBe('CB');
  });

  it('generateFromPair: returns null when score < threshold', () => {
    expect(gen.generateFromPair(makePair(0.3))).toBeNull();
  });

  it('generateFromPair: returns null when diseaseKeys differ', () => {
    expect(gen.generateFromPair(makePair(0.9, false))).toBeNull();
  });

  it('generateFromPair: edge is frozen', () => {
    const edge = gen.generateFromPair(makePair(0.8));
    expect(Object.isFrozen(edge)).toBe(true);
  });

  it('generateFromPair: edgeId starts with EDGE-', () => {
    const edge = gen.generateFromPair(makePair(0.8));
    expect(edge?.edgeId).toMatch(/^EDGE-/);
  });

  it('generateFromPairs: returns only edges above threshold', () => {
    const pairs = [makePair(0.9), makePair(0.3), makePair(0.7)];
    const edges = gen.generateFromPairs(pairs);
    expect(edges).toHaveLength(2);
  });

  it('constructor: throws when threshold out of range', () => {
    expect(() => new EdgeGenerator(1.5)).toThrow(RangeError);
    expect(() => new EdgeGenerator(-0.1)).toThrow(RangeError);
  });

  it('threshold getter returns configured threshold', () => {
    expect(gen.threshold).toBe(0.5);
    expect(DEFAULT_THRESHOLD).toBe(0.5);
  });
});

// ── SimilarityAuditLog ────────────────────────────────────────────────────────

describe('SimilarityAuditLog', () => {
  beforeEach(() => resetAuditLog());

  it('logComparison: appends an entry', () => {
    logComparison({ caseIdA: 'CA', caseIdB: 'CB', score: 0.8, accepted: true, reason: 'above threshold' });
    expect(getLog()).toHaveLength(1);
  });

  it('logComparison: returns frozen entry', () => {
    const entry = logComparison({ caseIdA: 'CA', caseIdB: 'CB', score: 0.7, accepted: false, reason: 'below' });
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it('getLog: returns a copy (not the internal array)', () => {
    logComparison({ caseIdA: 'A', caseIdB: 'B', score: 0.5, accepted: true, reason: '' });
    const log = getLog();
    log.push({ caseIdA: 'X', caseIdB: 'Y', score: 0, accepted: false, reason: '' } as any);
    expect(getLog()).toHaveLength(1);
  });

  it('getSummary: counts accepted and rejected correctly', () => {
    logComparison({ caseIdA: 'A', caseIdB: 'B', score: 0.9, accepted: true,  reason: '' });
    logComparison({ caseIdA: 'C', caseIdB: 'D', score: 0.3, accepted: false, reason: '' });
    logComparison({ caseIdA: 'E', caseIdB: 'F', score: 0.7, accepted: true,  reason: '' });
    const s = getSummary();
    expect(s.totalComparisons).toBe(3);
    expect(s.acceptedCount).toBe(2);
    expect(s.rejectedCount).toBe(1);
    expect(s.avgScore).toBeCloseTo((0.9 + 0.3 + 0.7) / 3);
    expect(s.avgAcceptedScore).toBeCloseTo((0.9 + 0.7) / 2);
  });

  it('getSummary: returns zeros when log is empty', () => {
    const s = getSummary();
    expect(s.totalComparisons).toBe(0);
    expect(s.avgScore).toBe(0);
  });

  it('resetLog: clears all entries', () => {
    logComparison({ caseIdA: 'A', caseIdB: 'B', score: 0.5, accepted: true, reason: '' });
    resetAuditLog();
    expect(getLog()).toHaveLength(0);
  });
});

// ── SimilarityEngine ──────────────────────────────────────────────────────────

describe('SimilarityEngine', () => {
  beforeEach(() => {
    resetAuditLog();
    _resetEdgeCounter();
  });

  function makeEngine(threshold = 0.5) {
    const storage = makeStorage();
    const repo    = new SimilarityRepositoryImpl(storage);
    return { engine: new SimilarityEngine({ repository: repo, threshold }), repo };
  }

  function makeCase(id: string, qs: number, consent: number, diseaseKey = 'ENDO') {
    return makeCaseEntity({ id, qualityScore: qs, consentLevel: consent, diseaseKey,
      startDate: '2026-01-01', endDate: '2026-04-01', recordCount: 90, hasOutcome: true });
  }

  it('run: returns empty result when fewer than 2 cases', async () => {
    const { engine } = makeEngine();
    const result = await engine.run([makeCase('C1', 70, 2)]);
    expect(result.edgesGenerated).toBe(0);
    expect(result.pairsEvaluated).toBe(0);
  });

  it('run: generates edges for eligible similar cases', async () => {
    const { engine } = makeEngine(0.0); // threshold=0 to guarantee edges
    const result = await engine.run([
      makeCase('C1', 70, 2),
      makeCase('C2', 75, 2),
    ]);
    expect(result.edgesGenerated).toBeGreaterThanOrEqual(1);
    expect(result.casesCompared).toBe(2);
  });

  it('run: consent-rejected cases are excluded before comparison', async () => {
    const { engine } = makeEngine(0.0);
    const result = await engine.run([
      makeCase('C1', 70, 2),
      makeCase('C2', 70, 1), // consent < 2 → rejected
    ]);
    expect(result.consentRejected).toBe(1);
    expect(result.pairsEvaluated).toBe(0); // only 1 eligible → no pairs
  });

  it('run: cross-disease cases do not generate edges', async () => {
    const { engine } = makeEngine(0.0);
    const result = await engine.run([
      makeCase('C1', 70, 2, 'ENDO'),
      makeCase('C2', 70, 2, 'PCOS'),
    ]);
    expect(result.edgesGenerated).toBe(0);
    expect(result.pairsEvaluated).toBe(1);
  });

  it('run: edges below threshold are not persisted', async () => {
    const { engine, repo } = makeEngine(0.99); // very high threshold
    await engine.run([makeCase('C1', 70, 2), makeCase('C2', 10, 2)]);
    const all = await repo.findAll();
    expect(all).toHaveLength(0);
  });

  it('run: returns networkDensity', async () => {
    const { engine } = makeEngine(0.0);
    const result = await engine.run([
      makeCase('C1', 70, 2),
      makeCase('C2', 75, 2),
      makeCase('C3', 80, 2),
    ]);
    // networkDensity = edges / maxPossiblePairs
    expect(result.networkDensity).toBeGreaterThanOrEqual(0);
    expect(result.networkDensity).toBeLessThanOrEqual(1);
  });

  it('run: throws when caseEntities is not an array', async () => {
    const { engine } = makeEngine();
    await expect(engine.run(null as any)).rejects.toThrow(TypeError);
  });

  it('run: audit log is populated after run', async () => {
    const { engine } = makeEngine(0.0);
    await engine.run([makeCase('C1', 70, 2), makeCase('C2', 75, 2)]);
    expect(getLog().length).toBeGreaterThan(0);
  });

  it('constructor: throws when repository is missing', () => {
    expect(() => new SimilarityEngine({ repository: null } as any)).toThrow(TypeError);
  });
});

// ── Composition Root: PR-019 tokens ──────────────────────────────────────────

describe('CompositionRoot: PR-019 tokens', () => {
  function buildContainer() {
    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    const root      = new CompositionRoot(container, registry, {});
    root.assemble();
    return { container, registry };
  }

  it('SimilarityRepository resolves to SimilarityRepositoryImpl', () => {
    const { container } = buildContainer();
    const repo = container.resolve(TOKENS.SimilarityRepository);
    expect(repo).toBeInstanceOf(SimilarityRepositoryImpl);
  });

  it('VectorBuilder resolves', () => {
    const { container } = buildContainer();
    expect(container.resolve(TOKENS.VectorBuilder)).toBeInstanceOf(VectorBuilder);
  });

  it('SimilarityCalculator resolves', () => {
    const { container } = buildContainer();
    expect(container.resolve(TOKENS.SimilarityCalculator)).toBeInstanceOf(SimilarityCalculator);
  });

  it('EdgeGenerator resolves', () => {
    const { container } = buildContainer();
    expect(container.resolve(TOKENS.EdgeGenerator)).toBeInstanceOf(EdgeGenerator);
  });

  it('SimilarityEngine resolves', () => {
    const { container } = buildContainer();
    expect(container.resolve(TOKENS.SimilarityEngine)).toBeInstanceOf(SimilarityEngine);
  });

  it('SimilarityService resolves to SimilarityEngine instance', () => {
    const { container } = buildContainer();
    const svc = container.resolve(TOKENS.SimilarityService);
    expect(svc).toBeInstanceOf(SimilarityEngine);
  });

  it('Feature Registry: Similarity status is active', () => {
    const { registry } = buildContainer();
    const status = registry.getAll().get('Similarity')?.status;
    expect(status).toBe('active');
  });
});

// ── ArchitectureGuard: PR-019 rules ──────────────────────────────────────────

describe('ArchitectureGuard: PR-019 rules', () => {
  beforeEach(() => {
    (globalThis as any).window = { __ippoArchGuard: undefined };
    runArchitectureGuard();
  });

  function check(from: string, to: string) {
    (globalThis as any).window.__ippoArchGuard.check(from, to);
    return (globalThis as any).window.__ippoArchGuard.violations;
  }

  it('blocks feature → SimilarityRepository direct', () => {
    const v = check('/features/similarity-feature.js', '/repositories/similarity/similarity-repository.js');
    expect(v.some((x: any) => x.label === 'feature→SimilarityRepository')).toBe(true);
  });

  it('blocks screen → SimilarityRepository direct', () => {
    const v = check('/screens/similarity.js', '/repositories/similarity/similarity-repository.js');
    expect(v.some((x: any) => x.label === 'screen→SimilarityRepository')).toBe(true);
  });

  it('blocks feature → EdgeGenerator direct', () => {
    const v = check('/features/sim.js', '/domains/similarity/edge-generator.js');
    expect(v.some((x: any) => x.label === 'feature→EdgeGenerator')).toBe(true);
  });

  it('blocks screen → EdgeGenerator direct', () => {
    const v = check('/screens/sim.js', '/domains/similarity/edge-generator.js');
    expect(v.some((x: any) => x.label === 'screen→EdgeGenerator')).toBe(true);
  });

  it('blocks feature → VectorBuilder direct', () => {
    const v = check('/features/sim.js', '/domains/similarity/vector-builder.js');
    expect(v.some((x: any) => x.label === 'feature→VectorBuilder')).toBe(true);
  });

  it('blocks feature → SimilarityCalculator direct', () => {
    const v = check('/features/sim.js', '/domains/similarity/similarity-calculator.js');
    expect(v.some((x: any) => x.label === 'feature→SimilarityCalculator')).toBe(true);
  });

  it('SimilarityEngine access from feature does NOT trigger a violation', () => {
    (globalThis as any).window.__ippoArchGuard.violations = [];
    check('/features/sim.js', '/domains/similarity/similarity-engine.js');
    const v = (globalThis as any).window.__ippoArchGuard.violations;
    expect(v.every((x: any) => !x.label.includes('SimilarityEngine'))).toBe(true);
  });
});
