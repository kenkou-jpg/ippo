// tests/network-evolution/similarity-public-gate.test.js — PR-067 tests.
// SimilarityPublicGateService — Phase 3 検証 → Founder 承認フロー → UI 公開ゲート (BD-026 / BD-027).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SimilarityPublicGateService,
} from '../../src/domains/network-evolution/similarity-public-gate-service.js';
import {
  SimilarityPublicGateRepository,
} from '../../src/domains/network-evolution/similarity-public-gate-repository.js';
import {
  buildApprovalRecord, _resetApprovalCounter,
} from '../../src/domains/network-evolution/similarity-public-gate-entity.js';
import { GATE_STATE, PUBLIC_GATE_SCHEMA_VERSION } from '../../src/domains/network-evolution/similarity-public-gate-types.js';
import {
  Phase3CompletionValidator, Phase3IncompleteError,
} from '../../src/domains/network-evolution/phase3-completion-validator.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function qualifiedProfile(overrides = {}) {
  return {
    clusterId:         overrides.clusterId ?? 'ENDO',
    caseCount:         overrides.caseCount ?? 50,
    signalPercentiles: overrides.signalPercentiles ?? { PAIN: { p25: 1, p50: 2, p75: 3, p90: 4 } },
  };
}

function makeQualifiedClusterProfiles(count) {
  const keys = ['ENDO', 'PCOS', 'ADENO', 'PMDD', 'FIBROID', 'MIGRAINE', 'IBS'];
  const profiles = {};
  for (let i = 0; i < count; i++) profiles[keys[i]] = qualifiedProfile({ clusterId: keys[i] });
  return profiles;
}

function makeGate() {
  const phase3Validator = new Phase3CompletionValidator();
  const repository      = new SimilarityPublicGateRepository();
  const service = new SimilarityPublicGateService({ phase3Validator, repository });
  return { service, phase3Validator, repository };
}

beforeEach(() => { _resetApprovalCounter(); });

// ── buildApprovalRecord entity ───────────────────────────────────────────────

describe('buildApprovalRecord entity', () => {
  const completeReport = Object.freeze({ phase3Complete: true, qualifiedDiseaseCount: 5, requiredDiseaseCount: 5 });

  it('throws when founderId is missing', () => {
    expect(() => buildApprovalRecord({ founderId: '', phase3Report: completeReport })).toThrow();
  });

  it('throws when phase3Report.phase3Complete is not true', () => {
    expect(() => buildApprovalRecord({ founderId: 'f1', phase3Report: { phase3Complete: false } })).toThrow();
  });

  it('builds a frozen ApprovalRecord with decidedAt ISO string (BD-018)', () => {
    const record = buildApprovalRecord({ founderId: 'f1', phase3Report: completeReport });
    expect(Object.isFrozen(record)).toBe(true);
    expect(new Date(record.decidedAt).toISOString()).toBe(record.decidedAt);
  });

  it('approvalId starts with "pubgate_" and is unique across calls', () => {
    const a = buildApprovalRecord({ founderId: 'f1', phase3Report: completeReport });
    const b = buildApprovalRecord({ founderId: 'f1', phase3Report: completeReport });
    expect(a.approvalId).toMatch(/^pubgate_/);
    expect(a.approvalId).not.toBe(b.approvalId);
  });

  it('carries qualifiedDiseaseCount / requiredDiseaseCount from the report', () => {
    const record = buildApprovalRecord({ founderId: 'f1', phase3Report: completeReport });
    expect(record.qualifiedDiseaseCount).toBe(5);
    expect(record.requiredDiseaseCount).toBe(5);
  });

  it('defaults note to an empty string', () => {
    const record = buildApprovalRecord({ founderId: 'f1', phase3Report: completeReport });
    expect(record.note).toBe('');
  });
});

// ── SimilarityPublicGateRepository ────────────────────────────────────────────

