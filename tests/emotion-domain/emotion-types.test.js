// tests/emotion-domain/emotion-types.test.js
// Emotion Types SSOT — PR-038
import { describe, it, expect } from 'vitest';
import {
  EMOTION_TYPES, EMOTION_INTENSITY, EMOTION_SOURCE,
  EMOTION_TYPE_VALUES, EMOTION_INTENSITY_VALUES, EMOTION_SOURCE_VALUES,
} from '../../src/domains/emotion/emotion-types.js';

describe('EMOTION_TYPES', () => {
  it('is frozen', () => expect(Object.isFrozen(EMOTION_TYPES)).toBe(true));
  it('has exactly 10 types', () => expect(Object.keys(EMOTION_TYPES)).toHaveLength(10));
  it('values equal their keys', () => {
    for (const [k, v] of Object.entries(EMOTION_TYPES)) expect(v).toBe(k);
  });
  it('contains all required types', () => {
    for (const t of ['HAPPY','CALM','ENERGETIC','NEUTRAL','TIRED','ANXIOUS','SAD','ANGRY','STRESSED','UNKNOWN']) {
      expect(EMOTION_TYPES).toHaveProperty(t);
    }
  });
});

describe('EMOTION_INTENSITY', () => {
  it('is frozen', () => expect(Object.isFrozen(EMOTION_INTENSITY)).toBe(true));
  it('has LOW, MEDIUM, HIGH, UNKNOWN', () => {
    for (const v of ['LOW','MEDIUM','HIGH','UNKNOWN']) expect(EMOTION_INTENSITY).toHaveProperty(v);
  });
});

describe('EMOTION_SOURCE', () => {
  it('is frozen', () => expect(Object.isFrozen(EMOTION_SOURCE)).toBe(true));
  it('has USER_INPUT, INFERRED, UNKNOWN', () => {
    for (const v of ['USER_INPUT','INFERRED','UNKNOWN']) expect(EMOTION_SOURCE).toHaveProperty(v);
  });
});

describe('EMOTION_TYPE_VALUES', () => {
  it('is a frozen Set of size 10', () => {
    expect(Object.isFrozen(EMOTION_TYPE_VALUES)).toBe(true);
    expect(EMOTION_TYPE_VALUES.size).toBe(10);
  });
  it('has HAPPY', () => expect(EMOTION_TYPE_VALUES.has('HAPPY')).toBe(true));
  it('does not have unknown value', () => expect(EMOTION_TYPE_VALUES.has('BORED')).toBe(false));
});

describe('EMOTION_INTENSITY_VALUES', () => {
  it('is a frozen Set of size 4', () => expect(EMOTION_INTENSITY_VALUES.size).toBe(4));
});

describe('EMOTION_SOURCE_VALUES', () => {
  it('is a frozen Set of size 3', () => expect(EMOTION_SOURCE_VALUES.size).toBe(3));
});
