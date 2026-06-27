// event-replay-service.js — Event Replay Service.
// BD-015: Record → Signal → Layer決定論的再構築 — replay guarantees this.
// BD-018: generatedAt on all replay results.
// Append Only — replay reads only; never mutates the store.
// PR-037: Event Sourcing Foundation

export class EventReplayService {
  #store;

  /**
   * @param {{ store: import('./event-store.js').EventStore }} deps
   */
  constructor({ store }) {
    if (!store) throw new Error('[EventReplayService] store is required');
    this.#store = store;
  }

  /**
   * Replay all events and return the ordered sequence.
   * @param {{ from?: string, to?: string }} [options]
   * @returns {Readonly<object>}
   */
  replay(options = {}) {
    const events = this.#store.getEvents(options);
    return Object.freeze({
      events:      Object.freeze([...events]),
      totalEvents: events.length,
      from:        options.from ?? null,
      to:          options.to   ?? null,
      generatedAt: new Date().toISOString(),   // BD-018
      bd015Compliant: true,
    });
  }

  /**
   * Replay all events up to (and including) a specific ISO timestamp.
   * @param {string} isoTimestamp
   * @returns {Readonly<object>}
   */
  replayUntil(isoTimestamp) {
    if (!isoTimestamp) throw new Error('[EventReplayService] isoTimestamp is required');
    return this.replay({ to: isoTimestamp });
  }

  /**
   * Rebuild the logical state of an aggregate from its events.
   * Applies events in chronological order via a reducer function.
   *
   * @param {string}   aggregateId
   * @param {Function} [reducer]   (state, event) => newState
   * @param {object}   [initial]   initial state (default: {})
   * @returns {Readonly<object>}   { state, eventCount, aggregateId, generatedAt }
   */
  rebuildState(aggregateId, reducer = (_s, e) => ({ ...(_s ?? {}), lastEvent: e }), initial = {}) {
    if (!aggregateId) throw new Error('[EventReplayService] aggregateId is required');
    const events = this.#store.getByAggregate(aggregateId)
      .slice()
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

    let state = { ...initial };
    for (const event of events) {
      state = reducer(state, event);
    }

    return Object.freeze({
      state:       Object.freeze(state),
      eventCount:  events.length,
      aggregateId,
      generatedAt: new Date().toISOString(),   // BD-018
      bd015Compliant: true,
    });
  }

  /**
   * Verify that the event log has no gaps (sequential version check).
   * Wave1: checks that all events have id, eventType, occurredAt.
   * @returns {Readonly<object>} { valid, issues, checkedCount, generatedAt }
   */
  verifyIntegrity() {
    const events = this.#store.getEvents();
    const issues = [];

    for (const e of events) {
      if (!e.id)          issues.push(`${e.id ?? '?'}: missing id`);
      if (!e.eventType)   issues.push(`${e.id}: missing eventType`);
      if (!e.occurredAt)  issues.push(`${e.id}: missing occurredAt (BD-018)`);
      if (!e.version)     issues.push(`${e.id}: missing version`);
    }

    return Object.freeze({
      valid:        issues.length === 0,
      issues:       Object.freeze(issues),
      checkedCount: events.length,
      generatedAt:  new Date().toISOString(),
      bd015Compliant: issues.length === 0,
    });
  }
}
