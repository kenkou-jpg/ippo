// tests/operations/delivery-health-metrics.test.js
// DeliveryHealthMetrics — deliverySuccessRate / deliveryFailureRate / averageQueueAge / pendingCount
import { describe, it, expect, vi } from 'vitest';
import { DeliveryHealthMetrics } from '../../src/domains/delivery/delivery-health-metrics.js';

function makeQueue(entries = []) {
  return { findAll: () => entries };
}

describe('DeliveryHealthMetrics', () => {
  it('returns zero metrics for empty queue', () => {
    const m = new DeliveryHealthMetrics({ deliveryQueue: makeQueue() });
    expect(m.getHealthMetrics()).toEqual({
      deliverySuccessRate: 0,
      deliveryFailureRate: 0,
      averageQueueAge:     0,
      pendingCount:        0,
    });
  });

  it('computes success and failure rates from terminal entries', () => {
    const entries = [
      { status: 'DELIVERED', enqueuedAt: new Date().toISOString() },
      { status: 'DELIVERED', enqueuedAt: new Date().toISOString() },
      { status: 'FAILED',    enqueuedAt: new Date().toISOString() },
    ];
    const m = new DeliveryHealthMetrics({ deliveryQueue: makeQueue(entries) });
    const h = m.getHealthMetrics();
    expect(h.deliverySuccessRate).toBeCloseTo(2 / 3);
    expect(h.deliveryFailureRate).toBeCloseTo(1 / 3);
  });

  it('counts pending entries', () => {
    const entries = [
      { status: 'PENDING',   enqueuedAt: new Date().toISOString() },
      { status: 'PENDING',   enqueuedAt: new Date().toISOString() },
      { status: 'DELIVERED', enqueuedAt: new Date().toISOString() },
    ];
    const m = new DeliveryHealthMetrics({ deliveryQueue: makeQueue(entries) });
    expect(m.getHealthMetrics().pendingCount).toBe(2);
  });

  it('computes averageQueueAge in seconds for pending entries', () => {
    const past = new Date(Date.now() - 10_000).toISOString(); // 10 seconds ago
    const entries = [
      { status: 'PENDING', enqueuedAt: past },
      { status: 'PENDING', enqueuedAt: past },
    ];
    const m = new DeliveryHealthMetrics({ deliveryQueue: makeQueue(entries) });
    const h = m.getHealthMetrics();
    expect(h.averageQueueAge).toBeGreaterThanOrEqual(9);
    expect(h.averageQueueAge).toBeLessThan(30);
  });

  it('averageQueueAge is 0 when no PENDING entries', () => {
    const entries = [{ status: 'DELIVERED', enqueuedAt: new Date().toISOString() }];
    const m = new DeliveryHealthMetrics({ deliveryQueue: makeQueue(entries) });
    expect(m.getHealthMetrics().averageQueueAge).toBe(0);
  });
});
