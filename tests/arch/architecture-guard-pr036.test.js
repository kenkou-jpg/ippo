// tests/arch/architecture-guard-pr036.test.js
// PR-036 Architecture Guard — forbidden rules for Similarity Intelligence layer
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

describe('ArchGuard PR-036 — FeatureVectorRepository', () => {
  it('flags screen → feature-vector-repository', () => {
    withWindow((g) => {
      g.check('/screens/home/', '/domains/similarity/feature-vector-repository.js');
      expect(g.violations.some(v => v.label === 'screen→FeatureVectorRepository')).toBe(true);
    });
  });

  it('flags feature → feature-vector-repository', () => {
    withWindow((g) => {
      g.check('/features/similarity/', '/domains/similarity/feature-vector-repository.js');
      expect(g.violations.some(v => v.label === 'feature→FeatureVectorRepository')).toBe(true);
    });
  });

  it('does NOT flag application → feature-vector-repository', () => {
    withWindow((g) => {
      g.check('/application/composition-root.js', '/domains/similarity/feature-vector-repository.js');
      expect(g.violations.some(v => v.label === 'screen→FeatureVectorRepository')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→FeatureVectorRepository')).toBe(false);
    });
  });
});

describe('ArchGuard PR-036 — FeatureVectorService', () => {
  it('flags screen → feature-vector-service', () => {
    withWindow((g) => {
      g.check('/screens/similarity/', '/domains/similarity/feature-vector-service.js');
      expect(g.violations.some(v => v.label === 'screen→FeatureVectorService')).toBe(true);
    });
  });

  it('flags feature → feature-vector-service', () => {
    withWindow((g) => {
      g.check('/features/network/', '/domains/similarity/feature-vector-service.js');
      expect(g.violations.some(v => v.label === 'feature→FeatureVectorService')).toBe(true);
    });
  });
});

describe('ArchGuard PR-036 — FvSimilarityEngine', () => {
  it('flags screen → fv-similarity-engine', () => {
    withWindow((g) => {
      g.check('/screens/dashboard/', '/domains/similarity/fv-similarity-engine.js');
      expect(g.violations.some(v => v.label === 'screen→FvSimilarityEngine')).toBe(true);
    });
  });

  it('flags feature → fv-similarity-engine', () => {
    withWindow((g) => {
      g.check('/features/analytics/', '/domains/similarity/fv-similarity-engine.js');
      expect(g.violations.some(v => v.label === 'feature→FvSimilarityEngine')).toBe(true);
    });
  });

  it('does NOT flag domain → fv-similarity-engine', () => {
    withWindow((g) => {
      g.check('/application/api-gateway.js', '/domains/similarity/fv-similarity-engine.js');
      expect(g.violations.some(v => v.label === 'screen→FvSimilarityEngine')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→FvSimilarityEngine')).toBe(false);
    });
  });
});

describe('ArchGuard PR-036 — SignalSimilarityService', () => {
  it('flags screen → signal-similarity-service', () => {
    withWindow((g) => {
      g.check('/screens/record/', '/domains/similarity/signal-similarity-service.js');
      expect(g.violations.some(v => v.label === 'screen→SignalSimilarityService')).toBe(true);
    });
  });

  it('flags feature → signal-similarity-service', () => {
    withWindow((g) => {
      g.check('/features/admin/', '/domains/similarity/signal-similarity-service.js');
      expect(g.violations.some(v => v.label === 'feature→SignalSimilarityService')).toBe(true);
    });
  });

  it('does NOT flag application → signal-similarity-service', () => {
    withWindow((g) => {
      g.check('/application/composition-root.js', '/domains/similarity/signal-similarity-service.js');
      expect(g.violations.some(v => v.label === 'screen→SignalSimilarityService')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→SignalSimilarityService')).toBe(false);
    });
  });
});
