// tests/network-domain/longitudinal-signal-service.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { LongitudinalSignalService } from '../../src/domains/network/longitudinal-signal-service.js';
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
    timestamp,
    vectorVersion: '1',
    menstrualPhase: 'UNKNOWN',
    createdAt: new Date().toISOString(),
  };
}

describe('LongitudinalSignalService', () => {
  let svc;
  beforeEach(() => { svc = new LongitudinalSignalService(); _id = 0; });

  describe('getHistory()', () => {
    it('returns empty array for empty input', () => {
      expect(svc.getHistory([])).toEqual([]);
    });

    it('returns empty array for non-array', () => {
      expect(svc.getHistory(null)).toEqual([]);
    });

    it('sorts signals chronologically ascending', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.5, '2026-06-10T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.PAIN, 0.3, '2026-06-01T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.PAIN, 0.7, '2026-06-20T00:00:00.000Z'),
      ];
      const history = svc.getHistory(signals);
      expect(history[0].timestamp.slice(0, 10)).toBe('2026-06-01');
      expect(history[2].timestamp.slice(0, 10)).toBe('2026-06-20');
    });

    it('filters out null entries', () => {
      const signals = [null, makeSignal(SIGNAL_TYPES.PAIN, 0.5, '2026-06-01T00:00:00.000Z'), undefined];
      const history = svc.getHistory(signals);
      expect(history).toHaveLength(1);
    });
  });

  describe('getHistoryByType()', () => {
    it('returns only signals of the specified type', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN,  0.5, '2026-06-01T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.8, '2026-06-02T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.PAIN,  0.3, '2026-06-03T00:00:00.000Z'),
      ];
      const history = svc.getHistoryByType(signals, SIGNAL_TYPES.PAIN);
      expect(history).toHaveLength(2);
      expect(history.every(s => s.signalType === SIGNAL_TYPES.PAIN)).toBe(true);
    });

    it('returns sorted ascending', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.8, '2026-06-10T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.PAIN, 0.2, '2026-06-01T00:00:00.000Z'),
      ];
      const history = svc.getHistoryByType(signals, SIGNAL_TYPES.PAIN);
      expect(history[0].normalizedValue).toBe(0.2);
    });

    it('throws for unknown signalType', () => {
      expect(() => svc.getHistoryByType([], 'INVALID')).toThrow('[LongitudinalSignalService]');
    });
  });

  describe('getHistoryRange()', () => {
    it('returns signals within date range inclusive', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.9, '2026-05-31T00:00:00.000Z'), // outside
        makeSignal(SIGNAL_TYPES.PAIN, 0.5, '2026-06-01T00:00:00.000Z'), // boundary in
        makeSignal(SIGNAL_TYPES.PAIN, 0.3, '2026-06-15T00:00:00.000Z'), // inside
        makeSignal(SIGNAL_TYPES.PAIN, 0.7, '2026-07-01T00:00:00.000Z'), // outside
      ];
      const history = svc.getHistoryRange(signals, '2026-06-01', '2026-06-30');
      expect(history).toHaveLength(2);
    });

    it('returns empty for non-array', () => {
      expect(svc.getHistoryRange(null, '2026-06-01', '2026-06-30')).toEqual([]);
    });
  });

  describe('buildWindow()', () => {
    it('delegates to TrendWindowBuilder', () => {
      const signals = [makeSignal(SIGNAL_TYPES.PAIN, 0.5, '2026-06-28T00:00:00.000Z')];
      const window_ = svc.buildWindow(signals, 7, '2026-06-30');
      expect(window_).toHaveProperty('windowDays', 7);
      expect(window_).toHaveProperty('signalCount', 1);
    });
  });

  describe('movingAverage()', () => {
    it('computes moving average for type in window', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.4, '2026-06-20T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.PAIN, 0.6, '2026-06-25T00:00:00.000Z'),
      ];
      const result = svc.movingAverage(signals, SIGNAL_TYPES.PAIN, 30, '2026-06-30');
      expect(result.average).toBeCloseTo(0.5);
      expect(result.count).toBe(2);
    });
  });

  describe('baseline()', () => {
    it('computes baseline from full history', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.SLEEP, 0.5, '2026-01-01T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.9, '2026-06-01T00:00:00.000Z'),
      ];
      const result = svc.baseline(signals, SIGNAL_TYPES.SLEEP);
      expect(result.sampleCount).toBe(2);
      expect(result.mean).toBeCloseTo(0.7);
    });
  });
});
