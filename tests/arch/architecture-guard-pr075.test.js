// tests/arch/architecture-guard-pr075.test.js
// PR-075: Wave2 Exit Audit (Phase G capstone).
// UI must not reach Wave2ExitAuditService directly — access via ApiGateway.
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

describe('ArchGuard PR-075 — Wave2ExitAuditService', () => {
  it('flags screen → wave2-exit-audit-service', () => {
    withWindow((g) => {
      g.check('/screens/admin/', '/domains/wave2-exit-audit/wave2-exit-audit-service.js');
      expect(g.violations.some(v => v.label === 'screen→Wave2ExitAuditService')).toBe(true);
    });
  });

  it('flags feature → wave2-exit-audit-service', () => {
    withWindow((g) => {
      g.check('/features/admin/', '/domains/wave2-exit-audit/wave2-exit-audit-service.js');
      expect(g.violations.some(v => v.label === 'feature→Wave2ExitAuditService')).toBe(true);
    });
  });

  it('does not flag domain-internal access to Wave2ExitAuditService', () => {
    withWindow((g) => {
      g.check('/application/api-gateway.js', '/domains/wave2-exit-audit/wave2-exit-audit-service.js');
      expect(g.violations.some(v => v.label === 'screen→Wave2ExitAuditService')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→Wave2ExitAuditService')).toBe(false);
    });
  });
});
