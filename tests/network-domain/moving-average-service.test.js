// tests/network-domain/moving-average-service.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { MovingAverageService } from '../../src/domains/network/moving-average-service.js';
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

describe('MovingAverageService', () => {
  let svc;
  beforeEach(() => { svc = new MovingAverageService(); _id = 0; });

  describe('compute() — result shape', () => {
    it('returns signalType, windowDays, average, count, from, to', () => {
      const result = svc.compute([], SIGNAL_TYPES.PAIN, 7, '2026-06-30');
      expect(result).toHaveProperty('signalType', SIGNAL_TYPES.PAIN);
      expect(result).toHaveProperty('windowDays', 7);
      expect(result).toHaveProperty('average', 0);
      expect(result).toHaveProperty('count', 0);
      expect(result).toHaveProperty('from');
      expect(result).toHaveProperty('to');
    });
  });

  describe('compute() — 7-day window', () => {
    it('includes only signals within last 7 days', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.8, '2026-06-23T00:00:00.000Z'), // outside (day -7)
        makeSignal(SIGNAL_TYPES.PAIN, 0.4, '2026-06-24T00:00:00.000Z'), // inside boundary
        makeSignal(SIGNAL_TYPES.PAIN, 0.6, '2026-06-30T00:00:00.000Z'), // inside
      ];
      const result = svc.compute(signals, SIGNAL_TYPES.PAIN, 7, '2026-06-30');
      expect(result.count).toBe(2);
      expect(result.average).toBeCloseTo(0.5);
    });

    it('returns average 0 when no signals in window', () => {
      const result = svc.compute([], SIGNAL_TYPES.PAIN, 7, '2026-06-30');
      expect(result.average).toBe(0);
      expect(result.count).toBe(0);
    });
  });

  describe('compute() — 30-day window', () => {
    it('includes signals within last 30 days', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.SLEEP, 0.8, '2026-06-01T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.6, '2026-06-15T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.4, '2026-06-30T00:00:00.000Z'),
      ];
      const result = svc.compute(signals, SIGNAL_TYPES.SLEEP, 30, '2026-06-30');
      expect(result.count).toBe(3);
      expect(result.average).toBeCloseTo(0.6);
    });

    it('excludes signals older than 30 days', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.9, '2026-05-01T00:00:00.000Z'), // outside
        makeSignal(SIGNAL_TYPES.PAIN, 0.3, '2026-06-10T00:00:00.000Z'), // inside
      ];
      const result = svc.compute(signals, SIGNAL_TYPES.PAIN, 30, '2026-06-30');
      expect(result.count).toBe(1);
      expect(result.average).toBeCloseTo(0.3);
    });
  });

  describe('compute() — filters by signalType', () => {
    it('only averages signals of the requested type', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.8, '2026-06-20T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.2, '2026-06-20T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.PAIN, 0.4, '2026-06-25T00:00:00.000Z'),
      ];
      const result = svc.compute(signals, SIGNAL_TYPES.PAIN, 30, '2026-06-30');
      expect(result.count).toBe(2);
      expect(result.average).toBeCloseTo(0.6);
    });
  });

  describe('compute() — errors', () => {
    it('throws for unknown signalType', () => {
      expect(() => svc.compute([], 'INVALID', 7, '2026-06-30')).toThrow('[MovingAverageService]');
    });

    it('throws RangeError for invalid days', () => {
      expect(() => svc.compute([], SIGNAL_TYPES.PAIN, 0, '2026-06-30')).toThrow(RangeError);
    });
  });

  describe('compute7()', () => {
    it('delegates to compute with days=7', () => {
      const result = svc.compute7([], SIGNAL_TYPES.PAIN, '2026-06-30');
      expect(result.windowDays).toBe(7);
    });
  });

  describe('compute30()', () => {
    it('delegates to compute with days=30', () => {
      const result = svc.compute30([], SIGNAL_TYPES.PAIN, '2026-06-30');
      expect(result.windowDays).toBe(30);
    });
  });

  describe('computeAll()', () => {
    it('returns last7 and last30 for each type present', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.5, '2026-06-20T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.7, '2026-06-20T00:00:00.000Z'),
      ];
      const result = svc.computeAll(signals, '2026-06-30');
      expect(result[SIGNAL_TYPES.PAIN]).toHaveProperty('last7');
      expect(result[SIGNAL_TYPES.PAIN]).toHaveProperty('last30');
      expect(result[SIGNAL_TYPES.SLEEP]).toHaveProperty('last7');
    });

    it('returns empty object for empty signals', () => {
      expect(svc.computeAll([], '2026-06-30')).toEqual({});
    });

    it('returns empty object for non-array', () => {
      expect(svc.computeAll(null, '2026-06-30')).toEqual({});
    });

    it('does not include unknown signal types', () => {
      const signals = [makeSignal(SIGNAL_TYPES.PAIN, 0.5, '2026-06-20T00:00:00.000Z')];
      const result = svc.computeAll(signals, '2026-06-30');
      const keys = Object.keys(result);
      expect(keys).toEqual([SIGNAL_TYPES.PAIN]);
    });
  });
});
