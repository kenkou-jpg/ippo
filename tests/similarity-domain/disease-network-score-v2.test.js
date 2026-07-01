// tests/similarity-domain/disease-network-score-v2.test.js — PR-064 tests.
// DiseaseNetworkScoreV2Service — Cluster Profile × V2 Edge × Longitudinal Context integration.
// BD-042: V1/V2 edge separation. BD-018: generatedAt / vectorVersion='2' on every score.
import { describe, it, expect, vi } from 'vitest';
import {
  DiseaseNetworkScoreV2Service, NETWORK_SCORE_V2_SCHEMA_VERSION,
} from '../../src/domains/similarity/disease-network-score-v2-service.js';
import { LONGITUDINAL_TREND } from '../../src/domains/similarity/longitudinal-edge-enricher.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeV2Edge(overrides = {}) {
  return {
    edgeId:        overrides.edgeId        ?? 'EDGEV2-AA-BB-1',
    sourceCaseId:  overrides.sourceCaseId   ?? 'C1',
    targetCaseId:  overrides.targetCaseId   ?? 'C2',
    score:         overrides.score          ?? 0.8,
    displayScore:  overrides.displayScore,
    diseaseKey:    overrides.diseaseKey     ?? 'ENDO',
    vectorVersion: overrides.vectorVersion  ?? '2',
    longitudinalContext: overrides.longitudinalContext,
  };
}

function makeV1Edge(overrides = {}) {
  return {
    edgeId: 'EDGE-AA-BB-1', sourceCaseId: 'C1', targetCaseId: 'C2',
    score: 0.9, diseaseKey: 'ENDO', vectorVersion: '1',
    ...overrides,
  };
}

const clusterProfile = Object.freeze({ clusterId: 'ENDO', caseCount: 10, generatedAt: new Date().toISOString() });

// ── computeNetworkScore ──────────────────────────────────────────────────────

