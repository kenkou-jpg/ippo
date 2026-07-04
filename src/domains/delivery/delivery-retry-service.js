// DeliveryRetryService — re-queues FAILED notifications back to PENDING.
// Only FAILED → PENDING is permitted. DELIVERED and SCHEDULED are never retried.
// All access via ApiGateway — UI must not import this directly.
// PR-027: Operations Automation & Analytics Completion

export class DeliveryRetryService {
  #deliveryQueue;
  #deliveryAuditLog;

  /**
   * @param {{
   *   deliveryQueue:    import('./delivery-queue.js').DeliveryQueue,
   *   deliveryAuditLog: import('./delivery-audit-log.js').DeliveryAuditLog,
   * }} deps
   */
  constructor({ deliveryQueue, deliveryAuditLog }) {
    this.#deliveryQueue    = deliveryQueue;
    this.#deliveryAuditLog = deliveryAuditLog;
  }

  /**
   * Re-queue all FAILED entries back to PENDING.
   * DELIVERED and SCHEDULED entries are never touched.
   *
   * @returns {{ retried: number, entries: object[] }}
   */
  retryFailed() {
    const failed  = this.#deliveryQueue.findByStatus('FAILED');
    const retried = [];

    for (const entry of failed) {
      const updated = this.#deliveryQueue.resetToPending(entry.id);
      this.#deliveryAuditLog.append({
        queueId:          entry.id,
        userId:           entry.userId,
        notificationType: entry.notificationType,
        fromStatus:       'FAILED',
        toStatus:         'PENDING',
        reason:           'retry',
      });
      retried.push(updated);
    }

    return { retried: retried.length, entries: retried };
  }

  /**
   * Return all entries currently retryable (status === FAILED).
   * @returns {object[]}
   */
  getRetryableEntries() {
    return this.#deliveryQueue.findByStatus('FAILED');
  }
}
