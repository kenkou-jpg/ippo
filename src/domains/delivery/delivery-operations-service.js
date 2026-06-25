// DeliveryOperationsService — read-only aggregation of delivery queue health.
// No retry, no mutation. Metrics only.
// All access via ApiGateway — UI must not import this directly.
// PR-026: Operations & KPI Automation

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
   *   pending:      number,
   *   scheduled:    number,
   *   delivered:    number,
   *   failed:       number,
   *   deliveryRate: number,
   * }}
   */
  getDeliveryHealth() {
    const all       = this.#deliveryQueue.findAll();
    const pending   = all.filter(e => e.status === 'PENDING').length;
    const scheduled = all.filter(e => e.status === 'SCHEDULED').length;
    const delivered = all.filter(e => e.status === 'DELIVERED').length;
    const failed    = all.filter(e => e.status === 'FAILED').length;
    const terminal  = delivered + failed;
    return {
      pending,
      scheduled,
      delivered,
      failed,
      deliveryRate: terminal > 0 ? Math.round(delivered / terminal * 1000) / 1000 : 0,
    };
  }
}