describe('DiseaseNetworkScoreV2Service.computeNetworkScore()', () => {
  it('throws when diseaseKey is missing', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    expect(() => svc.computeNetworkScore({ diseaseKey: '' })).toThrow();
  });

  it('throws when edges is not an array', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    expect(() => svc.computeNetworkScore({ diseaseKey: 'ENDO', edges: null })).toThrow(TypeError);
  });

  it('returns zeros when no edges are given', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({ diseaseKey: 'ENDO', edges: [] });
    expect(score.nodeCount).toBe(0);
    expect(score.edgeCount).toBe(0);
    expect(score.avgScore).toBe(0);
    expect(score.clusterCohesion).toBe(0);
    expect(score.longitudinalTrend).toBe(LONGITUDINAL_TREND.UNKNOWN);
  });

  it('BD-042: ignores V1 edges even for the same diseaseKey (V1/V2 must not mix)', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({
      diseaseKey: 'ENDO',
      edges: [makeV1Edge()],
    });
    expect(score.edgeCount).toBe(0);
  });

  it('counts only V2 edges matching the diseaseKey', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({
      diseaseKey: 'ENDO',
      edges: [
        makeV2Edge({ diseaseKey: 'ENDO', sourceCaseId: 'C1', targetCaseId: 'C2' }),
        makeV2Edge({ diseaseKey: 'PCOS', sourceCaseId: 'C3', targetCaseId: 'C4' }),
        makeV1Edge(),
      ],
    });
    expect(score.edgeCount).toBe(1);
  });

  it('nodeCount reflects distinct case ids from edge endpoints', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({
      diseaseKey: 'ENDO',
      edges: [
        makeV2Edge({ sourceCaseId: 'C1', targetCaseId: 'C2' }),
        makeV2Edge({ sourceCaseId: 'C2', targetCaseId: 'C3' }),
      ],
    });
    expect(score.nodeCount).toBe(3); // C1, C2, C3
  });

  it('nodeCount includes isolated caseIds passed explicitly', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({
      diseaseKey: 'ENDO',
      edges: [makeV2Edge({ sourceCaseId: 'C1', targetCaseId: 'C2' })],
      caseIds: ['C1', 'C2', 'C-ISOLATED'],
    });
    expect(score.nodeCount).toBe(3);
  });

  it('avgScore is the mean of edge scores', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({
      diseaseKey: 'ENDO',
      edges: [
        makeV2Edge({ sourceCaseId: 'C1', targetCaseId: 'C2', score: 0.6 }),
        makeV2Edge({ sourceCaseId: 'C2', targetCaseId: 'C3', score: 0.8 }),
      ],
    });
    expect(score.avgScore).toBeCloseTo(0.7);
  });

  it('avgScore prefers displayScore over raw score when present (Longitudinal-enriched)', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({
      diseaseKey: 'ENDO',
      edges: [makeV2Edge({ score: 0.5, displayScore: 0.55 })],
    });
    expect(score.avgScore).toBeCloseTo(0.55);
  });

  it('clusterCohesion is edgeCount / maxPossiblePairs', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({
      diseaseKey: 'ENDO',
      edges: [
        makeV2Edge({ sourceCaseId: 'C1', targetCaseId: 'C2' }),
      ],
      caseIds: ['C1', 'C2', 'C3'], // maxPossiblePairs = 3
    });
    expect(score.clusterCohesion).toBeCloseTo(1 / 3);
  });

  it('clusterCohesion is 0 when fewer than 2 nodes', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({ diseaseKey: 'ENDO', edges: [], caseIds: ['C1'] });
    expect(score.clusterCohesion).toBe(0);
  });

  it('clusterCohesion is capped at 1', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    // 3 edges among only 2 possible nodes (duplicate edges accumulated over reruns — BD-023)
    const score = svc.computeNetworkScore({
      diseaseKey: 'ENDO',
      edges: [
        makeV2Edge({ edgeId: 'E1', sourceCaseId: 'C1', targetCaseId: 'C2' }),
        makeV2Edge({ edgeId: 'E2', sourceCaseId: 'C1', targetCaseId: 'C2' }),
      ],
      caseIds: ['C1', 'C2'],
    });
    expect(score.clusterCohesion).toBeLessThanOrEqual(1);
  });

  it('longitudinalTrend reflects the dominant trend across enriched edges', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({
      diseaseKey: 'ENDO',
      edges: [
        makeV2Edge({
          sourceCaseId: 'C1', targetCaseId: 'C2',
          longitudinalContext: { sourceTrend: LONGITUDINAL_TREND.IMPROVING, targetTrend: LONGITUDINAL_TREND.IMPROVING },
        }),
        makeV2Edge({
          sourceCaseId: 'C2', targetCaseId: 'C3',
          longitudinalContext: { sourceTrend: LONGITUDINAL_TREND.WORSENING, targetTrend: LONGITUDINAL_TREND.STABLE },
        }),
      ],
    });
    expect(score.longitudinalTrend).toBe(LONGITUDINAL_TREND.IMPROVING);
  });

  it('longitudinalTrend is UNKNOWN when no edges carry longitudinalContext', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({
      diseaseKey: 'ENDO',
      edges: [makeV2Edge()],
    });
    expect(score.longitudinalTrend).toBe(LONGITUDINAL_TREND.UNKNOWN);
  });

  it('ignores UNKNOWN trends within longitudinalContext', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({
      diseaseKey: 'ENDO',
      edges: [
        makeV2Edge({
          longitudinalContext: { sourceTrend: LONGITUDINAL_TREND.UNKNOWN, targetTrend: LONGITUDINAL_TREND.STABLE },
        }),
      ],
    });
    expect(score.longitudinalTrend).toBe(LONGITUDINAL_TREND.STABLE);
  });

  it('includes caseCountFromCluster when clusterProfile is provided', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({ diseaseKey: 'ENDO', clusterProfile, edges: [] });
    expect(score.caseCountFromCluster).toBe(10);
  });

  it('caseCountFromCluster is null when clusterProfile is omitted', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({ diseaseKey: 'ENDO', edges: [] });
    expect(score.caseCountFromCluster).toBeNull();
  });

  it('carries vectorVersion="2" (BD-018/BD-010)', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({ diseaseKey: 'ENDO', edges: [] });
    expect(score.vectorVersion).toBe('2');
  });

  it('carries generatedAt ISO string (BD-018)', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({ diseaseKey: 'ENDO', edges: [] });
    expect(new Date(score.generatedAt).toISOString()).toBe(score.generatedAt);
  });

  it('is frozen', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const score = svc.computeNetworkScore({ diseaseKey: 'ENDO', edges: [] });
    expect(Object.isFrozen(score)).toBe(true);
  });

  it('publishes DISEASE_NETWORK_SCORE_V2_COMPUTED (best-effort)', () => {
    const published = [];
    const svc = new DiseaseNetworkScoreV2Service({ eventPublisher: { publish: (e) => published.push(e) } });
    svc.computeNetworkScore({ diseaseKey: 'ENDO', edges: [] });
    expect(published).toHaveLength(1);
    expect(published[0].eventType).toBe('DISEASE_NETWORK_SCORE_V2_COMPUTED');
  });

  it('survives if eventPublisher.publish throws (best-effort)', () => {
    const svc = new DiseaseNetworkScoreV2Service({ eventPublisher: { publish: () => { throw new Error('bus'); } } });
    expect(() => svc.computeNetworkScore({ diseaseKey: 'ENDO', edges: [] })).not.toThrow();
  });
});

