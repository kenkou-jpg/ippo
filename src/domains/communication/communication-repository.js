// CommunicationRepository — StorageService-backed persistence for Communication Domain.
// All access goes through StorageService (never localStorage directly).
// PR-023: Communication Layer

const KEYS = Object.freeze({
  AUDIT_LOG: 'ippo_comm_audit_log',
  METRICS:   'ippo_comm_metrics',
});

export class CommunicationRepository {
  #storage;

  /** @param {import('../../contracts/IStorageService.js').IStorageService} storage */
  constructor(storage) {
    this.#storage = storage;
  }

  // ── Audit Log (append-only) ───────────────────────────────────────────────

  /**
   * Append an audit entry. Does NOT support update or delete.
   * @param {object} entry
   */
  saveAuditLog(entry) {
    const log = this.#storage.get(KEYS.AUDIT_LOG) ?? [];
    log.push(entry);
    this.#storage.set(KEYS.AUDIT_LOG, log);
  }

  /**
   * Find all entries with status GENERATED or PENDING.
   * @returns {object[]}
   */
  findPending() {
    const log = this.#storage.get(KEYS.AUDIT_LOG) ?? [];
    return log.filter(e => e.status === 'GENERATED' || e.status === 'PENDING');
  }

  /**
   * Find all entries for a given userId.
   * @param {string} userId
   * @returns {object[]}
   */
  findByUser(userId) {
    const log = this.#storage.get(KEYS.AUDIT_LOG) ?? [];
    return log.filter(e => e.userId === userId);
  }

  // ── Metrics ───────────────────────────────────────────────────────────────

  /**
   * @returns {object|null}
   */
  loadMetrics() {
    return this.#storage.get(KEYS.METRICS) ?? null;
  }

  /**
   * @param {object} metrics
   */
  saveMetrics(metrics) {
    this.#storage.set(KEYS.METRICS, metrics);
  }
}
