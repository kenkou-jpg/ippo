// repository-factory.js — NetworkSignal Repository Factory.
// Creates the correct INetworkSignalRepository implementation based on config.
// BD-034: All Wave2 persistence targets Supabase — this factory enables the switch.
// BD-041: PR ordering must respect dependency graph — Supabase impl comes in PR-042.
// AP-03: SSOT isolation — factory is the single place where backend selection happens.
// PR-041: NetworkSignal Persistence Migration (Wave2 Phase A-1)

import { NetworkSignalMemoryRepository } from './network-signal-memory-repository.js';
import { PERSISTENCE_BACKEND }           from '../../infrastructure/persistence-config.js';

export class NetworkSignalRepositoryFactory {
  /**
   * Create an INetworkSignalRepository for the given backend.
   *
   * Supported backends:
   *   'memory'   — in-memory, session-scoped. Default for Wave2 Phase A-1.
   *   'supabase' — Supabase-backed. Available in PR-042.
   *
   * @param {{ backend?: string }} config
   * @returns {import('./network-signal-repository-interface.js').INetworkSignalRepository}
   */
  static create(config = {}) {
    const backend = config?.backend ?? PERSISTENCE_BACKEND.MEMORY;

    switch (backend) {
      case PERSISTENCE_BACKEND.MEMORY:
        return new NetworkSignalMemoryRepository();

      case PERSISTENCE_BACKEND.SUPABASE:
        throw new Error(
          '[NetworkSignalRepositoryFactory] Supabase backend is not yet implemented. ' +
          'Use PR-042 (NetworkSignal Supabase Adapter). Current backend: "supabase" is reserved.'
        );

      default:
        throw new Error(
          `[NetworkSignalRepositoryFactory] Unknown backend: "${backend}". ` +
          `Valid values: ${Object.values(PERSISTENCE_BACKEND).join(', ')}`
        );
    }
  }
}
