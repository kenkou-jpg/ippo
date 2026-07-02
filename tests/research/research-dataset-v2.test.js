// tests/research/research-dataset-v2.test.js — PR-068 tests.
// ResearchDatasetV2Service — Record × Signal × DiseaseEntity × Case × V2 Edge ×
// ClusterStats × KG骨格 統合Dataset生成 → Founder承認公開 (BD-021 / BD-030).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ResearchDatasetV2Service, DatasetKAnonymityError, DatasetV2PublicationNotApprovedError,
} from '../../src/domains/research/research-dataset-v2-service.js';
import {
  buildResearchDatasetV2, _resetDatasetV2Counter,
} from '../../src/domains/research/research-dataset-v2-entity.js';
import {
  RESEARCH_DATASET_V2_SCHEMA_VERSION, DATASET_V2_MAJOR, DATASET_V2_MINOR, K_ANONYMITY_MIN_K,
} from '../../src/domains/research/research-dataset-v2-types.js';
import { DatasetVersionRepository } from '../../src/domains/dataset-version/dataset-version-repository.js';
import { DatasetVersionService }    from '../../src/domains/dataset-version/dataset-version-service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function qualifiedProfile(overrides = {}) {
  return { clusterId: overrides.clusterId ?? 'ENDO', caseCount: overrides.caseCount ?? 50 };
}

function makeClusterProfiles(count) {
  const keys = ['ENDO', 'PCOS', 'ADENO', 'PMDD', 'FIBROID'];
  const profiles = {};
  for (let i = 0; i < count; i++) profiles[keys[i]] = qualifiedProfile({ clusterId: keys[i] });
  return profiles;
}

function makeV2Edge(overrides = {}) {
  return {
    edgeId: overrides.edgeId ?? 'EDGEV2-AA-BB-1', sourceCaseId: overrides.sourceCaseId ?? 'C1',
    targetCaseId: overrides.targetCaseId ?? 'C2', score: overrides.score ?? 0.8,
    displayScore: overrides.displayScore ?? 0.82, diseaseKey: overrides.diseaseKey ?? 'ENDO', vectorVersion: '2',
  };
}

function makeKgSnapshot(overrides = {}) {
  return { kgVersion: 'KG-v1.0-20261231', nodeCount: 40, edgeCount: 120, ...overrides };
}

function makeService() {
  const repository            = new DatasetVersionRepository();
  const datasetVersionService = new DatasetVersionService({ repository });
  const service                = new ResearchDatasetV2Service({ datasetVersionService });
  return { service, datasetVersionService, repository };
}

beforeEach(() => { _resetDatasetV2Counter(); });

// ── buildResearchDatasetV2 entity ────────────────────────────────────────────

describe('buildResearchDatasetV2 entity', () => {
  it('throws when array-typed fields are not arrays', () => {
    expect(() => buildResearchDatasetV2({ signals: null })).toThrow(TypeError);
    expect(() => buildResearchDatasetV2({ diseases: 'x' })).toThrow(TypeError);
    expect(() => buildResearchDatasetV2({ cases: {} })).toThrow(TypeError);
    expect(() => buildResearchDatasetV2({ v2Edges: 1 })).toThrow(TypeError);
  });

  it('throws when clusterProfiles is not a keyed object', () => {
    expect(() => buildResearchDatasetV2({ clusterProfiles: [] })).toThrow(TypeError);
  });

  it('builds a frozen dataset with generatedAt ISO string (BD-018)', () => {
    const d = buildResearchDatasetV2({});
    expect(Object.isFrozen(d)).toBe(true);
    expect(new Date(d.generatedAt).toISOString()).toBe(d.generatedAt);
  });

  it('id starts with "datasetv2_" and is unique across calls', () => {
    const a = buildResearchDatasetV2({});
    const b = buildResearchDatasetV2({});
    expect(a.id).toMatch(/^datasetv2_/);
    expect(a.id).not.toBe(b.id);
  });

  it('completion condition ①: includes KG / V2 Edge / Cluster Stats counts', () => {
    const d = buildResearchDatasetV2({
      v2Edges: [makeV2Edge(), makeV2Edge({ edgeId: 'EDGEV2-CC-DD-2' })],
      clusterProfiles: makeClusterProfiles(2),
      kgSnapshot: makeKgSnapshot(),
    });
    expect(d.v2EdgeCount).toBe(2);
    expect(d.clusterCount).toBe(2);
    expect(d.kgNodeCount).toBe(40);
    expect(d.kgEdgeCount).toBe(120);
    expect(d.v2Edges).toHaveLength(2);
    expect(Object.keys(d.clusterProfiles)).toEqual(['ENDO', 'PCOS']);
    expect(d.kgSnapshot.kgVersion).toBe('KG-v1.0-20261231');
  });

  it('kgNodeCount/kgEdgeCount default to 0 when kgSnapshot is omitted', () => {
    const d = buildResearchDatasetV2({});
    expect(d.kgNodeCount).toBe(0);
    expect(d.kgEdgeCount).toBe(0);
    expect(d.kgSnapshot).toBeNull();
  });

  it('recordCount and caseCount mirror the cases array length', () => {
    const d = buildResearchDatasetV2({ cases: [{ caseId: 'C1' }, { caseId: 'C2' }] });
    expect(d.recordCount).toBe(2);
    expect(d.caseCount).toBe(2);
  });
});

