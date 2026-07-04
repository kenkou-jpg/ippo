// tests/similarity-domain/similarity-snapshot-v2.test.js — PR-065 tests.
// SimilaritySnapshotV2 — VECTOR_VERSION='2' Similarity Snapshot (BD-018 / BD-010 / BD-023).
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildSimilaritySnapshotV2, _resetSnapshotCounterV2,
} from '../../src/domains/similarity/similarity-snapshot-v2-entity.js';
import { SimilaritySnapshotV2Repository } from '../../src/domains/similarity/similarity-snapshot-v2-repository.js';
import { SimilaritySnapshotV2Service }    from '../../src/domains/similarity/similarity-snapshot-v2-service.js';
import {
  SIMILARITY_SNAPSHOT_V2_SCHEMA_VERSION, VECTOR_VERSION_V1, VECTOR_VERSION_V2,
} from '../../src/domains/similarity/similarity-snapshot-v2-types.js';
import {
  SimilarityEngineV2, _resetEdgeCounterV2,
} from '../../src/domains/similarity/similarity-engine-v2.js';
import { SimilarityRepositoryImpl } from '../../src/repositories/similarity/similarity-repository.js';
import { buildFeatureVectorV2 }     from '../../src/domains/similarity/feature-vector-v2-entity.js';
import { FV_V2_DIMENSION_COUNT }    from '../../src/domains/similarity/feature-vector-v2-types.js';
import { _resetEdgeCounter } from '../../src/domains/similarity/edge-generator.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem:    (k)    => store[k] ?? null,
    setItem:    (k, v) => { store[k] = v; },
    removeItem: (k)    => { delete store[k]; },
  };
}

function makeV2Edge(overrides = {}) {
  return {
    edgeId: overrides.edgeId ?? 'EDGEV2-AA-BB-1', sourceCaseId: overrides.sourceCaseId ?? 'C1',
    targetCaseId: overrides.targetCaseId ?? 'C2', score: overrides.score ?? 0.8,
    diseaseKey: overrides.diseaseKey ?? 'ENDO', vectorVersion: '2',
  };
}

function makeV1Edge(overrides = {}) {
  return {
    edgeId: 'EDGE-AA-BB-1', sourceCaseId: 'C1', targetCaseId: 'C2',
    score: 0.9, diseaseKey: 'ENDO', vectorVersion: '1', ...overrides,
  };
}

beforeEach(() => {
  _resetSnapshotCounterV2();
  _resetEdgeCounterV2();
  _resetEdgeCounter();
});

// ── buildSimilaritySnapshotV2 entity ─────────────────────────────────────────

describe('buildSimilaritySnapshotV2 entity', () => {
  it('builds a frozen snapshot with vectorVersion="2" (BD-010)', () => {
    const s = buildSimilaritySnapshotV2({ edgeCount: 3, caseCount: 4, threshold: 0.5 });
    expect(s.vectorVersion).toBe('2');
    expect(Object.isFrozen(s)).toBe(true);
  });

  it('includes computedAt ISO string (BD-018)', () => {
    const s = buildSimilaritySnapshotV2({ edgeCount: 0, caseCount: 0, threshold: 0.5 });
    expect(new Date(s.computedAt).toISOString()).toBe(s.computedAt);
  });

  it('snapshotId starts with "simsnap2_"', () => {
    const s = buildSimilaritySnapshotV2({ edgeCount: 0, caseCount: 0, threshold: 0.5 });
    expect(s.snapshotId).toMatch(/^simsnap2_/);
  });

  it('generates unique snapshotIds across calls (BD-023 parity)', () => {
    const a = buildSimilaritySnapshotV2({ edgeCount: 1, caseCount: 2, threshold: 0.5 });
    const b = buildSimilaritySnapshotV2({ edgeCount: 1, caseCount: 2, threshold: 0.5 });
    expect(a.snapshotId).not.toBe(b.snapshotId);
  });

  it('carries the given edgeCount/caseCount/threshold', () => {
    const s = buildSimilaritySnapshotV2({ edgeCount: 7, caseCount: 5, threshold: 0.6 });
    expect(s).toMatchObject({ edgeCount: 7, caseCount: 5, threshold: 0.6 });
  });

  it('throws when edgeCount is negative', () => {
    expect(() => buildSimilaritySnapshotV2({ edgeCount: -1, caseCount: 0, threshold: 0.5 })).toThrow();
  });

  it('throws when caseCount is negative', () => {
    expect(() => buildSimilaritySnapshotV2({ edgeCount: 0, caseCount: -1, threshold: 0.5 })).toThrow();
  });

  it('throws when threshold is out of [0,1]', () => {
    expect(() => buildSimilaritySnapshotV2({ edgeCount: 0, caseCount: 0, threshold: 1.5 })).toThrow();
  });
});

