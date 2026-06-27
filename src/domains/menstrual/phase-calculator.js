// phase-calculator.js — Wave1 fixed-logic phase / cycleDay calculator.
// Wave2: Signal-corrected phase estimation (planned).
// BD-022: Wave1 in-memory only — no Supabase.
// PR-039: Menstrual Intelligence Foundation

import { MENSTRUAL_PHASES, CYCLE_LENGTH_TYPICAL, PERIOD_LENGTH_TYPICAL } from './menstrual-types.js';

// Wave1 fixed phase boundaries (day ranges inclusive)
const PHASE_RANGES = Object.freeze([
  { phase: MENSTRUAL_PHASES.MENSTRUAL,  start: 1,  end: 5  },
  { phase: MENSTRUAL_PHASES.FOLLICULAR, start: 6,  end: 12 },
  { phase: MENSTRUAL_PHASES.OVULATION,  start: 13, end: 16 },
  { phase: MENSTRUAL_PHASES.LUTEAL,     start: 17, end: 28 },
]);

export class PhaseCalculator {
  /**
   * Determine the menstrual phase for a given cycle day.
   * @param {number} cycleDay  — 1-based day in the cycle
   * @param {number} [cycleLength=28]
   * @returns {string} MENSTRUAL_PHASES value
   */
  calculatePhase(cycleDay, cycleLength = CYCLE_LENGTH_TYPICAL) {
    if (!Number.isInteger(cycleDay) || cycleDay < 1)
      throw new Error('[PhaseCalculator] cycleDay must be a positive integer');

    // Normalize cycleDay within the cycle
    const day = ((cycleDay - 1) % cycleLength) + 1;

    for (const { phase, start, end } of PHASE_RANGES) {
      if (day >= start && day <= end) return phase;
    }
    // Days beyond LUTEAL end (e.g. long cycles) → LUTEAL
    return MENSTRUAL_PHASES.LUTEAL;
  }

  /**
   * Calculate the cycle day from a start date and a target date.
   * @param {string} cycleStartIso — ISO date of cycle day 1
   * @param {string} [targetIso]   — ISO date to compute day for (default: now)
   * @returns {number} cycle day (1-based, minimum 1)
   */
  calculateCycleDay(cycleStartIso, targetIso = new Date().toISOString()) {
    if (!cycleStartIso) throw new Error('[PhaseCalculator] cycleStartIso is required');
    const start  = new Date(cycleStartIso);
    const target = new Date(targetIso);
    if (isNaN(start.getTime())) throw new Error('[PhaseCalculator] cycleStartIso is not a valid date');
    if (isNaN(target.getTime())) throw new Error('[PhaseCalculator] targetIso is not a valid date');
    const diffMs   = target.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    return Math.max(1, diffDays + 1);
  }

  /**
   * Return true if the given cycle day falls within the ovulation window.
   * @param {number} cycleDay
   * @param {number} [cycleLength=28]
   */
  isOvulationWindow(cycleDay, cycleLength = CYCLE_LENGTH_TYPICAL) {
    const phase = this.calculatePhase(cycleDay, cycleLength);
    return phase === MENSTRUAL_PHASES.OVULATION;
  }

  /**
   * Get the current phase based on an ongoing cycle start date.
   * @param {string} cycleStartIso
   * @param {number} [cycleLength=28]
   * @returns {{ phase: string, cycleDay: number }}
   */
  getCurrentPhase(cycleStartIso, cycleLength = CYCLE_LENGTH_TYPICAL) {
    const cycleDay = this.calculateCycleDay(cycleStartIso);
    const phase    = this.calculatePhase(cycleDay, cycleLength);
    return Object.freeze({ phase, cycleDay });
  }
}
