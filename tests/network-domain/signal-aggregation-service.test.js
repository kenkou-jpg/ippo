// tests/network-domain/signal-aggregation-service.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { SignalAggregationService } from '../../src/domains/network/signal-aggregation-service.js';
import { SIGNAL_TYPES } from '../../src/domains/network/network-signal-types.js';

function makeSignal(overrides = {}) {
  return {
    id:              overrides.id ?? 'ns_1_1',
    signalType:      overrides.signalType ?? SIGNAL_TYPES.PAIN,
    normalizedValue: overrides.normalizedValue ?? 0.5,
    rawValue:        overrides.rawValue ?? 5,
    unit:            overrides.unit ?? '/10',
    metadata:        overrides.metadata ?? {},
    recordId:        overrides.recordId ?? 'rec_001',
    timestamp:       overrides.timestamp ?? '2026-06-01T10:00:00.000Z',
    vectorVersion:   '1',
    menstrualPhase:  'UNKNOWN',
    createdAt:       '2026-06-01T10:00:00.000Z',
  };
}

describe('SignalAggregationService', () => {
  let svc;

  beforeEach(() => { svc = new SignalAggregationService(); });

  // aggregate()
  describe('aggregate()', () => {
    it('returns empty result for empty array', () => {
      const result = svc.aggregate([]);
      expect(result.byType).toEqual({});
      expect(result.byDay).toEqual({});
      expect(result.total).toBe(0);
    });

    it('returns empty result for non-array', () => {
      const result = svc.aggregate(null);
      expect(result.total).toBe(0);
    });

    it('groups by signalType correctly', () => {
      const signals = [
        makeSignal({ signalType: SIGNAL_TYPES.PAIN, normalizedValue: 0.4 }),
        makeSignal({ signalType: SIGNAL_TYPES.PAIN, normalizedValue: 0.6 }),
        makeSignal({ signalType: SIGNAL_TYPES.SLEEP, normalizedValue: 0.8 }),
      ];
      const result = svc.aggregate(signals);
      expect(result.byType[SIGNAL_TYPES.PAIN].count).toBe(2);
      expect(result.byType[SIGNAL_TYPES.SLEEP].count).toBe(1);
      expect(result.total).toBe(3);
    });

    it('computes average per type', () => {
      const signals = [
        makeSignal({ signalType: SIGNAL_TYPES.PAIN, normalizedValue: 0.4 }),
        makeSignal({ signalType: SIGNAL_TYPES.PAIN, normalizedValue: 0.6 }),
      ];
      const result = svc.aggregate(signals);
      expect(result.byType[SIGNAL_TYPES.PAIN].average).toBeCloseTo(0.5);
    });

    it('computes min and max per type', () => {
      const signals = [
        makeSignal({ signalType: SIGNAL_TYPES.PAIN, normalizedValue: 0.2 }),
        makeSignal({ signalType: SIGNAL_TYPES.PAIN, normalizedValue: 0.8 }),
      ];
      const result = svc.aggregate(signals);
      expect(result.byType[SIGNAL_TYPES.PAIN].min).toBeCloseTo(0.2);
      expect(result.byType[SIGNAL_TYPES.PAIN].max).toBeCloseTo(0.8);
    });

    it('tracks latest signal per type', () => {
      const signals = [
        makeSignal({ signalType: SIGNAL_TYPES.PAIN, timestamp: '2026-06-01T08:00:00.000Z', id: 'ns_1' }),
        makeSignal({ signalType: SIGNAL_TYPES.PAIN, timestamp: '2026-06-02T10:00:00.000Z', id: 'ns_2' }),
      ];
      const result = svc.aggregate(signals);
      expect(result.byType[SIGNAL_TYPES.PAIN].latest.id).toBe('ns_2');
    });

    it('groups by calendar day', () => {
      const signals = [
        makeSignal({ timestamp: '2026-06-01T08:00:00.000Z' }),
        makeSignal({ timestamp: '2026-06-01T20:00:00.000Z' }),
        makeSignal({ timestamp: '2026-06-02T10:00:00.000Z' }),
      ];
      const result = svc.aggregate(signals);
      expect(result.byDay['2026-06-01']).toHaveLength(2);
      expect(result.byDay['2026-06-02']).toHaveLength(1);
    });

    it('skips null/undefined entries gracefully', () => {
      const result = svc.aggregate([null, undefined, makeSignal()]);
      expect(result.total).toBe(3);
      expect(result.byType[SIGNAL_TYPES.PAIN].count).toBe(1);
    });
  });

  // aggregateByType()
  describe('aggregateByType()', () => {
    it('returns stats for the specified type only', () => {
      const signals = [
        makeSignal({ signalType: SIGNAL_TYPES.PAIN, normalizedValue: 0.6 }),
        makeSignal({ signalType: SIGNAL_TYPES.SLEEP, normalizedValue: 0.9 }),
      ];
      const stats = svc.aggregateByType(signals, SIGNAL_TYPES.PAIN);
      expect(stats.count).toBe(1);
      expect(stats.average).toBeCloseTo(0.6);
    });

    it('returns zero-stats for type with no signals', () => {
      const stats = svc.aggregateByType([], SIGNAL_TYPES.SYMPTOM);
      expect(stats.count).toBe(0);
      expect(stats.average).toBe(0);
      expect(stats.latest).toBeNull();
    });

    it('throws for unknown signalType', () => {
      expect(() => svc.aggregateByType([], 'INVALID')).toThrow('[SignalAggregationService]');
    });
  });

  // aggregateByDay()
  describe('aggregateByDay()', () => {
    it('returns day-keyed map', () => {
      const signals = [
        makeSignal({ timestamp: '2026-06-10T09:00:00.000Z' }),
        makeSignal({ timestamp: '2026-06-11T09:00:00.000Z' }),
      ];
      const byDay = svc.aggregateByDay(signals);
      expect(Object.keys(byDay)).toEqual(expect.arrayContaining(['2026-06-10', '2026-06-11']));
    });

    it('returns empty object for empty input', () => {
      expect(svc.aggregateByDay([])).toEqual({});
    });

    it('returns empty object for non-array', () => {
      expect(svc.aggregateByDay(null)).toEqual({});
    });
  });

  // latestByType()
  describe('latestByType()', () => {
    it('returns latest signal per type', () => {
      const signals = [
        makeSignal({ signalType: SIGNAL_TYPES.PAIN, timestamp: '2026-06-01T00:00:00.000Z', id: 'old' }),
        makeSignal({ signalType: SIGNAL_TYPES.PAIN, timestamp: '2026-06-10T00:00:00.000Z', id: 'new' }),
        makeSignal({ signalType: SIGNAL_TYPES.SLEEP, timestamp: '2026-06-05T00:00:00.000Z', id: 'sleep1' }),
      ];
      const latest = svc.latestByType(signals);
      expect(latest[SIGNAL_TYPES.PAIN].id).toBe('new');
      expect(latest[SIGNAL_TYPES.SLEEP].id).toBe('sleep1');
    });

    it('returns empty object for empty input', () => {
      expect(svc.latestByType([])).toEqual({});
    });
  });

  // averageByType()
  describe('averageByType()', () => {
    it('computes correct average', () => {
      const signals = [
        makeSignal({ signalType: SIGNAL_TYPES.PAIN, normalizedValue: 0.2 }),
        makeSignal({ signalType: SIGNAL_TYPES.PAIN, normalizedValue: 0.4 }),
        makeSignal({ signalType: SIGNAL_TYPES.PAIN, normalizedValue: 0.6 }),
      ];
      expect(svc.averageByType(signals, SIGNAL_TYPES.PAIN)).toBeCloseTo(0.4);
    });

    it('returns 0 for empty type', () => {
      expect(svc.averageByType([], SIGNAL_TYPES.SLEEP)).toBe(0);
    });
  });

  // countByType()
  describe('countByType()', () => {
    it('returns per-type counts', () => {
      const signals = [
        makeSignal({ signalType: SIGNAL_TYPES.PAIN }),
        makeSignal({ signalType: SIGNAL_TYPES.PAIN }),
        makeSignal({ signalType: SIGNAL_TYPES.SYMPTOM }),
      ];
      const counts = svc.countByType(signals);
      expect(counts[SIGNAL_TYPES.PAIN]).toBe(2);
      expect(counts[SIGNAL_TYPES.SYMPTOM]).toBe(1);
    });

    it('returns empty object for non-array', () => {
      expect(svc.countByType(null)).toEqual({});
    });
  });
});
