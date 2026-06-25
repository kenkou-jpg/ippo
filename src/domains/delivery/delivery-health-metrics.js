// DeliveryHealthMetrics — computed health indicators for the delivery queue.
// Measurement only. No UI. No mutations.
// All access via ApiGateway — UI must not import this directly.
// PR-026: Operations & KPI Automation

export class DeliveryHealthMetrics {
  #deliveryQueue;

  /** @param {import('./delivery-queue.js').DeliveryQueue} deliveryQueue */
  constructor({ deliveryQueue }) {
    this.#deliveryQueue = deliveryQueue;
  }

  /**
   * Compute delivery health indicators from the current queue state.
   *
   * @returns {{
   *   deliverySuccessRate: number,
   *   deliveryFailureRate: number,
   *   averageQueueAge:     number,
   *   pendingCount:        number,
   * }}
   */
  getHealthMetrics() {
    const all       = this.#deliveryQueue.findAll();
    const delivered = all.filter(e => e.status === 'DELIVERED').length;
    const failed    = all.filter(e => e.status === 'FAILED').length;
    const pending   = all.filter(e => e.status === 'PENDING');
    const terminal  = delivered + failed;

    const deliverySuccessRate = terminal > 0
      ? Math.round(delivered / terminal * 1000) / 1000
      : 0;
    const deliveryFailureRate = terminal > 0
      ? Math.round(failed / terminal * 1000) / 1000
      : 0;

    const now = Date.now();
    const averageQueueAge = pending.length > 0
      ? Math.round(
          pending.reduce((sum, e) => {
            const enqueuedMs = e.enqueuedAt ? new Date(e.enqueuedAt).getTime() : now;
            return sum + (now - enqueuedMs);
          }, 0) / pending.length / 1000
        )
      : 0;

    return {
      deliverySuccessRate,
      deliveryFailureRate,
      averageQueueAge,
      pendingCount: pending.length,
    };
  }
}
