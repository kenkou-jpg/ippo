// tests/similarity-domain/feature-vector-repository.test.js
// FeatureVectorRepository — Append-Only, PR-036
import { describe, it, expect } from 'vitest';
import { FeatureVectorRepository } from '../../src/domains/similarity/feature-vector-repository.js';
import { buildFeatureVector }      from '../../src/domains/similarity/feature-vector-entity.js';

const DIMS = new Array(12).fill(0.5);

function makeRepo() { return new FeatureVectorRepository(); }
function makeVec(userId = 'u1') {
  return buildFeatureVector({ userId, dimensions: [...DIMS] });
}

describe('FeatureVectorRepository.append()', () => {
  it('appends a valid vector', () => {
    const r = makeRepo();
    r.append(makeVec());
    expect(r.count).toBe(1);
  });

  it('throws when id is missing', () => {
    expect(() => makeRepo().append({ userId: 'u1', vectorVersion: '1', generatedAt: 'x' })).toThrow();
  });

  it('throws when userId is missing', () => {
    expect(() => makeRepo().append({ id: 'x', vectorVersion: '1', generatedAt: 'x' })).toThrow();
  });

  it('throws when vectorVersion is missing (BD-010)', () => {
    expect(() => makeRepo().append({ id: 'x', userId: 'u1', generatedAt: 'x' })).toThrow();
  });

  it('throws when generatedAt is missing (BD-018)', () => {
    expect(() => makeRepo().append({ id: 'x', userId: 'u1', vectorVersion: '1' })).toThrow();
  });
});

describe('FeatureVectorRepository.findAll()', () => {
  it('returns [] when empty', () => expect(makeRepo().findAll()).toEqual([]));

  it('returns all appended vectors', () => {
    const r = makeRepo();
    r.append(makeVec('u1'));
    r.append(makeVec('u2'));
    expect(r.findAll()).toHaveLength(2);
  });

  it('returns a copy (no mutation)', () => {
    const r = makeRepo();
    r.append(makeVec());
    r.findAll().push('intruder');
    expect(r.count).toBe(1);
  });
});

describe('FeatureVectorRepository.findByUser()', () => {
  it('returns only vectors for userId', () => {
    const r = makeRepo();
    r.append(makeVec('u1'));
    r.append(makeVec('u2'));
    r.append(makeVec('u1'));
    expect(r.findByUser('u1')).toHaveLength(2);
    expect(r.findByUser('u2')).toHaveLength(1);
  });

  it('returns [] for unknown user', () => {
    expect(makeRepo().findByUser('none')).toEqual([]);
  });
});

describe('FeatureVectorRepository.latestForUser()', () => {
  it('returns null when empty', () => {
    expect(makeRepo().latestForUser('u1')).toBeNull();
  });

  it('returns the vector when only one exists', () => {
    const r = makeRepo();
    const v = makeVec('u1');
    r.append(v);
    expect(r.latestForUser('u1')).toBe(v);
  });

  it('returns the most recent by generatedAt', () => {
    const r = makeRepo();
    r.append(makeVec('u1'));
    const later = makeVec('u1');
    r.append(later);
    expect(r.latestForUser('u1').generatedAt >= later.generatedAt).toBe(true);
  });
});

describe('FeatureVectorRepository.count', () => {
  it('starts at 0', () => expect(makeRepo().count).toBe(0));

  it('increments on append', () => {
    const r = makeRepo();
    r.append(makeVec());
    r.append(makeVec());
    expect(r.count).toBe(2);
  });
});
