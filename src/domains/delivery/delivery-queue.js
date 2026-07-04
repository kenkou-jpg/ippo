// DeliveryQueue — manages notification send-state lifecycle.
// Items are never deleted. Status transitions are allowed; deletion is not.
// DeliveryAuditLog records every transition for full lifecycle traceability.
// PR-024: Delivery & Admin Analytics Layer

export const DELIVERY_STATUS = Object.freeze({
  PENDING:   'PENDING',
  SCHEDULED: 'SCHEDULED',
  DELIVERED: 'DELIVERED',
  FAILED:    'FAILED',
});

const VALID_TRANSITIONS = Object.freeze({
  [DELIVERY_STATUS.PENDING]:   new Set([DELIVERY_STATUS.SCHEDULED, DELIVERY_STATUS.FAILED]),
  [DELIVERY_STATUS.SCHEDULED]: new Set([DELIVERY_STATUS.DELIVERED, DELIVERY_STATUS.FAILED]),
  [DELIVERY_STATUS.DELIVERED]: new Set(),
  [DELIVERY_STATUS.FAILED]:    new Set(),
});

let _idCounter = 0;

export class DeliveryQueue {
  #repository;

  /** @param {import('./delivery-repository.js').DeliveryRepository} repository */
  constructor(repository) {
    this.#repository = repository;
  }

  /**
   * Add a new entry to the queue with status PENDING.
   * @param {{ userId:string, notificationType:string, scheduledAt:string, candidateDueAt:string }} params
   * @returns {object} the created entry
   */
  enqueue({ userId, notificationType, scheduledAt, candidateDueAt }) {
    const entry = {
      id:               `dq_${Date.now()}_${++_idCounter}`,
      userId,
      notificationType,
      scheduledAt,
      candidateDueAt,
      status:           DELIVERY_STATUS.PENDING,
      enqueuedAt:       new Date().toISOString(),
      updatedAt:        new Date().toISOString(),
    };
    this.#repository.appendQueue(entry);
    return entry;
  }

  /**
   * Transition an entry to a new status. Throws on invalid transition.
   * Does NOT delete the entry — only updates status.
   * @param {string} queueId
   * @param {string} newStatus  one of DELIVERY_STATUS values
   * @returns {object} updated entry
   */
  transition(queueId, newStatus) {
    if (!Object.values(DELIVERY_STATUS).includes(newStatus)) {
      throw new Error(`[DeliveryQueue] Unknown status: "${newStatus}"`);
    }
    const queue = this.#repository.loadQueue();
    const idx   = queue.findIndex(e => e.id === queueId);
    if (idx === -1) throw new Error(`[DeliveryQueue] Entry not found: "${queueId}"`);

    const current = queue[idx];
    const allowed = VALID_TRANSITIONS[current.status];
    if (!allowed.has(newStatus)) {
      throw new Error(
        `[DeliveryQueue] Invalid transition: ${current.status} → ${newStatus} for "${queueId}"`
      );
    }

    queue[idx] = { ...current, status: newStatus, updatedAt: new Date().toISOString() };
    this.#repository.saveQueue(queue);
    return queue[idx];
  }

  // ── Named transition helpers (PR-025) ────────────────────────────────────

  /** PENDING → SCHEDULED */
  markScheduled(queueId) { return this.transition(queueId, DELIVERY_STATUS.SCHEDULED); }

  /** SCHEDULED → DELIVERED */
  markDelivered(queueId) { return this.transition(queueId, DELIVERY_STATUS.DELIVERED); }

  /** PENDING|SCHEDULED → FAILED */
  markFailed(queueId)    { return this.transition(queueId, DELIVERY_STATUS.FAILED); }

  /** @returns {object[]} */
  findByStatus(status) {
    return this.#repository.findQueueByStatus(status);
  }

  /** @returns {object[]} */
  findByUser(userId) {
    return this.#repository.findQueueByUser(userId);
  }

  /** @returns {object[]} */
  findAll() {
    return this.#repository.loadQueue();
  }

  // ── Retry (PR-027) ───────────────────────────────────────────────────────

  /**
   * Reset a FAILED entry back to PENDING for retry.
   * Only DeliveryRetryService should call this — not UI code.
   * Throws if the entry is not in FAILED status.
   * @param {string} queueId
   * @returns {object} updated entry
   */
  resetToPending(queueId) {
    const queue = this.#repository.loadQueue();
    const idx   = queue.findIndex(e => e.id === queueId);
    if (idx === -1) throw new Error(`[DeliveryQueue] Entry not found: "${queueId}"`);

    const current = queue[idx];
    if (current.status !== DELIVERY_STATUS.FAILED) {
      throw new Error(
        `[DeliveryQueue] resetToPending only allowed from FAILED, got "${current.status}" for "${queueId}"`
      );
    }

    queue[idx] = { ...current, status: DELIVERY_STATUS.PENDING, updatedAt: new Date().toISOString() };
    this.#repository.saveQueue(queue);
    return queue[idx];
  }
}
