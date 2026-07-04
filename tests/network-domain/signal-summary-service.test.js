// tests/network-domain/signal-summary-service.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { SignalSummaryService } from '../../src/domains/network/signal-summary-service.js';
import { SIGNAL_TYPES } from '../../src/domains/network/network-signal-types.js';

let _id = 0;
function makeSignal(signalType, normalizedValue = 0.5, overrides = {}) {
  _id++;
  return {
    id:              overrides.id ?? `ns_${_id}`,
    signalType,
    normalizedValue,
    rawValue:        normalizedValue * 10,
    unit:            '/10',
    metadata:        {},
    recordId:        overrides.recordId ?? 'rec_001',
    timestamp:       overrides.timestamp ?? `2026-06-0${_id % 9 + 1}T10:00:00.000Z`,
    vectorVersion:   '1',
    menstrualPhase:  'UNKNOWN',
    createdAt:       new Date().toISOString(),
  };
}

describe('SignalSummaryService', () => {
  let svc;
  beforeEach(() => { svc = new SignalSummaryService(); _id = 0; });

  describe('summarize() — empty input', () => {
    it('returns zero-values for empty array', () => {
      const summary = svc.summarize([]);
      expect(summary.symptomCount).toBe(0);
      expect(summary.painAverage).toBe(0);
      expect(summary.sleepAverage).toBe(0);
      expect(summary.exposureCount).toBe(0);
      expect(summary.menstrualRecords).toBe(0);
      expect(summary.emotionCount).toBe(0);
      expect(summary.totalSignals).toBe(0);
    });

    it('returns zero-values for non-array', () => {
      const summary = svc.summarize(null);
      expect(summary.totalSignals).toBe(0);
    });

    it('includes generatedAt ISO string', () => {
      const summary = svc.summarize([]);
      expect(summary.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('summarize() — field correctness', () => {
    it('counts symptom signals', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.SYMPTOM),
        makeSignal(SIGNAL_TYPES.SYMPTOM),
        makeSignal(SIGNAL_TYPES.PAIN),
      ];
      const summary = svc.summarize(signals);
      expect(summary.symptomCount).toBe(2);
    });

    it('averages pain normalizedValue', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.4),
        makeSignal(SIGNAL_TYPES.PAIN, 0.6),
      ];
      const summary = svc.summarize(signals);
      expect(summary.painAverage).toBeCloseTo(0.5);
    });

    it('averages sleep normalizedValue', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.SLEEP, 0.75),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.875),
      ];
      const summary = svc.summarize(signals);
      expect(summary.sleepAverage).toBeCloseTo(0.8125);
    });

    it('counts exposure signals', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.EXPOSURE),
        makeSignal(SIGNAL_TYPES.EXPOSURE),
        makeSignal(SIGNAL_TYPES.EXPOSURE),
      ];
      const summary = svc.summarize(signals);
      expect(summary.exposureCount).toBe(3);
    });

    it('counts menstrual records', () => {
      const signals = [makeSignal(SIGNAL_TYPES.MENSTRUAL)];
      const summary = svc.summarize(signals);
      expect(summary.menstrualRecords).toBe(1);
    });

    it('counts emotion signals', () => {
      const signals = [makeSignal(SIGNAL_TYPES.EMOTION)];
      const summary = svc.summarize(signals);
      expect(summary.emotionCount).toBe(1);
    });

    it('totalSignals is the full count', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN),
        makeSignal(SIGNAL_TYPES.SLEEP),
        makeSignal(SIGNAL_TYPES.SYMPTOM),
      ];
      const summary = svc.summarize(signals);
      expect(summary.totalSignals).toBe(3);
    });
  });

  describe('summarize() — latestSignals', () => {
    it('latestSignals contains all 6 SIGNAL_TYPES keys', () => {
      const summary = svc.summarize([]);
      expect(Object.keys(summary.latestSignals)).toEqual(
        expect.arrayContaining(Object.values(SIGNAL_TYPES))
      );
    });

    it('latestSignals entries are null when no signals of that type', () => {
      const summary = svc.summarize([makeSignal(SIGNAL_TYPES.PAIN)]);
      expect(summary.latestSignals[SIGNAL_TYPES.SLEEP]).toBeNull();
    });

    it('latestSignals returns the most recent signal per type', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.3, { timestamp: '2026-06-01T00:00:00.000Z', id: 'old_pain' }),
        makeSignal(SIGNAL_TYPES.PAIN, 0.7, { timestamp: '2026-06-10T00:00:00.000Z', id: 'new_pain' }),
      ];
      const summary = svc.summarize(signals);
      expect(summary.latestSignals[SIGNAL_TYPES.PAIN].id).toBe('new_pain');
    });
  });

  describe('summarizeByRecord()', () => {
    it('filters to the given recordId', () => {
      const signals = [
        makeSignal(SIGNAL_TYPES.PAIN, 0.5, { recordId: 'rec_A' }),
        makeSignal(SIGNAL_TYPES.PAIN, 0.5, { recordId: 'rec_B' }),
        makeSignal(SIGNAL_TYPES.SLEEP, 0.8, { recordId: 'rec_A' }),
      ];
      const summary = svc.summarizeByRecord(signals, 'rec_A');
      expect(summary.totalSignals).toBe(2);
    });

    it('returns zero-values for non-matching recordId', () => {
      const signals = [makeSignal(SIGNAL_TYPES.PAIN, 0.5, { recordId: 'rec_A' })];
      const summary = svc.summarizeByRecord(signals, 'rec_Z');
      expect(summary.totalSignals).toBe(0);
    });
  });
});
