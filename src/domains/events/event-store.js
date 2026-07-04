// event-store.js — In-memory Append-Only Event Store.
// BD-015: All events must be replayable — store is the source of truth.
// BD-022: Wave1 in-memory only — no Supabase, no DB.
// Append Only — no update, no delete (BD-015 integrity).
// PR-037: Event Sourcing Foundation

export class EventStore {
  #events = [];

  /**
   * Append a DomainEvent. Requires id, eventType, aggregateId, occurredAt, version.
   * @param {Readonly<object>} event
   */
  append(event) {
    if (!event?.id || !event?.eventType || !event?.aggregateId ||
        !event?.occurredAt || !event?.version) {
      throw new Error(
        '[EventStore] event must have id, eventType, aggregateId, occurredAt, version (BD-015/BD-018)'
      );
    }
    this.#events.push(event);
  }

  /**
   * Return all events (copy), optionally filtered by options.
   * @param {{ from?: string, to?: string }} [options]
   * @returns {Readonly<object>[]}
   */
  getEvents(options = {}) {
    let result = [...this.#events];
    if (options.from) result = result.filter(e => e.occurredAt >= options.from);
    if (options.to)   result = result.filter(e => e.occurredAt <= options.to);
    return result;
  }

  /**
   * Return all events for a specific aggregate (by aggregateId).
   * @param {string} aggregateId
   * @returns {Readonly<object>[]}
   */
  getByAggregate(aggregateId) {
    return this.#events.filter(e => e.aggregateId === aggregateId);
  }

  /**
   * Return all events of a specific type.
   * @param {string} eventType
   * @returns {Readonly<object>[]}
   */
  getByType(eventType) {
    return this.#events.filter(e => e.eventType === eventType);
  }

  /** Total number of stored events. */
  get count() { return this.#events.length; }

  /**
   * Clear all events — for test isolation only.
   * Must never be called in production.
   */
  clearForTests() {
    this.#events = [];
  }
}
