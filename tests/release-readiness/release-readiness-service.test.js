// tests/release-readiness/release-readiness-service.test.js — PR-077 tests.
// Release Readiness Recovery Program — docs/RELEASE_READINESS_COUNCIL.md Critical C-2/C-3.
// Additive ledger above Wave2ExitAuditService (PR-075) — never reads/writes it.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReleaseReadinessService, CONFIRMATION_CATEGORY, REGULATORY_CONDITIONS, FOUNDER_REVIEW_BD_LIST,
  RELEASE_READINESS_SCHEMA_VERSION,
} from '../../src/domains/release-readiness/release-readiness-service.js';
import { ReleaseReadinessRepository } from '../../src/domains/release-readiness/release-readiness-repository.js';
import { buildConfirmationRecord, _resetConfirmationCounter } from '../../src/domains/release-readiness/release-readiness-entity.js';
import { CONFIRMABLE_ITEM_IDS } from '../../src/domains/release-readiness/release-readiness-types.js';
import { BD_SCOPE_LIST, MECHANICALLY_AUDITED_BDS } from '../../src/domains/wave2-exit-audit/wave2-exit-audit-types.js';

beforeEach(() => { _resetConfirmationCounter(); });

function buildService(overrides = {}) {
  const repository = new ReleaseReadinessRepository();
  const service = new ReleaseReadinessService({ repository, ...overrides });
  return { service, repository };
}

// ── release-readiness-types.js ────────────────────────────────────────────────

describe('REGULATORY_CONDITIONS', () => {
  it('has exactly C-1〜C-5 (REGULATORY_MEDICAL_COUNCIL.md 条件一覧)', () => {
    expect(REGULATORY_CONDITIONS.map(c => c.id)).toEqual(['C-1', 'C-2', 'C-3', 'C-4', 'C-5']);
  });
});

describe('FOUNDER_REVIEW_BD_LIST', () => {
  it('is exactly BD_SCOPE_LIST minus MECHANICALLY_AUDITED_BDS (34 of 43)', () => {
    expect(BD_SCOPE_LIST.length).toBe(43);
    expect(MECHANICALLY_AUDITED_BDS.length).toBe(9);
    expect(FOUNDER_REVIEW_BD_LIST.length).toBe(34);
  });

  it('never contains a mechanically-audited BD', () => {
    const ids = FOUNDER_REVIEW_BD_LIST.map(b => b.bd);
    for (const bd of MECHANICALLY_AUDITED_BDS) expect(ids).not.toContain(bd);
  });
});

describe('CONFIRMABLE_ITEM_IDS', () => {
  it('contains all 5 regulatory conditions and all 34 BD reviews (39 total)', () => {
    expect(CONFIRMABLE_ITEM_IDS.size).toBe(39);
    expect(CONFIRMABLE_ITEM_IDS.has('C-3')).toBe(true);
    expect(CONFIRMABLE_ITEM_IDS.has('BD-044')).toBe(false); // out of scope — not in BD_SCOPE_LIST at all
  });
});

// ── release-readiness-entity.js ─────────────────────────────────────────────────

