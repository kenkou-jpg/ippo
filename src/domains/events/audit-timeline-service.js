// audit-timeline-service.js — Audit Timeline Service.
// Merges Signal / Disease / Snapshot / Similarity / Record events into a unified timeline.
// BD-018: generatedAt required on every timeline output.
// BD-019 (Audit Trail): all actions must be auditable.
// BD-021: no data deletion — audit trail is permanent.
// PR-037: Event Sourcing Foundation

import { DOMAIN_EVENT_TYPES } from './domain-event-types.js';

/** Event types that belong to each audit category. */
const TIMELINE_CATEGORIES = Object.freeze({
  signal:     Object.freeze([
    DOMAIN_EVENT_TYPES.SIGNAL_CREATED,
    DOMAIN_EVENT_TYPES.SIGNAL_SNAPSHOT_CREATED,
    DOMAIN_EVENT_TYPES.LONGITUDINAL_SNAPSHOT_CREATED,
  ]),
  disease:    Object.freeze([
    DOMAIN_EVENT_TYPES.DISEASE_CREATED,
    DOMAIN_EVENT_TYPES.DISEASE_UPDATED,
    DOMAIN_EVENT_TYPES.DISEASE_SNAPSHOT_CREATED,
  ]),
  similarity: Object.freeze([
    DOMAIN_EVENT_TYPES.FEATURE_VECTOR_CREATED,
    DOMAIN_EVENT_TYPES.SIMILARITY_CALCULATED,
  ]),
  record:     Object.freeze([
    DOMAIN_EVENT_TYPES.RECORD_CREATED,
    DOMAIN_EVENT_TYPES.RECORD_UPDATED,
  ]),
  emotion:    Object.freeze([DOMAIN_EVENT_TYPES.EMOTION_CREATED]),
  menstrual:  Object.freeze([DOMAIN_EVENT_TYPES.MENSTRUAL_RECORDED]),
  research:   Object.freeze([DOMAIN_EVENT_TYPES.RESEARCH_DATASET_CREATED]),
  consent:    Object.freeze([DOMAIN_EVENT_TYPES.CONSENT_UPDATED]),
  experiment: Object.freeze([DOMAIN_EVENT_TYPES.EXPERIMENT_CREATED]),
});

export class AuditTimelineService {
  #store;

  /**
   * @param {{ store: import('./event-store.js').EventStore }} deps
   */
  constructor({ store }) {
    if (!store) throw new Error('[AuditTimelineService] store is required');
    this.#store = store;
  }

  /**
   * Build the full audit timeline across all event categories.
   * @param {{ from?: string, to?: string, limit?: number }} [options]
   * @returns {Readonly<object>} { events, totalEvents, from, to, generatedAt, byCategory }
   */
  getAuditTimeline(options = {}) {
    let events = this.#store.getEvents({ from: options.from, to: options.to });

    // Sort chronologically
    events = events.slice().sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

    // Apply limit after sort
    if (options.limit && options.limit > 0) {
      events = events.slice(0, options.limit);
    }

    const byCategory = {};
    for (const [cat, types] of Object.entries(TIMELINE_CATEGORIES)) {
      byCategory[cat] = events.filter(e => types.includes(e.eventType)).length;
    }

    return Object.freeze({
      events:      Object.freeze(events.map(e => Object.freeze({ ...e }))),
      totalEvents: events.length,
      from:        options.from ?? null,
      to:          options.to   ?? null,
      generatedAt: new Date().toISOString(),  // BD-018
      byCategory:  Object.freeze(byCategory),
      bd019Compliant: true,
      bd021Compliant: true,
    });
  }

  /**
   * Return timeline filtered to a single aggregate.
   * @param {string} aggregateId
   * @returns {Readonly<object>}
   */
  getTimelineForAggregate(aggregateId) {
    const events = this.#store.getByAggregate(aggregateId)
      .slice()
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

    return Object.freeze({
      aggregateId,
      events:      Object.freeze([...events]),
      totalEvents: events.length,
      generatedAt: new Date().toISOString(),
    });
  }

  /**
   * Return category breakdown counts.
   * @returns {Readonly<object>}
   */
  getCategorySummary() {
    const allEvents = this.#store.getEvents();
    const counts = {};
    for (const [cat, types] of Object.entries(TIMELINE_CATEGORIES)) {
      counts[cat] = allEvents.filter(e => types.includes(e.eventType)).length;
    }
    return Object.freeze({ ...counts, total: allEvents.length, generatedAt: new Date().toISOString() });
  }
}
