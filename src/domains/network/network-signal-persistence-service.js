// network-signal-persistence-service.js — Wave2 Persistence Service.
// Decorates INetworkSignalRepository with:
//   1. Event publishing (SIGNAL_CREATED) on every append (Event Sourcing / BD-015)
//   2. Migration ingestion from Wave1 storage (BD-022 migration path)
//   3. Status reporting for diagnostics
//
// Implements INetworkSignalRepository so it can be injected wherever a
// repository is expected — callers require no change (Decorator Pattern).
//
// BD-022: NetworkSignal must be persistable to Supabase.
// BD-015: Every append generates a SIGNAL_CREATED event for Replay.
// AP-02:  Append-Only — no delete/update methods.
// PR-041: NetworkSignal Persistence Migration (Wave2 Phase A-1)

import { INetworkSignalRepository } from './network-signal-repository-interface.js';
import { buildDomainEvent }          from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES }        from '../events/domain-event-types.js';
import { AGGREGATE_TYPES }           from '../events/domain-event-types.js';

export class NetworkSignalPersistenceService extends INetworkSignalRepository {
  #repository;      // INetworkSignalRepository — the backing store
  #eventPublisher;  // EventPublisher | null — optional; null = event publishing skipped
  #initialized;     // boolean

  /**
   * @param {{
   *   repository:     import('./network-signal-repository-interface.js').INetworkSignalRepository,
   *   eventPublisher?: import('../events/event-publisher.js').EventPublisher | null,
   * }} deps
   */
  constructor({ repository, eventPublisher = null }) {
    super();
    if (!repository) throw new Error('[NetworkSignalPersistenceService] repository is required');
    if (!(repository instanceof INetworkSignalRepository)) {
      throw new Error('[NetworkSignalPersistenceService] repository must implement INetworkSignalRepository');
    }
    this.#repository     = repository;
    this.#eventPublisher = eventPublisher ?? null;
    this.#initialized    = false;
  }

  // ── INetworkSignalRepository implementation ───────────────────────────────

  /**
   * Append a signal and publish SIGNAL_CREATED event (if EventPublisher is wired).
   * @param {import('./network-signal-entity.js').NetworkSignal} signal
   * @returns {import('./network-signal-entity.js').NetworkSignal}
   */
  append(signal) {
    const stored = this.#repository.append(signal);
    this.#publishSignalCreated(stored);
    return stored;
  }

  /** @returns {import('./network-signal-entity.js').NetworkSignal[]} */
  findAll() {
    return this.#repository.findAll();
  }

  /**
   * @param {string} recordId
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  findByRecord(recordId) {
    return this.#repository.findByRecord(recordId);
  }

  /**
   * @param {string} signalType
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  findByType(signalType) {
    return this.#repository.findByType(signalType);
  }

  /** @returns {number} */
  get count() {
    return this.#repository.count;
  }

  /** @returns {string} */
  get repositoryType() {
    return this.#repository.repositoryType;
  }

  /** @returns {{ appendOnly: boolean, persistent: boolean, supabase: boolean }} */
  get capabilities() {
    return this.#repository.capabilities;
  }

  // ── Migration ─────────────────────────────────────────────────────────────

  /**
   * Initialize from a Wave1 migration source.
   * Loads signals from the source without publishing events (historical data).
   * Idempotent — calling twice is safe; subsequent calls after the first are no-ops.
   *
   * @param {{ migrationSource?: { findAll(): import('./network-signal-entity.js').NetworkSignal[] } | null }} options
   * @returns {{ migrated: number, skipped: number, alreadyInitialized: boolean }}
   */
  initialize({ migrationSource = null } = {}) {
    if (this.#initialized) {
      return { migrated: 0, skipped: 0, alreadyInitialized: true };
    }
    this.#initialized = true;

    if (!migrationSource) {
      return { migrated: 0, skipped: 0, alreadyInitialized: false };
    }

    const legacySignals = migrationSource.findAll();
    let migrated = 0;

    for (const signal of legacySignals) {
      // Append directly to backing repository — no event publishing for migrated data.
      this.#repository.append(signal);
      migrated++;
    }

    return { migrated, skipped: 0, alreadyInitialized: false };
  }

  // ── Status ────────────────────────────────────────────────────────────────

  /**
   * Return diagnostics for monitoring and ApiGateway status endpoints.
   * @returns {{
   *   repositoryType: string,
   *   capabilities: object,
   *   signalCount: number,
   *   eventPublisherWired: boolean,
   *   initialized: boolean,
   *   wave: string,
   *   bd022: string,
   * }}
   */
  getStatus() {
    return {
      repositoryType:     this.#repository.repositoryType,
      capabilities:       this.#repository.capabilities,
      signalCount:        this.#repository.count,
      eventPublisherWired: !!this.#eventPublisher,
      initialized:        this.#initialized,
      wave:               'Wave2 Phase A-1',
      bd022:              'Interface complete — Supabase backend available in PR-042',
    };
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #publishSignalCreated(signal) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.SIGNAL_CREATED,
        aggregateType: AGGREGATE_TYPES.SIGNAL,
        aggregateId:   signal.id,
        payload: {
          signalType:      signal.signalType,
          recordId:        signal.recordId,
          normalizedValue: signal.normalizedValue,
          rawValue:        signal.rawValue,
          unit:            signal.unit,
          vectorVersion:   signal.vectorVersion,
          menstrualPhase:  signal.menstrualPhase,
          timestamp:       signal.timestamp,
        },
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort; repository write already succeeded.
    }
  }
}