// ── computeForAllClusters ────────────────────────────────────────────────────

describe('DiseaseNetworkScoreV2Service.computeForAllClusters()', () => {
  it('throws when diseaseKeys is not an array', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    expect(() => svc.computeForAllClusters({ diseaseKeys: null })).toThrow(TypeError);
  });

  it('computes a NetworkScore per diseaseKey (completion condition ①)', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const edges = [
      makeV2Edge({ diseaseKey: 'ENDO', sourceCaseId: 'C1', targetCaseId: 'C2' }),
      makeV2Edge({ diseaseKey: 'PCOS', sourceCaseId: 'C3', targetCaseId: 'C4' }),
    ];
    const scores = svc.computeForAllClusters({ diseaseKeys: ['ENDO', 'PCOS', 'ADENO'], edges });
    expect(scores).toHaveLength(3);
    expect(scores.find(s => s.diseaseKey === 'ENDO').edgeCount).toBe(1);
    expect(scores.find(s => s.diseaseKey === 'PCOS').edgeCount).toBe(1);
    expect(scores.find(s => s.diseaseKey === 'ADENO').edgeCount).toBe(0);
  });

  it('threads clusterProfiles and caseIdsByDisease per key', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const scores = svc.computeForAllClusters({
      diseaseKeys: ['ENDO'],
      clusterProfiles: { ENDO: clusterProfile },
      caseIdsByDisease: { ENDO: ['C1', 'C2', 'C-ISOLATED'] },
      edges: [makeV2Edge({ sourceCaseId: 'C1', targetCaseId: 'C2' })],
    });
    expect(scores[0].caseCountFromCluster).toBe(10);
    expect(scores[0].nodeCount).toBe(3);
  });
});

// ── getStatus ────────────────────────────────────────────────────────────────

describe('DiseaseNetworkScoreV2Service.getStatus()', () => {
  it('returns frozen compliance flags', () => {
    const svc = new DiseaseNetworkScoreV2Service();
    const status = svc.getStatus();
    expect(Object.isFrozen(status)).toBe(true);
    expect(status.bd018Compliant).toBe(true);
    expect(status.bd042Compliant).toBe(true);
    expect(status.vectorVersion).toBe('2');
    expect(status.schemaVersion).toBe(NETWORK_SCORE_V2_SCHEMA_VERSION);
  });
});
