// event-bus.js — Synchronous In-process Event Bus.
// Wave1: synchronous only — no Message Queue, no async, no external broker.
// BD-015: All domain events must reach the EventStore via this bus.
// PR-037: Event Sourcing Foundation

export class EventBus {
  #subscriptions = new Map();  // eventType → Set<handler>

  /**
   * Publish a single DomainEvent synchronously to all subscribers.
   * @param {Readonly<object>} event
   */
  publish(event) {
    if (!event?.eventType) throw new Error('[EventBus] event.eventType is required');
    const handlers = this.#subscriptions.get(event.eventType) ?? new Set();
    const wildcards = this.#subscriptions.get('*') ?? new Set();
    for (const handler of [...handlers, ...wildcards]) {
      handler(event);
    }
  }

  /**
   * Subscribe a handler to an event type (or '*' for all events).
   * @param {string}   eventType
   * @param {Function} handler
   * @returns {Function} unsubscribe function
   */
  subscribe(eventType, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('[EventBus] handler must be a function');
    }
    if (!this.#subscriptions.has(eventType)) {
      this.#subscriptions.set(eventType, new Set());
    }
    this.#subscriptions.get(eventType).add(handler);
    return () => this.unsubscribe(eventType, handler);
  }

  /**
   * Remove a handler subscription.
   * @param {string}   eventType
   * @param {Function} handler
   */
  unsubscribe(eventType, handler) {
    this.#subscriptions.get(eventType)?.delete(handler);
  }

  /**
   * Publish multiple events in sequence.
   * @param {Readonly<object>[]} events
   */
  publishBatch(events) {
    if (!Array.isArray(events)) throw new TypeError('[EventBus] publishBatch expects an array');
    for (const event of events) {
      this.publish(event);
    }
  }

  /** Return number of registered subscriptions (for diagnostics). */
  get subscriptionCount() {
    let total = 0;
    for (const handlers of this.#subscriptions.values()) total += handlers.size;
    return total;
  }
}
