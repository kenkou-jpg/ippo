// network-signal-repository-interface.js — Wave2 Repository Interface (SSOT).
// BD-022: NetworkSignal must be persistable to Supabase (Wave2 scope).
// BD-016: Each data asset has exactly one SSOT — this interface defines it.
// AP-02: Append-Only is enforced structurally — no delete() method exists.
// PR-041: NetworkSignal Persistence Migration (Wave2 Phase A-1)

/**
 * INetworkSignalRepository — Base interface for all NetworkSignal repository implementations.
 *
 * Design constraints:
 *  - Append-Only: no delete/update methods (BD-001 / AP-02)
 *  - All implementations must be swap-compatible (BD-034 / AP-03)
 *  - Supabase implementation will be wired in PR-042
 */
export class INetworkSignalRepository {
  /**
   * Append a NetworkSignal. Append-Only — never updates existing entries.
   * @param {import('./network-signal-entity.js').NetworkSignal} signal
   * @returns {import('./network-signal-entity.js').NetworkSignal}
   */
  // eslint-disable-next-line no-unused-vars
  append(signal) {
    throw new Error(`[INetworkSignalRepository] append() not implemented in ${this.constructor.name}`);
  }

  /**
   * Return all stored signals.
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  findAll() {
    throw new Error(`[INetworkSignalRepository] findAll() not implemented in ${this.constructor.name}`);
  }

  /**
   * Return all signals tied to a specific record.
   * @param {string} recordId
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  // eslint-disable-next-line no-unused-vars
  findByRecord(recordId) {
    throw new Error(`[INetworkSignalRepository] findByRecord() not implemented in ${this.constructor.name}`);
  }

  /**
   * Return all signals of a given signal type.
   * @param {string} signalType
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  // eslint-disable-next-line no-unused-vars
  findByType(signalType) {
    throw new Error(`[INetworkSignalRepository] findByType() not implemented in ${this.constructor.name}`);
  }

  /** Total number of stored signals. @returns {number} */
  get count() {
    throw new Error(`[INetworkSignalRepository] count not implemented in ${this.constructor.name}`);
  }

  /**
   * Repository backend identifier.
   * 'memory' for Wave1 / PR-041.
   * 'supabase' for Wave2 Supabase implementation (PR-042).
   * @returns {'memory'|'supabase'}
   */
  get repositoryType() {
    throw new Error(`[INetworkSignalRepository] repositoryType not implemented in ${this.constructor.name}`);
  }

  /**
   * Capabilities declaration — used by persistence service and factory to make routing decisions.
   * @returns {{ appendOnly: boolean, persistent: boolean, supabase: boolean }}
   */
  get capabilities() {
    return { appendOnly: true, persistent: false, supabase: false };
  }
}
