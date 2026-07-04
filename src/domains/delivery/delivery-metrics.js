// DeliveryMetrics — counters for notification delivery outcomes.
// No UI dependency. Computed from StorageService counters + live DeliveryQueue.
// PR-025: Delivery Infrastructure Completion

const KEY = 'ippo_delivery_metrics';

const ZERO = Object.freeze({ delivered: 0, failed: 0 });

export class DeliveryMetrics {
  #storage;
  #deliveryQueue;

  /**
   * @param storage      IStorageService
   * @param deliveryQueue DeliveryQueue (for live pending count)
   */
  constructor(storage, deliveryQueue) {
    this.#storage       = storage;
    this.#deliveryQueue = deliveryQueue;
  }

  recordDelivered() {
    const c = this.#storage.get(KEY) ?? { ...ZERO };
    c.delivered = (c.delivered ?? 0) + 1;
    this.#storage.set(KEY, c);
  }

  recordFailed() {
    const c = this.#storage.get(KEY) ?? { ...ZERO };
    c.failed = (c.failed ?? 0) + 1;
    this.#storage.set(KEY, c);
  }

  /**
   * Returns a snapshot of all delivery KPIs.
   * @returns {{
   *   delivered:    number,
   *   failed:       number,
   *   pending:      number,
   *   deliveryRate: number,
   *   failureRate:  number,
   * }}
   */
  getSnapshot() {
    const { delivered = 0, failed = 0 } = this.#storage.get(KEY) ?? ZERO;
    const pending  = this.#deliveryQueue.findByStatus('PENDING').length;
    const total    = delivered + failed;
    return {
      delivered,
      failed,
      pending,
      deliveryRate: total > 0 ? Math.round(delivered / total * 1000) / 1000 : 0,
      failureRate:  total > 0 ? Math.round(failed  / total * 1000) / 1000 : 0,
    };
  }
}
