// network-signal-memory-repository.js — Wave2 In-Memory Repository Adapter.
// Implements INetworkSignalRepository for session-scoped in-memory storage.
// Supabase adapter will replace this in PR-042 without any change to callers.
// BD-022: in-memory is the Wave2 Phase A-1 adapter; Supabase is next.
// BD-013: SSOT type definitions remain in network-signal-types.js.
// AP-02: Append-Only enforced — no delete/update methods.
// PR-041: NetworkSignal Persistence Migration (Wave2 Phase A-1)

import { INetworkSignalRepository } from './network-signal-repository-interface.js';

export class NetworkSignalMemoryRepository extends INetworkSignalRepository {
  #signals = [];

  /**
   * Append a NetworkSignal. Append-Only.
   * @param {import('./network-signal-entity.js').NetworkSignal} signal
   * @returns {import('./network-signal-entity.js').NetworkSignal}
   */
  append(signal) {
    this.#signals = [...this.#signals, signal];
    return signal;
  }

  /**
   * Return a defensive copy of all signals.
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  findAll() {
    return [...this.#signals];
  }

  /**
   * Return signals for a specific record.
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

  /** @returns {number} */
  get count() {
    return this.#signals.length;
  }

  /** @returns {'memory'} */
  get repositoryType() {
    return 'memory';
  }

  /** @returns {{ appendOnly: boolean, persistent: boolean, supabase: boolean }} */
  get capabilities() {
    return { appendOnly: true, persistent: false, supabase: false };
  }
}
