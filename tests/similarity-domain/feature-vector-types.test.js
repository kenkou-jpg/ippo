// tests/similarity-domain/feature-vector-types.test.js
// FeatureVector Types SSOT — PR-036
import { describe, it, expect } from 'vitest';
import {
  FV_DIM, FV_DIMENSION_COUNT, FV_DIM_LABELS, VECTOR_VERSION,
} from '../../src/domains/similarity/feature-vector-types.js';

describe('FV_DIM', () => {
  it('is frozen', () => expect(Object.isFrozen(FV_DIM)).toBe(true));
  it('has exactly 12 dimensions', () => expect(Object.keys(FV_DIM)).toHaveLength(12));

  it('contains all expected dims', () => {
    for (const k of [
      'SYMPTOM_SCORE', 'PAIN_SCORE', 'MENSTRUAL_REG', 'SLEEP_QUALITY',
      'EXPOSURE_RATE', 'EMOTION_SCORE', 'DISEASE_BURDEN', 'CLUSTER_COVERAGE',
      'TREND_DIRECTION', 'BASELINE_STABLE', 'SIGNAL_DENSITY', 'SNAPSHOT_AGE',
    ]) {
      expect(FV_DIM).toHaveProperty(k);
    }
  });

  it('indices are 0–11 contiguous', () => {
    const values = Object.values(FV_DIM).sort((a, b) => a - b);
    expect(values).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});

describe('FV_DIMENSION_COUNT', () => {
  it('equals 12', () => expect(FV_DIMENSION_COUNT).toBe(12));
});

describe('FV_DIM_LABELS', () => {
  it('is frozen', () => expect(Object.isFrozen(FV_DIM_LABELS)).toBe(true));
  it('has 12 entries', () => expect(Object.keys(FV_DIM_LABELS)).toHaveLength(12));
  it('maps index 0 to SYMPTOM_SCORE', () => expect(FV_DIM_LABELS[0]).toBe('SYMPTOM_SCORE'));
  it('maps index 11 to SNAPSHOT_AGE', () => expect(FV_DIM_LABELS[11]).toBe('SNAPSHOT_AGE'));
});

describe('VECTOR_VERSION re-export (BD-010)', () => {
  it('is defined', () => expect(VECTOR_VERSION).toBeDefined());
  it('is a string', () => expect(typeof VECTOR_VERSION).toBe('string'));
  it('equals "1" for Wave1', () => expect(VECTOR_VERSION).toBe('1'));
});
