// tests/network-domain/eventstore-signal-created.test.js
// SIGNAL_CREATED event persisted to SupabaseEventPersistenceRepository (PR-042)
import { describe, it, expect, vi } from 'vitest';
import { SupabaseEventPersistenceRepository } from '../../src/infrastructure/supabase-event-persistence-repository.js';
import { NetworkSignalSupabaseRepository }    from '../../src/domains/network/network-signal-supabase-repository.js';
import { NetworkSignalPersistenceService }    from '../../src/domains/network/network-signal-persistence-service.js';
import { buildNetworkSignal }                from '../../src/domains/network/network-signal-entity.js';

function makeSignal(overrides = {}) {
  return buildNetworkSignal({
    signalType: 'PAIN', normalizedValue: 0.5, rawValue: 5, unit: 'u', ...overrides,
  });
}

describe('SIGNAL_CREATED → SupabaseEventPersistenceRepository', () => {
  it('SIGNAL_CREATED event is stored in SupabaseEventPersistenceRepository', () => {
    const eventRepo = new SupabaseEventPersistenceRepository({ supabaseClient: null });
    const publisher = { publish: (event) => eventRepo.append(event) };
    const signalRepo = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const svc = new NetworkSignalPersistenceService({ repository: signalRepo, eventPublisher: publisher });
    svc.initialize();
    svc.append(makeSignal({ signalType: 'SLEEP' }));
    expect(eventRepo.count).toBe(1);
    const events = eventRepo.findAll();
    expect(events[0].eventType).toBe('SIGNAL_CREATED');
    expect(events[0].payload.signalType).toBe('SLEEP');
  });

  it('multiple appends create multiple SIGNAL_CREATED events', () => {
    const eventRepo  = new SupabaseEventPersistenceRepository({ supabaseClient: null });
    const publisher  = { publish: (e) => eventRepo.append(e) };
    const signalRepo = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const svc        = new NetworkSignalPersistenceService({ repository: signalRepo, eventPublisher: publisher });
    svc.initialize();
    svc.append(makeSignal({ signalType: 'PAIN' }));
    svc.append(makeSignal({ signalType: 'FATIGUE' }));
    svc.append(makeSignal({ signalType: 'SLEEP' }));
    expect(eventRepo.count).toBe(3);
    expect(eventRepo.findByType('SIGNAL_CREATED')).toHaveLength(3);
  });

  it('findByAggregateId returns events for specific signal', () => {
    const eventRepo  = new SupabaseEventPersistenceRepository({ supabaseClient: null });
    const publisher  = { publish: (e) => eventRepo.append(e) };
    const signalRepo = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const svc        = new NetworkSignalPersistenceService({ repository: signalRepo, eventPublisher: publisher });
    svc.initialize();
    const signal = makeSignal({ signalType: 'MOOD' });
    svc.append(signal);
    const events = eventRepo.findByAggregateId(signal.id);
    expect(events).toHaveLength(1);
    expect(events[0].aggregateId).toBe(signal.id);
  });

  it('migration signals do NOT generate SIGNAL_CREATED events in EventStore', () => {
    const eventRepo  = new SupabaseEventPersistenceRepository({ supabaseClient: null });
    const publisher  = { publish: (e) => eventRepo.append(e) };
    const signalRepo = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const svc        = new NetworkSignalPersistenceService({ repository: signalRepo, eventPublisher: publisher });
    const legacySignals = [makeSignal(), makeSignal()];
    svc.initialize({ migrationSource: { findAll: () => legacySignals } });
    // No events for migrated historical data
    expect(eventRepo.count).toBe(0);
    // New signal DOES generate event
    svc.append(makeSignal());
    expect(eventRepo.count).toBe(1);
  });
});
