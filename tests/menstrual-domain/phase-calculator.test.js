// tests/menstrual-domain/phase-calculator.test.js
// PhaseCalculator — Wave1 fixed-logic, PR-039
import { describe, it, expect, beforeEach } from 'vitest';
import { PhaseCalculator } from '../../src/domains/menstrual/phase-calculator.js';
import { MENSTRUAL_PHASES } from '../../src/domains/menstrual/menstrual-types.js';

let calc;
beforeEach(() => { calc = new PhaseCalculator(); });

describe('PhaseCalculator.calculatePhase()', () => {
  it('returns MENSTRUAL for days 1-5', () => {
    for (let d = 1; d <= 5; d++)
      expect(calc.calculatePhase(d)).toBe('MENSTRUAL');
  });
  it('returns FOLLICULAR for days 6-12', () => {
    for (let d = 6; d <= 12; d++)
      expect(calc.calculatePhase(d)).toBe('FOLLICULAR');
  });
  it('returns OVULATION for days 13-16', () => {
    for (let d = 13; d <= 16; d++)
      expect(calc.calculatePhase(d)).toBe('OVULATION');
  });
  it('returns LUTEAL for days 17-28', () => {
    for (let d = 17; d <= 28; d++)
      expect(calc.calculatePhase(d)).toBe('LUTEAL');
  });
  it('throws for day 0', () => {
    expect(() => calc.calculatePhase(0)).toThrow();
  });
  it('throws for negative day', () => {
    expect(() => calc.calculatePhase(-1)).toThrow();
  });
  it('wraps day > cycleLength via modulo', () => {
    // day 29 in 28-day cycle wraps to day 1 = MENSTRUAL
    expect(calc.calculatePhase(29, 28)).toBe('MENSTRUAL');
  });
  it('uses provided cycleLength', () => {
    // day 30 in 35-day cycle = 30 → LUTEAL
    expect(calc.calculatePhase(30, 35)).toBe('LUTEAL');
  });
});

describe('PhaseCalculator.calculateCycleDay()', () => {
  it('returns 1 when cycleStartIso == targetIso (same day)', () => {
    const today = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
    expect(calc.calculateCycleDay(today, today)).toBe(1);
  });
  it('returns 2 for next day', () => {
    const start = '2026-01-01T00:00:00.000Z';
    const target = '2026-01-02T00:00:00.000Z';
    expect(calc.calculateCycleDay(start, target)).toBe(2);
  });
  it('returns 14 for 13 days later', () => {
    const start = '2026-01-01T00:00:00.000Z';
    const target = '2026-01-14T00:00:00.000Z';
    expect(calc.calculateCycleDay(start, target)).toBe(14);
  });
  it('throws for invalid date', () => {
    expect(() => calc.calculateCycleDay('not-a-date')).toThrow();
  });
});

describe('PhaseCalculator.isOvulationWindow()', () => {
  it('returns true for cycleDay 13', () => expect(calc.isOvulationWindow(13)).toBe(true));
  it('returns true for cycleDay 16', () => expect(calc.isOvulationWindow(16)).toBe(true));
  it('returns false for cycleDay 12', () => expect(calc.isOvulationWindow(12)).toBe(false));
  it('returns false for cycleDay 17', () => expect(calc.isOvulationWindow(17)).toBe(false));
});

describe('PhaseCalculator.getCurrentPhase()', () => {
  it('returns a frozen object with phase and cycleDay', () => {
    const start = '2026-01-01T00:00:00.000Z';
    const result = calc.getCurrentPhase(start);
    expect(result).toHaveProperty('phase');
    expect(result).toHaveProperty('cycleDay');
    expect(Object.isFrozen(result)).toBe(true);
  });
  it('phase is a valid MENSTRUAL_PHASES value', () => {
    const start = new Date(Date.now() - 3 * 86400000).toISOString();
    const result = calc.getCurrentPhase(start);
    expect(Object.values(MENSTRUAL_PHASES)).toContain(result.phase);
  });
});
