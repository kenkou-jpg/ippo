// tests/operations/delivery-health-expanded.test.js
// DeliveryOperationsService PR-027 expanded fields
import { describe, it, expect } from 'vitest';
import { DeliveryOperationsService, QUEUE_HEALTH } from '../../src/domains/delivery/delivery-operations-service.js';

function makeQueue(entries = []) {
  return { findAll: () => entries };
}

describe('DeliveryOperationsService PR-027 — expanded health fields', () => {
  it('includes all PR-027 fields', () => {
    const svc = new DeliveryOperationsService({ deliveryQueue: makeQueue() });
    const h   = svc.getDeliveryHealth();
    expect(h).toHaveProperty('pendingCount');
    expect(h).toHaveProperty('scheduledCount');
    expect(h).toHaveProperty('deliveredCount');
    expect(h).toHaveProperty('failedCount');
    expect(h).toHaveProperty('successRate');
    expect(h).toHaveProperty('failureRate');
    expect(h).toHaveProperty('retryableCount');
    expect(h).toHaveProperty('queueHealth');
  });

  it('retains PR-026 backward-compat aliases', () => {
    const svc = new DeliveryOperationsService({ deliveryQueue: makeQueue() });
    const h   = svc.getDeliveryHealth();
    expect(h).toHaveProperty('pending');
    expect(h).toHaveProperty('scheduled');
    expect(h).toHaveProperty('delivered');
    expect(h).toHaveProperty('failed');
    expect(h).toHaveProperty('deliveryRate');
  });

  it('queueHealth = HEALTHY when failureRate < 5%', () => {
    // 2% failure rate: 49 delivered, 1 failed
    const entries = [...Array(49).fill({ status: 'DELIVERED' }), { status: 'FAILED' }];
    const svc = new DeliveryOperationsService({ deliveryQueue: makeQueue(entries) });
    expect(svc.getDeliveryHealth().queueHealth).toBe(QUEUE_HEALTH.HEALTHY);
  });

  it('queueHealth = WARNING when 5% <= failureRate < 15%', () => {
    // 10% failure: 9 delivered, 1 failed
    const entries = [
      ...Array(9).fill({ status: 'DELIVERED' }),
      { status: 'FAILED' },
    ];
    const svc = new DeliveryOperationsService({ deliveryQueue: makeQueue(entries) });
    expect(svc.getDeliveryHealth().queueHealth).toBe(QUEUE_HEALTH.WARNING);
  });

  it('queueHealth = CRITICAL when failureRate >= 15%', () => {
    // 20% failure: 4 delivered, 1 failed
    const entries = [
      ...Array(4).fill({ status: 'DELIVERED' }),
      { status: 'FAILED' },
    ];
    const svc = new DeliveryOperationsService({ deliveryQueue: makeQueue(entries) });
    expect(svc.getDeliveryHealth().queueHealth).toBe(QUEUE_HEALTH.CRITICAL);
  });

  it('queueHealth = HEALTHY when no terminal entries', () => {
    const entries = [{ status: 'PENDING' }, { status: 'SCHEDULED' }];
    const svc = new DeliveryOperationsService({ deliveryQueue: makeQueue(entries) });
    expect(svc.getDeliveryHealth().queueHealth).toBe(QUEUE_HEALTH.HEALTHY);
  });

  it('retryableCount equals failedCount', () => {
    const entries = [
      { status: 'DELIVERED' },
      { status: 'FAILED' },
      { status: 'FAILED' },
    ];
    const svc = new DeliveryOperationsService({ deliveryQueue: makeQueue(entries) });
    const h   = svc.getDeliveryHealth();
    expect(h.retryableCount).toBe(h.failedCount);
    expect(h.retryableCount).toBe(2);
  });
});