// ── ResearchDatasetV2Service.buildDatasetV2 ──────────────────────────────────

describe('ResearchDatasetV2Service.buildDatasetV2()', () => {
  it('throws when constructed without datasetVersionService', () => {
    expect(() => new ResearchDatasetV2Service({})).toThrow();
  });

  it('completion condition ②: throws DatasetKAnonymityError when a cluster has caseCount < 5 (BD-030)', () => {
    const { service } = makeService();
    expect(() => service.buildDatasetV2({ clusterProfiles: { ENDO: qualifiedProfile({ caseCount: 4 }) } }))
      .toThrow(DatasetKAnonymityError);
  });

  it('does not build a partial dataset when k-anonymity fails (all-or-nothing, unlike Wave1 suppression)', () => {
    const { service } = makeService();
    const clusterProfiles = { ...makeClusterProfiles(3), LOWN: qualifiedProfile({ clusterId: 'LOWN', caseCount: 2 }) };
    let thrown = null;
    try { service.buildDatasetV2({ clusterProfiles }); } catch (e) { thrown = e; }
    expect(thrown).toBeInstanceOf(DatasetKAnonymityError);
    expect(thrown.diseaseKey).toBe('LOWN');
    expect(thrown.count).toBe(2);
  });

  it('builds successfully when all clusters meet caseCount >= 5', () => {
    const { service } = makeService();
    const dataset = service.buildDatasetV2({
      v2Edges: [makeV2Edge()], clusterProfiles: makeClusterProfiles(5), kgSnapshot: makeKgSnapshot(),
    });
    expect(dataset.v2EdgeCount).toBe(1);
    expect(dataset.clusterCount).toBe(5);
  });

  it('builds successfully with no clusterProfiles at all (nothing to violate)', () => {
    const { service } = makeService();
    expect(() => service.buildDatasetV2({})).not.toThrow();
  });

  it('publishes RESEARCH_DATASET_V2_BUILT (best-effort)', () => {
    const published = [];
    const repository            = new DatasetVersionRepository();
    const datasetVersionService = new DatasetVersionService({ repository });
    const service = new ResearchDatasetV2Service({
      datasetVersionService, eventPublisher: { publish: (e) => published.push(e) },
    });
    service.buildDatasetV2({});
    expect(published).toHaveLength(1);
    expect(published[0].eventType).toBe('RESEARCH_DATASET_V2_BUILT');
  });

  it('survives if eventPublisher.publish throws (best-effort)', () => {
    const repository            = new DatasetVersionRepository();
    const datasetVersionService = new DatasetVersionService({ repository });
    const service = new ResearchDatasetV2Service({
      datasetVersionService, eventPublisher: { publish: () => { throw new Error('bus'); } },
    });
    expect(() => service.buildDatasetV2({})).not.toThrow();
  });
});

// ── ResearchDatasetV2Service.publishDatasetV2 — BD-021 Founder gate ───────────

