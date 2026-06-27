// tests/emotion-domain/emotion-repository.test.js
// EmotionRepository — Append-Only, BD-021, PR-038
import { describe, it, expect, beforeEach } from 'vitest';
import { EmotionRepository } from '../../src/domains/emotion/emotion-repository.js';
import { buildEmotion }      from '../../src/domains/emotion/emotion-entity.js';

function makeRepo() { return new EmotionRepository(); }
function makeEmo(type = 'HAPPY', recordId = null) {
  return buildEmotion({ emotionType: type, recordId });
}

describe('EmotionRepository.append()', () => {
  it('appends a valid emotion', () => {
    const r = makeRepo();
    r.append(makeEmo());
    expect(r.count).toBe(1);
  });
  it('throws when id is missing', () => {
    expect(() => makeRepo().append({ emotionType: 'HAPPY', createdAt: 'x' })).toThrow(/id is required/);
  });
  it('throws when emotionType is missing', () => {
    expect(() => makeRepo().append({ id: 'x', createdAt: 'x' })).toThrow(/emotionType is required/);
  });
  it('throws when createdAt is missing', () => {
    expect(() => makeRepo().append({ id: 'x', emotionType: 'HAPPY' })).toThrow(/createdAt is required/);
  });
});

describe('EmotionRepository.findAll()', () => {
  it('returns [] when empty', () => expect(makeRepo().findAll()).toEqual([]));
  it('returns all appended emotions', () => {
    const r = makeRepo();
    r.append(makeEmo('HAPPY'));
    r.append(makeEmo('SAD'));
    expect(r.findAll()).toHaveLength(2);
  });
  it('returns a copy (no mutation)', () => {
    const r = makeRepo();
    r.append(makeEmo());
    r.findAll().push('intruder');
    expect(r.count).toBe(1);
  });
});

describe('EmotionRepository.findByRecord()', () => {
  it('filters by recordId', () => {
    const r = makeRepo();
    r.append(makeEmo('HAPPY', 'r1'));
    r.append(makeEmo('SAD',   'r2'));
    r.append(makeEmo('CALM',  'r1'));
    expect(r.findByRecord('r1')).toHaveLength(2);
    expect(r.findByRecord('r2')).toHaveLength(1);
  });
  it('returns [] for unknown recordId', () => {
    expect(makeRepo().findByRecord('none')).toEqual([]);
  });
  it('returns emotions with recordId null when queried with null', () => {
    const r = makeRepo();
    r.append(makeEmo('HAPPY', null));
    expect(r.findByRecord(null)).toHaveLength(1);
  });
});

describe('EmotionRepository.findByType()', () => {
  it('filters by emotionType', () => {
    const r = makeRepo();
    r.append(makeEmo('HAPPY'));
    r.append(makeEmo('HAPPY'));
    r.append(makeEmo('SAD'));
    expect(r.findByType('HAPPY')).toHaveLength(2);
    expect(r.findByType('SAD')).toHaveLength(1);
  });
  it('returns [] for unknown type', () => {
    expect(makeRepo().findByType('BORED')).toEqual([]);
  });
});

describe('EmotionRepository.count', () => {
  it('starts at 0', () => expect(makeRepo().count).toBe(0));
  it('increments per append', () => {
    const r = makeRepo();
    r.append(makeEmo());
    r.append(makeEmo());
    expect(r.count).toBe(2);
  });
});

describe('EmotionRepository.clearForTests()', () => {
  it('resets store to 0', () => {
    const r = makeRepo();
    r.append(makeEmo());
    r.clearForTests();
    expect(r.count).toBe(0);
  });
});
