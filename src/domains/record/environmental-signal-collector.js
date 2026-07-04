// environmental-signal-collector.js — PR-049: Environmental Signal Collector.
// BD-003: Lunar Calendar UI implementation is FORBIDDEN.
// BD-043: Environmental Signal UI display is FORBIDDEN — background only.
// BD-031: No AI, no LLM, no diagnosis, no treatment.
// BD-038: Rule-based only.
// BD-032: Append-Only — collector returns enriched record (NEW object, no mutation).
//
// Responsibility:
//   1. Accept a Record object.
//   2. Compute lunarPhase deterministically from record date.
//   3. Return an enriched Record with environmentalSignals.lunarPhase attached.
//   4. Publish ENVIRONMENTAL_SIGNAL_RECORDED DomainEvent (best-effort).
//
// Key constraint (BD-003 / BD-043):
//   lunarPhase MUST NOT be rendered in any UI screen or feature.
//   Data is collected for Wave3 Environment × Symptom correlation analysis only.

import { buildDomainEvent }            from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';
import {
  LUNAR_PHASES,
  LUNAR_CYCLE_DAYS,
  LUNAR_EPOCH_MS,
} from './environmental-signal-types.js';

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Compute lunar age in days for a given date.
 * Uses J2000.0 new-moon epoch (2000-01-06T18:14:00Z) as anchor.
 *
 * @param {Date|string|number} date
 * @returns {number} lunar age [0, LUNAR_CYCLE_DAYS)
 */
export function computeLunarAge(date) {
  const ms       = new Date(date).getTime();
  const cycleMsec = LUNAR_CYCLE_DAYS * 86_400_000;
  const elapsed  = ms - LUNAR_EPOCH_MS;
  // Positive modulo: works correctly for dates before epoch too
  return ((elapsed % cycleMsec) + cycleMsec) % cycleMsec / 86_400_000;
}

/**
 * Convert lunar age (days) to a named lunar phase.
 *
 * Boundaries (half-way between 8 canonical phase centres):
 *   New Moon centre  ≈ day  0   → window [0, 1.845)
 *   Full Moon centre ≈ day 14.77 → window [13.923, 16.608)
 *
 * @param {number} ageDays  [0, 29.53)
 * @returns {string}  One of LUNAR_PHASES values
 */
export function lunarAgeToPhase(ageDays) {
  if (typeof ageDays !== 'number' || isNaN(ageDays)) return LUNAR_PHASES.UNKNOWN;

  const a = ageDays;
  if (a < 1.845)  return LUNAR_PHASES.NEW_MOON;
  if (a < 7.384)  return LUNAR_PHASES.WAXING_CRESCENT;
  if (a < 11.076) return LUNAR_PHASES.FIRST_QUARTER;
  if (a < 14.769) return LUNAR_PHASES.WAXING_GIBBOUS;
  if (a < 16.608) return LUNAR_PHASES.FULL_MOON;
  if (a < 22.153) return LUNAR_PHASES.WANING_GIBBOUS;
  if (a < 25.846) return LUNAR_PHASES.LAST_QUARTER;
  if (a < LUNAR_CYCLE_DAYS) return LUNAR_PHASES.WANING_CRESCENT;
  return LUNAR_PHASES.UNKNOWN;
}

/**
 * Compute the lunar phase for a given date.
 * @param {Date|string|number} date
 * @returns {string}
 */
export function computeLunarPhase(date) {
  try {
    const age = computeLunarAge(date);
    return lunarAgeToPhase(age);
  } catch {
    return LUNAR_PHASES.UNKNOWN;
  }
}

// ── EnvironmentalSignalCollector ──────────────────────────────────────────────

let _idCounter = 0;

export class EnvironmentalSignalCollector {
  #eventPublisher;

  /**
   * @param {{ eventPublisher?: object|null }} deps
   */
  constructor({ eventPublisher = null } = {}) {
    this.#eventPublisher = eventPublisher ?? null;
  }

  /**
   * Attach environmental signal metadata to a Record (background only — BD-043).
   *
   * Returns a NEW object with environmentalSignals.lunarPhase set.
   * The original record is never mutated (BD-032 Append-Only principle).
   *
   * @param {object} record  The saved Record object
   * @returns {Readonly<object>}  Enriched record with environmentalSignals
   */
  collect(record) {
    if (!record || typeof record !== 'object') {
      throw new TypeError('[EnvironmentalSignalCollector] record is required');
    }

    const date       = record.date ?? record.timestamp ?? record.createdAt ?? new Date().toISOString();
    const lunarPhase = computeLunarPhase(date);
    const collectedAt = new Date().toISOString();
    const collectId   = `env_${Date.now()}_${++_idCounter}`;

    const environmentalSignals = Object.freeze({
      ...(record.environmentalSignals ?? {}),
      lunarPhase,
      collectedAt,
      collectId,
    });

    const enriched = Object.freeze({
      ...record,
      environmentalSignals,
    });

    this.#publishCollected(enriched, lunarPhase, collectedAt);
    return enriched;
  }

  /**
   * Collect environmental signals for multiple records.
   * @param {object[]} records
   * @returns {Readonly<object>[]}
   */
  collectAll(records = []) {
    return records.map(r => this.collect(r));
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #publishCollected(record, lunarPhase, collectedAt) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.ENVIRONMENTAL_SIGNAL_RECORDED,
        aggregateType: AGGREGATE_TYPES.RECORD,
        aggregateId:   record.id ?? record.recordId ?? 'unknown',
        payload: Object.freeze({
          recordId:    record.id ?? record.recordId ?? null,
          lunarPhase,
          recordDate:  record.date ?? record.timestamp ?? null,
          collectedAt,
        }),
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort; enrichment already succeeded.
    }
  }
}