// ── SimilaritySnapshotV2Repository ────────────────────────────────────────────

describe('SimilaritySnapshotV2Repository', () => {
  let repo;
  beforeEach(() => { repo = new SimilaritySnapshotV2Repository(); });

  it('accepts and retrieves V2 snapshots', () => {
    repo.append(buildSimilaritySnapshotV2({ edgeCount: 1, caseCount: 2, threshold: 0.5 }));
    expect(repo.findAll()).toHaveLength(1);
    expect(repo.count).toBe(1);
  });

  it('BD-042: rejects a V1 snapshot with a clear error (generation separation)', () => {
    const fakeV1 = { snapshotId: 'simsnap_1', vectorVersion: VECTOR_VERSION_V1, computedAt: new Date().toISOString() };
    expect(() => repo.append(fakeV1)).toThrow(/BD-042/);
  });

  it('throws when required fields are missing', () => {
    expect(() => repo.append({ snapshotId: 's1', vectorVersion: '2' })).toThrow();
  });

  it('latest returns the most recently computed snapshot', async () => {
    const a = buildSimilaritySnapshotV2({ edgeCount: 1, caseCount: 1, threshold: 0.5 });
    await new Promise(r => setTimeout(r, 5));
    const b = buildSimilaritySnapshotV2({ edgeCount: 2, caseCount: 2, threshold: 0.5 });
    repo.append(a);
    repo.append(b);
    expect(repo.latest().snapshotId).toBe(b.snapshotId);
  });

  it('latest returns null when empty', () => {
    expect(repo.latest()).toBeNull();
  });

  it('findAll returns a copy (no external mutation)', () => {
    repo.append(buildSimilaritySnapshotV2({ edgeCount: 1, caseCount: 1, threshold: 0.5 }));
    const all = repo.findAll();
    all.pop();
    expect(repo.count).toBe(1);
  });

  it('has no delete/deleteById method (BD-032 Append-Only)', () => {
    expect(typeof repo.delete).toBe('undefined');
    expect(typeof repo.deleteById).toBe('undefined');
  });
});

// ── SimilaritySnapshotV2Service ───────────────────────────────────────────────

