// tests/arch/architecture-guard-pr077.test.js
// PR-077: Release Readiness Recovery Program.
// UI must not reach ReleaseReadinessService directly — access via ApiGateway.
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

describe('ArchGuard PR-077 — ReleaseReadinessService', () => {
  it('flags screen → release-readiness-service', () => {
    withWindow((g) => {
      g.check('/screens/admin/', '/domains/release-readiness/release-readiness-service.js');
      expect(g.violations.some(v => v.label === 'screen→ReleaseReadinessService')).toBe(true);
    });
  });

  it('flags feature → release-readiness-service', () => {
    withWindow((g) => {
      g.check('/features/admin/', '/domains/release-readiness/release-readiness-service.js');
      expect(g.violations.some(v => v.label === 'feature→ReleaseReadinessService')).toBe(true);
    });
  });

  it('does not flag domain-internal access to ReleaseReadinessService', () => {
    withWindow((g) => {
      g.check('/application/api-gateway.js', '/domains/release-readiness/release-readiness-service.js');
      expect(g.violations.some(v => v.label === 'screen→ReleaseReadinessService')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→ReleaseReadinessService')).toBe(false);
    });
  });
});
