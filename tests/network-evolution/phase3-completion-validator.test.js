// tests/network-evolution/phase3-completion-validator.test.js — PR-066 tests.
// Phase3CompletionValidator — NETWORK_EVOLUTION_COUNCIL Section 2-C Phase 3 completion (BD-026).
import { describe, it, expect, vi } from 'vitest';
import {
  Phase3CompletionValidator, Phase3IncompleteError,
} from '../../src/domains/network-evolution/phase3-completion-validator.js';
import {
  PHASE3_CASE_COUNT_THRESHOLD, PHASE3_REQUIRED_DISEASE_COUNT,
  PHASE3_VALIDATION_SCHEMA_VERSION, VALIDATION_RESULT,
} from '../../src/domains/network-evolution/phase3-completion-validator-types.js';

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
  for (let i = 0; i < count; i++) {
    profiles[keys[i]] = qualifiedProfile({ clusterId: keys[i] });
  }
  return profiles;
}

// ── checkDiseaseCluster ───────────────────────────────────────────────────────

describe('Phase3CompletionValidator.checkDiseaseCluster()', () => {
  it('throws when diseaseKey is missing', () => {
    const v = new Phase3CompletionValidator();
    expect(() => v.checkDiseaseCluster('', qualifiedProfile())).toThrow();
  });

  it('passes when caseCount >= 50 and statistics are computed', () => {
    const v = new Phase3CompletionValidator();
    const check = v.checkDiseaseCluster('ENDO', qualifiedProfile());
    expect(check.caseCountMet).toBe(true);
    expect(check.confidenceAchieved).toBe(true);
    expect(check.passed).toBe(true);
  });

  it('fails when caseCount is below threshold (Section 2-C)', () => {
    const v = new Phase3CompletionValidator();
    const check = v.checkDiseaseCluster('ENDO', qualifiedProfile({ caseCount: 49 }));
    expect(check.caseCountMet).toBe(false);
    expect(check.passed).toBe(false);
  });

  it('fails when caseCount is met but no statistics were computed (confidence not achieved)', () => {
    const v = new Phase3CompletionValidator();
    const check = v.checkDiseaseCluster('ENDO', qualifiedProfile({ signalPercentiles: {} }));
    expect(check.caseCountMet).toBe(true);
    expect(check.confidenceAchieved).toBe(false);
    expect(check.passed).toBe(false);
  });

  it('treats a null/missing profile as caseCount 0 (fails)', () => {
    const v = new Phase3CompletionValidator();
    const check = v.checkDiseaseCluster('ENDO', null);
    expect(check.caseCount).toBe(0);
    expect(check.passed).toBe(false);
  });

  it('exposes the caseCountThreshold constant', () => {
    const v = new Phase3CompletionValidator();
    const check = v.checkDiseaseCluster('ENDO', qualifiedProfile());
    expect(check.caseCountThreshold).toBe(PHASE3_CASE_COUNT_THRESHOLD);
  });

  it('is frozen', () => {
    const v = new Phase3CompletionValidator();
    expect(Object.isFrozen(v.checkDiseaseCluster('ENDO', qualifiedProfile()))).toBe(true);
  });
});

// ── validatePhase3 ────────────────────────────────────────────────────────────

