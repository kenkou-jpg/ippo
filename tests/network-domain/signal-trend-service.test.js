// tests/network-domain/signal-trend-service.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { SignalTrendService, TREND_DIRECTION } from '../../src/domains/network/signal-trend-service.js';
import { SIGNAL_TYPES } from '../../src/domains/network/network-signal-types.js';

function makeSignal(signalType, normalizedValue, timestamp) {
  return {
    id: `ns_${Date.now()}_${Math.random()}`,
    signalType,
    normalizedValue,
    rawValue: normalizedValue * 10,
    unit: '/10',
    metadata: {},
    recordId: 'rec_001',
    timestamp: timestamp ?? new Date().toISOString(),
    vectorVersion: '1',
    menstrualPhase: 'UNKNOWN',
    createdAt: new Date().toISOString(),
  };
}

describe('SignalTrendService', () => {
  let svc;

  beforeEach(() => { svc = new SignalTrendService(); });

  describe('TREND_DIRECTION constants', () => {
    it('exports IMPROVING', () => expect(TREND_DIRECTION.IMPROVING).toBe('Improving'));
    it('exports STABLE',    () => expect(TREND_DIRECTION.STABLE).toBe('Stable'));
    it('exports WORSENING', () => expect(TREND_DIRECTION.WORSENING).toBe('Worsening'));
    it('exports INCREASING',() => expect(TREND_DIRECTION.INCREASING).toBe('Increasing'));
    it('exports DECREASING',() => expect(TREND_DIRECTION.DECREASING).toBe('Decreasing'));
    it('exports UNKNOWN',   () => expect(TREND_DIRECTION.UNKNOWN).toBe('Unknown'));
    it('is frozen',         () => expect(Object.isFrozen(TREND_DIRECTION)).toBe(true));
  });

  describe('trend() — UNKNOWN for insufficient data', () => {
    it('returns UNKNOWN for 0 signals', () => {
      const result = svc.trend([], SIGNAL_TYPES.PAIN);
      expect(result.direction).toBe(TREND_DIRECTION.UNKNOWN);
      expect(result.dataPoints).toBe(0);
    });

    it('returns UNKNOWN for 1 signal', () => {
      const result = svc.trend([makeSignal(SIGNAL_TYPES.PAIN, 0.5, '2026-06-01T00:00:00.000Z')], SIGNAL_TYPES.PAIN);
      expect(result.direction).toBe(TREND_DIRECTION.UNKNOWN);
      expect(result.dataPoints).toBe(1);
      expect(result.recentAvg).toBeCloseTo(0.5);
    });
  });

  describe('trend() — PAIN (lower is better)', () => {
    it('Improving when recent pain is lower', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.8, '2026-06-01T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.PAIN, 0.7, '2026-06-02T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.PAIN, 0.2, '2026-06-05T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.PAIN, 0.1, '2026-06-06T00:00:00.000Z'),
      ];
      const result = svc.trend(signals, SIGNAL_TYPES.PAIN);
      expect(result.direction).toBe(TREND_DIRECTION.IMPROVING);
      expect(result.delta).toBeLessThan(0);
    });

    it('Worsening when recent pain is higher', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.1, '2026-06-01T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.PAIN, 0.2, '2026-06-02T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.PAIN, 0.7, '2026-06-05T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.PAIN, 0.8, '2026-06-06T00:00:00.000Z'),
      ];
      const result = svc.trend(signals, SIGNAL_TYPES.PAIN);
      expect(result.direction).toBe(TREND_DIRECTION.WORSENING);
    });

    it('Stable when delta is within threshold', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.5, '2026-06-01T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.PAIN, 0.5, '2026-06-02T00:00:00.000Z'),
      ];
      const result = svc.trend(signals, SIGNAL_TYPES.PAIN);
      expect(result.direction).toBe(TREND_DIRECTION.STABLE);
    });
  });

  describe('trend() — SYMPTOM (lower is better)', () => {
    it('Improving when recent symptom count is lower', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.SYMPTOM, 0.9, '2026-06-01T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.SYMPTOM, 0.1, '2026-06-10T00:00:00.000Z'),
      ];
      const result = svc.trend(signals, SIGNAL_TYPES.SYMPTOM);
      expect(result.direction).toBe(TREND_DIRECTION.IMPROVING);
    });
  });

  describe('trend() — SLEEP (higher is better)', () => {
    it('Increasing when recent sleep is longer', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.SLEEP, 0.5, '2026-06-01T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.9, '2026-06-10T00:00:00.000Z'),
      ];
      const result = svc.trend(signals, SIGNAL_TYPES.SLEEP);
      expect(result.direction).toBe(TREND_DIRECTION.INCREASING);
    });

    it('Decreasing when recent sleep is shorter', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.SLEEP, 0.9, '2026-06-01T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.3, '2026-06-10T00:00:00.000Z'),
      ];
      const result = svc.trend(signals, SIGNAL_TYPES.SLEEP);
      expect(result.direction).toBe(TREND_DIRECTION.DECREASING);
    });
  });

  describe('trend() — MENSTRUAL / EXPOSURE (neutral)', () => {
    it('Increasing when recent menstrual is higher', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.MENSTRUAL, 0.2, '2026-06-01T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.MENSTRUAL, 0.8, '2026-06-10T00:00:00.000Z'),
      ];
      const result = svc.trend(signals, SIGNAL_TYPES.MENSTRUAL);
      expect(result.direction).toBe(TREND_DIRECTION.INCREASING);
    });

    it('Decreasing when recent exposure is lower', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.EXPOSURE, 0.8, '2026-06-01T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.EXPOSURE, 0.2, '2026-06-10T00:00:00.000Z'),
      ];
      const result = svc.trend(signals, SIGNAL_TYPES.EXPOSURE);
      expect(result.direction).toBe(TREND_DIRECTION.DECREASING);
    });
  });

  describe('trend() — result shape', () => {
    it('returns signalType, direction, delta, dataPoints, recentAvg, olderAvg', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.8, '2026-06-01T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.PAIN, 0.2, '2026-06-10T00:00:00.000Z'),
      ];
      const result = svc.trend(signals, SIGNAL_TYPES.PAIN);
      expect(result).toHaveProperty('signalType', SIGNAL_TYPES.PAIN);
      expect(result).toHaveProperty('direction');
      expect(result).toHaveProperty('delta');
      expect(result).toHaveProperty('dataPoints', 2);
      expect(result).toHaveProperty('recentAvg');
      expect(result).toHaveProperty('olderAvg');
    });
  });

  describe('trend() — errors', () => {
    it('throws for unknown signalType', () => {
      expect(() => svc.trend([], 'INVALID')).toThrow('[SignalTrendService]');
    });
  });

  describe('trendAll()', () => {
    it('returns trends for all types present', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN,  0.5, '2026-06-01T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.PAIN,  0.3, '2026-06-10T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.7, '2026-06-01T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.9, '2026-06-10T00:00:00.000Z'),
      ];
      const result = svc.trendAll(signals);
      expect(result).toHaveProperty(SIGNAL_TYPES.PAIN);
      expect(result).toHaveProperty(SIGNAL_TYPES.SLEEP);
      expect(Object.keys(result)).toHaveLength(2);
    });

    it('returns empty object for empty signals', () => {
      expect(svc.trendAll([])).toEqual({});
    });

    it('returns empty object for non-array', () => {
      expect(svc.trendAll(null)).toEqual({});
    });
  });
});
