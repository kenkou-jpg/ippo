// tests/network-domain/architecture-guard-pr031.test.js
// Architecture Guard verification for PR-031 — Signal Intelligence.
// Tests run locally against a self-contained simulation (FORBIDDEN_PR031 defined here),
// matching the pattern used in architecture-guard-pr029.test.js and architecture-guard-pr030.test.js.

import { describe, it, expect } from 'vitest';

const FORBIDDEN_PR031 = [
  { from: /\/screens\//,   to: /signal-aggregation-service/, label: 'screen→SignalAggregationService'  },
  { from: /\/features\//,  to: /signal-aggregation-service/, label: 'feature→SignalAggregationService' },
  { from: /\/screens\//,   to: /signal-trend-service/,       label: 'screen→SignalTrendService'        },
  { from: /\/features\//,  to: /signal-trend-service/,       label: 'feature→SignalTrendService'       },
  { from: /\/screens\//,   to: /signal-timeline-service/,    label: 'screen→SignalTimelineService'     },
  { from: /\/features\//,  to: /signal-timeline-service/,    label: 'feature→SignalTimelineService'    },
  { from: /\/screens\//,   to: /signal-summary-service/,     label: 'screen→SignalSummaryService'      },
  { from: /\/features\//,  to: /signal-summary-service/,     label: 'feature→SignalSummaryService'     },
];

function check(from, to) {
  for (const { from: fRe, to: tRe, label } of FORBIDDEN_PR031) {
    if (fRe.test(from) && tRe.test(to)) return { violated: true, label };
  }
  return { violated: false, label: null };
}

const VIOLATIONS = [
  ['/src/screens/health-screen.js',         '/src/domains/network/signal-aggregation-service.js', 'screen→SignalAggregationService'],
  ['/src/features/dashboard/index.js',      '/src/domains/network/signal-aggregation-service.js', 'feature→SignalAggregationService'],
  ['/src/screens/record-screen.js',         '/src/domains/network/signal-trend-service.js',       'screen→SignalTrendService'],
  ['/src/features/insight/trend.js',        '/src/domains/network/signal-trend-service.js',       'feature→SignalTrendService'],
  ['/src/screens/history-screen.js',        '/src/domains/network/signal-timeline-service.js',    'screen→SignalTimelineService'],
  ['/src/features/timeline/index.js',       '/src/domains/network/signal-timeline-service.js',    'feature→SignalTimelineService'],
  ['/src/screens/summary-screen.js',        '/src/domains/network/signal-summary-service.js',     'screen→SignalSummaryService'],
  ['/src/features/profile/summary.js',      '/src/domains/network/signal-summary-service.js',     'feature→SignalSummaryService'],
];

const ALLOWED = [
  ['/src/application/api-gateway.js',       '/src/domains/network/signal-aggregation-service.js'],
  ['/src/application/composition-root.js',  '/src/domains/network/signal-trend-service.js'],
  ['/src/application/api-gateway.js',       '/src/domains/network/signal-timeline-service.js'],
  ['/src/application/composition-root.js',  '/src/domains/network/signal-summary-service.js'],
  ['/src/domains/network/network-signal-service.js', '/src/domains/network/signal-aggregation-service.js'],
];

describe('ArchGuard PR-031 — Signal Intelligence FORBIDDEN rules', () => {
  it.each(VIOLATIONS)('blocks %s → %s (%s)', (from, to, expectedLabel) => {
    const result = check(from, to);
    expect(result.violated).toBe(true);
    expect(result.label).toBe(expectedLabel);
  });

  it.each(ALLOWED)('allows %s → %s', (from, to) => {
    const result = check(from, to);
    expect(result.violated).toBe(false);
  });

  it('FORBIDDEN_PR031 has exactly 8 rules', () => {
    expect(FORBIDDEN_PR031).toHaveLength(8);
  });

  it('each forbidden rule has from, to, label', () => {
    for (const rule of FORBIDDEN_PR031) {
      expect(rule.from).toBeInstanceOf(RegExp);
      expect(rule.to).toBeInstanceOf(RegExp);
      expect(typeof rule.label).toBe('string');
    }
  });
});
