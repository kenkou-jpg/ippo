// cycle-analysis-service.js — Cycle statistics & estimation (Wave1 fixed logic).
// NAC-04: Longitudinal analysis covers cycle patterns.
// Wave1: estimation only — no AI, no prediction engine.
// BD-018: generatedAt on every output object.
// BD-022: Wave1 in-memory only.
// PR-039: Menstrual Intelligence Foundation

import {
  CYCLE_STATUS, CYCLE_LENGTH_MIN, CYCLE_LENGTH_MAX,
  CYCLE_LENGTH_TYPICAL, PERIOD_LENGTH_TYPICAL,
} from './menstrual-types.js';

export class CycleAnalysisService {
  /**
   * Calculate the average cycle length from an array of MenstrualRecords.
   * Uses cycleDay===1 entries as cycle start points.
   *
   * @param {Readonly<object>[]} records
   * @returns {{ averageCycleLength: number, sampleSize: number, generatedAt: string }}
   */
  calculateAverageCycle(records = []) {
    const starts = records
      .filter(r => r.cycleDay === 1 && r.startedAt)
      .map(r => new Date(r.startedAt).getTime())
      .sort((a, b) => a - b);

    if (starts.length < 2) {
      return Object.freeze({
        averageCycleLength: CYCLE_LENGTH_TYPICAL,
        sampleSize: 0,
        generatedAt: new Date().toISOString(),
      });
    }

    const lengths = [];
    for (let i = 1; i < starts.length; i++) {
      lengths.push(Math.round((starts[i] - starts[i - 1]) / 86_400_000));
    }
    const avg = lengths.reduce((s, v) => s + v, 0) / lengths.length;

    return Object.freeze({
      averageCycleLength: Math.round(avg),
      sampleSize: lengths.length,
      generatedAt: new Date().toISOString(),
    });
  }

  /**
   * Calculate average period (bleeding) length.
   * Uses records where flow !== NONE and cycleDay <= 10.
   *
   * @param {Readonly<object>[]} records
   * @returns {{ averagePeriodLength: number, sampleSize: number, generatedAt: string }}
   */
  calculateAveragePeriod(records = []) {
    const bleeding = records.filter(r => r.flow && r.flow !== 'NONE' && r.cycleDay <= 10);
    if (!bleeding.length) {
      return Object.freeze({
        averagePeriodLength: PERIOD_LENGTH_TYPICAL,
        sampleSize: 0,
        generatedAt: new Date().toISOString(),
      });
    }
    // Group by cycle start (nearest cycleDay===1 entry) — Wave1 simplified: use max cycleDay
    const maxCycleDay = Math.max(...bleeding.map(r => r.cycleDay));
    return Object.freeze({
      averagePeriodLength: maxCycleDay,
      sampleSize: bleeding.length,
      generatedAt: new Date().toISOString(),
    });
  }

  /**
   * Detect whether cycles are regular.
   * Regular = all cycle lengths within [CYCLE_LENGTH_MIN, CYCLE_LENGTH_MAX] and
   * standard deviation <= 3 days.
   *
   * @param {Readonly<object>[]} records
   * @returns {{ status: string, averageCycleLength: number, stdDev: number, generatedAt: string }}
   */
  detectRegularity(records = []) {
    const { averageCycleLength, sampleSize } = this.calculateAverageCycle(records);

    if (sampleSize < 2) {
      return Object.freeze({
        status: CYCLE_STATUS.UNKNOWN,
        averageCycleLength,
        stdDev: 0,
        generatedAt: new Date().toISOString(),
      });
    }

    const starts = records
      .filter(r => r.cycleDay === 1 && r.startedAt)
      .map(r => new Date(r.startedAt).getTime())
      .sort((a, b) => a - b);

    const lengths = [];
    for (let i = 1; i < starts.length; i++) {
      lengths.push(Math.round((starts[i] - starts[i - 1]) / 86_400_000));
    }

    const mean   = lengths.reduce((s, v) => s + v, 0) / lengths.length;
    const stdDev = Math.sqrt(lengths.reduce((s, v) => s + (v - mean) ** 2, 0) / lengths.length);

    const allInRange = lengths.every(l => l >= CYCLE_LENGTH_MIN && l <= CYCLE_LENGTH_MAX);
    const status = allInRange && stdDev <= 3 ? CYCLE_STATUS.REGULAR : CYCLE_STATUS.IRREGULAR;

    return Object.freeze({
      status,
      averageCycleLength: Math.round(mean),
      stdDev: Math.round(stdDev * 10) / 10,
      generatedAt: new Date().toISOString(),
    });
  }

  /**
   * Estimate the next cycle start date.
   * Wave1: uses average cycle length from historical data.
   *
   * @param {Readonly<object>[]} records
   * @returns {{ estimatedNextStart: string|null, basedOnAverage: number, generatedAt: string, wave1Stub: boolean }}
   */
  estimateNextCycle(records = []) {
    const starts = records
      .filter(r => r.cycleDay === 1 && r.startedAt)
      .map(r => new Date(r.startedAt).getTime())
      .sort((a, b) => a - b);

    const { averageCycleLength } = this.calculateAverageCycle(records);
    const lastStart = starts.length ? starts[starts.length - 1] : null;

    const estimatedNextStart = lastStart
      ? new Date(lastStart + averageCycleLength * 86_400_000).toISOString()
      : null;

    return Object.freeze({
      estimatedNextStart,
      basedOnAverage: averageCycleLength,
      generatedAt: new Date().toISOString(),
      wave1Stub: true,
    });
  }

  /**
   * Build a complete cycle summary for Longitudinal integration.
   * BD-018: includes generatedAt.
   * NAC-04: supplies cycleLengthAverage / periodLengthAverage / regularity to LongitudinalSummary.
   *
   * @param {Readonly<object>[]} records
   * @returns {Readonly<object>}
   */
  buildCycleSummary(records = []) {
    const { averageCycleLength }  = this.calculateAverageCycle(records);
    const { averagePeriodLength } = this.calculateAveragePeriod(records);
    const { status: regularity, stdDev } = this.detectRegularity(records);
    const { estimatedNextStart }  = this.estimateNextCycle(records);

    // MENSTRUAL_REG score: REGULAR=1.0, IRREGULAR=0.3, UNKNOWN=0.5
    const regularityScore =
      regularity === 'REGULAR'   ? 1.0 :
      regularity === 'IRREGULAR' ? 0.3 : 0.5;

    return Object.freeze({
      cycleLengthAverage:  averageCycleLength,
      periodLengthAverage: averagePeriodLength,
      regularity,
      regularityScore,
      stdDev,
      estimatedNextStart,
      recordCount:         records.length,
      generatedAt:         new Date().toISOString(),
      bd018Compliant:      true,
    });
  }
}