describe('buildConfirmationRecord', () => {
  it('throws without founderId', () => {
    expect(() => buildConfirmationRecord({ category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-1', confirmed: true }))
      .toThrow(/founderId/);
  });

  it('throws for an unknown category', () => {
    expect(() => buildConfirmationRecord({ founderId: 'f1', category: 'NOPE', itemId: 'C-1', confirmed: true }))
      .toThrow(/category/);
  });

  it('throws for an itemId not in CONFIRMABLE_ITEM_IDS', () => {
    expect(() => buildConfirmationRecord({
      founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-99', confirmed: true,
    })).toThrow(/itemId/);
  });

  it('throws when confirmed is not a boolean', () => {
    expect(() => buildConfirmationRecord({
      founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-1', confirmed: 'yes',
    })).toThrow(/boolean/);
  });

  it('builds a frozen record with confirmedAt ISO string (BD-018)', () => {
    const r = buildConfirmationRecord({
      founderId: 'kenkou-jpg', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-1', confirmed: true,
    });
    expect(Object.isFrozen(r)).toBe(true);
    expect(new Date(r.confirmedAt).toISOString()).toBe(r.confirmedAt);
    expect(r.confirmationId).toMatch(/^relready_/);
  });

  it('allows confirmed:false as an explicit non-completion record', () => {
    expect(() => buildConfirmationRecord({
      founderId: 'f1', category: CONFIRMATION_CATEGORY.BD_FOUNDER_REVIEW, itemId: 'BD-003', confirmed: false, note: 'not yet',
    })).not.toThrow();
  });
});

// ── release-readiness-repository.js ─────────────────────────────────────────────

describe('ReleaseReadinessRepository', () => {
  it('rejects malformed records', () => {
    const repo = new ReleaseReadinessRepository();
    expect(() => repo.append({})).toThrow();
  });

  it('findLatestByItem returns null when never confirmed', () => {
    const repo = new ReleaseReadinessRepository();
    expect(repo.findLatestByItem('C-1')).toBeNull();
  });

  it('findLatestByItem returns the most recent record for that item', () => {
    const repo = new ReleaseReadinessRepository();
    const r1 = buildConfirmationRecord({ founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-1', confirmed: false });
    repo.append(r1);
    const r2 = buildConfirmationRecord({ founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-1', confirmed: true });
    repo.append(r2);
    expect(repo.findLatestByItem('C-1').confirmationId).toBe(r2.confirmationId);
  });

  it('never deletes history — findAll returns every record (Append-Only, BD-032)', () => {
    const repo = new ReleaseReadinessRepository();
    repo.append(buildConfirmationRecord({ founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-1', confirmed: false }));
    repo.append(buildConfirmationRecord({ founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-1', confirmed: true }));
    expect(repo.findAll()).toHaveLength(2);
    expect(repo.count).toBe(2);
  });
});

// ── release-readiness-service.js ────────────────────────────────────────────────

describe('ReleaseReadinessService.confirmItem', () => {
  it('throws without repository', () => {
    expect(() => new ReleaseReadinessService({})).toThrow();
  });

  it('appends a record and returns it', () => {
    const { service, repository } = buildService();
    const record = service.confirmItem({ founderId: 'kenkou-jpg', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-1', confirmed: true });
    expect(repository.count).toBe(1);
    expect(record.itemId).toBe('C-1');
  });

  it('publishes RELEASE_READINESS_ITEM_CONFIRMED (best-effort)', () => {
    const published = [];
    const { service } = buildService({ eventPublisher: { publish: (e) => published.push(e) } });
    service.confirmItem({ founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-1', confirmed: true });
    expect(published).toHaveLength(1);
    expect(published[0].eventType).toBe('RELEASE_READINESS_ITEM_CONFIRMED');
  });

  it('survives if eventPublisher.publish throws (best-effort)', () => {
    const { service, repository } = buildService({ eventPublisher: { publish: () => { throw new Error('bus'); } } });
    expect(() => service.confirmItem({ founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-1', confirmed: true })).not.toThrow();
    expect(repository.count).toBe(1);
  });
});

describe('ReleaseReadinessService.getConfirmationStatus', () => {
  it('reports every item as unreviewed before any confirmation', () => {
    const { service } = buildService();
    const status = service.getConfirmationStatus();
    expect(status.schemaVersion).toBe(RELEASE_READINESS_SCHEMA_VERSION);
    expect(status.regulatoryConditions).toHaveLength(5);
    expect(status.bdReviews).toHaveLength(34);
    expect(status.regulatoryConditions.every(i => i.reviewed === false)).toBe(true);
    expect(status.bdReviews.every(i => i.reviewed === false)).toBe(true);
  });

  it('reflects the latest confirmation per item', () => {
    const { service } = buildService();
    service.confirmItem({ founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-1', confirmed: false, note: 'pending' });
    service.confirmItem({ founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-1', confirmed: true, note: 'done' });
    const status = service.getConfirmationStatus();
    const c1 = status.regulatoryConditions.find(i => i.itemId === 'C-1');
    expect(c1.reviewed).toBe(true);
    expect(c1.confirmed).toBe(true);
    expect(c1.note).toBe('done');
  });
});

describe('ReleaseReadinessService.checkBetaReadinessGate', () => {
  it('fail-closed: not ready when nothing has been confirmed', () => {
    const { service } = buildService();
    const gate = service.checkBetaReadinessGate();
    expect(gate.ready).toBe(false);
    expect(gate.unconfirmedRegulatoryConditions).toHaveLength(5);
    expect(gate.unconfirmedBdReviews).toHaveLength(34);
  });

  it('not ready when regulatory conditions are confirmed but BD reviews are not', () => {
    const { service } = buildService();
    for (const c of REGULATORY_CONDITIONS) {
      service.confirmItem({ founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: c.id, confirmed: true });
    }
    const gate = service.checkBetaReadinessGate();
    expect(gate.ready).toBe(false);
    expect(gate.unconfirmedRegulatoryConditions).toHaveLength(0);
    expect(gate.unconfirmedBdReviews).toHaveLength(34);
  });

  it('a confirmed:false record still blocks the gate (not merely "unreviewed")', () => {
    const { service } = buildService();
    for (const c of REGULATORY_CONDITIONS) {
      service.confirmItem({ founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: c.id, confirmed: c.id !== 'C-3' });
    }
    service.confirmItem({ founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-3', confirmed: false, note: 'SaMD opinion not yet obtained' });
    for (const b of FOUNDER_REVIEW_BD_LIST) {
      service.confirmItem({ founderId: 'f1', category: CONFIRMATION_CATEGORY.BD_FOUNDER_REVIEW, itemId: b.bd, confirmed: true });
    }
    const gate = service.checkBetaReadinessGate();
    expect(gate.ready).toBe(false);
    expect(gate.unconfirmedRegulatoryConditions.map(i => i.itemId)).toEqual(['C-3']);
  });

  it('ready:true only once every regulatory condition and BD review is confirmed:true', () => {
    const { service } = buildService();
    for (const c of REGULATORY_CONDITIONS) {
      service.confirmItem({ founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: c.id, confirmed: true });
    }
    for (const b of FOUNDER_REVIEW_BD_LIST) {
      service.confirmItem({ founderId: 'f1', category: CONFIRMATION_CATEGORY.BD_FOUNDER_REVIEW, itemId: b.bd, confirmed: true });
    }
    const gate = service.checkBetaReadinessGate();
    expect(gate.ready).toBe(true);
    expect(gate.unconfirmedRegulatoryConditions).toHaveLength(0);
    expect(gate.unconfirmedBdReviews).toHaveLength(0);
  });
});

describe('ReleaseReadinessService.getHistory / getStatus', () => {
  it('getHistory returns the full Append-Only audit trail', () => {
    const { service } = buildService();
    service.confirmItem({ founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-1', confirmed: false });
    service.confirmItem({ founderId: 'f1', category: CONFIRMATION_CATEGORY.REGULATORY_CONDITION, itemId: 'C-1', confirmed: true });
    expect(service.getHistory()).toHaveLength(2);
  });

  it('getStatus returns frozen metadata and never claims Wave2ExitAudit is modified', () => {
    const { service } = buildService();
    const status = service.getStatus();
    expect(Object.isFrozen(status)).toBe(true);
    expect(status.regulatoryConditionCount).toBe(5);
    expect(status.bdFounderReviewCount).toBe(34);
    expect(status.note).toMatch(/does not modify or replace/);
  });
});
