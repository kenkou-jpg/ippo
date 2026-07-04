// tests/infrastructure/repository-provider-supabase.test.js
// RepositoryProvider — Supabase wiring (PR-042)
import { describe, it, expect, vi } from 'vitest';
import { RepositoryProvider }              from '../../src/infrastructure/repository-provider.js';
import { NetworkSignalSupabaseRepository } from '../../src/domains/network/network-signal-supabase-repository.js';
import { NetworkSignalPersistenceService } from '../../src/domains/network/network-signal-persistence-service.js';
import { PERSISTENCE_CONFIG }             from '../../src/infrastructure/persistence-config.js';

const mockClient = {
  from: vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({ data: [], error: null }),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
  auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
};

function makeProvider(overrides = {}) {
  return new RepositoryProvider({
    config:         PERSISTENCE_CONFIG,
    migrationSource: null,
    eventPublisher: null,
    supabaseClient: mockClient,
    ...overrides,
  });
}

describe('RepositoryProvider — supabase wiring', () => {
  it('accepts supabaseClient in constructor without throwing', () => {
    expect(() => makeProvider()).not.toThrow();
  });

  it('creates NetworkSignalPersistenceService backed by Supabase', () => {
    const svc = makeProvider().createNetworkSignalPersistenceService();
    expect(svc).toBeInstanceOf(NetworkSignalPersistenceService);
    expect(svc.repositoryType).toBe('supabase');
  });

  it('capabilities.persistent is true for supabase-backed service', () => {
    const svc = makeProvider().createNetworkSignalPersistenceService();
    expect(svc.capabilities.persistent).toBe(true);
    expect(svc.capabilities.supabase).toBe(true);
  });

  it('createAndInitializeNetworkSignalPersistenceService initializes', () => {
    const svc = makeProvider().createAndInitializeNetworkSignalPersistenceService();
    expect(svc.getStatus().initialized).toBe(true);
    expect(svc.repositoryType).toBe('supabase');
  });

  it('supabaseClient: null creates degraded-mode supabase repo (no throw)', () => {
    const provider = makeProvider({ supabaseClient: null });
    const svc = provider.createNetworkSignalPersistenceService();
    expect(svc.repositoryType).toBe('supabase'); // still supabase type
    expect(svc.count).toBe(0);
  });

  it('PERSISTENCE_CONFIG.networkSignal.backend is "supabase"', () => {
    expect(PERSISTENCE_CONFIG.networkSignal.backend).toBe('supabase');
  });
});
