// event-publisher.js — DomainEvent Publisher (EventBus + EventStore wiring).
// Single entry point for publishing domain events:
//   1. Validates the event
//   2. Appends to EventStore (persistent record, BD-015)
//   3. Dispatches to EventBus (subscriber notification)
// Wave1: synchronous only.
// PR-037: Event Sourcing Foundation

export class EventPublisher {
  #store;
  #bus;

  /**
   * @param {{ store: import('./event-store.js').EventStore, bus: import('./event-bus.js').EventBus }} deps
   */
  constructor({ store, bus }) {
    if (!store) throw new Error('[EventPublisher] store is required');
    if (!bus)   throw new Error('[EventPublisher] bus is required');
    this.#store = store;
    this.#bus   = bus;
  }

  /**
   * Publish a single DomainEvent: append to store then dispatch on bus.
   * @param {Readonly<object>} event
   */
  publish(event) {
    this.#store.append(event);
    this.#bus.publish(event);
  }

  /**
   * Publish multiple events in sequence.
   * @param {Readonly<object>[]} events
   */
  publishBatch(events) {
    if (!Array.isArray(events)) throw new TypeError('[EventPublisher] publishBatch expects an array');
    for (const event of events) {
      this.publish(event);
    }
  }

  /** Delegate subscribe to the underlying EventBus. */
  subscribe(eventType, handler) {
    return this.#bus.subscribe(eventType, handler);
  }

  /** Expose store for read-only queries (no mutation). */
  get store() { return this.#store; }
}
