// DeliveryRepository — StorageService-backed persistence for Delivery Domain.
// All I/O through StorageService only. No direct localStorage access.
// PR-024: Delivery & Admin Analytics Layer

const KEYS = Object.freeze({
  QUEUE: 'ippo_delivery_queue',
  AUDIT: 'ippo_delivery_audit',
});

export class DeliveryRepository {
  #storage;

  /** @param storage IStorageService */
  constructor(storage) {
    this.#storage = storage;
  }

  // ── Queue ─────────────────────────────────────────────────────────────────

  appendQueue(entry) {
    const q = this.#storage.get(KEYS.QUEUE) ?? [];
    q.push(entry);
    this.#storage.set(KEYS.QUEUE, q);
  }

  loadQueue() {
    return this.#storage.get(KEYS.QUEUE) ?? [];
  }

  saveQueue(queue) {
    this.#storage.set(KEYS.QUEUE, queue);
  }

  findQueueByStatus(status) {
    return this.loadQueue().filter(e => e.status === status);
  }

  findQueueByUser(userId) {
    return this.loadQueue().filter(e => e.userId === userId);
  }

  // ── Audit (append-only) ───────────────────────────────────────────────────

  appendAudit(entry) {
    const log = this.#storage.get(KEYS.AUDIT) ?? [];
    log.push(entry);
    this.#storage.set(KEYS.AUDIT, log);
  }

  loadAudit() {
    return this.#storage.get(KEYS.AUDIT) ?? [];
  }

  findAuditByUser(userId) {
    return this.loadAudit().filter(e => e.userId === userId);
  }
}
