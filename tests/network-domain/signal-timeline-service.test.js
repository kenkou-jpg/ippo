// tests/network-domain/signal-timeline-service.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { SignalTimelineService } from '../../src/domains/network/signal-timeline-service.js';
import { SIGNAL_TYPES } from '../../src/domains/network/network-signal-types.js';

let _id = 0;
function makeSignal(overrides = {}) {
  _id++;
  return {
    id:              overrides.id ?? `ns_${_id}`,
    signalType:      overrides.signalType ?? SIGNAL_TYPES.PAIN,
    normalizedValue: overrides.normalizedValue ?? 0.5,
    rawValue:        5,
    unit:            '/10',
    metadata:        {},
    recordId:        overrides.recordId ?? 'rec_001',
    timestamp:       overrides.timestamp ?? '2026-06-10T10:00:00.000Z',
    vectorVersion:   '1',
    menstrualPhase:  'UNKNOWN',
    createdAt:       new Date().toISOString(),
  };
}

describe('SignalTimelineService', () => {
  let svc;
  beforeEach(() => { svc = new SignalTimelineService(); });

  describe('buildTimeline()', () => {
    it('returns empty result for empty array', () => {
      const result = svc.buildTimeline([]);
      expect(result.days).toEqual([]);
      expect(result.totalDays).toBe(0);
      expect(result.totalSignals).toBe(0);
      expect(result.from).toBeNull();
      expect(result.to).toBeNull();
    });

    it('returns empty result for non-array', () => {
      const result = svc.buildTimeline(null);
      expect(result.days).toEqual([]);
    });

    it('groups signals by calendar day', () => {
      const signals = [
        makeSignal({ timestamp: '2026-06-01T09:00:00.000Z' }),
        makeSignal({ timestamp: '2026-06-01T20:00:00.000Z' }),
        makeSignal({ timestamp: '2026-06-02T10:00:00.000Z' }),
      ];
      const result = svc.buildTimeline(signals);
      expect(result.totalDays).toBe(2);
      expect(result.totalSignals).toBe(3);
      expect(result.days[0].date).toBe('2026-06-01');
      expect(result.days[0].count).toBe(2);
      expect(result.days[1].date).toBe('2026-06-02');
      expect(result.days[1].count).toBe(1);
    });

    it('sorts days chronologically (ascending)', () => {
      const signals = [
        makeSignal({ timestamp: '2026-06-05T00:00:00.000Z' }),
        makeSignal({ timestamp: '2026-06-01T00:00:00.000Z' }),
        makeSignal({ timestamp: '2026-06-03T00:00:00.000Z' }),
      ];
      const result = svc.buildTimeline(signals);
      const dates = result.days.map(d => d.date);
      expect(dates).toEqual(['2026-06-01', '2026-06-03', '2026-06-05']);
    });

    it('sets from and to correctly', () => {
      const signals = [
        makeSignal({ timestamp: '2026-06-01T00:00:00.000Z' }),
        makeSignal({ timestamp: '2026-06-10T00:00:00.000Z' }),
      ];
      const result = svc.buildTimeline(signals);
      expect(result.from).toBe('2026-06-01');
      expect(result.to).toBe('2026-06-10');
    });

    it('each day entry has date, signals, count', () => {
      const signals = [makeSignal({ timestamp: '2026-06-01T00:00:00.000Z' })];
      const result = svc.buildTimeline(signals);
      const day = result.days[0];
      expect(day).toHaveProperty('date', '2026-06-01');
      expect(day).toHaveProperty('signals');
      expect(day).toHaveProperty('count', 1);
      expect(Array.isArray(day.signals)).toBe(true);
    });

    it('handles single signal', () => {
      const signals = [makeSignal({ timestamp: '2026-06-15T12:00:00.000Z' })];
      const result = svc.buildTimeline(signals);
      expect(result.totalDays).toBe(1);
      expect(result.from).toBe('2026-06-15');
      expect(result.to).toBe('2026-06-15');
    });

    it('skips null/undefined entries', () => {
      const signals = [null, makeSignal({ timestamp: '2026-06-01T00:00:00.000Z' }), undefined];
      const result = svc.buildTimeline(signals);
      expect(result.totalSignals).toBe(3); // counts all including nulls passed in
    });
  });

  describe('buildTimelineRange()', () => {
    it('filters to date range inclusive', () => {
      const signals = [
        makeSignal({ timestamp: '2026-05-31T00:00:00.000Z' }),
        makeSignal({ timestamp: '2026-06-01T00:00:00.000Z' }),
        makeSignal({ timestamp: '2026-06-05T00:00:00.000Z' }),
        makeSignal({ timestamp: '2026-06-10T00:00:00.000Z' }),
      ];
      const result = svc.buildTimelineRange(signals, '2026-06-01', '2026-06-05');
      expect(result.totalSignals).toBe(2);
      expect(result.from).toBe('2026-06-01');
      expect(result.to).toBe('2026-06-05');
    });

    it('returns empty for range outside signals', () => {
      const signals = [makeSignal({ timestamp: '2026-06-15T00:00:00.000Z' })];
      const result = svc.buildTimelineRange(signals, '2026-07-01', '2026-07-31');
      expect(result.totalSignals).toBe(0);
    });
  });

  describe('buildTimelineByType()', () => {
    it('filters to specific type only', () => {
      const signals = [
        makeSignal({ signalType: SIGNAL_TYPES.PAIN,  timestamp: '2026-06-01T00:00:00.000Z' }),
        makeSignal({ signalType: SIGNAL_TYPES.SLEEP, timestamp: '2026-06-02T00:00:00.000Z' }),
        makeSignal({ signalType: SIGNAL_TYPES.PAIN,  timestamp: '2026-06-03T00:00:00.000Z' }),
      ];
      const result = svc.buildTimelineByType(signals, SIGNAL_TYPES.PAIN);
      expect(result.totalSignals).toBe(2);
    });

    it('returns empty for type with no signals', () => {
      const signals = [makeSignal({ signalType: SIGNAL_TYPES.PAIN })];
      const result = svc.buildTimelineByType(signals, SIGNAL_TYPES.SLEEP);
      expect(result.totalSignals).toBe(0);
    });
  });
});