describe('SimilarityPublicGateRepository', () => {
  let repo;
  beforeEach(() => { repo = new SimilarityPublicGateRepository(); });

  const completeReport = Object.freeze({ phase3Complete: true, qualifiedDiseaseCount: 5, requiredDiseaseCount: 5 });

  it('accepts and retrieves approval records', () => {
    repo.append(buildApprovalRecord({ founderId: 'f1', phase3Report: completeReport }));
    expect(repo.findAll()).toHaveLength(1);
    expect(repo.count).toBe(1);
  });

  it('throws when required fields are missing', () => {
    expect(() => repo.append({ approvalId: 'a1' })).toThrow();
  });

  it('latest returns the most recently decided approval', async () => {
    const a = buildApprovalRecord({ founderId: 'f1', phase3Report: completeReport });
    await new Promise(r => setTimeout(r, 5));
    const b = buildApprovalRecord({ founderId: 'f2', phase3Report: completeReport });
    repo.append(a);
    repo.append(b);
    expect(repo.latest().approvalId).toBe(b.approvalId);
  });

  it('latest returns null when empty', () => {
    expect(repo.latest()).toBeNull();
  });

  it('findAll returns a copy (no external mutation)', () => {
    repo.append(buildApprovalRecord({ founderId: 'f1', phase3Report: completeReport }));
    const all = repo.findAll();
    all.pop();
    expect(repo.count).toBe(1);
  });

  it('has no delete/deleteById method (BD-032 Append-Only)', () => {
    expect(typeof repo.delete).toBe('undefined');
    expect(typeof repo.deleteById).toBe('undefined');
  });
});

// ── SimilarityPublicGateService.checkGate ─────────────────────────────────────

describe('SimilarityPublicGateService.checkGate()', () => {
  it('throws when constructed without phase3Validator or repository', () => {
    expect(() => new SimilarityPublicGateService({})).toThrow();
    expect(() => new SimilarityPublicGateService({ phase3Validator: new Phase3CompletionValidator() })).toThrow();
  });

  it('completion condition ①: gateState is BLOCKED when Phase 3 is not complete (BD-026/BD-027)', () => {
    const { service } = makeGate();
    const status = service.checkGate(makeQualifiedClusterProfiles(2));
    expect(status.gateState).toBe(GATE_STATE.BLOCKED);
    expect(status.phase3Report.phase3Complete).toBe(false);
  });

  it('gateState is READY_FOR_APPROVAL when Phase 3 complete and no approval exists yet', () => {
    const { service } = makeGate();
    const status = service.checkGate(makeQualifiedClusterProfiles(5));
    expect(status.gateState).toBe(GATE_STATE.READY_FOR_APPROVAL);
  });

  it('gateState is APPROVED after a Founder approval has been recorded', () => {
    const { service } = makeGate();
    const profiles = makeQualifiedClusterProfiles(5);
    const first  = service.checkGate(profiles);
    service.approvePublication({ founderId: 'founder-1', phase3Report: first.phase3Report });
    const second = service.checkGate(profiles);
    expect(second.gateState).toBe(GATE_STATE.APPROVED);
  });

  it('is frozen and carries schemaVersion/generatedAt', () => {
    const { service } = makeGate();
    const status = service.checkGate({});
    expect(Object.isFrozen(status)).toBe(true);
    expect(status.schemaVersion).toBe(PUBLIC_GATE_SCHEMA_VERSION);
    expect(new Date(status.generatedAt).toISOString()).toBe(status.generatedAt);
  });
});

// ── SimilarityPublicGateService.approvePublication — BD-026/BD-027 hard gate ──