describe('Phase3CompletionValidator.validatePhase3()', () => {
  it('throws when clusterProfiles is not a keyed object', () => {
    const v = new Phase3CompletionValidator();
    expect(() => v.validatePhase3(null)).toThrow(TypeError);
    expect(() => v.validatePhase3([])).toThrow(TypeError);
  });

  it('completion condition ①: automatically verifies Phase 3 across all clusters', () => {
    const v = new Phase3CompletionValidator();
    const report = v.validatePhase3(makeQualifiedClusterProfiles(5));
    expect(report.qualifiedDiseaseCount).toBe(5);
    expect(Object.keys(report.diseaseChecks)).toHaveLength(5);
  });

  it('phase3Complete is true when >= 5 disease clusters qualify (Section 1-A)', () => {
    const v = new Phase3CompletionValidator();
    const report = v.validatePhase3(makeQualifiedClusterProfiles(5));
    expect(report.phase3Complete).toBe(true);
    expect(report.result).toBe(VALIDATION_RESULT.PASS);
  });

  it('phase3Complete is false when fewer than 5 disease clusters qualify', () => {
    const v = new Phase3CompletionValidator();
    const report = v.validatePhase3(makeQualifiedClusterProfiles(4));
    expect(report.phase3Complete).toBe(false);
    expect(report.result).toBe(VALIDATION_RESULT.FAIL);
  });

  it('unqualified clusters (caseCount < 50) do not count toward qualifiedDiseaseCount', () => {
    const v = new Phase3CompletionValidator();
    const profiles = {
      ...makeQualifiedClusterProfiles(4),
      LOWN: qualifiedProfile({ clusterId: 'LOWN', caseCount: 10 }),
    };
    const report = v.validatePhase3(profiles);
    expect(report.qualifiedDiseaseCount).toBe(4);
    expect(report.phase3Complete).toBe(false);
  });

  it('exposes requiredDiseaseCount and caseCountThreshold constants', () => {
    const v = new Phase3CompletionValidator();
    const report = v.validatePhase3({});
    expect(report.requiredDiseaseCount).toBe(PHASE3_REQUIRED_DISEASE_COUNT);
    expect(report.caseCountThreshold).toBe(PHASE3_CASE_COUNT_THRESHOLD);
  });

  it('carries schemaVersion and generatedAt (BD-018)', () => {
    const v = new Phase3CompletionValidator();
    const report = v.validatePhase3({});
    expect(report.schemaVersion).toBe(PHASE3_VALIDATION_SCHEMA_VERSION);
    expect(new Date(report.generatedAt).toISOString()).toBe(report.generatedAt);
  });

  it('is frozen (Founder-facing report is immutable)', () => {
    const v = new Phase3CompletionValidator();
    const report = v.validatePhase3(makeQualifiedClusterProfiles(5));
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.diseaseChecks)).toBe(true);
  });

  it('publishes PHASE3_VALIDATION_COMPLETED (best-effort)', () => {
    const published = [];
    const v = new Phase3CompletionValidator({ eventPublisher: { publish: (e) => published.push(e) } });
    v.validatePhase3(makeQualifiedClusterProfiles(5));
    expect(published).toHaveLength(1);
    expect(published[0].eventType).toBe('PHASE3_VALIDATION_COMPLETED');
  });

  it('survives if eventPublisher.publish throws (best-effort)', () => {
    const v = new Phase3CompletionValidator({ eventPublisher: { publish: () => { throw new Error('bus'); } } });
    expect(() => v.validatePhase3(makeQualifiedClusterProfiles(5))).not.toThrow();
  });
});

// ── assertComplete / BD-026 gate for PR-067 ────────────────────────────────────

describe('Phase3CompletionValidator.assertComplete() — BD-026 gate', () => {
  it('completion condition ②: throws Phase3IncompleteError when Phase 3 is not reached, blocking Similarity UI publication', () => {
    const v = new Phase3CompletionValidator();
    const report = v.validatePhase3(makeQualifiedClusterProfiles(2));
    expect(() => v.assertComplete(report)).toThrow(Phase3IncompleteError);
  });

  it('does not throw when Phase 3 is complete', () => {
    const v = new Phase3CompletionValidator();
    const report = v.validatePhase3(makeQualifiedClusterProfiles(5));
    expect(() => v.assertComplete(report)).not.toThrow();
  });

  it('Phase3IncompleteError carries the failing report for diagnostics', () => {
    const v = new Phase3CompletionValidator();
    const report = v.validatePhase3(makeQualifiedClusterProfiles(1));
    try {
      v.assertComplete(report);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(Phase3IncompleteError);
      expect(err.report).toBe(report);
      expect(err.message).toMatch(/BD-026/);
    }
  });
});

// ── getStatus ────────────────────────────────────────────────────────────────

describe('Phase3CompletionValidator.getStatus()', () => {
  it('returns frozen compliance metadata', () => {
    const v = new Phase3CompletionValidator();
    const status = v.getStatus();
    expect(Object.isFrozen(status)).toBe(true);
    expect(status.ready).toBe(true);
    expect(status.caseCountThreshold).toBe(PHASE3_CASE_COUNT_THRESHOLD);
    expect(status.requiredDiseaseCount).toBe(PHASE3_REQUIRED_DISEASE_COUNT);
    expect(status.schemaVersion).toBe(PHASE3_VALIDATION_SCHEMA_VERSION);
  });
});
