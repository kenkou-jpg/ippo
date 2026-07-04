// emotion-signal-generator.js — Emotion Signal Generation Foundation (PR-043).
// BD-024: Emotion Signal auto-generation from Record is Wave2 scope (now active).
// BD-031: No AI, no LLM, no diagnosis, no treatment, no urgency.
// BD-038: Rule-based implementation only — LLM is Wave3+.
// AP-02:  Append-Only — signals are never deleted or updated.
//
// Responsibility:
//   1. Accept a Record object.
//   2. Apply deterministic Emotion Rules (emotion-rules.js).
//   3. Build NetworkSignal entities for each matching rule.
//   4. Append each to NetworkSignalPersistenceService (BD-022).
//   5. Publish EMOTION_SIGNAL_GENERATED event per signal (BD-015 / BD-017).
//   6. Return the generated signals (Append-Only — no delete).
//
// Design constraints:
//   - Stateless: generate() has no side effects outside of repository.append() and event.publish().
//   - Idempotent per-record: caller controls whether to call twice.
//   - Event publishing is best-effort: repository write succeeds even if event fails.

import { buildNetworkSignal }   from './network-signal-entity.js';
import { applyAllEmotionRules } from './emotion-rules.js';
import { buildDomainEvent }     from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';

export class EmotionSignalGenerator {
  #persistenceService;  // NetworkSignalPersistenceService (INetworkSignalRepository)
  #eventPublisher;      // EventPublisher | null

  /**
   * @param {{
   *   persistenceService: import('./network-signal-persistence-service.js').NetworkSignalPersistenceService,
   *   eventPublisher?:    object | null,
   * }} deps
   */
  constructor({ persistenceService, eventPublisher = null }) {
    if (!persistenceService) {
      throw new Error('[EmotionSignalGenerator] persistenceService is required');
    }
    if (typeof persistenceService.append !== 'function') {
      throw new Error('[EmotionSignalGenerator] persistenceService must implement append()');
    }
    this.#persistenceService = persistenceService;
    this.#eventPublisher     = eventPublisher ?? null;
  }

  /**
   * Generate Emotion Signals from a Record and persist them.
   *
   * Applies all four Emotion Rules (Mood / Fatigue / Stress / Motivation).
   * Each matching rule produces one EMOTION-type NetworkSignal.
   * Signals are appended via NetworkSignalPersistenceService (BD-022 / AP-02).
   * EMOTION_SIGNAL_GENERATED event is published per signal (BD-015).
   *
   * @param {object} record  The saved Record object.
   * @param {{ menstrualPhase?: string }} options
   * @returns {Readonly<object>[]}  The generated NetworkSignal entities (may be empty).
   */
  generate(record, { menstrualPhase } = {}) {
    if (!record) return [];

    const recordId  = record.id ?? record.recordId ?? null;
    const timestamp = record.date ?? record.timestamp ?? new Date().toISOString();

    const signalParams = applyAllEmotionRules(record, {
      recordId,
      timestamp,
      menstrualPhase,
    });

    if (signalParams.length === 0) return [];

    const generated = [];

    for (const params of signalParams) {
      const signal = buildNetworkSignal(params);
      const stored = this.#persistenceService.append(signal);
      this.#publishEmotionSignalGenerated(stored);
      generated.push(stored);
    }

    return generated;
  }

  /**
   * Return the name of the backing repository type (for diagnostics).
   * @returns {string}
   */
  get repositoryType() {
    return this.#persistenceService.repositoryType ?? 'unknown';
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #publishEmotionSignalGenerated(signal) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.EMOTION_SIGNAL_GENERATED,
        aggregateType: AGGREGATE_TYPES.EMOTION,
        aggregateId:   signal.id,
        payload: Object.freeze({
          signalType:      signal.signalType,
          subType:         signal.metadata?.subType ?? null,
          category:        signal.metadata?.category ?? null,
          normalizedValue: signal.normalizedValue,
          rawValue:        signal.rawValue,
          recordId:        signal.recordId,
          menstrualPhase:  signal.menstrualPhase,
          timestamp:       signal.timestamp,
        }),
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort; persistence already succeeded.
    }
  }
}
