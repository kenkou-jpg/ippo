// menstrual-service.js — Menstrual domain service.
// BD-015: MenstrualRecorded events are replayable via EventPublisher.
// BD-018: generatedAt on every statistics output.
// BD-022: Wave1 in-memory only.
// NAC-01: toNetworkSignals() converts to SIGNAL_TYPES.MENSTRUAL.
// PR-039: Menstrual Intelligence Foundation

import { buildMenstrualRecord }  from './menstrual-entity.js';
import { validateMenstrual }     from './menstrual-validator.js';
import { PhaseCalculator }       from './phase-calculator.js';
import { CycleAnalysisService }  from './cycle-analysis-service.js';
import { MENSTRUAL_PHASES, FLOW_LEVEL } from './menstrual-types.js';
import { buildNetworkSignal }    from '../network/network-signal-entity.js';
import { SIGNAL_TYPES, SIGNAL_UNITS } from '../network/network-signal-types.js';
import { buildDomainEvent }      from '../events/domain-event-entity.js';

/** Flow → normalizedValue mapping for NetworkSignal. */
const FLOW_NORMALIZED = Object.freeze({
  [FLOW_LEVEL.NONE]:    0.0,
  [FLOW_LEVEL.LIGHT]:   0.33,
  [FLOW_LEVEL.MEDIUM]:  0.67,
  [FLOW_LEVEL.HEAVY]:   1.0,
  [FLOW_LEVEL.UNKNOWN]: 0.5,
});

export class MenstrualService {
  #repository;
  #eventPublisher;
  #phaseCalc;
  #cycleAnalysis;

  /**
   * @param {{ repository: object, eventPublisher?: object }} deps
   */
  constructor({ repository, eventPublisher = null }) {
    if (!repository) throw new Error('[MenstrualService] repository is required');
    this.#repository     = repository;
    this.#eventPublisher = eventPublisher;
    this.#phaseCalc      = new PhaseCalculator();
    this.#cycleAnalysis  = new CycleAnalysisService();
  }

  /**
   * Create and persist a new MenstrualRecord.
   * Publishes MENSTRUAL_RECORDED event if EventPublisher is wired (BD-015).
   *
   * @param {object} params
   * @returns {Readonly<object>} created MenstrualRecord entity
   */
  create(params) {
    const validation = validateMenstrual(params);
    if (!validation.valid) {
      throw new Error(`[MenstrualService] Validation failed: ${validation.errors.join(', ')}`);
    }
    const record = buildMenstrualRecord(params);
    this.#repository.append(record);

    if (this.#eventPublisher) {
      try {
        const event = buildDomainEvent({
          eventType:     'MENSTRUAL_RECORDED',
          aggregateType: 'SIGNAL',
          aggregateId:   record.id,
          payload:       Object.freeze({
            cycleDay:  record.cycleDay,
            phase:     record.phase,
            flow:      record.flow,
            painLevel: record.painLevel,
            recordId:  record.recordId,
            startedAt: record.startedAt,
          }),
        });
        this.#eventPublisher.publish(event);
      } catch (_) {
        // Event publishing is best-effort in Wave1
      }
    }

    return record;
  }

  /**
   * Return all menstrual records.
   * @returns {Readonly<object>[]}
   */
  list() {
    return this.#repository.findAll();
  }

  /**
   * Find records where cycleDay === 1 (current/latest cycle start).
   * @returns {Readonly<object>[]}
   */
  findCurrentCycle() {
    return this.#repository.findCycleStarts();
  }

  /**
   * Find all records for a given cycle identified by its start date.
   * A "cycle" = all records whose startedAt is on or after cycleStartIso
   * and before (cycleStartIso + 35 days).
   *
   * @param {string} cycleStartIso
   * @returns {Readonly<object>[]}
   */
  findCycle(cycleStartIso) {
    if (!cycleStartIso) throw new Error('[MenstrualService] cycleStartIso is required');
    const start = new Date(cycleStartIso).getTime();
    const end   = start + 35 * 86_400_000;
    return this.#repository.findAll().filter(r => {
      const t = new Date(r.startedAt).getTime();
      return t >= start && t < end;
    });
  }

  /**
   * Find records by menstrual phase.
   * @param {string} phase
   * @returns {Readonly<object>[]}
   */
  findByPhase(phase) {
    if (!phase) throw new Error('[MenstrualService] phase is required');
    if (!Object.values(MENSTRUAL_PHASES).includes(phase))
      throw new Error(`[MenstrualService] Unknown phase: "${phase}"`);
    return this.#repository.findByPhase(phase);
  }

  /**
   * Return aggregate cycle statistics.
   * BD-018: includes generatedAt.
   *
   * @returns {Readonly<object>}
   */
  getCycleStatistics() {
    const all = this.#repository.findAll();
    return this.#cycleAnalysis.buildCycleSummary(all);
  }

  /**
   * Estimate the next cycle start date (Wave1: fixed average logic).
   * @returns {Readonly<object>}
   */
  estimateNextCycle() {
    return this.#cycleAnalysis.estimateNextCycle(this.#repository.findAll());
  }

  /**
   * Convert all stored MenstrualRecords to NetworkSignals (SIGNAL_TYPES.MENSTRUAL).
   * NAC-01: normalizedValue derived from flow level; phase + cycleDay in metadata.
   *
   * @returns {Readonly<object>[]}
   */
  toNetworkSignals() {
    return this.#repository.findAll().map(r => {
      const normalizedValue = FLOW_NORMALIZED[r.flow] ?? 0.5;
      const rawValue        = Math.round(normalizedValue * 3);
      return buildNetworkSignal({
        signalType:      SIGNAL_TYPES.MENSTRUAL,
        normalizedValue,
        rawValue,
        unit:            SIGNAL_UNITS.MENSTRUAL,
        recordId:        r.recordId ?? null,
        timestamp:       r.startedAt,
        metadata:        Object.freeze({
          phase:     r.phase,
          cycleDay:  r.cycleDay,
          flow:      r.flow,
          painLevel: r.painLevel,
          menstrualId: r.id,
        }),
      });
    });
  }

  /**
   * Get MENSTRUAL_REG score for FeatureVector Dim-2.
   * Returns regularityScore from CycleAnalysisService (REGULAR=1.0, IRREGULAR=0.3, UNKNOWN=0.5).
   * @returns {number} [0, 1]
   */
  getMenstrualRegScore() {
    return this.getCycleStatistics().regularityScore ?? 0.5;
  }
}
