// menstrual-phase-auto-resolution.test.js — PR-044 integration tests.
// Verifies: MENSTRUAL signals receive resolved phase at record save time.
// BD-014: MenstrualPhase auto-resolution from Record.
// BD-015: 100% deterministic reconstruction.
// BD-031/BD-038: No AI/LLM — pure rule engine only.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MenstrualPhaseResolverService } from '../../src/domains/menstrual/menstrual-phase-resolver.js';
import { MENSTRUAL_PHASES } from '../../src/domains/menstrual/menstrual-types.js';
import { DOMAIN_EVENT_TYPES } from '../../src/domains/events/domain-event-types.js';

// ── Unit: resolver wired into signal generation ───────────────────────────

describe('PR-044: MenstrualPhase auto-resolution at record save', () => {
  let resolver;

  beforeEach(() => {
    resolver = new MenstrualPhaseResolverService();
  });

  it('resolves phase for record with menstrualFlow + cycleDay (end-to-end shape)', () => {
    const record = {
      id:            'rec-001',
      date:          '2026-06-01',
      menstrualFlow: 2,
      cycleDay:      3,
    };
    const phase = resolver.resolveFromRecord(record);
    expect(phase).toBe(MENSTRUAL_PHASES.MENSTRUAL);
    // Phase must NOT be UNKNOWN for a record with valid cycleDay
    expect(phase).not.toBe(MENSTRUAL_PHASES.UNKNOWN);
  });

  it('returns UNKNOWN for record without cycleDay (no menstrual data)', () => {
    const record = { id: 'rec-002', date: '2026-06-01', painLevel: 3 };
    expect(resolver.resolveFromRecord(record)).toBe(MENSTRUAL_PHASES.UNKNOWN);
  });

  it('phase-by-phase coverage — all four core phases can be resolved', () => {
    const cases = [
      { cycleDay: 1,  expected: MENSTRUAL_PHASES.MENSTRUAL  },
      { cycleDay: 7,  expected: MENSTRUAL_PHASES.FOLLICULAR },
      { cycleDay: 14, expected: MENSTRUAL_PHASES.OVULATION  },
      { cycleDay: 21, expected: MENSTRUAL_PHASES.LUTEAL     },
    ];
    for (const { cycleDay, expected } of cases) {
      const record = { id: `rec-${cycleDay}`, menstrualFlow: 1, cycleDay };
      expect(resolver.resolveFromRecord(record)).toBe(expected);
    }
  });
});

// ── Domain Event type registered ──────────────────────────────────────────

describe('PR-044: MENSTRUAL_PHASE_RESOLVED domain event type', () => {
  it('is registered in DOMAIN_EVENT_TYPES', () => {
    expect(DOMAIN_EVENT_TYPES.MENSTRUAL_PHASE_RESOLVED).toBe('MENSTRUAL_PHASE_RESOLVED');
  });

  it('DOMAIN_EVENT_TYPES is frozen (Append-Only registry)', () => {
    expect(Object.isFrozen(DOMAIN_EVENT_TYPES)).toBe(true);
  });
});

// ── Phase-based signal aggregation ───────────────────────────────────────

describe('PR-044: Phase-based signal aggregation support', () => {
  it('resolver returns consistent phases enabling group-by-phase aggregation', () => {
    const resolver = new MenstrualPhaseResolverService();
    const records = [
      { cycleDay: 2,  menstrualFlow: 3 },
      { cycleDay: 8,  menstrualFlow: 1 },
      { cycleDay: 15, menstrualFlow: 0 },
      { cycleDay: 22, menstrualFlow: 0 },
      { cycleDay: 4,  menstrualFlow: 2 },
    ];

    const byPhase = {};
    for (const r of records) {
      const phase = resolver.resolveFromRecord(r);
      byPhase[phase] = (byPhase[phase] ?? 0) + 1;
    }

    expect(byPhase[MENSTRUAL_PHASES.MENSTRUAL]).toBe(2);
    expect(byPhase[MENSTRUAL_PHASES.FOLLICULAR]).toBe(1);
    expect(byPhase[MENSTRUAL_PHASES.OVULATION]).toBe(1);
    expect(byPhase[MENSTRUAL_PHASES.LUTEAL]).toBe(1);
    expect(byPhase[MENSTRUAL_PHASES.UNKNOWN]).toBeUndefined();
  });
});
