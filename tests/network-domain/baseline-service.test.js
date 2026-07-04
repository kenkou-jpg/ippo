// tests/network-domain/baseline-service.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { BaselineService } from '../../src/domains/network/baseline-service.js';
import { SIGNAL_TYPES } from '../../src/domains/network/network-signal-types.js';

let _id = 0;
function makeSignal(signalType, normalizedValue, timestamp) {
  _id++;
  return {
    id: `ns_${_id}`,
    signalType,
    normalizedValue,
    rawValue: normalizedValue * 10,
    unit: '/10',
    metadata: {},
    recordId: 'rec_001',
    timestamp: timestamp ?? `2026-06-${String(_id % 28 + 1).padStart(2, '0')}T10:00:00.000Z`,
    vectorVersion: '1',
    menstrualPhase: 'UNKNOWN',
    createdAt: new Date().toISOString(),
  };
}

describe('BaselineService', () => {
  let svc;
  beforeEach(() => { svc = new BaselineService(); _id = 0; });

  describe('compute() — result shape', () => {
    it('returns signalType, mean, stddev, min, max, sampleCount, computedAt', () => {
      const result = svc.compute([], SIGNAL_TYPES.PAIN);
      expect(result).toHaveProperty('signalType', SIGNAL_TYPES.PAIN);
      expect(result).toHaveProperty('mean');
      expect(result).toHaveProperty('stddev');
      expect(result).toHaveProperty('min');
      expect(result).toHaveProperty('max');
      expect(result).toHaveProperty('sampleCount', 0);
      expect(result).toHaveProperty('computedAt');
    });

    it('computedAt is an ISO string', () => {
      const result = svc.compute([], SIGNAL_TYPES.PAIN);
      expect(result.computedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('compute() — empty input', () => {
    it('returns null mean for no signals', () => {
      const result = svc.compute([], SIGNAL_TYPES.PAIN);
      expect(result.mean).toBeNull();
      expect(result.min).toBeNull();
      expect(result.max).toBeNull();
      expect(result.stddev).toBeNull();
      expect(result.sampleCount).toBe(0);
    });

    it('returns null mean for non-array', () => {
      const result = svc.compute(null, SIGNAL_TYPES.PAIN);
      expect(result.mean).toBeNull();
    });
  });

  describe('compute() — statistical correctness', () => {
    it('computes correct mean', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.2),
        makeSignal(SIGNAL_TYPES.PAIN, 0.4),
        makeSignal(SIGNAL_TYPES.PAIN, 0.6),
      ];
      const result = svc.compute(signals, SIGNAL_TYPES.PAIN);
      expect(result.mean).toBeCloseTo(0.4);
      expect(result.sampleCount).toBe(3);
    });

    it('computes correct min and max', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.SLEEP, 0.3),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.7),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.5),
      ];
      const result = svc.compute(signals, SIGNAL_TYPES.SLEEP);
      expect(result.min).toBeCloseTo(0.3);
      expect(result.max).toBeCloseTo(0.7);
    });

    it('computes non-null stddev for 2+ signals', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.2),
        makeSignal(SIGNAL_TYPES.PAIN, 0.8),
      ];
      const result = svc.compute(signals, SIGNAL_TYPES.PAIN);
      expect(result.stddev).not.toBeNull();
      expect(result.stddev).toBeGreaterThan(0);
    });

    it('returns null stddev for 1 signal', () => {
      const signals = [makeSignal(SIGNAL_TYPES.PAIN, 0.5)];
      const result = svc.compute(signals, SIGNAL_TYPES.PAIN);
      expect(result.stddev).toBeNull();
    });

    it('filters to specified signalType only', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.8),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.1), // should not affect PAIN baseline
        makeSignal(SIGNAL_TYPES.PAIN, 0.4),
      ];
      const result = svc.compute(signals, SIGNAL_TYPES.PAIN);
      expect(result.sampleCount).toBe(2);
      expect(result.mean).toBeCloseTo(0.6);
    });
  });

  describe('compute() — errors', () => {
    it('throws for unknown signalType', () => {
      expect(() => svc.compute([], 'INVALID')).toThrow('[BaselineService]');
    });
  });

  describe('computeAll()', () => {
    it('returns baseline for each type present in signals', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.5),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.7),
      ];
      const result = svc.computeAll(signals);
      expect(result).toHaveProperty(SIGNAL_TYPES.PAIN);
      expect(result).toHaveProperty(SIGNAL_TYPES.SLEEP);
      expect(Object.keys(result)).toHaveLength(2);
    });

    it('returns empty object for empty signals', () => {
      expect(svc.computeAll([])).toEqual({});
    });

    it('returns empty object for non-array', () => {
      expect(svc.computeAll(null)).toEqual({});
    });
  });

  describe('computeWave1()', () => {
    it('always returns all 5 Wave1 types', () => {
      const result = svc.computeWave1([]);
      const keys = Object.keys(result);
      expect(keys).toContain(SIGNAL_TYPES.PAIN);
      expect(keys).toContain(SIGNAL_TYPES.SLEEP);
      expect(keys).toContain(SIGNAL_TYPES.SYMPTOM);
      expect(keys).toContain(SIGNAL_TYPES.EXPOSURE);
      expect(keys).toContain(SIGNAL_TYPES.MENSTRUAL);
      expect(keys).toHaveLength(5);
    });

    it('returns null mean for types with no data', () => {
      const result = svc.computeWave1([]);
      for (const key of Object.keys(result)) {
        expect(result[key].mean).toBeNull();
      }
    });

    it('fills in data when signals are present', () => {
      const signals = [makeSignal(SIGNAL_TYPES.PAIN, 0.6)];
      const result = svc.computeWave1(signals);
      expect(result[SIGNAL_TYPES.PAIN].mean).toBeCloseTo(0.6);
      expect(result[SIGNAL_TYPES.SLEEP].mean).toBeNull();
    });
  });
});
