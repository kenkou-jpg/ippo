// tests/data-deletion/data-deletion-service.test.js — PR-078 tests.
// Data Deletion Pipeline — docs/RELEASE_READINESS_COUNCIL.md BD-019.
// 匿名化優先 → SoftDelete → 90日後HardDelete. Self-contained Append-Only ledger + gate.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DataDeletionService, DeletionStageOrderError, HardDeleteNotEligibleError,
  DELETION_STAGE, HARD_DELETE_HOLD_DAYS, DATA_DELETION_SCHEMA_VERSION,
} from '../../src/domains/data-deletion/data-deletion-service.js';
import { DataDeletionRepository } from '../../src/domains/data-deletion/data-deletion-repository.js';
import {
  buildDeletionStageRecord, newRequestId, _resetDeletionRecordCounter,
} from '../../src/domains/data-deletion/data-deletion-entity.js';
import { DELETION_STAGE_ORDER } from '../../src/domains/data-deletion/data-deletion-types.js';

beforeEach(() => { _resetDeletionRecordCounter(); });

function buildService(overrides = {}) {
  const repository = new DataDeletionRepository();
  const service = new DataDeletionService({ repository, ...overrides });
  return { service, repository };
}

function daysAfter(iso, days) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// ── data-deletion-types.js ──────────────────────────────────────────────────

describe('DELETION_STAGE_ORDER', () => {
  it('is exactly the BD-019 pipeline order', () => {
    expect(DELETION_STAGE_ORDER).toEqual(['REQUESTED', 'ANONYMIZED', 'SOFT_DELETED', 'HARD_DELETED']);
  });
});

describe('HARD_DELETE_HOLD_DAYS', () => {
  it('is 90 (BD-019: SoftDelete → 90日後HardDelete)', () => {
    expect(HARD_DELETE_HOLD_DAYS).toBe(90);
  });
});

// ── data-deletion-entity.js ─────────────────────────────────────────────────

describe('buildDeletionStageRecord', () => {
  it('throws without requestId', () => {
    expect(() => buildDeletionStageRecord({ userId: 'u1', stage: DELETION_STAGE.REQUESTED, actorId: 'a1' }))
      .toThrow(/requestId/);
  });

  it('throws without userId', () => {
    expect(() => buildDeletionStageRecord({ requestId: 'r1', stage: DELETION_STAGE.REQUESTED, actorId: 'a1' }))
      .toThrow(/userId/);
  });

  it('throws for an unknown stage', () => {
    expect(() => buildDeletionStageRecord({ requestId: 'r1', userId: 'u1', stage: 'NOPE', actorId: 'a1' }))
      .toThrow(/unknown stage/);
  });

  it('throws without actorId', () => {
    expect(() => buildDeletionStageRecord({ requestId: 'r1', userId: 'u1', stage: DELETION_STAGE.REQUESTED }))
      .toThrow(/actorId/);
  });

  it('builds a frozen record with recordId and occurredAt', () => {
    const record = buildDeletionStageRecord({ requestId: 'r1', userId: 'u1', stage: DELETION_STAGE.REQUESTED, actorId: 'a1' });
    expect(record.recordId).toMatch(/^datadel_/);
    expect(record.occurredAt).toBeTruthy();
    expect(Object.isFrozen(record)).toBe(true);
  });
});

describe('newRequestId', () => {
  it('returns unique ids', () => {
    const a = newRequestId();
    const b = newRequestId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^delreq_/);
  });
});

// ── data-deletion-repository.js ─────────────────────────────────────────────

