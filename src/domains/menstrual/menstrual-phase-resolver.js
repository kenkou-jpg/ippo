// menstrual-phase-resolver.js — PR-044: MenstrualPhase Auto-Resolution (BD-014).
// Pure deterministic resolver: cycleDay → MenstrualPhase, no AI/LLM/randomness.
// BD-015: 100% deterministic reconstruction from Record Layer.
// BD-031: No diagnosis, no treatment suggestion.
// BD-038: Rule-based only.
// Append-Only: resolves phase at write time; no retroactive mutation.

import { MENSTRUAL_PHASES, CYCLE_LENGTH_TYPICAL } from './menstrual-types.js';
import { PhaseCalculator } from './phase-calculator.js';

export class MenstrualPhaseResolverService {
  #phaseCalculator;

  constructor() {
    this.#phaseCalculator = new PhaseCalculator();
  }

  /**
   * Resolve menstrual phase from a cycle day.
   * Returns UNKNOWN if cycleDay is absent or invalid.
   *
   * @param {{ cycleDay?: number|null, cycleLength?: number }} params
   * @returns {string} MENSTRUAL_PHASES value
   */
  resolve({ cycleDay = null, cycleLength = CYCLE_LENGTH_TYPICAL } = {}) {
    if (cycleDay == null || !Number.isInteger(cycleDay) || cycleDay < 1) {
      return MENSTRUAL_PHASES.UNKNOWN;
    }
    try {
      return this.#phaseCalculator.calculatePhase(cycleDay, cycleLength);
    } catch {
      return MENSTRUAL_PHASES.UNKNOWN;
    }
  }

  /**
   * Resolve menstrual phase from a Record object.
   * Extracts cycleDay from record.cycleDay; falls back to UNKNOWN if absent.
   *
   * @param {object} record
   * @returns {string} MENSTRUAL_PHASES value
   */
  resolveFromRecord(record) {
    if (!record || typeof record !== 'object') return MENSTRUAL_PHASES.UNKNOWN;
    return this.resolve({
      cycleDay:    record.cycleDay ?? null,
      cycleLength: record.cycleLength ?? CYCLE_LENGTH_TYPICAL,
    });
  }
}
