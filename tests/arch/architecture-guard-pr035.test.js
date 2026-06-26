// tests/arch/architecture-guard-pr035.test.js
// PR-035 Architecture Guard — forbidden rules for Snapshot layer
import { describe, it, expect } from 'vitest';
import { runArchitectureGuard } from '../../src/application/architecture-guard.js';

function withWindow(fn) {
  const win = { __ippoArchGuard: null };
  const orig = globalThis.window;
  globalThis.window = win;
  try {
    runArchitectureGuard();
    fn(win.__ippoArchGuard);
  } finally {
    globalThis.window = orig;
  }
}

describe('ArchGuard PR-035 — SignalSnapshotRepository', () => {
  it('flags screen → signal-snapshot-repository', () => {
    withWindow((g) => {
      g.check('/screens/home/', '/domains/network/signal-snapshot-repository.js');
      expect(g.violations.some(v => v.label === 'screen→SignalSnapshotRepository')).toBe(true);
    });
  });

  it('flags feature → signal-snapshot-repository', () => {
    withWindow((g) => {
      g.check('/features/snapshot/', '/domains/network/signal-snapshot-repository.js');
      expect(g.violations.some(v => v.label === 'feature→SignalSnapshotRepository')).toBe(true);
    });
  });

  it('does NOT flag application → signal-snapshot-repository', () => {
    withWindow((g) => {
      g.check('/application/composition-root.js', '/domains/network/signal-snapshot-repository.js');
      expect(g.violations.some(v => v.label === 'screen→SignalSnapshotRepository')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→SignalSnapshotRepository')).toBe(false);
    });
  });
});

describe('ArchGuard PR-035 — SignalSnapshotService', () => {
  it('flags screen → signal-snapshot-service', () => {
    withWindow((g) => {
      g.check('/screens/dashboard/', '/domains/network/signal-snapshot-service.js');
      expect(g.violations.some(v => v.label === 'screen→SignalSnapshotService')).toBe(true);
    });
  });

  it('flags feature → signal-snapshot-service', () => {
    withWindow((g) => {
      g.check('/features/analytics/', '/domains/network/signal-snapshot-service.js');
      expect(g.violations.some(v => v.label === 'feature→SignalSnapshotService')).toBe(true);
    });
  });
});

describe('ArchGuard PR-035 — LongitudinalSnapshotService', () => {
  it('flags screen → longitudinal-snapshot-service', () => {
    withWindow((g) => {
      g.check('/screens/record/', '/domains/network/longitudinal-snapshot-service.js');
      expect(g.violations.some(v => v.label === 'screen→LongitudinalSnapshotService')).toBe(true);
    });
  });

  it('flags feature → longitudinal-snapshot-service', () => {
    withWindow((g) => {
      g.check('/features/signal/', '/domains/network/longitudinal-snapshot-service.js');
      expect(g.violations.some(v => v.label === 'feature→LongitudinalSnapshotService')).toBe(true);
    });
  });

  it('does NOT flag domain → longitudinal-snapshot-service', () => {
    withWindow((g) => {
      g.check('/application/api-gateway.js', '/domains/network/longitudinal-snapshot-service.js');
      expect(g.violations.some(v => v.label === 'screen→LongitudinalSnapshotService')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→LongitudinalSnapshotService')).toBe(false);
    });
  });
});

describe('ArchGuard PR-035 — DiseaseSnapshotService', () => {
  it('flags screen → disease-snapshot-service', () => {
    withWindow((g) => {
      g.check('/screens/disease/', '/domains/disease/disease-snapshot-service.js');
      expect(g.violations.some(v => v.label === 'screen→DiseaseSnapshotService')).toBe(true);
    });
  });

  it('flags feature → disease-snapshot-service', () => {
    withWindow((g) => {
      g.check('/features/admin/', '/domains/disease/disease-snapshot-service.js');
      expect(g.violations.some(v => v.label === 'feature→DiseaseSnapshotService')).toBe(true);
    });
  });

  it('does NOT flag application → disease-snapshot-service', () => {
    withWindow((g) => {
      g.check('/application/composition-root.js', '/domains/disease/disease-snapshot-service.js');
      expect(g.violations.some(v => v.label === 'screen→DiseaseSnapshotService')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→DiseaseSnapshotService')).toBe(false);
    });
  });
});
