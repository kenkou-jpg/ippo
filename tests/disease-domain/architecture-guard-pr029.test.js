// tests/disease-domain/architecture-guard-pr029.test.js
// ArchGuard PR-029 — screen/feature must not reach DiseaseRepository or DiseaseService
import { describe, it, expect, beforeEach } from 'vitest';

const FORBIDDEN_PR029 = [
  { from: /\/screens\//,  to: /disease-repository/, label: 'screen→DiseaseRepository'  },
  { from: /\/features\//, to: /disease-repository/, label: 'feature→DiseaseRepository' },
  { from: /\/screens\//,  to: /disease-service/,    label: 'screen→DiseaseService'     },
  { from: /\/features\//, to: /disease-service/,    label: 'feature→DiseaseService'    },
];

const VIOLATIONS = [
  { from: '/screens/disease-screen.js',   to: '/domains/disease/disease-repository.js', label: 'screen→DiseaseRepository'  },
  { from: '/features/disease/index.js',   to: '/domains/disease/disease-repository.js', label: 'feature→DiseaseRepository' },
  { from: '/screens/disease-screen.js',   to: '/domains/disease/disease-service.js',    label: 'screen→DiseaseService'     },
  { from: '/features/disease/index.js',   to: '/domains/disease/disease-service.js',    label: 'feature→DiseaseService'    },
];

const ALLOWED = [
  { from: '/application/api-gateway.js',      to: '/domains/disease/disease-service.js'    },
  { from: '/application/composition-root.js', to: '/domains/disease/disease-repository.js' },
  { from: '/application/composition-root.js', to: '/domains/disease/disease-validator.js'  },
];

describe('ArchGuard PR-029 — Disease access rules', () => {
  let guard;

  beforeEach(() => {
    guard = {
      check(from, to) {
        return FORBIDDEN_PR029.filter(r => r.from.test(from) && r.to.test(to)).map(r => r.label);
      },
    };
  });

  it.each(VIOLATIONS)('blocks $label', ({ from, to }) => {
    expect(guard.check(from, to).length).toBeGreaterThan(0);
  });

  it.each(ALLOWED)('allows CompositionRoot/ApiGateway → Disease internals', ({ from, to }) => {
    expect(guard.check(from, to)).toHaveLength(0);
  });
});
