// tests/record-domain/environmental-signal-collector.test.js — PR-049 tests.
// EnvironmentalSignalCollector — BD-003 / BD-043 / BD-032.
// BD-003: lunarPhase data MUST NOT be displayed in UI.
// BD-043: Environmental Signal is background-only — Wave3+ for UI disclosure.
// BD-032: collect() returns NEW frozen record — no mutation.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EnvironmentalSignalCollector,
  computeLunarAge,
  computeLunarPhase,
  lunarAgeToPhase,
} from '../../src/domains/record/environmental-signal-collector.js';
import {
  LUNAR_PHASES,
  LUNAR_CYCLE_DAYS,
  LUNAR_EPOCH_MS,
} from '../../src/domains/record/environmental-signal-types.js';
import { DOMAIN_EVENT_TYPES } from '../../src/domains/events/domain-event-types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRecord(overrides = {}) {
  return {
    id:        overrides.id        ?? 'rec_001',
    userId:    overrides.userId    ?? 'user_001',
    date:      overrides.date      ?? new Date().toISOString(),
    symptoms:  overrides.symptoms  ?? [],
    painLevel: overrides.painLevel ?? 3,
    ...overrides,
  };
}

function makeMockPublisher() {
  const events = [];
  return {
    publish: vi.fn((event) => events.push(event)),
    events,
  };
}

// ── computeLunarAge ────────────────────────────────────────────────────────────

describe('computeLunarAge', () => {
  it('returns 0 at the epoch (known new moon)', () => {
    const age = computeLunarAge(new Date(LUNAR_EPOCH_MS));
    expect(age).toBeCloseTo(0, 5);
  });

  it('returns half-cycle at 14.77 days after epoch', () => {
    const halfCycleMs = 14.77 * 86_400_000;
    const age = computeLunarAge(new Date(LUNAR_EPOCH_MS + halfCycleMs));
    expect(age).toBeCloseTo(14.77, 2);
  });

  it('wraps correctly at exactly one cycle after epoch (same lunar phase as epoch)', () => {
    const oneCycleMs = LUNAR_CYCLE_DAYS * 86_400_000;
    const age = computeLunarAge(new Date(LUNAR_EPOCH_MS + oneCycleMs));
    // Due to float64 precision, age may be near 0 OR near LUNAR_CYCLE_DAYS —
    // both represent the same lunar position (new moon).
    const normalized = Math.min(age, LUNAR_CYCLE_DAYS - age);
    expect(normalized).toBeCloseTo(0, 0);
  });

  it('handles dates before epoch (positive modulo)', () => {
    const age = computeLunarAge(new Date(LUNAR_EPOCH_MS - 86_400_000));
    expect(age).toBeGreaterThanOrEqual(0);
    expect(age).toBeLessThan(LUNAR_CYCLE_DAYS);
  });

  it('accepts ISO string input', () => {
    const age = computeLunarAge('2000-01-06T18:14:00.000Z');
    expect(age).toBeCloseTo(0, 5);
  });
});

// ── lunarAgeToPhase ───────────────────────────────────────────────────────────

describe('lunarAgeToPhase', () => {
  it('returns NEW_MOON for age 0', () => {
    expect(lunarAgeToPhase(0)).toBe(LUNAR_PHASES.NEW_MOON);
  });

  it('returns NEW_MOON for age 1', () => {
    expect(lunarAgeToPhase(1)).toBe(LUNAR_PHASES.NEW_MOON);
  });

  it('returns WAXING_CRESCENT for age 3', () => {
    expect(lunarAgeToPhase(3)).toBe(LUNAR_PHASES.WAXING_CRESCENT);
  });

  it('returns FIRST_QUARTER for age 9', () => {
    expect(lunarAgeToPhase(9)).toBe(LUNAR_PHASES.FIRST_QUARTER);
  });

  it('returns WAXING_GIBBOUS for age 12', () => {
    expect(lunarAgeToPhase(12)).toBe(LUNAR_PHASES.WAXING_GIBBOUS);
  });

  it('returns FULL_MOON for age 15', () => {
    expect(lunarAgeToPhase(15)).toBe(LUNAR_PHASES.FULL_MOON);
  });

  it('returns WANING_GIBBOUS for age 18', () => {
    expect(lunarAgeToPhase(18)).toBe(LUNAR_PHASES.WANING_GIBBOUS);
  });

  it('returns LAST_QUARTER for age 23', () => {
    expect(lunarAgeToPhase(23)).toBe(LUNAR_PHASES.LAST_QUARTER);
  });

  it('returns WANING_CRESCENT for age 27', () => {
    expect(lunarAgeToPhase(27)).toBe(LUNAR_PHASES.WANING_CRESCENT);
  });

  it('returns UNKNOWN for NaN', () => {
    expect(lunarAgeToPhase(NaN)).toBe(LUNAR_PHASES.UNKNOWN);
  });
});

