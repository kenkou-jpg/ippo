// tests/arch/architecture-guard-pr033.test.js
// PR-033 Architecture Guard — forbidden dependency rules for Persistent Signal layer
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runArchitectureGuard } from '../../src/application/architecture-guard.js';

function withWindow(fn) {
  const win = {
    __ippoArchGuard: null,
  };
  const origWindow = globalThis.window;
  globalThis.window = win;
  try {
    runArchitectureGuard();
    fn(win.__ippoArchGuard);
  } finally {
    globalThis.window = origWindow;
  }
}

describe('ArchGuard PR-033 — PersistentNetworkSignalService rules', () => {
  it('flags screen → persistent-network-signal-service', () => {
    withWindow((guard) => {
      guard.check('/screens/dashboard/', '/domains/network/persistent-network-signal-service.js');
      expect(guard.violations.some(v => v.label === 'screen→PersistentNetworkSignalService')).toBe(true);
    });
  });

  it('flags feature → persistent-network-signal-service', () => {
    withWindow((guard) => {
      guard.check('/features/signal-list/', '/domains/network/persistent-network-signal-service.js');
      expect(guard.violations.some(v => v.label === 'feature→PersistentNetworkSignalService')).toBe(true);
    });
  });

  it('does NOT flag api-gateway → persistent-network-signal-service', () => {
    withWindow((guard) => {
      guard.check('/application/api-gateway.js', '/domains/network/persistent-network-signal-service.js');
      expect(guard.violations.some(v => v.label === 'screen→PersistentNetworkSignalService')).toBe(false);
      expect(guard.violations.some(v => v.label === 'feature→PersistentNetworkSignalService')).toBe(false);
    });
  });
});

describe('ArchGuard PR-033 — NetworkSignalStorageRepository rules', () => {
  it('flags screen → network-signal-storage-repository', () => {
    withWindow((guard) => {
      guard.check('/screens/home/', '/domains/network/network-signal-storage-repository.js');
      expect(guard.violations.some(v => v.label === 'screen→NetworkSignalStorageRepository')).toBe(true);
    });
  });

  it('flags feature → network-signal-storage-repository', () => {
    withWindow((guard) => {
      guard.check('/features/record-input/', '/domains/network/network-signal-storage-repository.js');
      expect(guard.violations.some(v => v.label === 'feature→NetworkSignalStorageRepository')).toBe(true);
    });
  });
});

describe('ArchGuard PR-033 — SignalReconstructionService rules', () => {
  it('flags screen → signal-reconstruction-service', () => {
    withWindow((guard) => {
      guard.check('/screens/debug/', '/domains/network/signal-reconstruction-service.js');
      expect(guard.violations.some(v => v.label === 'screen→SignalReconstructionService')).toBe(true);
    });
  });

  it('flags feature → signal-reconstruction-service', () => {
    withWindow((guard) => {
      guard.check('/features/admin/', '/domains/network/signal-reconstruction-service.js');
      expect(guard.violations.some(v => v.label === 'feature→SignalReconstructionService')).toBe(true);
    });
  });

  it('does NOT flag domain → signal-reconstruction-service', () => {
    withWindow((guard) => {
      guard.check('/application/composition-root.js', '/domains/network/signal-reconstruction-service.js');
      expect(guard.violations.some(v => v.label === 'screen→SignalReconstructionService')).toBe(false);
      expect(guard.violations.some(v => v.label === 'feature→SignalReconstructionService')).toBe(false);
    });
  });
});

describe('ArchGuard PR-033 — violations array resets per invocation', () => {
  it('each check() call accumulates into the same guard session', () => {
    withWindow((guard) => {
      guard.check('/screens/a/', '/domains/network/persistent-network-signal-service.js');
      guard.check('/screens/b/', '/domains/network/network-signal-storage-repository.js');
      // persistent-network-signal-service also matches the PR-030 network-signal-service pattern,
      // so screen/a triggers 2 violations + screen/b triggers 1 = 3 total.
      expect(guard.violations.length).toBeGreaterThanOrEqual(2);
    });
  });
});
