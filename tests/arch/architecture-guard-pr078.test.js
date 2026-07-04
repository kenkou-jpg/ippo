// tests/arch/architecture-guard-pr078.test.js
// PR-078: Data Deletion Pipeline (BD-019).
// UI must not reach DataDeletionService directly — access via ApiGateway.
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

describe('ArchGuard PR-078 — DataDeletionService', () => {
  it('flags screen → data-deletion-service', () => {
    withWindow((g) => {
      g.check('/screens/admin/', '/domains/data-deletion/data-deletion-service.js');
      expect(g.violations.some(v => v.label === 'screen→DataDeletionService')).toBe(true);
    });
  });

  it('flags feature → data-deletion-service', () => {
    withWindow((g) => {
      g.check('/features/admin/', '/domains/data-deletion/data-deletion-service.js');
      expect(g.violations.some(v => v.label === 'feature→DataDeletionService')).toBe(true);
    });
  });

  it('does not flag domain-internal access to DataDeletionService', () => {
    withWindow((g) => {
      g.check('/application/api-gateway.js', '/domains/data-deletion/data-deletion-service.js');
      expect(g.violations.some(v => v.label === 'screen→DataDeletionService')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→DataDeletionService')).toBe(false);
    });
  });
});
