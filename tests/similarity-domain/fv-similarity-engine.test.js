// tests/similarity-domain/fv-similarity-engine.test.js
// FvSimilarityEngine — Wave1 Cosine only, PR-036
import { describe, it, expect } from 'vitest';
import { FvSimilarityEngine } from '../../src/domains/similarity/fv-similarity-engine.js';
import { buildFeatureVector } from '../../src/domains/similarity/feature-vector-entity.js';

const engine = () => new FvSimilarityEngine();

function makeVec(userId, dims) {
  return buildFeatureVector({ userId, dimensions: dims });
}

const ZEROS = new Array(12).fill(0);
const ONES  = new Array(12).fill(1).map(v => v / Math.sqrt(12)); // unit vec

describe('FvSimilarityEngine.calculateSimilarity()', () => {
  it('identical vectors score 1', () => {
    const dims = new Array(12).fill(0.5);
    const v = makeVec('u1', dims);
    const result = engine().calculateSimilarity(v, v);
    expect(result.score).toBeCloseTo(1, 4);
  });

  it('orthogonal vectors score 0', () => {
    const a = new Array(12).fill(0); a[0] = 1;
    const b = new Array(12).fill(0); b[6] = 1;
    const result = engine().calculateSimilarity(makeVec('u1', a), makeVec('u2', b));
    expect(result.score).toBeCloseTo(0, 4);
  });

  it('zero vectors score 0', () => {
    const z = makeVec('u1', ZEROS);
    expect(engine().calculateSimilarity(z, z).score).toBe(0);
  });

  it('result has vectorVersion (BD-010)', () => {
    const v = makeVec('u1', new Array(12).fill(0.5));
    expect(engine().calculateSimilarity(v, v).vectorVersion).toBe('1');
  });

  it('result has method "cosine"', () => {
    const v = makeVec('u1', new Array(12).fill(0.5));
    expect(engine().calculateSimilarity(v, v).method).toBe('cosine');
  });

  it('result has generatedAt (BD-018)', () => {
    const v = makeVec('u1', new Array(12).fill(0.5));
    expect(engine().calculateSimilarity(v, v).generatedAt).toMatch(/^\d{4}/);
  });

  it('throws when vecA dimensions are missing', () => {
    expect(() => engine().calculateSimilarity({ dimensions: [] }, makeVec('u1', ZEROS)))
      .toThrow(/FvSimilarityEngine/);
  });
});

describe('FvSimilarityEngine.compare()', () => {
  it('returns dimScores array of length 12', () => {
    const v = makeVec('u1', new Array(12).fill(0.5));
    const result = engine().compare(v, v);
    expect(result.dimScores).toHaveLength(12);
  });

  it('dimScores is frozen', () => {
    const v = makeVec('u1', new Array(12).fill(0.5));
    expect(Object.isFrozen(engine().compare(v, v).dimScores)).toBe(true);
  });
});

describe('FvSimilarityEngine.rank()', () => {
  it('returns [] for empty candidates', () => {
    const v = makeVec('u1', new Array(12).fill(0.5));
    expect(engine().rank(v, [])).toEqual([]);
  });

  it('sorts by score descending', () => {
    const ref  = makeVec('u1', new Array(12).fill(0.8));
    const high = makeVec('u2', new Array(12).fill(0.8));
    const low  = makeVec('u3', new Array(12).fill(0.1));
    const ranked = engine().rank(ref, [low, high]);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });

  it('each rank item has score and vector', () => {
    const ref = makeVec('u1', new Array(12).fill(0.5));
    const c   = makeVec('u2', new Array(12).fill(0.5));
    const [item] = engine().rank(ref, [c]);
    expect(item.score).toBeDefined();
    expect(item.vector).toBeDefined();
  });
});

describe('FvSimilarityEngine.normalize()', () => {
  it('clamps values > 1 to 1', () => {
    expect(engine().normalize([2, 0.5])).toEqual([1, 0.5]);
  });

  it('clamps values < 0 to 0', () => {
    expect(engine().normalize([-1, 0.5])).toEqual([0, 0.5]);
  });

  it('replaces NaN with 0', () => {
    expect(engine().normalize([NaN])[0]).toBe(0);
  });

  it('throws for non-array input', () => {
    expect(() => engine().normalize('bad')).toThrow();
  });
});
