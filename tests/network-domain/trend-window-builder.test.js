// tests/network-domain/trend-window-builder.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { TrendWindowBuilder, WINDOW_SIZES } from '../../src/domains/network/trend-window-builder.js';
import { SIGNAL_TYPES } from '../../src/domains/network/network-signal-types.js';

function makeSignal(timestamp, signalType = SIGNAL_TYPES.PAIN, id = null) {
  return {
    id:              id ?? `ns_${timestamp}`,
    signalType,
    normalizedValue: 0.5,
    rawValue:        5,
    unit:            '/10',
    metadata:        {},
    recordId:        'rec_001',
    timestamp,
    vectorVersion:   '1',
    menstrualPhase:  'UNKNOWN',
    createdAt:       new Date().toISOString(),
  };
}

describe('TrendWindowBuilder', () => {
  let builder;

  beforeEach(() => { builder = new TrendWindowBuilder(); });

  describe('WINDOW_SIZES constants', () => {
    it('LAST7 is 7', () => expect(WINDOW_SIZES.LAST7).toBe(7));
    it('LAST30 is 30', () => expect(WINDOW_SIZES.LAST30).toBe(30));
    it('is frozen', () => expect(Object.isFrozen(WINDOW_SIZES)).toBe(true));
  });

  describe('build() — result shape', () => {
    it('returns windowDays, from, to, signals, dayCount, signalCount', () => {
      const result = builder.build([], 7, '2026-06-30');
      expect(result).toHaveProperty('windowDays', 7);
      expect(result).toHaveProperty('from', '2026-06-24');
      expect(result).toHaveProperty('to', '2026-06-30');
      expect(result).toHaveProperty('signals');
      expect(result).toHaveProperty('dayCount', 0);
      expect(result).toHaveProperty('signalCount', 0);
    });

    it('result is frozen', () => {
      const result = builder.build([], 7, '2026-06-30');
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('build() — window boundaries', () => {
    it('Last7: from = referenceDate - 6 days', () => {
      const result = builder.build([], 7, '2026-06-30');
      expect(result.from).toBe('2026-06-24');
      expect(result.to).toBe('2026-06-30');
    });

    it('Last30: from = referenceDate - 29 days', () => {
      const result = builder.build([], 30, '2026-06-30');
      expect(result.from).toBe('2026-06-01');
      expect(result.to).toBe('2026-06-30');
    });

    it('includes signals on the boundary dates (inclusive)', () => {
      const signals = [
        makeSignal('2026-06-24T00:00:00.000Z'), // from boundary
        makeSignal('2026-06-30T23:59:59.000Z'), // to boundary
      ];
      const result = builder.build(signals, 7, '2026-06-30');
      expect(result.signalCount).toBe(2);
    });

    it('excludes signals outside the window', () => {
      const signals = [
        makeSignal('2026-06-23T23:59:59.000Z'), // 1 day before window
        makeSignal('2026-06-25T00:00:00.000Z'), // inside window
      ];
      const result = builder.build(signals, 7, '2026-06-30');
      expect(result.signalCount).toBe(1);
    });
  });

  describe('build() — dayCount', () => {
    it('counts distinct calendar days', () => {
      const signals = [
        makeSignal('2026-06-28T09:00:00.000Z', SIGNAL_TYPES.PAIN, 'a'),
        makeSignal('2026-06-28T20:00:00.000Z', SIGNAL_TYPES.SLEEP, 'b'),
        makeSignal('2026-06-29T10:00:00.000Z', SIGNAL_TYPES.PAIN, 'c'),
      ];
      const result = builder.build(signals, 7, '2026-06-30');
      expect(result.dayCount).toBe(2);
      expect(result.signalCount).toBe(3);
    });
  });

  describe('build() — empty and sparse input', () => {
    it('returns empty window for empty signals', () => {
      const result = builder.build([], 30, '2026-06-30');
      expect(result.signalCount).toBe(0);
      expect(result.dayCount).toBe(0);
    });

    it('returns empty window for non-array', () => {
      const result = builder.build(null, 7, '2026-06-30');
      expect(result.signalCount).toBe(0);
    });

    it('tolerates sparse data (missing days in window)', () => {
      const signals = [makeSignal('2026-06-30T00:00:00.000Z')];
      const result = builder.build(signals, 30, '2026-06-30');
      expect(result.signalCount).toBe(1);
      expect(result.dayCount).toBe(1); // only 1 day present out of 30
    });
  });

  describe('build() — errors', () => {
    it('throws RangeError for days < 1', () => {
      expect(() => builder.build([], 0, '2026-06-30')).toThrow(RangeError);
    });

    it('throws RangeError for non-number days', () => {
      expect(() => builder.build([], 'seven', '2026-06-30')).toThrow(RangeError);
    });
  });

  describe('buildLast7()', () => {
    it('uses 7-day window', () => {
      const result = builder.buildLast7([], '2026-06-30');
      expect(result.windowDays).toBe(7);
      expect(result.from).toBe('2026-06-24');
    });
  });

  describe('buildLast30()', () => {
    it('uses 30-day window', () => {
      const result = builder.buildLast30([], '2026-06-30');
      expect(result.windowDays).toBe(30);
      expect(result.from).toBe('2026-06-01');
    });

    it('filters signals to Last30', () => {
      const signals = [
        makeSignal('2026-05-31T00:00:00.000Z', SIGNAL_TYPES.PAIN, 'out'),
        makeSignal('2026-06-01T00:00:00.000Z', SIGNAL_TYPES.PAIN, 'in'),
        makeSignal('2026-06-30T00:00:00.000Z', SIGNAL_TYPES.PAIN, 'in2'),
      ];
      const result = builder.buildLast30(signals, '2026-06-30');
      expect(result.signalCount).toBe(2);
    });
  });
});