describe('SimilarityPublicGateService.approvePublication()', () => {
  it('completion condition ①: throws Phase3IncompleteError when Phase 3 is not reached', () => {
    const { service } = makeGate();
    const incompleteReport = service.checkGate(makeQualifiedClusterProfiles(2)).phase3Report;
    expect(() => service.approvePublication({ founderId: 'founder-1', phase3Report: incompleteReport }))
      .toThrow(Phase3IncompleteError);
  });

  it('does not persist an approval when blocked', () => {
    const { service, repository } = makeGate();
    const incompleteReport = service.checkGate(makeQualifiedClusterProfiles(1)).phase3Report;
    try { service.approvePublication({ founderId: 'founder-1', phase3Report: incompleteReport }); } catch { /* expected */ }
    expect(repository.count).toBe(0);
  });

  it('completion condition ②: publication state changes after Founder approval', () => {
    const { service } = makeGate();
    const report = service.checkGate(makeQualifiedClusterProfiles(5)).phase3Report;
    expect(service.isPublicationApproved()).toBe(false);
    service.approvePublication({ founderId: 'founder-1', phase3Report: report });
    expect(service.isPublicationApproved()).toBe(true);
  });

  it('completion condition ③: approval record is persisted to the repository', () => {
    const { service, repository } = makeGate();
    const report = service.checkGate(makeQualifiedClusterProfiles(5)).phase3Report;
    service.approvePublication({ founderId: 'founder-1', phase3Report: report, note: 'Q3 review' });
    expect(repository.count).toBe(1);
    expect(repository.latest().founderId).toBe('founder-1');
    expect(repository.latest().note).toBe('Q3 review');
  });

  it('completion condition ③: publishes SIMILARITY_PUBLICATION_APPROVED (best-effort)', () => {
    const published = [];
    const phase3Validator = new Phase3CompletionValidator();
    const repository      = new SimilarityPublicGateRepository();
    const service = new SimilarityPublicGateService({
      phase3Validator, repository, eventPublisher: { publish: (e) => published.push(e) },
    });
    const report = service.checkGate(makeQualifiedClusterProfiles(5)).phase3Report;
    service.approvePublication({ founderId: 'founder-1', phase3Report: report });
    expect(published).toHaveLength(1);
    expect(published[0].eventType).toBe('SIMILARITY_PUBLICATION_APPROVED');
  });

  it('survives if eventPublisher.publish throws (best-effort, repository already persisted)', () => {
    const phase3Validator = new Phase3CompletionValidator();
    const repository      = new SimilarityPublicGateRepository();
    const service = new SimilarityPublicGateService({
      phase3Validator, repository, eventPublisher: { publish: () => { throw new Error('bus'); } },
    });
    const report = service.checkGate(makeQualifiedClusterProfiles(5)).phase3Report;
    expect(() => service.approvePublication({ founderId: 'founder-1', phase3Report: report })).not.toThrow();
    expect(repository.count).toBe(1);
  });

  it('getApprovals returns the full audit trail across multiple approvals', () => {
    const { service } = makeGate();
    const report = service.checkGate(makeQualifiedClusterProfiles(5)).phase3Report;
    service.approvePublication({ founderId: 'founder-1', phase3Report: report });
    service.approvePublication({ founderId: 'founder-1', phase3Report: report, note: 'second confirmation' });
    expect(service.getApprovals()).toHaveLength(2);
  });
});

// ── verifyCaseRecommendationAlignment — PR-059 integration (completion condition ④) ──

describe('SimilarityPublicGateService.verifyCaseRecommendationAlignment()', () => {
  it('is aligned (both false) before any Founder approval', () => {
    const { service } = makeGate();
    const alignment = service.verifyCaseRecommendationAlignment({ phase3Complete: false });
    expect(alignment.aligned).toBe(true);
    expect(alignment.remainingAction).toBeNull();
  });

  it('flags misalignment when gate is approved but CaseRecommendationService.PHASE3_COMPLETE is still false', () => {
    const { service } = makeGate();
    const report = service.checkGate(makeQualifiedClusterProfiles(5)).phase3Report;
    service.approvePublication({ founderId: 'founder-1', phase3Report: report });
    const alignment = service.verifyCaseRecommendationAlignment({ phase3Complete: false });
    expect(alignment.aligned).toBe(false);
    expect(alignment.gateApproved).toBe(true);
    expect(alignment.structuralFlagComplete).toBe(false);
    expect(alignment.remainingAction).toMatch(/PHASE3_COMPLETE/);
  });

  it('is aligned once both the gate and the structural flag agree', () => {
    const { service } = makeGate();
    const report = service.checkGate(makeQualifiedClusterProfiles(5)).phase3Report;
    service.approvePublication({ founderId: 'founder-1', phase3Report: report });
    const alignment = service.verifyCaseRecommendationAlignment({ phase3Complete: true });
    expect(alignment.aligned).toBe(true);
    expect(alignment.remainingAction).toBeNull();
  });
});

// ── getStatus ────────────────────────────────────────────────────────────────

describe('SimilarityPublicGateService.getStatus()', () => {
  it('returns frozen compliance metadata', () => {
    const { service } = makeGate();
    const status = service.getStatus();
    expect(Object.isFrozen(status)).toBe(true);
    expect(status.ready).toBe(true);
    expect(status.publicationApproved).toBe(false);
    expect(status.approvalCount).toBe(0);
    expect(status.schemaVersion).toBe(PUBLIC_GATE_SCHEMA_VERSION);
  });

  it('reflects approvalCount after an approval', () => {
    const { service } = makeGate();
    const report = service.checkGate(makeQualifiedClusterProfiles(5)).phase3Report;
    service.approvePublication({ founderId: 'founder-1', phase3Report: report });
    expect(service.getStatus().approvalCount).toBe(1);
    expect(service.getStatus().publicationApproved).toBe(true);
  });
});
