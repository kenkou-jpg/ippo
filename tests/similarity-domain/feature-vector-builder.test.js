// tests/similarity-domain/feature-vector-builder.test.js
// FeatureVectorBuilder — 12-dim from NetworkSignal + Disease + Longitudinal + Snapshot
import { describe, it, expect } from 'vitest';
import { FeatureVectorBuilder } from '../../src/domains/similarity/feature-vector-builder.js';
import { FV_DIM, FV_DIMENSION_COUNT } from '../../src/domains/similarity/feature-vector-types.js';
import { buildNetworkSignal }   from '../../src/domains/network/network-signal-entity.js';

const builder = () => new FeatureVectorBuilder();

function makeSignal(type, normalizedValue = 0.7) {
  return buildNetworkSignal({ recordId: 'r1', signalType: type, normalizedValue, rawValue: normalizedValue * 10, unit: 'score' });
}

describe('FeatureVectorBuilder.build() — structure', () => {
  it('returns a frozen FeatureVector entity', () => {
    const v = builder().build({ userId: 'u1' });
    expect(Object.isFrozen(v)).toBe(true);
  });

  it('has vectorVersion (BD-010)', () => {
    expect(builder().build({ userId: 'u1' }).vectorVersion).toBe('1');
  });

  it('has generatedAt (BD-018)', () => {
    expect(builder().build({ userId: 'u1' }).generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('dimensions has length 12', () => {
    expect(builder().build({ userId: 'u1' }).dimensions).toHaveLength(FV_DIMENSION_COUNT);
  });

  it('all dimensions in [0,1]', () => {
    const dims = builder().build({ userId: 'u1', signals: [makeSignal('SYMPTOM', 0.5)] }).dimensions;
    for (const d of dims) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
    }
  });
});

describe('FeatureVectorBuilder.build() — Signal layer (dims 0–5)', () => {
  it('SYMPTOM signal → FV_DIM.SYMPTOM_SCORE', () => {
    const v = builder().build({ userId: 'u1', signals: [makeSignal('SYMPTOM', 0.8)] });
    expect(v.dimensions[FV_DIM.SYMPTOM_SCORE]).toBeCloseTo(0.8, 5);
  });

  it('PAIN signal → FV_DIM.PAIN_SCORE', () => {
    const v = builder().build({ userId: 'u1', signals: [makeSignal('PAIN', 0.6)] });
    expect(v.dimensions[FV_DIM.PAIN_SCORE]).toBeCloseTo(0.6, 5);
  });

  it('SLEEP signal → FV_DIM.SLEEP_QUALITY', () => {
    const v = builder().build({ userId: 'u1', signals: [makeSignal('SLEEP', 0.4)] });
    expect(v.dimensions[FV_DIM.SLEEP_QUALITY]).toBeCloseTo(0.4, 5);
  });

  it('EMOTION_SCORE is 0 in Wave1 (no EMOTION signals)', () => {
    const v = builder().build({ userId: 'u1', signals: [] });
    expect(v.dimensions[FV_DIM.EMOTION_SCORE]).toBe(0);
  });

  it('averages multiple SYMPTOM signals', () => {
    const signals = [makeSignal('SYMPTOM', 0.4), makeSignal('SYMPTOM', 0.6)];
    const v = builder().build({ userId: 'u1', signals });
    expect(v.dimensions[FV_DIM.SYMPTOM_SCORE]).toBeCloseTo(0.5, 5);
  });
});

describe('FeatureVectorBuilder.build() — Disease layer (dims 6–7)', () => {
  it('DISEASE_BURDEN reflects active disease count', () => {
    const diseases = [{ active: true }, { active: true }];
    const v = builder().build({ userId: 'u1', diseases });
    expect(v.dimensions[FV_DIM.DISEASE_BURDEN]).toBeCloseTo(2 / 10, 5);
  });

  it('CLUSTER_COVERAGE reflects signal type diversity', () => {
    const signals = [makeSignal('SYMPTOM', 0.5), makeSignal('PAIN', 0.5)];
    const v = builder().build({ userId: 'u1', signals });
    expect(v.dimensions[FV_DIM.CLUSTER_COVERAGE]).toBeCloseTo(2 / 6, 5);
  });
});

describe('FeatureVectorBuilder.build() — Longitudinal layer (dims 8–9)', () => {
  it('TREND_DIRECTION maps 0 trend to 0.5', () => {
    const v = builder().build({ userId: 'u1', longitudinalSummary: { trend: 0 } });
    expect(v.dimensions[FV_DIM.TREND_DIRECTION]).toBeCloseTo(0.5, 5);
  });

  it('TREND_DIRECTION maps +1 trend to 1', () => {
    const v = builder().build({ userId: 'u1', longitudinalSummary: { trend: 1 } });
    expect(v.dimensions[FV_DIM.TREND_DIRECTION]).toBeCloseTo(1, 5);
  });

  it('BASELINE_STABLE is 1 when cv=0', () => {
    const v = builder().build({ userId: 'u1', longitudinalSummary: { baseline: { cv: 0 } } });
    expect(v.dimensions[FV_DIM.BASELINE_STABLE]).toBeCloseTo(1, 5);
  });
});

describe('FeatureVectorBuilder.build() — Snapshot layer (dims 10–11)', () => {
  it('SIGNAL_DENSITY reflects signal count', () => {
    const signals = Array.from({ length: 50 }, () => makeSignal('SYMPTOM', 0.5));
    const v = builder().build({ userId: 'u1', signals });
    expect(v.dimensions[FV_DIM.SIGNAL_DENSITY]).toBeCloseTo(50 / 100, 5);
  });

  it('SNAPSHOT_AGE is high for fresh snapshot', () => {
    const snapshot = { generatedAt: new Date().toISOString() };
    const v = builder().build({ userId: 'u1', snapshot });
    expect(v.dimensions[FV_DIM.SNAPSHOT_AGE]).toBeGreaterThan(0.9);
  });

  it('SNAPSHOT_AGE is 0 when snapshot is missing', () => {
    const v = builder().build({ userId: 'u1' });
    expect(v.dimensions[FV_DIM.SNAPSHOT_AGE]).toBe(0);
  });
});

describe('FeatureVectorBuilder.build() — metadata', () => {
  it('metadata includes signalCount', () => {
    const v = builder().build({ userId: 'u1', signals: [makeSignal('PAIN', 0.5)] });
    expect(v.metadata.signalCount).toBe(1);
  });

  it('metadata includes diseaseCount', () => {
    const v = builder().build({ userId: 'u1', diseases: [{ active: true }] });
    expect(v.metadata.diseaseCount).toBe(1);
  });
});
