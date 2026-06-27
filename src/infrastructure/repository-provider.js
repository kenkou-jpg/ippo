// repository-provider.js — Wave2 Repository Provider (DI helper).
// Single place that assembles NetworkSignalPersistenceService for DI injection.
// BD-034: Coordinates factory + persistence service + optional migration source.
// AP-05: Dependency direction — infrastructure → domain only.
// PR-041: NetworkSignal Persistence Migration (Wave2 Phase A-1)

import { NetworkSignalRepositoryFactory }  from '../domains/network/repository-factory.js';
import { NetworkSignalPersistenceService } from '../domains/network/network-signal-persistence-service.js';

export class RepositoryProvider {
  #config;
  #migrationSource;
  #eventPublisher;

  /**
   * @param {{
   *   config:           import('./persistence-config.js').typeof PERSISTENCE_CONFIG,
   *   migrationSource?: { findAll(): object[] } | null,
   *   eventPublisher?:  import('../domains/events/event-publisher.js').EventPublisher | null,
   * }} deps
   */
  constructor({ config, migrationSource = null, eventPublisher = null }) {
    if (!config?.networkSignal) {
      throw new Error('[RepositoryProvider] config.networkSignal is required');
    }
    this.#config          = config;
    this.#migrationSource = migrationSource ?? null;
    this.#eventPublisher  = eventPublisher  ?? null;
  }

  /**
   * Build a NetworkSignalPersistenceService for the configured backend.
   * Initialization (migration) is NOT triggered here — call initialize() separately.
   *
   * @returns {import('../domains/network/network-signal-persistence-service.js').NetworkSignalPersistenceService}
   */
  createNetworkSignalPersistenceService() {
    const repository = NetworkSignalRepositoryFactory.create(
      this.#config.networkSignal
    );
    return new NetworkSignalPersistenceService({
      repository,
      eventPublisher: this.#eventPublisher,
    });
  }

  /**
   * Build and initialize in one call (convenience for startup wiring).
   * @returns {import('../domains/network/network-signal-persistence-service.js').NetworkSignalPersistenceService}
   */
  createAndInitializeNetworkSignalPersistenceService() {
    const service = this.createNetworkSignalPersistenceService();
    service.initialize({ migrationSource: this.#migrationSource });
    return service;
  }
}
