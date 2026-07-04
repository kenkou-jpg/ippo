// tests/symptom/architecture-guard-pr028.test.js
// ArchGuard PR-028 — screen/feature must not reach SymptomRepository or SymptomValidator
import { describe, it, expect, beforeEach } from 'vitest';

const FORBIDDEN_PR028 = [
  { from: /\/screens\//,  to: /symptom-repository/, label: 'screen→SymptomRepository'  },
  { from: /\/features\//, to: /symptom-repository/, label: 'feature→SymptomRepository' },
  { from: /\/screens\//,  to: /symptom-validator/,  label: 'screen→SymptomValidator'   },
  { from: /\/features\//, to: /symptom-validator/,  label: 'feature→SymptomValidator'  },
];

const VIOLATIONS = [
  { from: '/screens/record-screen.js',    to: '/domains/symptom/symptom-repository.js', label: 'screen→SymptomRepository' },
  { from: '/features/record/index.js',    to: '/domains/symptom/symptom-repository.js', label: 'feature→SymptomRepository' },
  { from: '/screens/record-screen.js',    to: '/domains/symptom/symptom-validator.js',  label: 'screen→SymptomValidator' },
  { from: '/features/record/index.js',    to: '/domains/symptom/symptom-validator.js',  label: 'feature→SymptomValidator' },
];

const ALLOWED = [
  { from: '/application/api-gateway.js',      to: '/domains/symptom/symptom-service.js'    },
  { from: '/application/composition-root.js', to: '/domains/symptom/symptom-repository.js' },
  { from: '/application/composition-root.js', to: '/domains/symptom/symptom-validator.js'  },
];

describe('ArchGuard PR-028 — Symptom access rules', () => {
  let guard;

  beforeEach(() => {
    guard = {
      check(from, to) {
        return FORBIDDEN_PR028.filter(r => r.from.test(from) && r.to.test(to)).map(r => r.label);
      },
    };
  });

  it.each(VIOLATIONS)('blocks $label', ({ from, to }) => {
    expect(guard.check(from, to).length).toBeGreaterThan(0);
  });

  it.each(ALLOWED)('allows CompositionRoot/ApiGateway → Symptom internals', ({ from, to }) => {
    expect(guard.check(from, to)).toHaveLength(0);
  });
});
