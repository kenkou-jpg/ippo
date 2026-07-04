// tests/network-domain/longitudinal-summary-service.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { LongitudinalSummaryService } from '../../src/domains/network/longitudinal-summary-service.js';
import { BaselineService }            from '../../src/domains/network/baseline-service.js';
import { MovingAverageService }       from '../../src/domains/network/moving-average-service.js';
import { SignalTrendService }         from '../../src/domains/network/signal-trend-service.js';
import { TrendWindowBuilder }         from '../../src/domains/network/trend-window-builder.js';
import { SIGNAL_TYPES }              from '../../src/domains/network/network-signal-types.js';

function makeSvc() {
  return new LongitudinalSummaryService({
    baselineService:      new BaselineService(),
    movingAverageService: new MovingAverageService(),
    trendService:         new SignalTrendService(),
    windowBuilder:        new TrendWindowBuilder(),
  });
}

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

describe('LongitudinalSummaryService', () => {
  let svc;
  beforeEach(() => { svc = makeSvc(); _id = 0; });

  describe('summarize() — result shape', () => {
    it('returns baseline, movingAverage, trend, window, generatedAt', () => {
      const result = svc.summarize([], { referenceDate: '2026-06-30' });
      expect(result).toHaveProperty('baseline');
      expect(result).toHaveProperty('movingAverage');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('window');
      expect(result).toHaveProperty('generatedAt');
    });

    it('window has days, from, to, signalCount', () => {
      const result = svc.summarize([], { windowDays: 7, referenceDate: '2026-06-30' });
      expect(result.window).toHaveProperty('days', 7);
      expect(result.window).toHaveProperty('from');
      expect(result.window).toHaveProperty('to');
      expect(result.window).toHaveProperty('signalCount');
    });

    it('generatedAt is ISO string', () => {
      const result = svc.summarize([]);
      expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('summarize() — empty input', () => {
    it('returns empty structures for no signals', () => {
      const result = svc.summarize([], { referenceDate: '2026-06-30' });
      expect(result.window.signalCount).toBe(0);
      expect(result.movingAverage).toEqual({});
      expect(result.trend).toEqual({});
    });

    it('baseline always has Wave1 keys', () => {
      const result = svc.summarize([], { referenceDate: '2026-06-30' });
      expect(result.baseline).toHaveProperty(SIGNAL_TYPES.PAIN);
      expect(result.baseline).toHaveProperty(SIGNAL_TYPES.SLEEP);
      expect(result.baseline).toHaveProperty(SIGNAL_TYPES.SYMPTOM);
      expect(result.baseline).toHaveProperty(SIGNAL_TYPES.EXPOSURE);
      expect(result.baseline).toHaveProperty(SIGNAL_TYPES.MENSTRUAL);
    });
  });

  describe('summarize() — with signals', () => {
    it('baseline mean is computed from full history', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.4, '2026-01-01T00:00:00.000Z'), // outside 30-day window
        makeSignal(SIGNAL_TYPES.PAIN, 0.6, '2026-06-20T00:00:00.000Z'), // inside window
      ];
      const result = svc.summarize(signals, { windowDays: 30, referenceDate: '2026-06-30' });
      // baseline uses ALL signals (both)
      expect(result.baseline[SIGNAL_TYPES.PAIN].mean).toBeCloseTo(0.5);
      // trend uses only window signals
      expect(result.window.signalCount).toBe(1);
    });

    it('movingAverage has last7 and last30 for types present', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.SLEEP, 0.8, '2026-06-20T00:00:00.000Z'),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.6, '2026-06-25T00:00:00.000Z'),
      ];
      const result = svc.summarize(signals, { referenceDate: '2026-06-30' });
      expect(result.movingAverage[SIGNAL_TYPES.SLEEP]).toHaveProperty('last7');
      expect(result.movingAverage[SIGNAL_TYPES.SLEEP]).toHaveProperty('last30');
    });

    it('window uses the specified windowDays option', () => {
      const result = svc.summarize([], { windowDays: 7, referenceDate: '2026-06-30' });
      expect(result.window.days).toBe(7);
    });
  });

  describe('summarize() — non-array input', () => {
    it('handles null signals gracefully', () => {
      expect(() => svc.summarize(null, { referenceDate: '2026-06-30' })).not.toThrow();
    });
  });
});
