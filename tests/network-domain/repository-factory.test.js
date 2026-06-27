// tests/network-domain/repository-factory.test.js
// NetworkSignalRepositoryFactory (PR-041)
import { describe, it, expect } from 'vitest';
import { NetworkSignalRepositoryFactory }   from '../../src/domains/network/repository-factory.js';
import { NetworkSignalMemoryRepository }    from '../../src/domains/network/network-signal-memory-repository.js';
import { NetworkSignalSupabaseRepository }  from '../../src/domains/network/network-signal-supabase-repository.js';
import { INetworkSignalRepository }         from '../../src/domains/network/network-signal-repository-interface.js';
import { PERSISTENCE_BACKEND }              from '../../src/infrastructure/persistence-config.js';

describe('NetworkSignalRepositoryFactory.create', () => {
  it('creates NetworkSignalMemoryRepository for backend "memory"', () => {
    const repo = NetworkSignalRepositoryFactory.create({ backend: PERSISTENCE_BACKEND.MEMORY });
    expect(repo).toBeInstanceOf(NetworkSignalMemoryRepository);
  });

  it('created instance extends INetworkSignalRepository', () => {
    const repo = NetworkSignalRepositoryFactory.create({ backend: PERSISTENCE_BACKEND.MEMORY });
    expect(repo).toBeInstanceOf(INetworkSignalRepository);
  });

  it('defaults to memory backend when config is not supplied', () => {
    const repo = NetworkSignalRepositoryFactory.create();
    expect(repo.repositoryType).toBe('memory');
  });

  it('defaults to memory backend when config.backend is undefined', () => {
    const repo = NetworkSignalRepositoryFactory.create({});
    expect(repo.repositoryType).toBe('memory');
  });

  it('creates NetworkSignalSupabaseRepository for backend "supabase" (PR-042)', () => {
    const repo = NetworkSignalRepositoryFactory.create({
      backend: PERSISTENCE_BACKEND.SUPABASE,
      supabaseClient: null,
    });
    expect(repo).toBeInstanceOf(NetworkSignalSupabaseRepository);
    expect(repo.repositoryType).toBe('supabase');
  });

  it('throws for unknown backend', () => {
    expect(() =>
      NetworkSignalRepositoryFactory.create({ backend: 'redis' })
    ).toThrow('Unknown backend');
  });

  it('each call returns a fresh independent instance', () => {
    const r1 = NetworkSignalRepositoryFactory.create({ backend: PERSISTENCE_BACKEND.MEMORY });
    const r2 = NetworkSignalRepositoryFactory.create({ backend: PERSISTENCE_BACKEND.MEMORY });
    expect(r1).not.toBe(r2);
  });
});
