// persistent-network-signal-service.js — Orchestrates in-memory ↔ Storage sync for NetworkSignal.
// BD-022: Wave1 Storage abstraction layer (Supabase is Wave2).
// BD-016: StorageRepository is the SSOT for persisted signals.
// BD-015: Signals are re-constructible from Records (enforced via SignalReconstructionService).
// PR-033: NetworkSignal Persistence Foundation

export class PersistentNetworkSignalService {
  #signalRepository;   // NetworkSignalRepository (in-memory, Wave1 SSOT for live session)
  #storageRepository;  // NetworkSignalStorageRepository (Storage-backed persistence)

  /**
   * @param {{
   *   signalRepository:  import('./network-signal-repository.js').NetworkSignalRepository,
   *   storageRepository: import('./network-signal-storage-repository.js').NetworkSignalStorageRepository,
   * }} deps
   */
  constructor({ signalRepository, storageRepository }) {
    if (!signalRepository) throw new Error('[PersistentNetworkSignalService] signalRepository is required');
    if (!storageRepository) throw new Error('[PersistentNetworkSignalService] storageRepository is required');
    this.#signalRepository   = signalRepository;
    this.#storageRepository  = storageRepository;
  }

  /**
   * Persist a single NetworkSignal to the storage layer.
   * Does NOT duplicate to in-memory repo — in-memory is managed by NetworkSignalService.
   * @param {import('./network-signal-entity.js').NetworkSignal} signal
   * @returns {import('./network-signal-entity.js').NetworkSignal}
   */
  save(signal) {
    return this.#storageRepository.save(signal);
  }

  /**
   * Persist multiple NetworkSignals in a single write.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  saveMany(signals) {
    return this.#storageRepository.saveMany(signals);
  }

  /**
   * Return all persisted NetworkSignals from the storage layer.
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  findAll() {
    return this.#storageRepository.findAll();
  }

  /**
   * Return persisted signals for a specific record.
   * @param {string} recordId
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  findByRecord(recordId) {
    return this.#storageRepository.findByRecord(recordId);
  }

  /**
   * Return persisted signals of a specific signal type.
   * @param {string} signalType
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  findByType(signalType) {
    return this.#storageRepository.findByType(signalType);
  }

  /**
   * Clear the persisted signal cache.
   * Wave1: removes the storage key. Permanent DELETE is BD-022 Wave2 scope.
   */
  clearCache() {
    this.#storageRepository.clearCache();
  }

  /**
   * Return the current persistence status.
   * Used by ApiGateway.getPersistenceStatus().
   * @returns {{
   *   layer: string,
   *   storageKey: string,
   *   persistedCount: number,
   *   inMemoryCount: number,
   *   bd022Compliant: boolean,
   *   wave: string,
   * }}
   */
  getPersistenceStatus() {
    return {
      layer:          'storage-abstraction',
      storageKey:     this.#storageRepository.storageKey,
      persistedCount: this.#storageRepository.count,
      inMemoryCount:  this.#signalRepository.count,
      bd022Compliant: true,
      wave:           'Wave1 — Storage abstraction. Supabase is Wave2.',
    };
  }
}
