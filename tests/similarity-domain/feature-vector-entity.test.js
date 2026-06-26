// tests/similarity-domain/feature-vector-entity.test.js
// FeatureVector Entity — BD-010/BD-018, PR-036
import { describe, it, expect } from 'vitest';
import { buildFeatureVector }  from '../../src/domains/similarity/feature-vector-entity.js';
import { FV_DIMENSION_COUNT }  from '../../src/domains/similarity/feature-vector-types.js';

const VALID_DIMS = new Array(FV_DIMENSION_COUNT).fill(0).map((_, i) => i / (FV_DIMENSION_COUNT - 1));

function makeVector(overrides = {}) {
  return buildFeatureVector({ userId: 'u1', dimensions: [...VALID_DIMS], ...overrides });
}

describe('buildFeatureVector — structure', () => {
  it('returns a frozen object', () => expect(Object.isFrozen(makeVector())).toBe(true));
  it('has id', () => expect(makeVector().id).toBeTruthy());
  it('has userId', () => expect(makeVector().userId).toBe('u1'));
  it('has vectorVersion (BD-010)', () => expect(makeVector().vectorVersion).toBe('1'));
  it('has generatedAt ISO string (BD-018)', () => {
    expect(makeVector().generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it('has frozen dimensions array', () => expect(Object.isFrozen(makeVector().dimensions)).toBe(true));
  it('dimensions has length 12', () => expect(makeVector().dimensions).toHaveLength(12));
  it('has magnitude', () => expect(typeof makeVector().magnitude).toBe('number'));
  it('has frozen metadata', () => expect(Object.isFrozen(makeVector().metadata)).toBe(true));
});

describe('buildFeatureVector — validation', () => {
  it('throws when userId is missing', () => {
    expect(() => buildFeatureVector({ dimensions: VALID_DIMS })).toThrow(/userId is required/);
  });

  it('throws when dimensions length != 12', () => {
    expect(() => buildFeatureVector({ userId: 'u1', dimensions: [0, 1, 0] }))
      .toThrow(/dimensions must be an array of length 12/);
  });

  it('throws when dimensions is not an array', () => {
    expect(() => buildFeatureVector({ userId: 'u1', dimensions: 'bad' }))
      .toThrow();
  });

  it('throws when a dimension is out of [0,1]', () => {
    const dims = [...VALID_DIMS];
    dims[0] = 1.5;
    expect(() => buildFeatureVector({ userId: 'u1', dimensions: dims }))
      .toThrow(/dimensions\[0\]/);
  });

  it('throws when a dimension is NaN', () => {
    const dims = [...VALID_DIMS];
    dims[3] = NaN;
    expect(() => buildFeatureVector({ userId: 'u1', dimensions: dims }))
      .toThrow();
  });
});

describe('buildFeatureVector — unique ids', () => {
  it('produces unique ids', () => {
    const ids = new Set(Array.from({ length: 10 }, () => makeVector().id));
    expect(ids.size).toBe(10);
  });
});

describe('buildFeatureVector — zero vector', () => {
  it('magnitude of zero vector is 0', () => {
    const v = buildFeatureVector({ userId: 'u1', dimensions: new Array(12).fill(0) });
    expect(v.magnitude).toBe(0);
  });
});
