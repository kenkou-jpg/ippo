// DeliveryAuditLog — append-only lifecycle audit for all notification state transitions.
// Records every enqueue, scheduling, delivery, and failure event.
// DELETE forbidden. Used for delivery traceability and debugging.
// PR-024: Delivery & Admin Analytics Layer

let _idCounter = 0;

/**
 * @typedef {{
 *   id:               string,
 *   queueId:          string,
 *   userId:           string,
 *   notificationType: string,
 *   fromStatus:       string|null,
 *   toStatus:         string,
 *   reason:           string|null,
 *   recordedAt:       string,
 * }} DeliveryAuditEntry
 */

export class DeliveryAuditLog {
  #repository;

  /** @param {import('./delivery-repository.js').DeliveryRepository} repository */
  constructor(repository) {
    this.#repository = repository;
  }

  /**
   * Append a lifecycle event. Cannot update or delete existing entries.
   * @param {{
   *   queueId:          string,
   *   userId:           string,
   *   notificationType: string,
   *   fromStatus:       string|null,
   *   toStatus:         string,
   *   reason?:          string,
   * }} params
   * @returns {DeliveryAuditEntry}
   */
  append({ queueId, userId, notificationType, fromStatus, toStatus, reason }) {
    const entry = {
      id:               `da_${Date.now()}_${++_idCounter}`,
      queueId,
      userId,
      notificationType,
      fromStatus:       fromStatus ?? null,
      toStatus,
      reason:           reason ?? null,
      recordedAt:       new Date().toISOString(),
    };
    this.#repository.appendAudit(entry);
    return entry;
  }

  // ── Named event helpers (PR-025) ─────────────────────────────────────────

  /** Record initial enqueue (null → PENDING). */
  recordQueued({ queueId, userId, notificationType }) {
    return this.append({ queueId, userId, notificationType, fromStatus: null, toStatus: 'PENDING', reason: 'enqueued' });
  }

  /** Record PENDING → SCHEDULED transition. */
  recordScheduled({ queueId, userId, notificationType }) {
    return this.append({ queueId, userId, notificationType, fromStatus: 'PENDING', toStatus: 'SCHEDULED', reason: 'processing' });
  }

  /** Record SCHEDULED → DELIVERED transition. */
  recordDelivered({ queueId, userId, notificationType, providerId }) {
    return this.append({ queueId, userId, notificationType, fromStatus: 'SCHEDULED', toStatus: 'DELIVERED', reason: providerId ?? 'delivered' });
  }

  /** Record → FAILED transition (from any non-terminal status). */
  recordFailed({ queueId, userId, notificationType, fromStatus, reason }) {
    return this.append({ queueId, userId, notificationType, fromStatus: fromStatus ?? 'SCHEDULED', toStatus: 'FAILED', reason: reason ?? 'unknown' });
  }

  /**
   * @param {string} userId
   * @returns {DeliveryAuditEntry[]}
   */
  findByUser(userId) {
    return this.#repository.findAuditByUser(userId);
  }

  /**
   * @returns {DeliveryAuditEntry[]}
   */
  findAll() {
    return this.#repository.loadAudit();
  }
}
