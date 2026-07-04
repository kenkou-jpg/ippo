// menstrual-phase-resolver.test.js — PR-044: MenstrualPhase Auto-Resolution tests.
// Verifies: deterministic resolution, UNKNOWN fallback, extensible design.

import { describe, it, expect, beforeEach } from 'vitest';
import { MenstrualPhaseResolverService } from '../../src/domains/menstrual/menstrual-phase-resolver.js';
import { MENSTRUAL_PHASES } from '../../src/domains/menstrual/menstrual-types.js';

describe('MenstrualPhaseResolverService', () => {
  let resolver;

  beforeEach(() => {
    resolver = new MenstrualPhaseResolverService();
  });

  // ── resolve({ cycleDay }) ──────────────────────────────────────────────────

  describe('resolve() — cycleDay → phase', () => {
    it('cycleDay 1-5 → MENSTRUATION', () => {
      for (const day of [1, 2, 3, 4, 5]) {
        expect(resolver.resolve({ cycleDay: day })).toBe(MENSTRUAL_PHASES.MENSTRUAL);
      }
    });

    it('cycleDay 6-12 → FOLLICULAR', () => {
      for (const day of [6, 7, 10, 12]) {
        expect(resolver.resolve({ cycleDay: day })).toBe(MENSTRUAL_PHASES.FOLLICULAR);
      }
    });

    it('cycleDay 13-16 → OVULATION', () => {
      for (const day of [13, 14, 15, 16]) {
        expect(resolver.resolve({ cycleDay: day })).toBe(MENSTRUAL_PHASES.OVULATION);
      }
    });

    it('cycleDay 17-28 → LUTEAL', () => {
      for (const day of [17, 20, 25, 28]) {
        expect(resolver.resolve({ cycleDay: day })).toBe(MENSTRUAL_PHASES.LUTEAL);
      }
    });

    it('cycleDay 0 → UNKNOWN (invalid)', () => {
      expect(resolver.resolve({ cycleDay: 0 })).toBe(MENSTRUAL_PHASES.UNKNOWN);
    });

    it('cycleDay null → UNKNOWN', () => {
      expect(resolver.resolve({ cycleDay: null })).toBe(MENSTRUAL_PHASES.UNKNOWN);
    });

    it('cycleDay undefined → UNKNOWN', () => {
      expect(resolver.resolve({})).toBe(MENSTRUAL_PHASES.UNKNOWN);
    });

    it('no args → UNKNOWN', () => {
      expect(resolver.resolve()).toBe(MENSTRUAL_PHASES.UNKNOWN);
    });

    it('cycleDay negative → UNKNOWN', () => {
      expect(resolver.resolve({ cycleDay: -1 })).toBe(MENSTRUAL_PHASES.UNKNOWN);
    });

    it('cycleDay non-integer → UNKNOWN', () => {
      expect(resolver.resolve({ cycleDay: 3.5 })).toBe(MENSTRUAL_PHASES.UNKNOWN);
    });

    it('wraps cycleDay beyond cycleLength (day 29 in 28-day cycle → day 1 → MENSTRUATION)', () => {
      expect(resolver.resolve({ cycleDay: 29, cycleLength: 28 })).toBe(MENSTRUAL_PHASES.MENSTRUAL);
    });

    it('custom cycleLength 35: day 30 → LUTEAL', () => {
      expect(resolver.resolve({ cycleDay: 30, cycleLength: 35 })).toBe(MENSTRUAL_PHASES.LUTEAL);
    });
  });

  // ── resolveFromRecord() ───────────────────────────────────────────────────

  describe('resolveFromRecord()', () => {
    it('resolves phase from record with cycleDay', () => {
      const record = { id: 'r1', cycleDay: 3, menstrualFlow: 2 };
      expect(resolver.resolveFromRecord(record)).toBe(MENSTRUAL_PHASES.MENSTRUAL);
    });

    it('resolves FOLLICULAR from cycleDay 8', () => {
      expect(resolver.resolveFromRecord({ cycleDay: 8 })).toBe(MENSTRUAL_PHASES.FOLLICULAR);
    });

    it('resolves OVULATION from cycleDay 14', () => {
      expect(resolver.resolveFromRecord({ cycleDay: 14 })).toBe(MENSTRUAL_PHASES.OVULATION);
    });

    it('resolves LUTEAL from cycleDay 20', () => {
      expect(resolver.resolveFromRecord({ cycleDay: 20 })).toBe(MENSTRUAL_PHASES.LUTEAL);
    });

    it('returns UNKNOWN when record has no cycleDay', () => {
      const record = { id: 'r1', menstrualFlow: 1 };
      expect(resolver.resolveFromRecord(record)).toBe(MENSTRUAL_PHASES.UNKNOWN);
    });

    it('returns UNKNOWN for null record', () => {
      expect(resolver.resolveFromRecord(null)).toBe(MENSTRUAL_PHASES.UNKNOWN);
    });

    it('returns UNKNOWN for non-object record', () => {
      expect(resolver.resolveFromRecord('invalid')).toBe(MENSTRUAL_PHASES.UNKNOWN);
    });

    it('uses cycleLength from record when present', () => {
      // day 30 in 35-day cycle → LUTEAL
      const record = { cycleDay: 30, cycleLength: 35 };
      expect(resolver.resolveFromRecord(record)).toBe(MENSTRUAL_PHASES.LUTEAL);
    });
  });

  // ── Determinism guarantee ─────────────────────────────────────────────────

  describe('determinism', () => {
    it('same cycleDay always returns same phase (idempotent)', () => {
      for (let day = 1; day <= 28; day++) {
        const a = resolver.resolve({ cycleDay: day });
        const b = resolver.resolve({ cycleDay: day });
        expect(a).toBe(b);
      }
    });

    it('all resolved phases are valid MENSTRUAL_PHASES values', () => {
      const validPhases = new Set(Object.values(MENSTRUAL_PHASES));
      for (let day = 1; day <= 28; day++) {
        expect(validPhases.has(resolver.resolve({ cycleDay: day }))).toBe(true);
      }
    });
  });
});