describe('ResearchDatasetV2Service.publishDatasetV2()', () => {
  it('throws when datasetV2 is missing', () => {
    const { service } = makeService();
    expect(() => service.publishDatasetV2(null, { founderId: 'f1' })).toThrow();
  });

  it('completion condition ③: throws DatasetV2PublicationNotApprovedError without founderId (BD-021)', () => {
    const { service } = makeService();
    const dataset = service.buildDatasetV2({});
    expect(() => service.publishDatasetV2(dataset, {})).toThrow(DatasetV2PublicationNotApprovedError);
    expect(() => service.publishDatasetV2(dataset)).toThrow(DatasetV2PublicationNotApprovedError);
  });

  it('does not persist a DatasetVersion when publication is rejected', () => {
    const { service, repository } = makeService();
    const dataset = service.buildDatasetV2({});
    try { service.publishDatasetV2(dataset, {}); } catch { /* expected */ }
    expect(repository.findAll().length).toBe(0);
  });

  it('publishes a DatasetVersion named IPPO-DATASET-FULL-v2.0-{date} with an explicit founderId', () => {
    const { service } = makeService();
    const dataset = service.buildDatasetV2({ clusterProfiles: makeClusterProfiles(5) });
    const version = service.publishDatasetV2(dataset, { founderId: 'founder-1' });
    expect(version.versionName).toMatch(/^IPPO-DATASET-FULL-v2\.0-\d{8}$/);
    expect(version.createdBy).toBe('founder-1');
    expect(version.major).toBe(DATASET_V2_MAJOR);
    expect(version.minor).toBe(DATASET_V2_MINOR);
  });

  it('links the published DatasetVersion back to the source datasetV2.id', () => {
    const { service } = makeService();
    const dataset = service.buildDatasetV2({});
    const version = service.publishDatasetV2(dataset, { founderId: 'founder-1' });
    expect(version.datasetId).toBe(dataset.id);
  });

  it('carries dataset composition counts in content', () => {
    const { service } = makeService();
    const dataset = service.buildDatasetV2({ v2Edges: [makeV2Edge()], clusterProfiles: makeClusterProfiles(5) });
    const version = service.publishDatasetV2(dataset, { founderId: 'founder-1' });
    expect(version.content.v2EdgeCount).toBe(1);
    expect(version.content.clusterCount).toBe(5);
  });
});

// ── Export ────────────────────────────────────────────────────────────────────

describe('ResearchDatasetV2Service export', () => {
  it('exportJSON throws when datasetV2 is missing', () => {
    const { service } = makeService();
    expect(() => service.exportJSON(null)).toThrow();
  });

  it('exportJSON serializes the full dataset', () => {
    const { service } = makeService();
    const dataset = service.buildDatasetV2({ v2Edges: [makeV2Edge()] });
    const result  = service.exportJSON(dataset);
    expect(result.format).toBe('JSON');
    expect(JSON.parse(result.data).id).toBe(dataset.id);
  });

  it('exportCSV emits a header row plus one row per V2 edge (completion condition ④)', () => {
    const { service } = makeService();
    const dataset = service.buildDatasetV2({ v2Edges: [makeV2Edge(), makeV2Edge({ edgeId: 'EDGEV2-CC-DD-2' })] });
    const result  = service.exportCSV(dataset);
    const lines   = result.data.split('\n');
    expect(lines[0]).toBe('edgeId,sourceCaseId,targetCaseId,diseaseKey,score,displayScore,vectorVersion');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('EDGEV2-AA-BB-1');
  });

  it('exportCSV emits header-only output when there are no V2 edges', () => {
    const { service } = makeService();
    const dataset = service.buildDatasetV2({});
    const result  = service.exportCSV(dataset);
    expect(result.data.split('\n')).toHaveLength(1);
  });

  it('export metadata carries composition counts and generatedAt (BD-018)', () => {
    const { service } = makeService();
    const dataset = service.buildDatasetV2({ v2Edges: [makeV2Edge()], clusterProfiles: makeClusterProfiles(5) });
    const result  = service.exportJSON(dataset);
    expect(result.metadata.v2EdgeCount).toBe(1);
    expect(result.metadata.clusterCount).toBe(5);
    expect(new Date(result.metadata.generatedAt).toISOString()).toBe(result.metadata.generatedAt);
  });
});

// ── getStatus ────────────────────────────────────────────────────────────────

describe('ResearchDatasetV2Service.getStatus()', () => {
  it('returns frozen compliance metadata', () => {
    const { service } = makeService();
    const status = service.getStatus();
    expect(Object.isFrozen(status)).toBe(true);
    expect(status.schemaVersion).toBe(RESEARCH_DATASET_V2_SCHEMA_VERSION);
    expect(status.majorVersion).toBe(DATASET_V2_MAJOR);
    expect(status.minorVersion).toBe(DATASET_V2_MINOR);
    expect(status.kAnonymityMin).toBe(K_ANONYMITY_MIN_K);
  });
});
