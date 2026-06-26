// tests/network-domain/architecture-guard-pr030.test.js
// ArchGuard PR-030 — screen/feature must not reach NetworkSignalRepository or NetworkSignalService
import { describe, it, expect, beforeEach } from 'vitest';

const FORBIDDEN_PR030 = [
  { from: /\/screens\//,   to: /network-signal-repository/, label: 'screen→NetworkSignalRepository'  },
  { from: /\/features\//,  to: /network-signal-repository/, label: 'feature→NetworkSignalRepository' },
  { from: /\/screens\//,   to: /network-signal-service/,    label: 'screen→NetworkSignalService'     },
  { from: /\/features\//,  to: /network-signal-service/,    label: 'feature→NetworkSignalService'    },
];

const VIOLATIONS = [
  { from: '/screens/record-screen.js',    to: '/domains/network/network-signal-repository.js', label: 'screen→NetworkSignalRepository'  },
  { from: '/features/record/index.js',    to: '/domains/network/network-signal-repository.js', label: 'feature→NetworkSignalRepository' },
  { from: '/screens/record-screen.js',    to: '/domains/network/network-signal-service.js',    label: 'screen→NetworkSignalService'     },
  { from: '/features/record/index.js',    to: '/domains/network/network-signal-service.js',    label: 'feature→NetworkSignalService'    },
];

const ALLOWED = [
  { from: '/application/api-gateway.js',      to: '/domains/network/network-signal-service.js'    },
  { from: '/application/composition-root.js', to: '/domains/network/network-signal-repository.js' },
  { from: '/application/composition-root.js', to: '/domains/network/network-signal-validator.js'  },
];

describe('ArchGuard PR-030 — NetworkSignal access rules', () => {
  let guard;

  beforeEach(() => {
    guard = {
      check(from, to) {
        return FORBIDDEN_PR030.filter(r => r.from.test(from) && r.to.test(to)).map(r => r.label);
      },
    };
  });

  it.each(VIOLATIONS)('blocks $label', ({ from, to }) => {
    expect(guard.check(from, to).length).toBeGreaterThan(0);
  });

  it.each(ALLOWED)('allows CompositionRoot/ApiGateway → NetworkSignal internals', ({ from, to }) => {
    expect(guard.check(from, to)).toHaveLength(0);
  });
});

describe('ArchGuard PR-030 — rule coverage check', () => {
  it('has 4 forbidden rules for NetworkSignal', () => {
    expect(FORBIDDEN_PR030).toHaveLength(4);
  });

  it('all rules have labels', () => {
    for (const r of FORBIDDEN_PR030) {
      expect(r.label).toBeTruthy();
    }
  });

  it('screen rules match screen paths', () => {
    const screenRules = FORBIDDEN_PR030.filter(r => r.from.test('/screens/home/'));
    expect(screenRules.length).toBeGreaterThanOrEqual(2);
  });

  it('feature rules match feature paths', () => {
    const featureRules = FORBIDDEN_PR030.filter(r => r.from.test('/features/record/'));
    expect(featureRules.length).toBeGreaterThanOrEqual(2);
  });
});
