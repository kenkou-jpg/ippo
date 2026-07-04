// DeliveryOperationsService — read-only aggregation of delivery queue health.
// No retry, no mutation. Metrics only.
// All access via ApiGateway — UI must not import this directly.
// PR-026: initial (pending/scheduled/delivered/failed/deliveryRate)
// PR-027: expanded (successRate/failureRate/retryableCount/queueHealth)

/** @readonly */
export const QUEUE_HEALTH = Object.freeze({
  HEALTHY:  'HEALTHY',
  WARNING:  'WARNING',
  CRITICAL: 'CRITICAL',
});

export class DeliveryOperationsService {
  #deliveryQueue;

  /** @param {import('./delivery-queue.js').DeliveryQueue} deliveryQueue */
  constructor({ deliveryQueue }) {
    this.#deliveryQueue = deliveryQueue;
  }

  /**
   * Aggregate current delivery queue health metrics.
   * Read-only — no state mutations.
   *
   * @returns {{
   *   pendingCount:    number,
   *   scheduledCount:  number,
   *   deliveredCount:  number,
   *   failedCount:     number,
   *   successRate:     number,
   *   failureRate:     number,
   *   retryableCount:  number,
   *   queueHealth:     'HEALTHY'|'WARNING'|'CRITICAL',
   *   pending:         number,
   *   scheduled:       number,
   *   delivered:       number,
   *   failed:          number,
   *   deliveryRate:    number,
   * }}
   */
  getDeliveryHealth() {
    const all            = this.#deliveryQueue.findAll();
    const pendingCount   = all.filter(e => e.status === 'PENDING').length;
    const scheduledCount = all.filter(e => e.status === 'SCHEDULED').length;
    const deliveredCount = all.filter(e => e.status === 'DELIVERED').length;
    const failedCount    = all.filter(e => e.status === 'FAILED').length;
    const terminal       = deliveredCount + failedCount;

    const successRate    = terminal > 0 ? Math.round(deliveredCount / terminal * 1000) / 1000 : 0;
    const failureRate    = terminal > 0 ? Math.round(failedCount    / terminal * 1000) / 1000 : 0;
    const retryableCount = failedCount;

    const failureRatePct = failureRate * 100;
    const queueHealth    = failureRatePct < 5
      ? QUEUE_HEALTH.HEALTHY
      : failureRatePct < 15
        ? QUEUE_HEALTH.WARNING
        : QUEUE_HEALTH.CRITICAL;

    return {
      // PR-027 expanded fields
      pendingCount,
      scheduledCount,
      deliveredCount,
      failedCount,
      successRate,
      failureRate,
      retryableCount,
      queueHealth,
      // PR-026 aliases (backward-compatible)
      pending:      pendingCount,
      scheduled:    scheduledCount,
      delivered:    deliveredCount,
      failed:       failedCount,
      deliveryRate: successRate,
    };
  }
}