// ── computeLunarPhase ─────────────────────────────────────────────────────────

describe('computeLunarPhase', () => {
  it('returns a valid LUNAR_PHASES value for any ISO date', () => {
    const phase = computeLunarPhase('2024-06-15T00:00:00.000Z');
    expect(Object.values(LUNAR_PHASES)).toContain(phase);
  });

  it('returns UNKNOWN for invalid input', () => {
    expect(computeLunarPhase('not-a-date')).toBe(LUNAR_PHASES.UNKNOWN);
  });

  it('returns deterministic result for same date', () => {
    const date = '2025-03-14T12:00:00.000Z';
    expect(computeLunarPhase(date)).toBe(computeLunarPhase(date));
  });
});

// ── EnvironmentalSignalCollector ──────────────────────────────────────────────

describe('EnvironmentalSignalCollector', () => {
  let collector;
  let publisher;

  beforeEach(() => {
    publisher = makeMockPublisher();
    collector = new EnvironmentalSignalCollector({ eventPublisher: publisher });
  });

  it('constructs without eventPublisher (optional)', () => {
    expect(() => new EnvironmentalSignalCollector()).not.toThrow();
  });

  // ── collect() ──────────────────────────────────────────────────────────────

  describe('collect()', () => {
    it('returns a new frozen object (BD-032: no mutation)', () => {
      const record   = makeRecord();
      const enriched = collector.collect(record);
      expect(Object.isFrozen(enriched)).toBe(true);
      expect(enriched).not.toBe(record);
    });

    it('attaches environmentalSignals.lunarPhase', () => {
      const record   = makeRecord({ date: '2024-01-06T18:14:00.000Z' });
      const enriched = collector.collect(record);
      expect(enriched.environmentalSignals).toBeDefined();
      expect(typeof enriched.environmentalSignals.lunarPhase).toBe('string');
      expect(Object.values(LUNAR_PHASES)).toContain(enriched.environmentalSignals.lunarPhase);
    });

    it('attaches environmentalSignals.collectedAt (ISO timestamp)', () => {
      const enriched = collector.collect(makeRecord());
      expect(typeof enriched.environmentalSignals.collectedAt).toBe('string');
      expect(() => new Date(enriched.environmentalSignals.collectedAt)).not.toThrow();
    });

    it('attaches environmentalSignals.collectId', () => {
      const enriched = collector.collect(makeRecord());
      expect(typeof enriched.environmentalSignals.collectId).toBe('string');
      expect(enriched.environmentalSignals.collectId).toMatch(/^env_/);
    });

    it('preserves all original record fields', () => {
      const record   = makeRecord({ symptoms: ['cramp'], painLevel: 7 });
      const enriched = collector.collect(record);
      expect(enriched.id).toBe(record.id);
      expect(enriched.userId).toBe(record.userId);
      expect(enriched.symptoms).toEqual(record.symptoms);
      expect(enriched.painLevel).toBe(record.painLevel);
    });

    it('uses record.date for lunar calculation', () => {
      // Known new-moon epoch → should be NEW_MOON
      const record   = makeRecord({ date: '2000-01-06T18:14:00.000Z' });
      const enriched = collector.collect(record);
      expect(enriched.environmentalSignals.lunarPhase).toBe(LUNAR_PHASES.NEW_MOON);
    });

    it('falls back to record.timestamp when date is absent', () => {
      const { date: _d, ...base } = makeRecord();
      const record   = { ...base, timestamp: '2000-01-06T18:14:00.000Z' };
      const enriched = collector.collect(record);
      expect(enriched.environmentalSignals.lunarPhase).toBe(LUNAR_PHASES.NEW_MOON);
    });

    it('throws TypeError when record is missing', () => {
      expect(() => collector.collect(null)).toThrow(TypeError);
      expect(() => collector.collect(undefined)).toThrow(TypeError);
    });

    it('generates unique collectIds across calls', () => {
      const e1 = collector.collect(makeRecord({ id: 'r1' }));
      const e2 = collector.collect(makeRecord({ id: 'r2' }));
      expect(e1.environmentalSignals.collectId).not.toBe(e2.environmentalSignals.collectId);
    });

    it('merges with existing environmentalSignals if present', () => {
      const record = makeRecord({ environmentalSignals: { foo: 'bar' } });
      const enriched = collector.collect(record);
      expect(enriched.environmentalSignals.foo).toBe('bar');
      expect(enriched.environmentalSignals.lunarPhase).toBeDefined();
    });
  });

  // ── DomainEvent publishing ─────────────────────────────────────────────────

  describe('DomainEvent publishing', () => {
    it('publishes ENVIRONMENTAL_SIGNAL_RECORDED on collect()', () => {
      collector.collect(makeRecord());
      expect(publisher.publish).toHaveBeenCalledTimes(1);
      const event = publisher.events[0];
      expect(event.eventType).toBe(DOMAIN_EVENT_TYPES.ENVIRONMENTAL_SIGNAL_RECORDED);
    });

    it('event payload includes recordId and lunarPhase', () => {
      const record = makeRecord({ id: 'rec_xyz' });
      collector.collect(record);
      const { payload } = publisher.events[0];
      expect(payload.recordId).toBe('rec_xyz');
      expect(typeof payload.lunarPhase).toBe('string');
    });

    it('does not throw when eventPublisher is absent', () => {
      const c = new EnvironmentalSignalCollector();
      expect(() => c.collect(makeRecord())).not.toThrow();
    });
  });

  // ── collectAll() ───────────────────────────────────────────────────────────

  describe('collectAll()', () => {
    it('returns enriched array of same length', () => {
      const records  = [makeRecord({ id: 'r1' }), makeRecord({ id: 'r2' }), makeRecord({ id: 'r3' })];
      const enriched = collector.collectAll(records);
      expect(enriched).toHaveLength(3);
      enriched.forEach(e => expect(e.environmentalSignals?.lunarPhase).toBeDefined());
    });

    it('returns empty array for empty input', () => {
      expect(collector.collectAll([])).toEqual([]);
    });

    it('publishes one event per record', () => {
      collector.collectAll([makeRecord({ id: 'r1' }), makeRecord({ id: 'r2' })]);
      expect(publisher.publish).toHaveBeenCalledTimes(2);
    });
  });

  // ── BD-003 / BD-043 UI prohibition test ───────────────────────────────────

  describe('BD-003 / BD-043: UI display prohibition', () => {
    it('environmentalSignals is NOT part of the public record shape exported to UI layers', () => {
      // The enriched record has environmentalSignals, but this test documents
      // that UI code (screens/, features/) must NOT read this field.
      // The ArchitectureGuard enforces the import prohibition.
      // Here we confirm the field name is 'environmentalSignals' (not a UI display field).
      const enriched = collector.collect(makeRecord());
      // The data is present internally but MUST NOT be surface-rendered.
      // This test verifies the field name contract — guard enforcement is in architecture-guard.js.
      expect(enriched.environmentalSignals).toBeDefined();
      expect(enriched.environmentalSignals.lunarPhase).not.toBeUndefined();
      // No 'lunarCalendar' or 'moonDisplay' — those UI keys are prohibited (BD-003).
      expect(enriched.lunarCalendar).toBeUndefined();
      expect(enriched.moonDisplay).toBeUndefined();
    });
  });
});