describe('SimilaritySnapshotV2Service', () => {
  function makeService() {
    const repo = new SimilaritySnapshotV2Repository();
    return { repo, svc: new SimilaritySnapshotV2Service({ repository: repo }) };
  }

  it('throws when repository is not provided', () => {
    expect(() => new SimilaritySnapshotV2Service({})).toThrow();
  });

  it('createSnapshot: throws when edges is not an array', () => {
    const { svc } = makeService();
    expect(() => svc.createSnapshot({ edges: null })).toThrow(TypeError);
  });

  it('createSnapshot: counts only V2 edges (BD-042 — V1 ignored, not thrown)', () => {
    const { svc } = makeService();
    const snap = svc.createSnapshot({ edges: [makeV2Edge(), makeV1Edge()] });
    expect(snap.edgeCount).toBe(1);
  });

  it('createSnapshot: caseCount reflects distinct case ids among V2 edges', () => {
    const { svc } = makeService();
    const snap = svc.createSnapshot({
      edges: [
        makeV2Edge({ sourceCaseId: 'C1', targetCaseId: 'C2' }),
        makeV2Edge({ sourceCaseId: 'C2', targetCaseId: 'C3' }),
      ],
    });
    expect(snap.caseCount).toBe(3);
  });

  it('createSnapshot: default threshold matches EdgeGenerator.DEFAULT_THRESHOLD', () => {
    const { svc } = makeService();
    const snap = svc.createSnapshot({ edges: [] });
    expect(snap.threshold).toBe(0.5);
  });

  it('createSnapshot: accepts an explicit threshold', () => {
    const { svc } = makeService();
    const snap = svc.createSnapshot({ edges: [], threshold: 0.7 });
    expect(snap.threshold).toBe(0.7);
  });

  it('createSnapshot: persists to repository (Append-Only)', () => {
    const { svc, repo } = makeService();
    svc.createSnapshot({ edges: [] });
    svc.createSnapshot({ edges: [] });
    expect(repo.count).toBe(2);
  });

  it('BD-023: recomputation never overwrites a prior snapshot — distinct snapshotIds persist together', () => {
    const { svc, repo } = makeService();
    const first  = svc.createSnapshot({ edges: [makeV2Edge()] });
    const second = svc.createSnapshot({ edges: [makeV2Edge(), makeV2Edge({ edgeId: 'EDGEV2-CC-DD-2', sourceCaseId: 'C3', targetCaseId: 'C4' })] });
    expect(first.snapshotId).not.toBe(second.snapshotId);
    const all = repo.findAll();
    expect(all.some(s => s.snapshotId === first.snapshotId)).toBe(true);
    expect(all.some(s => s.snapshotId === second.snapshotId)).toBe(true);
  });

  it('getSnapshots returns all persisted snapshots', () => {
    const { svc } = makeService();
    svc.createSnapshot({ edges: [] });
    svc.createSnapshot({ edges: [] });
    expect(svc.getSnapshots()).toHaveLength(2);
  });

  it('getLatestSnapshot returns the newest snapshot', async () => {
    const { svc } = makeService();
    svc.createSnapshot({ edges: [] });
    await new Promise(r => setTimeout(r, 5));
    const second = svc.createSnapshot({ edges: [] });
    expect(svc.getLatestSnapshot().snapshotId).toBe(second.snapshotId);
  });

  it('getStatus returns BD-010/BD-018/BD-023/BD-042 compliance flags', () => {
    const { svc } = makeService();
    const status = svc.getStatus();
    expect(status.vectorVersion).toBe('2');
    expect(status.bd010Compliant).toBe(true);
    expect(status.bd018Compliant).toBe(true);
    expect(status.bd023Compliant).toBe(true);
    expect(status.bd042Compliant).toBe(true);
  });

  it('publishes SIMILARITY_SNAPSHOT_V2_CREATED (best-effort)', () => {
    const published = [];
    const repo = new SimilaritySnapshotV2Repository();
    const svc  = new SimilaritySnapshotV2Service({ repository: repo, eventPublisher: { publish: (e) => published.push(e) } });
    svc.createSnapshot({ edges: [] });
    expect(published).toHaveLength(1);
    expect(published[0].eventType).toBe('SIMILARITY_SNAPSHOT_V2_CREATED');
  });

  it('survives if eventPublisher.publish throws (best-effort)', () => {
    const repo = new SimilaritySnapshotV2Repository();
    const svc  = new SimilaritySnapshotV2Service({ repository: repo, eventPublisher: { publish: () => { throw new Error('bus'); } } });
    expect(() => svc.createSnapshot({ edges: [] })).not.toThrow();
  });
});

// ── BD-023 integration: SimilarityEngineV2 → SimilaritySnapshotV2Service ──────

describe('BD-023: edge recomputation → snapshot integration', () => {
  it('two SimilarityEngineV2.run() calls on the same vectors produce edges with distinct edgeIds, and both feed independent snapshots', async () => {
    const repo   = new SimilarityRepositoryImpl(makeStorage());
    const engine = new SimilarityEngineV2({ repository: repo, threshold: 0.0 });

    const vecA = buildFeatureVectorV2({ userId: 'u1', caseId: 'C1', diseaseKey: 'ENDO', dimensions: new Array(FV_V2_DIMENSION_COUNT).fill(0.5) });
    const vecB = buildFeatureVectorV2({ userId: 'u2', caseId: 'C2', diseaseKey: 'ENDO', dimensions: new Array(FV_V2_DIMENSION_COUNT).fill(0.5) });

    const runA = await engine.run([vecA, vecB]);
    const runB = await engine.run([vecA, vecB]); // recomputation — BD-023

    expect(runA.edges[0].edgeId).not.toBe(runB.edges[0].edgeId);

    const snapRepo = new SimilaritySnapshotV2Repository();
    const snapSvc  = new SimilaritySnapshotV2Service({ repository: snapRepo });

    const snapshotA = snapSvc.createSnapshot({ edges: runA.edges });
    const snapshotB = snapSvc.createSnapshot({ edges: [...runA.edges, ...runB.edges] });

    expect(snapshotA.snapshotId).not.toBe(snapshotB.snapshotId);
    expect(snapshotB.edgeCount).toBe(2); // both recomputation edges counted — none overwritten
  });
});

// ── Constants ────────────────────────────────────────────────────────────────

describe('PR-065 constants', () => {
  it('SIMILARITY_SNAPSHOT_V2_SCHEMA_VERSION is defined', () => {
    expect(SIMILARITY_SNAPSHOT_V2_SCHEMA_VERSION).toBe('1');
  });

  it('VECTOR_VERSION_V1 !== VECTOR_VERSION_V2', () => {
    expect(VECTOR_VERSION_V1).not.toBe(VECTOR_VERSION_V2);
  });
});