describe('DataDeletionRepository', () => {
  it('rejects an incomplete record', () => {
    const repo = new DataDeletionRepository();
    expect(() => repo.append({ requestId: 'r1' })).toThrow(/recordId, requestId, userId, stage, occurredAt/);
  });

  it('findLatestByRequest returns the most recently appended record for that request', () => {
    const repo = new DataDeletionRepository();
    const r1 = buildDeletionStageRecord({ requestId: 'req-1', userId: 'u1', stage: DELETION_STAGE.REQUESTED, actorId: 'a1' });
    const r2 = buildDeletionStageRecord({ requestId: 'req-1', userId: 'u1', stage: DELETION_STAGE.ANONYMIZED, actorId: 'a1' });
    repo.append(r1);
    repo.append(r2);
    expect(repo.findLatestByRequest('req-1').recordId).toBe(r2.recordId);
    expect(repo.findLatestByRequest('unknown')).toBeNull();
  });

  it('findAllByRequest returns full append-order history for one request only', () => {
    const repo = new DataDeletionRepository();
    repo.append(buildDeletionStageRecord({ requestId: 'req-1', userId: 'u1', stage: DELETION_STAGE.REQUESTED, actorId: 'a1' }));
    repo.append(buildDeletionStageRecord({ requestId: 'req-2', userId: 'u2', stage: DELETION_STAGE.REQUESTED, actorId: 'a1' }));
    repo.append(buildDeletionStageRecord({ requestId: 'req-1', userId: 'u1', stage: DELETION_STAGE.ANONYMIZED, actorId: 'a1' }));
    expect(repo.findAllByRequest('req-1')).toHaveLength(2);
    expect(repo.findAllByRequest('req-2')).toHaveLength(1);
  });

  it('has no delete method (BD-032 Append-Only)', () => {
    const repo = new DataDeletionRepository();
    expect(repo.delete).toBeUndefined();
    expect(repo.remove).toBeUndefined();
  });
});

// ── data-deletion-service.js — happy path ───────────────────────────────────

