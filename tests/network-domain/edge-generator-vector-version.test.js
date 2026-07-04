// tests/network-domain/edge-generator-vector-version.test.js
// EdgeGenerator — BD-011: vectorVersion field on all generated edges (PR-030)
import { describe, it, expect, beforeEach } from 'vitest';
import { EdgeGenerator, _resetEdgeCounter } from '../../src/domains/similarity/edge-generator.js';
import { VECTOR_VERSION } from '../../src/domains/similarity/vector-builder.js';

function makeVec(caseId, diseaseKey) {
  return { caseId, diseaseKey, values: [1, 0, 0, 0, 0, 0, 0, 0], magnitude: 1 };
}

function makeResult(score = 0.8, sameDiseaseKey = true) {
  return { score, sameDiseaseKey };
}

beforeEach(() => _resetEdgeCounter());

describe('EdgeGenerator — vectorVersion (BD-011)', () => {
  it('generated edge has vectorVersion field', () => {
    const gen  = new EdgeGenerator();
    const vecA = makeVec('caseA', 'endo');
    const vecB = makeVec('caseB', 'endo');
    const edge = gen.generateFromPair({ vecA, vecB, result: makeResult(0.8) });
    expect(edge).not.toBeNull();
    expect(edge.vectorVersion).toBeDefined();
  });

  it('vectorVersion matches VECTOR_VERSION constant ("1")', () => {
    const gen  = new EdgeGenerator();
    const edge = gen.generateFromPair({
      vecA:   makeVec('caseA', 'endo'),
      vecB:   makeVec('caseB', 'endo'),
      result: makeResult(0.8),
    });
    expect(edge.vectorVersion).toBe(VECTOR_VERSION);
    expect(edge.vectorVersion).toBe('1');
  });

  it('all edges from generateFromPairs carry vectorVersion', () => {
    const gen   = new EdgeGenerator();
    const pairs = [
      { vecA: makeVec('c1', 'endo'), vecB: makeVec('c2', 'endo'), result: makeResult(0.9) },
      { vecA: makeVec('c3', 'endo'), vecB: makeVec('c4', 'endo'), result: makeResult(0.7) },
      { vecA: makeVec('c5', 'pcos'), vecB: makeVec('c6', 'pcos'), result: makeResult(0.6) },
    ];
    const edges = gen.generateFromPairs(pairs);
    expect(edges).toHaveLength(3);
    for (const e of edges) {
      expect(e.vectorVersion).toBe('1');
    }
  });

  it('null result (below threshold) does not produce an edge', () => {
    const gen = new EdgeGenerator();
    const r   = gen.generateFromPair({
      vecA:   makeVec('cA', 'endo'),
      vecB:   makeVec('cB', 'endo'),
      result: makeResult(0.3),
    });
    expect(r).toBeNull();
  });

  it('VECTOR_VERSION export from vector-builder is "1"', () => {
    expect(VECTOR_VERSION).toBe('1');
  });
});
