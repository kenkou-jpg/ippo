// tests/operations/delivery-operations-service.test.js
// DeliveryOperationsService — getDeliveryHealth read-only aggregation
import { describe, it, expect } from 'vitest';
import { DeliveryOperationsService } from '../../src/domains/delivery/delivery-operations-service.js';

function makeQueue(entries = []) {
  return { findAll: () => entries };
}

describe('DeliveryOperationsService', () => {
  it('returns zero counts for empty queue', () => {
    const svc = new DeliveryOperationsService({ deliveryQueue: makeQueue() });
    const h   = svc.getDeliveryHealth();
    expect(h).toEqual({ pending: 0, scheduled: 0, delivered: 0, failed: 0, deliveryRate: 0 });
  });

  it('counts each status correctly', () => {
    const entries = [
      { status: 'PENDING' },
      { status: 'PENDING' },
      { status: 'SCHEDULED' },
      { status: 'DELIVERED' },
      { status: 'DELIVERED' },
      { status: 'FAILED' },
    ];
    const svc = new DeliveryOperationsService({ deliveryQueue: makeQueue(entries) });
    const h   = svc.getDeliveryHealth();
    expect(h.pending).toBe(2);
    expect(h.scheduled).toBe(1);
    expect(h.delivered).toBe(2);
    expect(h.failed).toBe(1);
  });

  it('computes deliveryRate = delivered / (delivered + failed)', () => {
    const entries = [
      { status: 'DELIVERED' },
      { status: 'DELIVERED' },
      { status: 'DELIVERED' },
      { status: 'FAILED' },
    ];
    const svc = new DeliveryOperationsService({ deliveryQueue: makeQueue(entries) });
    const h   = svc.getDeliveryHealth();
    expect(h.deliveryRate).toBeCloseTo(0.75);
  });

  it('deliveryRate is 0 when no terminal entries', () => {
    const entries = [{ status: 'PENDING' }, { status: 'SCHEDULED' }];
    const svc = new DeliveryOperationsService({ deliveryQueue: makeQueue(entries) });
    expect(svc.getDeliveryHealth().deliveryRate).toBe(0);
  });

  it('is read-only — does not mutate the queue', () => {
    const entries = [{ status: 'PENDING' }];
    const svc = new DeliveryOperationsService({ deliveryQueue: makeQueue(entries) });
    svc.getDeliveryHealth();
    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe('PENDING');
  });
});
