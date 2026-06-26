// tests/arch/architecture-guard-pr034.test.js
// PR-034 Architecture Guard — forbidden rules for Disease Cluster layer
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

describe('ArchGuard PR-034 — DiseaseClusterRepository', () => {
  it('flags screen → disease-cluster-repository', () => {
    withWindow((g) => {
      g.check('/screens/home/', '/domains/disease/disease-cluster-repository.js');
      expect(g.violations.some(v => v.label === 'screen→DiseaseClusterRepository')).toBe(true);
    });
  });

  it('flags feature → disease-cluster-repository', () => {
    withWindow((g) => {
      g.check('/features/cluster/', '/domains/disease/disease-cluster-repository.js');
      expect(g.violations.some(v => v.label === 'feature→DiseaseClusterRepository')).toBe(true);
    });
  });

  it('does NOT flag application → disease-cluster-repository', () => {
    withWindow((g) => {
      g.check('/application/composition-root.js', '/domains/disease/disease-cluster-repository.js');
      expect(g.violations.some(v => v.label === 'screen→DiseaseClusterRepository')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→DiseaseClusterRepository')).toBe(false);
    });
  });
});

describe('ArchGuard PR-034 — DiseaseClusterService', () => {
  it('flags screen → disease-cluster-service', () => {
    withWindow((g) => {
      g.check('/screens/dashboard/', '/domains/disease/disease-cluster-service.js');
      expect(g.violations.some(v => v.label === 'screen→DiseaseClusterService')).toBe(true);
    });
  });

  it('flags feature → disease-cluster-service', () => {
    withWindow((g) => {
      g.check('/features/analytics/', '/domains/disease/disease-cluster-service.js');
      expect(g.violations.some(v => v.label === 'feature→DiseaseClusterService')).toBe(true);
    });
  });
});

describe('ArchGuard PR-034 — DiseaseSignalMapper', () => {
  it('flags screen → disease-signal-mapper', () => {
    withWindow((g) => {
      g.check('/screens/record/', '/domains/disease/disease-signal-mapper.js');
      expect(g.violations.some(v => v.label === 'screen→DiseaseSignalMapper')).toBe(true);
    });
  });

  it('flags feature → disease-signal-mapper', () => {
    withWindow((g) => {
      g.check('/features/signal/', '/domains/disease/disease-signal-mapper.js');
      expect(g.violations.some(v => v.label === 'feature→DiseaseSignalMapper')).toBe(true);
    });
  });
});

describe('ArchGuard PR-034 — ClusterSimilarityAdapter', () => {
  it('flags screen → cluster-similarity-adapter', () => {
    withWindow((g) => {
      g.check('/screens/similarity/', '/domains/disease/cluster-similarity-adapter.js');
      expect(g.violations.some(v => v.label === 'screen→ClusterSimilarityAdapter')).toBe(true);
    });
  });

  it('flags feature → cluster-similarity-adapter', () => {
    withWindow((g) => {
      g.check('/features/admin/', '/domains/disease/cluster-similarity-adapter.js');
      expect(g.violations.some(v => v.label === 'feature→ClusterSimilarityAdapter')).toBe(true);
    });
  });

  it('does NOT flag domain → cluster-similarity-adapter', () => {
    withWindow((g) => {
      g.check('/application/api-gateway.js', '/domains/disease/cluster-similarity-adapter.js');
      expect(g.violations.some(v => v.label === 'screen→ClusterSimilarityAdapter')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→ClusterSimilarityAdapter')).toBe(false);
    });
  });
});
