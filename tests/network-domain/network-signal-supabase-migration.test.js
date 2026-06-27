// tests/network-domain/network-signal-supabase-migration.test.js
// Wave1 localStorage → Wave2 Supabase migration (PR-042)
import { describe, it, expect, vi } from 'vitest';
import { NetworkSignalSupabaseRepository } from '../../src/domains/network/network-signal-supabase-repository.js';
import { NetworkSignalPersistenceService } from '../../src/domains/network/network-signal-persistence-service.js';
import { buildNetworkSignal }              from '../../src/domains/network/network-signal-entity.js';

const mockClient = {
  from: vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({ data: [], error: null }),
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
  auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }) },
};

function makeLegacySignals(count = 3) {
  return Array.from({ length: count }, (_, i) =>
    buildNetworkSignal({ signalType: 'PAIN', normalizedValue: i * 0.1, rawValue: i, unit: 'u' })
  );
}

describe('Wave1 → Wave2 Supabase migration', () => {
  it('initialize() migrates localStorage signals into supabase repo (no events)', () => {
    const legacySignals = makeLegacySignals(5);
    const migrationSource = { findAll: () => legacySignals };
    const repo    = new NetworkSignalSupabaseRepository({ supabaseClient: mockClient });
    const eventPublisher = { publish: vi.fn() };
    const svc = new NetworkSignalPersistenceService({ repository: repo, eventPublisher });
    const result = svc.initialize({ migrationSource });
    expect(result.migrated).toBe(5);
    expect(result.alreadyInitialized).toBe(false);
    expect(svc.count).toBe(5);
    // No events published for migrated historical data
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('signals appended AFTER migration DO publish SIGNAL_CREATED events', () => {
    const migrationSource = { findAll: () => makeLegacySignals(2) };
    const repo   = new NetworkSignalSupabaseRepository({ supabaseClient: mockClient });
    const events = [];
    const publisher = { publish: (e) => events.push(e) };
    const svc = new NetworkSignalPersistenceService({ repository: repo, eventPublisher: publisher });
    svc.initialize({ migrationSource });
    svc.append(buildNetworkSignal({ signalType: 'SLEEP', normalizedValue: 0.8, rawValue: 6, unit: 'h' }));
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('SIGNAL_CREATED');
  });

  it('initialize() is idempotent — second call is no-op', () => {
    const repo = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const svc  = new NetworkSignalPersistenceService({ repository: repo });
    const r1   = svc.initialize({ migrationSource: { findAll: () => makeLegacySignals(3) } });
    const r2   = svc.initialize({ migrationSource: { findAll: () => makeLegacySignals(3) } });
    expect(r1.migrated).toBe(3);
    expect(r2.alreadyInitialized).toBe(true);
    expect(r2.migrated).toBe(0);
    expect(svc.count).toBe(3); // not 6
  });

  it('migration with empty source migrates 0 signals', () => {
    const repo   = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const svc    = new NetworkSignalPersistenceService({ repository: repo });
    const result = svc.initialize({ migrationSource: { findAll: () => [] } });
    expect(result.migrated).toBe(0);
    expect(svc.count).toBe(0);
  });

  it('migration without source returns migrated:0', () => {
    const repo   = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const svc    = new NetworkSignalPersistenceService({ repository: repo });
    const result = svc.initialize();
    expect(result.migrated).toBe(0);
  });

  it('getStatus() reports supabase repositoryType after migration', () => {
    const repo = new NetworkSignalSupabaseRepository({ supabaseClient: mockClient });
    const svc  = new NetworkSignalPersistenceService({ repository: repo });
    svc.initialize({ migrationSource: { findAll: () => makeLegacySignals(2) } });
    const status = svc.getStatus();
    expect(status.repositoryType).toBe('supabase');
    expect(status.capabilities.persistent).toBe(true);
    expect(status.signalCount).toBe(2);
  });
});
