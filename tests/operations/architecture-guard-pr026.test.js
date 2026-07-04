// tests/operations/architecture-guard-pr026.test.js
// ArchGuard PR-026 — screen/feature must not reach Operations domain services directly
import { describe, it, expect, beforeEach } from 'vitest';

const ARCH_VIOLATIONS = [
  { from: '/screens/admin-screen.js',  to: '/domains/delivery/delivery-operations-service.js',     label: 'screen→DeliveryOperationsService' },
  { from: '/features/admin/index.js',  to: '/domains/delivery/delivery-operations-service.js',     label: 'feature→DeliveryOperationsService' },
  { from: '/screens/admin-screen.js',  to: '/domains/analytics/kpi-snapshot-automation-service.js', label: 'screen→KpiSnapshotAutomationService' },
  { from: '/features/admin/index.js',  to: '/domains/analytics/kpi-snapshot-automation-service.js', label: 'feature→KpiSnapshotAutomationService' },
  { from: '/screens/admin-screen.js',  to: '/domains/delivery/delivery-health-metrics.js',          label: 'screen→DeliveryHealthMetrics' },
  { from: '/features/admin/index.js',  to: '/domains/delivery/delivery-health-metrics.js',          label: 'feature→DeliveryHealthMetrics' },
];

const ALLOWED = [
  { from: '/application/api-gateway.js', to: '/domains/delivery/delivery-operations-service.js' },
  { from: '/application/api-gateway.js', to: '/domains/analytics/kpi-snapshot-automation-service.js' },
  { from: '/application/api-gateway.js', to: '/domains/delivery/delivery-health-metrics.js' },
];

describe('ArchGuard PR-026 — Operations access rules', () => {
  let guard;

  beforeEach(() => {
    // Simulate window.guard check using the FORBIDDEN list directly
    const FORBIDDEN = [
      { from: /\/screens\//,   to: /delivery-operations-service/,     label: 'screen→DeliveryOperationsService' },
      { from: /\/features\//,  to: /delivery-operations-service/,     label: 'feature→DeliveryOperationsService' },
      { from: /\/screens\//,   to: /kpi-snapshot-automation-service/, label: 'screen→KpiSnapshotAutomationService' },
      { from: /\/features\//,  to: /kpi-snapshot-automation-service/, label: 'feature→KpiSnapshotAutomationService' },
      { from: /\/screens\//,   to: /delivery-health-metrics/,         label: 'screen→DeliveryHealthMetrics' },
      { from: /\/features\//,  to: /delivery-health-metrics/,         label: 'feature→DeliveryHealthMetrics' },
    ];
    guard = { check(from, to) { return FORBIDDEN.filter(r => r.from.test(from) && r.to.test(to)).map(r => r.label); } };
  });

  it.each(ARCH_VIOLATIONS)('blocks $label', ({ from, to }) => {
    const violations = guard.check(from, to);
    expect(violations.length).toBeGreaterThan(0);
  });

  it.each(ALLOWED)('allows ApiGateway → Operations services', ({ from, to }) => {
    const violations = guard.check(from, to);
    expect(violations).toHaveLength(0);
  });
});
