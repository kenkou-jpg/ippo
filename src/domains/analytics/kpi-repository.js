// KpiRepository — StorageService-backed persistence for KPI snapshots.
// Snapshots are append-only (time-series). No delete.
// PR-024: Admin Analytics Layer

const KEY = 'ippo_kpi_snapshots';

export class KpiRepository {
  #storage;

  constructor(storage) {
    this.#storage = storage;
  }

  /**
   * Append a KPI snapshot. Cannot update or delete.
   * @param {object} snapshot
   */
  append(snapshot) {
    const log = this.#storage.get(KEY) ?? [];
    log.push(snapshot);
    this.#storage.set(KEY, log);
  }

  /**
   * Return all snapshots in insertion order.
   * @returns {object[]}
   */
  findAll() {
    return this.#storage.get(KEY) ?? [];
  }

  /**
   * Return the most recent snapshot, or null if none exist.
   * @returns {object|null}
   */
  findLatest() {
    const log = this.#storage.get(KEY) ?? [];
    return log.length > 0 ? log[log.length - 1] : null;
  }
}
