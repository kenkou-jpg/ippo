// tests/research/architecture-guard-pr040.test.js
// ArchitectureGuard — Research Dataset boundary rules, PR-040
import { describe, it, expect } from 'vitest';
import { runArchitectureGuard } from '../../src/application/architecture-guard.js';

function withWindow(fn) {
  const win  = { __ippoArchGuard: null };
  const orig = globalThis.window;
  globalThis.window = win;
  try {
    runArchitectureGuard();
    fn(win.__ippoArchGuard);
  } finally {
    globalThis.window = orig;
  }
}

describe('ArchGuard PR-040 — ResearchDatasetRepository', () => {
  it('flags screen → research-dataset-repository', () => {
    withWindow((g) => {
      g.check('/screens/admin/', '/domains/research/research-dataset-repository.js');
      expect(g.violations.some(v => v.label === 'screen→ResearchDatasetRepository')).toBe(true);
    });
  });
  it('flags feature → research-dataset-repository', () => {
    withWindow((g) => {
      g.check('/features/export/', '/domains/research/research-dataset-repository.js');
      expect(g.violations.some(v => v.label === 'feature→ResearchDatasetRepository')).toBe(true);
    });
  });
  it('does NOT flag application → research-dataset-repository', () => {
    withWindow((g) => {
      g.check('/application/composition-root.js', '/domains/research/research-dataset-repository.js');
      expect(g.violations.some(v => v.label === 'screen→ResearchDatasetRepository')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→ResearchDatasetRepository')).toBe(false);
    });
  });
});

describe('ArchGuard PR-040 — ResearchDatasetBuilder', () => {
  it('flags screen → research-dataset-builder', () => {
    withWindow((g) => {
      g.check('/screens/research/', '/domains/research/research-dataset-builder.js');
      expect(g.violations.some(v => v.label === 'screen→ResearchDatasetBuilder')).toBe(true);
    });
  });
  it('flags feature → research-dataset-builder', () => {
    withWindow((g) => {
      g.check('/features/research/', '/domains/research/research-dataset-builder.js');
      expect(g.violations.some(v => v.label === 'feature→ResearchDatasetBuilder')).toBe(true);
    });
  });
});

describe('ArchGuard PR-040 — DatasetExportService', () => {
  it('flags screen → dataset-export-service', () => {
    withWindow((g) => {
      g.check('/screens/export/', '/domains/research/dataset-export-service.js');
      expect(g.violations.some(v => v.label === 'screen→DatasetExportService')).toBe(true);
    });
  });
  it('flags feature → dataset-export-service', () => {
    withWindow((g) => {
      g.check('/features/download/', '/domains/research/dataset-export-service.js');
      expect(g.violations.some(v => v.label === 'feature→DatasetExportService')).toBe(true);
    });
  });
});

describe('ArchGuard PR-040 — AnonymizationService', () => {
  it('flags screen → anonymization-service', () => {
    withWindow((g) => {
      g.check('/screens/admin/', '/domains/research/anonymization-service.js');
      expect(g.violations.some(v => v.label === 'screen→AnonymizationService')).toBe(true);
    });
  });
  it('flags feature → anonymization-service', () => {
    withWindow((g) => {
      g.check('/features/privacy/', '/domains/research/anonymization-service.js');
      expect(g.violations.some(v => v.label === 'feature→AnonymizationService')).toBe(true);
    });
  });
  it('does NOT flag domain → anonymization-service', () => {
    withWindow((g) => {
      g.check('/domains/research/research-dataset-service.js', '/domains/research/anonymization-service.js');
      expect(g.violations.some(v => v.label === 'screen→AnonymizationService')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→AnonymizationService')).toBe(false);
    });
  });
});
