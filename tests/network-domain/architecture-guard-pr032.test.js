// tests/network-domain/architecture-guard-pr032.test.js
import { describe, it, expect } from 'vitest';

const FORBIDDEN_PR032 = [
  { from: /\/screens\//,   to: /longitudinal-signal-service/,  label: 'screen→LongitudinalSignalService'   },
  { from: /\/features\//,  to: /longitudinal-signal-service/,  label: 'feature→LongitudinalSignalService'  },
  { from: /\/screens\//,   to: /moving-average-service/,       label: 'screen→MovingAverageService'        },
  { from: /\/features\//,  to: /moving-average-service/,       label: 'feature→MovingAverageService'       },
  { from: /\/screens\//,   to: /baseline-service/,             label: 'screen→BaselineService'             },
  { from: /\/features\//,  to: /baseline-service/,             label: 'feature→BaselineService'            },
  { from: /\/screens\//,   to: /trend-window-builder/,         label: 'screen→TrendWindowBuilder'          },
  { from: /\/features\//,  to: /trend-window-builder/,         label: 'feature→TrendWindowBuilder'         },
  { from: /\/screens\//,   to: /longitudinal-summary-service/, label: 'screen→LongitudinalSummaryService'  },
  { from: /\/features\//,  to: /longitudinal-summary-service/, label: 'feature→LongitudinalSummaryService' },
];

function check(from, to) {
  for (const { from: fRe, to: tRe, label } of FORBIDDEN_PR032) {
    if (fRe.test(from) && tRe.test(to)) return { violated: true, label };
  }
  return { violated: false, label: null };
}

const VIOLATIONS = [
  ['/src/screens/health.js',            '/src/domains/network/longitudinal-signal-service.js',  'screen→LongitudinalSignalService'],
  ['/src/features/trend/index.js',      '/src/domains/network/longitudinal-signal-service.js',  'feature→LongitudinalSignalService'],
  ['/src/screens/history.js',           '/src/domains/network/moving-average-service.js',       'screen→MovingAverageService'],
  ['/src/features/analytics/index.js',  '/src/domains/network/moving-average-service.js',       'feature→MovingAverageService'],
  ['/src/screens/profile.js',           '/src/domains/network/baseline-service.js',             'screen→BaselineService'],
  ['/src/features/insight/index.js',    '/src/domains/network/baseline-service.js',             'feature→BaselineService'],
  ['/src/screens/dashboard.js',         '/src/domains/network/trend-window-builder.js',         'screen→TrendWindowBuilder'],
  ['/src/features/report/index.js',     '/src/domains/network/trend-window-builder.js',         'feature→TrendWindowBuilder'],
  ['/src/screens/summary.js',           '/src/domains/network/longitudinal-summary-service.js', 'screen→LongitudinalSummaryService'],
  ['/src/features/summary/index.js',    '/src/domains/network/longitudinal-summary-service.js', 'feature→LongitudinalSummaryService'],
];

const ALLOWED = [
  ['/src/application/api-gateway.js',      '/src/domains/network/longitudinal-signal-service.js'],
  ['/src/application/composition-root.js', '/src/domains/network/moving-average-service.js'],
  ['/src/application/api-gateway.js',      '/src/domains/network/baseline-service.js'],
  ['/src/application/composition-root.js', '/src/domains/network/trend-window-builder.js'],
  ['/src/application/api-gateway.js',      '/src/domains/network/longitudinal-summary-service.js'],
  ['/src/domains/network/longitudinal-signal-service.js', '/src/domains/network/moving-average-service.js'],
];

describe('ArchGuard PR-032 — Longitudinal FORBIDDEN rules', () => {
  it.each(VIOLATIONS)('blocks %s → %s (%s)', (from, to, expectedLabel) => {
    const result = check(from, to);
    expect(result.violated).toBe(true);
    expect(result.label).toBe(expectedLabel);
  });

  it.each(ALLOWED)('allows %s → %s', (from, to) => {
    const result = check(from, to);
    expect(result.violated).toBe(false);
  });

  it('FORBIDDEN_PR032 has exactly 10 rules', () => {
    expect(FORBIDDEN_PR032).toHaveLength(10);
  });

  it('each rule has from (RegExp), to (RegExp), label (string)', () => {
    for (const rule of FORBIDDEN_PR032) {
      expect(rule.from).toBeInstanceOf(RegExp);
      expect(rule.to).toBeInstanceOf(RegExp);
      expect(typeof rule.label).toBe('string');
    }
  });
});
