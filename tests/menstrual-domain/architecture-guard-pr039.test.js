// tests/menstrual-domain/architecture-guard-pr039.test.js
// ArchitectureGuard — Menstrual boundary rules, PR-039
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

describe('ArchGuard PR-039 — MenstrualRepository', () => {
  it('flags screen → menstrual-repository', () => {
    withWindow((g) => {
      g.check('/screens/cycle/', '/domains/menstrual/menstrual-repository.js');
      expect(g.violations.some(v => v.label === 'screen→MenstrualRepository')).toBe(true);
    });
  });
  it('flags feature → menstrual-repository', () => {
    withWindow((g) => {
      g.check('/features/period/', '/domains/menstrual/menstrual-repository.js');
      expect(g.violations.some(v => v.label === 'feature→MenstrualRepository')).toBe(true);
    });
  });
  it('does NOT flag application → menstrual-repository', () => {
    withWindow((g) => {
      g.check('/application/composition-root.js', '/domains/menstrual/menstrual-repository.js');
      expect(g.violations.some(v => v.label === 'screen→MenstrualRepository')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→MenstrualRepository')).toBe(false);
    });
  });
});

describe('ArchGuard PR-039 — MenstrualService', () => {
  it('flags screen → menstrual-service', () => {
    withWindow((g) => {
      g.check('/screens/cycle/', '/domains/menstrual/menstrual-service.js');
      expect(g.violations.some(v => v.label === 'screen→MenstrualService')).toBe(true);
    });
  });
  it('flags feature → menstrual-service', () => {
    withWindow((g) => {
      g.check('/features/health/', '/domains/menstrual/menstrual-service.js');
      expect(g.violations.some(v => v.label === 'feature→MenstrualService')).toBe(true);
    });
  });
  it('does NOT flag application → menstrual-service', () => {
    withWindow((g) => {
      g.check('/application/api-gateway.js', '/domains/menstrual/menstrual-service.js');
      expect(g.violations.some(v => v.label === 'screen→MenstrualService')).toBe(false);
    });
  });
});

describe('ArchGuard PR-039 — CycleAnalysisService', () => {
  it('flags screen → cycle-analysis-service', () => {
    withWindow((g) => {
      g.check('/screens/analytics/', '/domains/menstrual/cycle-analysis-service.js');
      expect(g.violations.some(v => v.label === 'screen→CycleAnalysisService')).toBe(true);
    });
  });
  it('flags feature → cycle-analysis-service', () => {
    withWindow((g) => {
      g.check('/features/insights/', '/domains/menstrual/cycle-analysis-service.js');
      expect(g.violations.some(v => v.label === 'feature→CycleAnalysisService')).toBe(true);
    });
  });
  it('does NOT flag domain → cycle-analysis-service', () => {
    withWindow((g) => {
      g.check('/domains/menstrual/menstrual-service.js', '/domains/menstrual/cycle-analysis-service.js');
      expect(g.violations.some(v => v.label === 'screen→CycleAnalysisService')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→CycleAnalysisService')).toBe(false);
    });
  });
});

describe('ArchGuard PR-039 — PhaseCalculator', () => {
  it('flags screen → phase-calculator', () => {
    withWindow((g) => {
      g.check('/screens/calendar/', '/domains/menstrual/phase-calculator.js');
      expect(g.violations.some(v => v.label === 'screen→PhaseCalculator')).toBe(true);
    });
  });
  it('flags feature → phase-calculator', () => {
    withWindow((g) => {
      g.check('/features/ovulation/', '/domains/menstrual/phase-calculator.js');
      expect(g.violations.some(v => v.label === 'feature→PhaseCalculator')).toBe(true);
    });
  });
  it('does NOT flag domain → phase-calculator', () => {
    withWindow((g) => {
      g.check('/domains/menstrual/menstrual-service.js', '/domains/menstrual/phase-calculator.js');
      expect(g.violations.some(v => v.label === 'screen→PhaseCalculator')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→PhaseCalculator')).toBe(false);
    });
  });
});
