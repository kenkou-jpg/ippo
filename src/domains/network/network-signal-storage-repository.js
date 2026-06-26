// network-signal-storage-repository.js — StorageService-backed persistence for NetworkSignal.
// BD-022: Wave1 uses Storage abstraction; Supabase is Wave2 scope.
// BD-016: StorageService is the SSOT for this layer — no direct localStorage, no Supabase.
// PR-033: NetworkSignal Persistence Foundation
//
// Constraints:
//   - StorageService injected via DI only (no direct localStorage / Supabase / window)
//   - IndexedDB: forbidden
//   - DELETE: forbidden (BD-022 / KEEP_FOREVER policy)
//   - SSOT key: STORAGE_KEY constant below

const STORAGE_KEY = 'ippo_network_signals_v1';

export class NetworkSignalStorageRepository {
  #storage;

  /**
   * @param {{ storage: import('../../adapters/storage/local-storage-adapter.js').LocalStorageAdapter }} deps
   */
  constructor({ storage }) {
    if (!storage || typeof storage.get !== 'function' || typeof storage.set !== 'function') {
      throw new Error('[NetworkSignalStorageRepository] storage must implement IStorageService (get/set)');
    }
    this.#storage = storage;
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  #readAll() {
    const raw = this.#storage.get(STORAGE_KEY);
    if (!raw) return [];
    if (Array.isArray(raw)) return [...raw];
    return [];
  }

  #writeAll(signals) {
    this.#storage.set(STORAGE_KEY, signals);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Persist a single NetworkSignal.
   * Appends to the existing stored array; no overwrite, no DELETE.
   * @param {import('./network-signal-entity.js').NetworkSignal} signal
   * @returns {import('./network-signal-entity.js').NetworkSignal}
   */
  save(signal) {
    const existing = this.#readAll();
    this.#writeAll([...existing, signal]);
    return signal;
  }

  /**
   * Persist multiple NetworkSignals in a single write.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  saveMany(signals) {
    if (!Array.isArray(signals) || signals.length === 0) return [];
    const existing = this.#readAll();
    this.#writeAll([...existing, ...signals]);
    return signals;
  }

  /**
   * Return all persisted NetworkSignals.
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  findAll() {
    return this.#readAll();
  }

  /**
   * Return persisted signals for a specific record.
   * @param {string} recordId
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  findByRecord(recordId) {
    return this.#readAll().filter(s => s.recordId === recordId);
  }

  /**
   * Return persisted signals of a specific signal type.
   * @param {string} signalType
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  findByType(signalType) {
    return this.#readAll().filter(s => s.signalType === signalType);
  }

  /**
   * Clear the persisted signal cache.
   * Wave1: removes the storage key. Does NOT violate KEEP_FOREVER because
   * Wave1 storage is transient (session-scoped) and this is cache management.
   * Permanent DELETE is BD-022 Wave2 scope — forbidden from application layer.
   */
  clearCache() {
    this.#storage.remove(STORAGE_KEY);
  }

  /**
   * Return count of persisted signals (read-only, no side effects).
   * @returns {number}
   */
  get count() {
    return this.#readAll().length;
  }

  /**
   * Return the storage key used by this repository.
   * Exposed for diagnostics and tests.
   * @returns {string}
   */
  get storageKey() {
    return STORAGE_KEY;
  }
}
