// tests/network-domain/repository-factory-supabase.test.js
// NetworkSignalRepositoryFactory — Supabase branch (PR-042)
import { describe, it, expect, vi } from 'vitest';
import { NetworkSignalRepositoryFactory }   from '../../src/domains/network/repository-factory.js';
import { NetworkSignalSupabaseRepository }  from '../../src/domains/network/network-signal-supabase-repository.js';
import { NetworkSignalMemoryRepository }    from '../../src/domains/network/network-signal-memory-repository.js';
import { INetworkSignalRepository }         from '../../src/domains/network/network-signal-repository-interface.js';
import { PERSISTENCE_BACKEND }             from '../../src/infrastructure/persistence-config.js';

const mockClient = { from: vi.fn(), auth: { getSession: vi.fn() } };

describe('NetworkSignalRepositoryFactory.create — supabase backend', () => {
  it('returns NetworkSignalSupabaseRepository for backend "supabase"', () => {
    const repo = NetworkSignalRepositoryFactory.create({
      backend: PERSISTENCE_BACKEND.SUPABASE,
      supabaseClient: mockClient,
    });
    expect(repo).toBeInstanceOf(NetworkSignalSupabaseRepository);
  });

  it('returned supabase repo implements INetworkSignalRepository', () => {
    const repo = NetworkSignalRepositoryFactory.create({
      backend: PERSISTENCE_BACKEND.SUPABASE,
      supabaseClient: mockClient,
    });
    expect(repo).toBeInstanceOf(INetworkSignalRepository);
  });

  it('returned supabase repo has repositoryType "supabase"', () => {
    const repo = NetworkSignalRepositoryFactory.create({
      backend: PERSISTENCE_BACKEND.SUPABASE,
      supabaseClient: null,
    });
    expect(repo.repositoryType).toBe('supabase');
  });

  it('still returns MemoryRepository for backend "memory"', () => {
    const repo = NetworkSignalRepositoryFactory.create({ backend: PERSISTENCE_BACKEND.MEMORY });
    expect(repo).toBeInstanceOf(NetworkSignalMemoryRepository);
  });

  it('passes supabaseClient: null gracefully (degraded mode)', () => {
    expect(() => NetworkSignalRepositoryFactory.create({
      backend: PERSISTENCE_BACKEND.SUPABASE,
      supabaseClient: null,
    })).not.toThrow();
  });

  it('still throws for unknown backend', () => {
    expect(() => NetworkSignalRepositoryFactory.create({ backend: 'invalid' }))
      .toThrow('Unknown backend: "invalid"');
  });
});
