// tests/operations/delivery-retry-service.test.js
// DeliveryRetryService — retryFailed / getRetryableEntries
// DeliveryQueue.resetToPending — FAILED only
import { describe, it, expect, beforeEach } from 'vitest';
import { DeliveryRetryService } from '../../src/domains/delivery/delivery-retry-service.js';
import { DeliveryQueue }        from '../../src/domains/delivery/delivery-queue.js';
import { DeliveryRepository }   from '../../src/domains/delivery/delivery-repository.js';

function makeFakeStorage() {
  const store = {};
  return { get: k => store[k] ?? null, set: (k, v) => { store[k] = v; } };
}

function makeAuditLog() {
  const log = [];
  return { append: e => log.push(e), _log: log };
}

function seedQueue(queue, entries) {
  for (const e of entries) queue.enqueue(e);
}

function forceStatus(queue, id, status) {
  queue.resetToPending(id); // ensure PENDING first if needed — only used in helpers
}

describe('DeliveryQueue.resetToPending', () => {
  let queue;

  beforeEach(() => {
    const storage = makeFakeStorage();
    const repo    = new DeliveryRepository(storage);
    queue = new DeliveryQueue(repo);
  });

  it('resets FAILED entry to PENDING', () => {
    const e = queue.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: new Date().toISOString(), candidateDueAt: new Date().toISOString() });
    queue.markScheduled(e.id);
    queue.markFailed(e.id);

    const updated = queue.resetToPending(e.id);
    expect(updated.status).toBe('PENDING');
  });

  it('throws if entry is not FAILED', () => {
    const e = queue.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: new Date().toISOString(), candidateDueAt: new Date().toISOString() });
    expect(() => queue.resetToPending(e.id)).toThrow('resetToPending only allowed from FAILED');
  });

  it('throws if entry not found', () => {
    expect(() => queue.resetToPending('nonexistent')).toThrow('Entry not found');
  });

  it('does not affect other entries', () => {
    const e1 = queue.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: new Date().toISOString(), candidateDueAt: new Date().toISOString() });
    const e2 = queue.enqueue({ userId: 'u2', notificationType: 'DAY7_SUMMARY', scheduledAt: new Date().toISOString(), candidateDueAt: new Date().toISOString() });
    queue.markScheduled(e1.id);
    queue.markFailed(e1.id);
    queue.resetToPending(e1.id);

    expect(queue.findAll().find(x => x.id === e2.id).status).toBe('PENDING');
    expect(queue.findAll().find(x => x.id === e1.id).status).toBe('PENDING');
  });
});

describe('DeliveryRetryService.retryFailed', () => {
  let queue, auditLog, svc;

  beforeEach(() => {
    const storage = makeFakeStorage();
    const repo    = new DeliveryRepository(storage);
    queue    = new DeliveryQueue(repo);
    auditLog = makeAuditLog();
    svc      = new DeliveryRetryService({ deliveryQueue: queue, deliveryAuditLog: auditLog });
  });

  it('returns retried:0 when no FAILED entries', () => {
    queue.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: new Date().toISOString(), candidateDueAt: new Date().toISOString() });
    const result = svc.retryFailed();
    expect(result.retried).toBe(0);
    expect(result.entries).toHaveLength(0);
  });

  it('resets all FAILED entries to PENDING', () => {
    const e1 = queue.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: new Date().toISOString(), candidateDueAt: new Date().toISOString() });
    const e2 = queue.enqueue({ userId: 'u2', notificationType: 'DAY7_SUMMARY', scheduledAt: new Date().toISOString(), candidateDueAt: new Date().toISOString() });
    queue.markScheduled(e1.id); queue.markFailed(e1.id);
    queue.markScheduled(e2.id); queue.markFailed(e2.id);

    const result = svc.retryFailed();
    expect(result.retried).toBe(2);
    expect(queue.findByStatus('FAILED')).toHaveLength(0);
    expect(queue.findByStatus('PENDING')).toHaveLength(2);
  });

  it('does not retry DELIVERED entries', () => {
    const e1 = queue.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: new Date().toISOString(), candidateDueAt: new Date().toISOString() });
    queue.markScheduled(e1.id);
    queue.markDelivered(e1.id);

    const result = svc.retryFailed();
    expect(result.retried).toBe(0);
    expect(queue.findAll()[0].status).toBe('DELIVERED');
  });

  it('does not retry SCHEDULED entries', () => {
    const e1 = queue.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: new Date().toISOString(), candidateDueAt: new Date().toISOString() });
    queue.markScheduled(e1.id);

    const result = svc.retryFailed();
    expect(result.retried).toBe(0);
    expect(queue.findAll()[0].status).toBe('SCHEDULED');
  });

  it('appends audit log entries for each retried item', () => {
    const e1 = queue.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: new Date().toISOString(), candidateDueAt: new Date().toISOString() });
    queue.markScheduled(e1.id); queue.markFailed(e1.id);

    svc.retryFailed();
    expect(auditLog._log).toHaveLength(1);
    expect(auditLog._log[0].fromStatus).toBe('FAILED');
    expect(auditLog._log[0].toStatus).toBe('PENDING');
    expect(auditLog._log[0].reason).toBe('retry');
  });
});

describe('DeliveryRetryService.getRetryableEntries', () => {
  it('returns only FAILED entries', () => {
    const storage = makeFakeStorage();
    const repo    = new DeliveryRepository(storage);
    const queue   = new DeliveryQueue(repo);
    const auditLog = makeAuditLog();
    const svc = new DeliveryRetryService({ deliveryQueue: queue, deliveryAuditLog: auditLog });

    const e1 = queue.enqueue({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: new Date().toISOString(), candidateDueAt: new Date().toISOString() });
    const e2 = queue.enqueue({ userId: 'u2', notificationType: 'DAY7_SUMMARY', scheduledAt: new Date().toISOString(), candidateDueAt: new Date().toISOString() });
    queue.markScheduled(e1.id); queue.markFailed(e1.id);

    const retryable = svc.getRetryableEntries();
    expect(retryable).toHaveLength(1);
    expect(retryable[0].id).toBe(e1.id);
  });
});