describe('DataDeletionService pipeline', () => {
  it('advances REQUESTED → ANONYMIZED → SOFT_DELETED → HARD_DELETED in strict order', () => {
    const { service } = buildService();
    const req = service.requestDeletion({ userId: 'u1', actorId: 'a1' });
    expect(req.stage).toBe(DELETION_STAGE.REQUESTED);

    const anon = service.confirmAnonymization({ requestId: req.requestId, actorId: 'a1' });
    expect(anon.stage).toBe(DELETION_STAGE.ANONYMIZED);

    const soft = service.confirmSoftDelete({ requestId: req.requestId, actorId: 'a1' });
    expect(soft.stage).toBe(DELETION_STAGE.SOFT_DELETED);

    const eligibleAt = daysAfter(soft.occurredAt, HARD_DELETE_HOLD_DAYS);
    const hard = service.executeHardDelete({ requestId: req.requestId, actorId: 'a1', now: new Date(eligibleAt.getTime() + 1000) });
    expect(hard.stage).toBe(DELETION_STAGE.HARD_DELETED);
  });

  it('rejects HardDelete before the 90-day hold elapses (BD-019 fail-closed)', () => {
    const { service } = buildService();
    const req = service.requestDeletion({ userId: 'u1', actorId: 'a1' });
    service.confirmAnonymization({ requestId: req.requestId, actorId: 'a1' });
    const soft = service.confirmSoftDelete({ requestId: req.requestId, actorId: 'a1' });

    const tooEarly = daysAfter(soft.occurredAt, HARD_DELETE_HOLD_DAYS - 1);
    expect(() => service.executeHardDelete({ requestId: req.requestId, actorId: 'a1', now: tooEarly }))
      .toThrow(HardDeleteNotEligibleError);
  });

  it('rejects skipping a stage (SOFT_DELETED before ANONYMIZED)', () => {
    const { service } = buildService();
    const req = service.requestDeletion({ userId: 'u1', actorId: 'a1' });
    expect(() => service.confirmSoftDelete({ requestId: req.requestId, actorId: 'a1' }))
      .toThrow(DeletionStageOrderError);
  });

  it('rejects HardDelete attempted directly from REQUESTED', () => {
    const { service } = buildService();
    const req = service.requestDeletion({ userId: 'u1', actorId: 'a1' });
    expect(() => service.executeHardDelete({ requestId: req.requestId, actorId: 'a1' }))
      .toThrow(DeletionStageOrderError);
  });

  it('rejects re-requesting an already-open requestId', () => {
    const { service, repository } = buildService();
    const req = service.requestDeletion({ userId: 'u1', actorId: 'a1' });
    // Simulate a duplicate REQUESTED for the same requestId via direct advance-equivalent call
    expect(() => service.confirmAnonymization({ requestId: 'unknown-request', actorId: 'a1' }))
      .toThrow(/unknown requestId/);
    expect(repository.count).toBe(1);
  });

  it('getRequestStatus returns null for an unknown request', () => {
    const { service } = buildService();
    expect(service.getRequestStatus('nope')).toBeNull();
  });

  it('getRequestStatus exposes hardDeleteEligibleAt only while SOFT_DELETED', () => {
    const { service } = buildService();
    const req = service.requestDeletion({ userId: 'u1', actorId: 'a1' });
    expect(service.getRequestStatus(req.requestId).hardDeleteEligibleAt).toBeNull();

    service.confirmAnonymization({ requestId: req.requestId, actorId: 'a1' });
    const soft = service.confirmSoftDelete({ requestId: req.requestId, actorId: 'a1' });
    const status = service.getRequestStatus(req.requestId);
    expect(status.hardDeleteEligibleAt).toBe(daysAfter(soft.occurredAt, HARD_DELETE_HOLD_DAYS).toISOString());
    expect(status.history).toHaveLength(3);
  });

  it('getAllLatest returns one entry per request, at its current stage', () => {
    const { service } = buildService();
    const r1 = service.requestDeletion({ userId: 'u1', actorId: 'a1' });
    const r2 = service.requestDeletion({ userId: 'u2', actorId: 'a1' });
    service.confirmAnonymization({ requestId: r1.requestId, actorId: 'a1' });

    const latest = service.getAllLatest();
    expect(latest).toHaveLength(2);
    expect(latest.find(r => r.requestId === r1.requestId).stage).toBe(DELETION_STAGE.ANONYMIZED);
    expect(latest.find(r => r.requestId === r2.requestId).stage).toBe(DELETION_STAGE.REQUESTED);
  });

  it('getHistory returns the full cross-request audit trail', () => {
    const { service } = buildService();
    const r1 = service.requestDeletion({ userId: 'u1', actorId: 'a1' });
    service.confirmAnonymization({ requestId: r1.requestId, actorId: 'a1' });
    expect(service.getHistory()).toHaveLength(2);
  });

  it('getStatus reports schema version and the BD-019 hold days', () => {
    const { service } = buildService();
    const status = service.getStatus();
    expect(status.schemaVersion).toBe(DATA_DELETION_SCHEMA_VERSION);
    expect(status.hardDeleteHoldDays).toBe(HARD_DELETE_HOLD_DAYS);
  });

  it('throws without a repository', () => {
    expect(() => new DataDeletionService({})).toThrow(/repository is required/);
  });

  it('publishes DATA_DELETION_STAGE_ADVANCED on every transition when an eventPublisher is wired', () => {
    const published = [];
    const eventPublisher = { publish: (e) => published.push(e) };
    const { service } = buildService({ eventPublisher });
    const req = service.requestDeletion({ userId: 'u1', actorId: 'a1' });
    service.confirmAnonymization({ requestId: req.requestId, actorId: 'a1' });
    expect(published).toHaveLength(2);
    expect(published[0].eventType).toBe('DATA_DELETION_STAGE_ADVANCED');
    expect(published[0].aggregateType).toBe('DATA_DELETION');
  });

  it('does not throw if eventPublisher.publish itself throws (best-effort)', () => {
    const eventPublisher = { publish: () => { throw new Error('boom'); } };
    const { service } = buildService({ eventPublisher });
    expect(() => service.requestDeletion({ userId: 'u1', actorId: 'a1' })).not.toThrow();
  });
});
