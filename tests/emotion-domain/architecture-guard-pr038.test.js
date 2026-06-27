// tests/emotion-domain/architecture-guard-pr038.test.js
// PR-038 Architecture Guard — Emotion domain forbidden rules
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

describe('ArchGuard PR-038 — EmotionRepository', () => {
  it('flags screen → emotion-repository', () => {
    withWindow((g) => {
      g.check('/screens/home/', '/domains/emotion/emotion-repository.js');
      expect(g.violations.some(v => v.label === 'screen→EmotionRepository')).toBe(true);
    });
  });
  it('flags feature → emotion-repository', () => {
    withWindow((g) => {
      g.check('/features/diary/', '/domains/emotion/emotion-repository.js');
      expect(g.violations.some(v => v.label === 'feature→EmotionRepository')).toBe(true);
    });
  });
  it('does NOT flag application → emotion-repository', () => {
    withWindow((g) => {
      g.check('/application/composition-root.js', '/domains/emotion/emotion-repository.js');
      expect(g.violations.some(v => v.label === 'screen→EmotionRepository')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→EmotionRepository')).toBe(false);
    });
  });
});

describe('ArchGuard PR-038 — EmotionService', () => {
  it('flags screen → emotion-service', () => {
    withWindow((g) => {
      g.check('/screens/mood/', '/domains/emotion/emotion-service.js');
      expect(g.violations.some(v => v.label === 'screen→EmotionService')).toBe(true);
    });
  });
  it('flags feature → emotion-service', () => {
    withWindow((g) => {
      g.check('/features/health/', '/domains/emotion/emotion-service.js');
      expect(g.violations.some(v => v.label === 'feature→EmotionService')).toBe(true);
    });
  });
  it('does NOT flag application → emotion-service', () => {
    withWindow((g) => {
      g.check('/application/api-gateway.js', '/domains/emotion/emotion-service.js');
      expect(g.violations.some(v => v.label === 'screen→EmotionService')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→EmotionService')).toBe(false);
    });
  });
});

describe('ArchGuard PR-038 — EmotionSignalMapper', () => {
  it('flags screen → emotion-signal-mapper', () => {
    withWindow((g) => {
      g.check('/screens/record/', '/domains/emotion/emotion-signal-mapper.js');
      expect(g.violations.some(v => v.label === 'screen→EmotionSignalMapper')).toBe(true);
    });
  });
  it('flags feature → emotion-signal-mapper', () => {
    withWindow((g) => {
      g.check('/features/signal/', '/domains/emotion/emotion-signal-mapper.js');
      expect(g.violations.some(v => v.label === 'feature→EmotionSignalMapper')).toBe(true);
    });
  });
  it('does NOT flag application → emotion-signal-mapper', () => {
    withWindow((g) => {
      g.check('/application/composition-root.js', '/domains/emotion/emotion-signal-mapper.js');
      expect(g.violations.some(v => v.label === 'screen→EmotionSignalMapper')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→EmotionSignalMapper')).toBe(false);
    });
  });
});
