// network-signal-repository.js — Wave1 in-memory stub for NetworkSignal persistence.
// NETWORK ASSET COUNCIL (IPPO-COUNCIL-002) NAC-01 / NAC-02.
// BD-012: Longitudinal Signal computation is Wave2 scope — not implemented here.
// BD-013: Signal SSOT is network-signal-types.js.
// Storage禁止: no StorageService, no localStorage, no Supabase.
// DB禁止: no schema changes, no migrations.
// All data is session-scoped in-memory only. Persistence to DB is Wave2 scope.
// PR-030: Network Signal Foundation

export class NetworkSignalRepository {
  #signals = [];

  /**
   * Append a NetworkSignal to the in-memory store.
   * Wave1: not persisted across sessions.
   * @param {import('./network-signal-entity.js').NetworkSignal} signal
   * @returns {import('./network-signal-entity.js').NetworkSignal}
   */
  append(signal) {
    this.#signals = [...this.#signals, signal];
    return signal;
  }

  /**
   * Return all signals.
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  findAll() {
    return [...this.#signals];
  }

  /**
   * Return signals associated with a specific record.
   * @param {string} recordId
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  findByRecord(recordId) {
    return this.#signals.filter(s => s.recordId === recordId);
  }

  /**
   * Return signals of a specific signal type.
   * @param {string} signalType
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  findByType(signalType) {
    return this.#signals.filter(s => s.signalType === signalType);
  }

  /** Return current count of stored signals. */
  get count() {
    return this.#signals.length;
  }
}
