// tests/infrastructure/repository-provider.test.js
// RepositoryProvider — Wave2 DI helper (PR-041)
import { describe, it, expect, vi } from 'vitest';
import { RepositoryProvider }               from '../../src/infrastructure/repository-provider.js';
import { NetworkSignalPersistenceService }  from '../../src/domains/network/network-signal-persistence-service.js';
import { PERSISTENCE_CONFIG }               from '../../src/infrastructure/persistence-config.js';
import { buildNetworkSignal }               from '../../src/domains/network/network-signal-entity.js';

function makeProvider(overrides = {}) {
  return new RepositoryProvider({
    config:         PERSISTENCE_CONFIG,
    migrationSource: null,
    eventPublisher: null,
    ...overrides,
  });
}

describe('RepositoryProvider — construction', () => {
  it('throws when config.networkSignal is missing', () => {
    expect(() => new RepositoryProvider({ config: {} })).toThrow('config.networkSignal is required');
  });

  it('constructs successfully with PERSISTENCE_CONFIG', () => {
    expect(() => makeProvider()).not.toThrow();
  });
});

describe('RepositoryProvider.createNetworkSignalPersistenceService', () => {
  it('returns a NetworkSignalPersistenceService', () => {
    const svc = makeProvider().createNetworkSignalPersistenceService();
    expect(svc).toBeInstanceOf(NetworkSignalPersistenceService);
  });

  it('each call returns a fresh service instance', () => {
    const provider = makeProvider();
    const s1 = provider.createNetworkSignalPersistenceService();
    const s2 = provider.createNetworkSignalPersistenceService();
    expect(s1).not.toBe(s2);
  });

  it('returned service has repositoryType "memory" (Phase A-1 default)', () => {
    const svc = makeProvider().createNetworkSignalPersistenceService();
    expect(svc.repositoryType).toBe('memory');
  });
});

describe('RepositoryProvider.createAndInitializeNetworkSignalPersistenceService', () => {
  it('returns an initialized service', () => {
    const svc = makeProvider().createAndInitializeNetworkSignalPersistenceService();
    expect(svc.getStatus().initialized).toBe(true);
  });

  it('migrates signals from migrationSource during initialization', () => {
    const signal = buildNetworkSignal({
      signalType: 'PAIN', normalizedValue: 0.5, rawValue: 5, unit: 'pain_level_0_10',
    });
    const source = { findAll: () => [signal] };
    const provider = makeProvider({ migrationSource: source });
    const svc = provider.createAndInitializeNetworkSignalPersistenceService();
    expect(svc.count).toBe(1);
  });

  it('wires eventPublisher when provided', () => {
    const publish = vi.fn();
    const provider = makeProvider({ eventPublisher: { publish } });
    const svc = provider.createAndInitializeNetworkSignalPersistenceService();
    svc.append(buildNetworkSignal({
      signalType: 'SLEEP', normalizedValue: 0.8, rawValue: 6, unit: 'hours_0_12',
    }));
    expect(publish).toHaveBeenCalledOnce();
  });
});
