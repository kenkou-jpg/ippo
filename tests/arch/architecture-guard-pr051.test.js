// tests/arch/architecture-guard-pr051.test.js
// PR-051 Architecture Guard — forbidden rules for Knowledge Graph layer.
// BD-036: Append-Only enforcement — UI must never reach KG internals directly.
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

describe('ArchGuard PR-051 — KnowledgeGraphRepository', () => {
  it('flags screen → knowledge-graph-repository', () => {
    withWindow((g) => {
      g.check('/screens/record/', '/domains/knowledge/knowledge-graph-repository.js');
      expect(g.violations.some(v => v.label === 'screen→KnowledgeGraphRepository')).toBe(true);
    });
  });

  it('flags feature → knowledge-graph-repository', () => {
    withWindow((g) => {
      g.check('/features/insights/', '/domains/knowledge/knowledge-graph-repository.js');
      expect(g.violations.some(v => v.label === 'feature→KnowledgeGraphRepository')).toBe(true);
    });
  });

  it('does NOT flag application → knowledge-graph-repository', () => {
    withWindow((g) => {
      g.check('/application/composition-root.js', '/domains/knowledge/knowledge-graph-repository.js');
      expect(g.violations.some(v => v.label === 'screen→KnowledgeGraphRepository')).toBe(false);
      expect(g.violations.some(v => v.label === 'feature→KnowledgeGraphRepository')).toBe(false);
    });
  });
});

describe('ArchGuard PR-051 — KnowledgeGraphService', () => {
  it('flags screen → knowledge-graph-service', () => {
    withWindow((g) => {
      g.check('/screens/dashboard/', '/domains/knowledge/knowledge-graph-service.js');
      expect(g.violations.some(v => v.label === 'screen→KnowledgeGraphService')).toBe(true);
    });
  });

  it('flags feature → knowledge-graph-service', () => {
    withWindow((g) => {
      g.check('/features/kg/', '/domains/knowledge/knowledge-graph-service.js');
      expect(g.violations.some(v => v.label === 'feature→KnowledgeGraphService')).toBe(true);
    });
  });
});

describe('ArchGuard PR-051 — KnowledgeGraphNodeEntity', () => {
  it('flags screen → knowledge-graph-node-entity', () => {
    withWindow((g) => {
      g.check('/screens/home/', '/domains/knowledge/knowledge-graph-node-entity.js');
      expect(g.violations.some(v => v.label === 'screen→KnowledgeGraphNodeEntity')).toBe(true);
    });
  });

  it('flags feature → knowledge-graph-node-entity', () => {
    withWindow((g) => {
      g.check('/features/graph/', '/domains/knowledge/knowledge-graph-node-entity.js');
      expect(g.violations.some(v => v.label === 'feature→KnowledgeGraphNodeEntity')).toBe(true);
    });
  });
});

describe('ArchGuard PR-051 — KnowledgeGraphEdgeEntity', () => {
  it('flags screen → knowledge-graph-edge-entity', () => {
    withWindow((g) => {
      g.check('/screens/case/', '/domains/knowledge/knowledge-graph-edge-entity.js');
      expect(g.violations.some(v => v.label === 'screen→KnowledgeGraphEdgeEntity')).toBe(true);
    });
  });

  it('flags feature → knowledge-graph-edge-entity', () => {
    withWindow((g) => {
      g.check('/features/graph/', '/domains/knowledge/knowledge-graph-edge-entity.js');
      expect(g.violations.some(v => v.label === 'feature→KnowledgeGraphEdgeEntity')).toBe(true);
    });
  });
});
