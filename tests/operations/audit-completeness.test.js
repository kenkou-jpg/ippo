// tests/operations/audit-completeness.test.js
// Verifies that all audit logs emit ISO8601 timestamps for their required fields.
import { describe, it, expect } from 'vitest';

const ISO8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// ── CommunicationAuditLog ────────────────────────────────────────────────────
import { CommunicationAuditLog } from '../../src/domains/communication/communication-audit-log.js';

function makeCommRepo() {
  const store = [];
  return {
    saveAuditLog: e => store.push(e),
    findByUser: uid => store.filter(e => e.userId === uid),
    _store: store,
  };
}

describe('Audit Completeness — CommunicationAuditLog', () => {
  it('generatedAt is ISO8601', () => {
    const repo = makeCommRepo();
    const log  = new CommunicationAuditLog(repo);
    const e = log.append({ userId: 'u1', notificationType: 'DAY1_RECORD', scheduledAt: new Date().toISOString() });
    expect(e.generatedAt).toMatch(ISO8601_RE);
  });

  it('scheduledAt is preserved as provided ISO8601', () => {
    const repo = makeCommRepo();
    const log  = new CommunicationAuditLog(repo);
    const at   = new Date().toISOString();
    const e = log.append({ userId: 'u1', notificationType: 'DAY7_SUMMARY', scheduledAt: at });
    expect(e.scheduledAt).toBe(at);
  });
});

// ── DeliveryAuditLog ─────────────────────────────────────────────────────────
import { DeliveryAuditLog } from '../../src/domains/delivery/delivery-audit-log.js';

function makeDeliveryRepo() {
  const store = [];
  return {
    appendAudit: e => store.push(e),
    findAuditByUser: uid => store.filter(e => e.userId === uid),
    loadAudit: () => store,
    _store: store,
  };
}

describe('Audit Completeness — DeliveryAuditLog', () => {
  it('recordedAt is ISO8601', () => {
    const repo = makeDeliveryRepo();
    const log  = new DeliveryAuditLog(repo);
    const e = log.append({ queueId: 'dq_1', userId: 'u1', notificationType: 'DAY1_RECORD', fromStatus: null, toStatus: 'PENDING' });
    expect(e.recordedAt).toMatch(ISO8601_RE);
  });

  it('append-only — findAll grows monotonically', () => {
    const repo = makeDeliveryRepo();
    const log  = new DeliveryAuditLog(repo);
    log.recordQueued({ queueId: 'dq_1', userId: 'u1', notificationType: 'DAY1_RECORD' });
    log.recordScheduled({ queueId: 'dq_1', userId: 'u1', notificationType: 'DAY1_RECORD' });
    log.recordDelivered({ queueId: 'dq_1', userId: 'u1', notificationType: 'DAY1_RECORD' });
    expect(log.findAll()).toHaveLength(3);
  });
});

// ── KpiSnapshot ───────────────────────────────────────────────────────────────
import { KpiSnapshot } from '../../src/domains/analytics/kpi-snapshot.js';

function makeKpiRepo() {
  const store = [];
  return {
    append: e => store.push(e),
    findAll: () => store,
    findLatest: () => store.length ? store[store.length - 1] : null,
  };
}

describe('Audit Completeness — KpiSnapshot', () => {
  it('capturedAt is ISO8601', () => {
    const repo = makeKpiRepo();
    const snap = new KpiSnapshot(repo);
    const e = snap.capture({ day1Retention: 0.8, day7Retention: 0.5, recordCompletionRate: 0.7, experimentStartRate: 0.6, experimentCompletionRate: 0.4, consentLevel2Rate: 0.3, diseaseTagCoverage: 0.9, caseGenerationRate: 0.5 });
    expect(e.capturedAt).toMatch(ISO8601_RE);
  });

  it('append-only — findAll grows monotonically', () => {
    const repo = makeKpiRepo();
    const snap = new KpiSnapshot(repo);
    snap.capture({ day1Retention: 0.8, day7Retention: 0.5, recordCompletionRate: 0.7, experimentStartRate: 0.6, experimentCompletionRate: 0.4, consentLevel2Rate: 0.3, diseaseTagCoverage: 0.9, caseGenerationRate: 0.5 });
    snap.capture({ day1Retention: 0.9, day7Retention: 0.6, recordCompletionRate: 0.8, experimentStartRate: 0.7, experimentCompletionRate: 0.5, consentLevel2Rate: 0.4, diseaseTagCoverage: 1.0, caseGenerationRate: 0.6 });
    expect(snap.findAll()).toHaveLength(2);
  });
});
