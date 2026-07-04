// tests/architecture/wave2-network-signal-guard.test.js
// PR-041 ArchitectureGuard — Wave2 NetworkSignal V2 forbidden dependencies
import { describe, it, expect } from 'vitest';

const FORBIDDEN = [
  // PR-041 Wave2 Repository V2 — must not be imported directly from screens/features
  { from: /\/screens\//,   to: /network-signal-repository-interface/,  label: 'screen→INetworkSignalRepository'         },
  { from: /\/features\//,  to: /network-signal-repository-interface/,  label: 'feature→INetworkSignalRepository'        },
  { from: /\/screens\//,   to: /network-signal-memory-repository/,     label: 'screen→NetworkSignalMemoryRepository'    },
  { from: /\/features\//,  to: /network-signal-memory-repository/,     label: 'feature→NetworkSignalMemoryRepository'   },
  { from: /\/screens\//,   to: /network-signal-persistence-service/,   label: 'screen→NetworkSignalPersistenceService'  },
  { from: /\/features\//,  to: /network-signal-persistence-service/,   label: 'feature→NetworkSignalPersistenceService' },
  { from: /\/screens\//,   to: /repository-factory/,                   label: 'screen→NetworkSignalRepositoryFactory'   },
  { from: /\/features\//,  to: /repository-factory/,                   label: 'feature→NetworkSignalRepositoryFactory'  },
  { from: /\/screens\//,   to: /repository-provider/,                  label: 'screen→RepositoryProvider'               },
  { from: /\/features\//,  to: /repository-provider/,                  label: 'feature→RepositoryProvider'              },
  { from: /\/screens\//,   to: /persistence-config/,                   label: 'screen→PersistenceConfig'                },
  { from: /\/features\//,  to: /persistence-config/,                   label: 'feature→PersistenceConfig'               },
];

function checkViolation(from, to) {
  return FORBIDDEN.filter(rule => rule.from.test(from) && rule.to.test(to));
}

describe('ArchitectureGuard — Wave2 PR-041 forbidden dependencies', () => {
  it('screen must not import INetworkSignalRepository directly', () => {
    const violations = checkViolation(
      '/screens/main-screen.js',
      '/domains/network/network-signal-repository-interface.js'
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].label).toBe('screen→INetworkSignalRepository');
  });

  it('feature must not import NetworkSignalMemoryRepository directly', () => {
    const violations = checkViolation(
      '/features/signal-view/index.js',
      '/domains/network/network-signal-memory-repository.js'
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].label).toBe('feature→NetworkSignalMemoryRepository');
  });

  it('screen must not import NetworkSignalPersistenceService directly', () => {
    const violations = checkViolation(
      '/screens/record-entry/view.js',
      '/domains/network/network-signal-persistence-service.js'
    );
    expect(violations).toHaveLength(1);
  });

  it('feature must not import RepositoryFactory directly', () => {
    const violations = checkViolation(
      '/features/network/network-feature.js',
      '/domains/network/repository-factory.js'
    );
    expect(violations).toHaveLength(1);
  });

  it('feature must not import RepositoryProvider directly', () => {
    const violations = checkViolation(
      '/features/health/health-feature.js',
      '/infrastructure/repository-provider.js'
    );
    expect(violations).toHaveLength(1);
  });

  it('feature must not import PersistenceConfig directly', () => {
    const violations = checkViolation(
      '/features/config/config-feature.js',
      '/infrastructure/persistence-config.js'
    );
    expect(violations).toHaveLength(1);
  });

  it('application layer (ApiGateway) CAN import persistence service — not a forbidden path', () => {
    const violations = checkViolation(
      '/application/api-gateway.js',
      '/domains/network/network-signal-persistence-service.js'
    );
    expect(violations).toHaveLength(0);
  });

  it('composition-root CAN import persistence config — not a forbidden path', () => {
    const violations = checkViolation(
      '/application/composition-root.js',
      '/infrastructure/persistence-config.js'
    );
    expect(violations).toHaveLength(0);
  });
});
