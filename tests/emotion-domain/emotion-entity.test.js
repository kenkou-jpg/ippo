// tests/emotion-domain/emotion-entity.test.js
// Emotion Entity — immutable, BD-018, PR-038
import { describe, it, expect } from 'vitest';
import { buildEmotion } from '../../src/domains/emotion/emotion-entity.js';
import { EMOTION_TYPES, EMOTION_INTENSITY, EMOTION_SOURCE } from '../../src/domains/emotion/emotion-types.js';

function makeEmotion(overrides = {}) {
  return buildEmotion({ emotionType: 'HAPPY', ...overrides });
}

describe('buildEmotion — structure', () => {
  it('returns a frozen object', () => expect(Object.isFrozen(makeEmotion())).toBe(true));
  it('has id starting with emo_', () => expect(makeEmotion().id).toMatch(/^emo_/));
  it('has emotionType', () => expect(makeEmotion().emotionType).toBe('HAPPY'));
  it('has intensity default UNKNOWN', () => expect(makeEmotion().intensity).toBe('UNKNOWN'));
  it('has source default USER_INPUT', () => expect(makeEmotion().source).toBe('USER_INPUT'));
  it('has note default empty string', () => expect(makeEmotion().note).toBe(''));
  it('has recordId default null', () => expect(makeEmotion().recordId).toBeNull());
  it('has timestamp ISO string', () => expect(makeEmotion().timestamp).toMatch(/^\d{4}/));
  it('has createdAt ISO string (BD-018)', () => expect(makeEmotion().createdAt).toMatch(/^\d{4}/));
});

describe('buildEmotion — custom fields', () => {
  it('accepts custom intensity', () => {
    expect(buildEmotion({ emotionType: 'CALM', intensity: 'HIGH' }).intensity).toBe('HIGH');
  });
  it('accepts custom source', () => {
    expect(buildEmotion({ emotionType: 'CALM', source: 'INFERRED' }).source).toBe('INFERRED');
  });
  it('accepts recordId', () => {
    expect(buildEmotion({ emotionType: 'CALM', recordId: 'rec_1' }).recordId).toBe('rec_1');
  });
  it('accepts note', () => {
    expect(buildEmotion({ emotionType: 'SAD', note: 'feel low' }).note).toBe('feel low');
  });
});

describe('buildEmotion — validation', () => {
  it('throws when emotionType is missing', () => {
    expect(() => buildEmotion({ emotionType: undefined })).toThrow(/emotionType is required/);
  });
  it('throws for unknown emotionType', () => {
    expect(() => buildEmotion({ emotionType: 'BORED' })).toThrow(/Unknown emotionType/);
  });
  it('throws for unknown intensity', () => {
    expect(() => buildEmotion({ emotionType: 'HAPPY', intensity: 'EXTREME' })).toThrow(/Unknown intensity/);
  });
  it('throws for unknown source', () => {
    expect(() => buildEmotion({ emotionType: 'HAPPY', source: 'MAGIC' })).toThrow(/Unknown source/);
  });
});

describe('buildEmotion — all 10 types accepted', () => {
  for (const t of Object.values(EMOTION_TYPES)) {
    it(`accepts ${t}`, () => expect(() => buildEmotion({ emotionType: t })).not.toThrow());
  }
});

describe('buildEmotion — unique ids', () => {
  it('produces unique ids on each call', () => {
    const ids = new Set(Array.from({ length: 10 }, () => makeEmotion().id));
    expect(ids.size).toBe(10);
  });
});
