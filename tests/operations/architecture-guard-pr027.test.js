// tests/operations/architecture-guard-pr027.test.js
// ArchGuard PR-027 — screen/feature must not reach Automation services directly
import { describe, it, expect, beforeEach } from 'vitest';

const FORBIDDEN_PR027 = [
  { from: /\/screens\//,   to: /delivery-retry-service/,   label: 'screen→DeliveryRetryService'  },
  { from: /\/features\//,  to: /delivery-retry-service/,   label: 'feature→DeliveryRetryService' },
  { from: /\/screens\//,   to: /kpi-scheduler-service/,    label: 'screen→KpiSchedulerService'   },
  { from: /\/features\//,  to: /kpi-scheduler-service/,    label: 'feature→KpiSchedulerService'  },
  { from: /\/screens\//,   to: /analytics-service/,        label: 'screen→AnalyticsService'      },
  { from: /\/features\//,  to: /analytics-service/,        label: 'feature→AnalyticsService'     },
];

const VIOLATIONS = [
  { from: '/screens/admin.js',   to: '/domains/delivery/delivery-retry-service.js',   label: 'screen→DeliveryRetryService' },
  { from: '/features/admin.js',  to: '/domains/delivery/delivery-retry-service.js',   label: 'feature→DeliveryRetryService' },
  { from: '/screens/admin.js',   to: '/domains/analytics/kpi-scheduler-service.js',   label: 'screen→KpiSchedulerService' },
  { from: '/features/admin.js',  to: '/domains/analytics/kpi-scheduler-service.js',   label: 'feature→KpiSchedulerService' },
  { from: '/screens/admin.js',   to: '/domains/analytics/analytics-service.js',        label: 'screen→AnalyticsService' },
  { from: '/features/admin.js',  to: '/domains/analytics/analytics-service.js',        label: 'feature→AnalyticsService' },
];

const ALLOWED = [
  { from: '/application/api-gateway.js', to: '/domains/delivery/delivery-retry-service.js' },
  { from: '/application/api-gateway.js', to: '/domains/analytics/kpi-scheduler-service.js' },
  { from: '/application/api-gateway.js', to: '/domains/analytics/analytics-service.js' },
];

describe('ArchGuard PR-027 — Automation access rules', () => {
  let guard;

  beforeEach(() => {
    guard = {
      check(from, to) {
        return FORBIDDEN_PR027.filter(r => r.from.test(from) && r.to.test(to)).map(r => r.label);
      },
    };
  });

  it.each(VIOLATIONS)('blocks $label', ({ from, to }) => {
    expect(guard.check(from, to).length).toBeGreaterThan(0);
  });

  it.each(ALLOWED)('allows ApiGateway → Automation services', ({ from, to }) => {
    expect(guard.check(from, to)).toHaveLength(0);
  });
});
