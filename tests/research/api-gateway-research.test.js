// tests/research/api-gateway-research.test.js
// ApiGateway — Research Dataset API — PR-040
import { describe, it, expect, beforeEach } from 'vitest';
import { ApiGateway }                from '../../src/application/api-gateway.js';
import { ResearchDatasetService }    from '../../src/domains/research/research-dataset-service.js';
import { ResearchDatasetRepository } from '../../src/domains/research/research-dataset-repository.js';
import { ResearchDatasetBuilder }    from '../../src/domains/research/research-dataset-builder.js';
import { DatasetExportService }      from '../../src/domains/research/dataset-export-service.js';
import { AnonymizationService }      from '../../src/domains/research/anonymization-service.js';
import { DATASET_STATUS }            from '../../src/domains/research/research-dataset-types.js';

function adminPermission() {
  return {
    require: async (perm) => {
      if (!['admin:research', 'admin:dashboard'].includes(perm)) throw new Error('Forbidden');
      return { userId: 'admin-1', isAdmin: true };
    },
  };
}

function makeGateway() {
  const repo    = new ResearchDatasetRepository();
  const builder = new ResearchDatasetBuilder();
  const svc     = new ResearchDatasetService({ repository: repo, builder });
  const exporter = new DatasetExportService();
  const anon    = new AnonymizationService();

  return new ApiGateway({
    permissionService:         adminPermission(),
    similarityAccessGuard:     {},
    consentEnforcementService: {},
    recordQueryService:        { findByUser: async () => [] },
    recordCommandService:      { save: async (d) => d },
    experimentQueryService:    { findActive: async () => [] },
    experimentCommandService:  { create: async (d) => d },
    caseGenerationService:     { generate: async () => ({}) },
    similarityEngine:          {},
    researchDatasetService:    svc,
    datasetExportService:      exporter,
    anonymizationService:      anon,
  });
}

describe('ApiGateway — createResearchDataset', () => {
  it('returns READY dataset', async () => {
    const gw = makeGateway();
    const d  = await gw.createResearchDataset();
    expect(d.status).toBe(DATASET_STATUS.READY);
  });

  it('throws when service not wired', async () => {
    const gw = new ApiGateway({
      permissionService:         adminPermission(),
      similarityAccessGuard:     {},
      consentEnforcementService: {},
      recordQueryService:        { findByUser: async () => [] },
      recordCommandService:      { save: async (d) => d },
      experimentQueryService:    { findActive: async () => [] },
      experimentCommandService:  { create: async (d) => d },
      caseGenerationService:     { generate: async () => ({}) },
      similarityEngine:          {},
    });
    await expect(gw.createResearchDataset()).rejects.toThrow('ResearchDatasetService');
  });
});

describe('ApiGateway — getResearchDatasets', () => {
  it('returns array', async () => {
    const gw = makeGateway();
    await gw.createResearchDataset();
    const all = await gw.getResearchDatasets();
    expect(Array.isArray(all)).toBe(true);
    expect(all).toHaveLength(1);
  });
});

describe('ApiGateway — verifyResearchDataset', () => {
  it('verifies created dataset', async () => {
    const gw = makeGateway();
    const d  = await gw.createResearchDataset();
    const r  = await gw.verifyResearchDataset(d.id);
    expect(r.verified).toBe(true);
  });

  it('returns not found for unknown id', async () => {
    const gw = makeGateway();
    const r  = await gw.verifyResearchDataset('nonexistent');
    expect(r.verified).toBe(false);
  });
});

describe('ApiGateway — exportResearchDataset', () => {
  it('exports JSON by default', async () => {
    const gw = makeGateway();
    const d  = await gw.createResearchDataset();
    const r  = await gw.exportResearchDataset(d.id);
    expect(r.format).toBe('JSON');
  });

  it('exports CSV', async () => {
    const gw = makeGateway();
    const d  = await gw.createResearchDataset();
    const r  = await gw.exportResearchDataset(d.id, 'CSV');
    expect(r.format).toBe('CSV');
  });

  it('returns PARQUET stub', async () => {
    const gw = makeGateway();
    const d  = await gw.createResearchDataset();
    const r  = await gw.exportResearchDataset(d.id, 'PARQUET');
    expect(r.stub).toBe(true);
  });
});

describe('ApiGateway — getResearchStatistics', () => {
  it('returns generatedAt', async () => {
    const gw    = makeGateway();
    const stats = await gw.getResearchStatistics();
    expect(stats.generatedAt).toBeTruthy();
    expect(typeof stats.datasetCount).toBe('number');
  });
});

describe('ApiGateway — getAnonymizationReport', () => {
  it('returns report with generatedAt', async () => {
    const gw = makeGateway();
    await gw.createResearchDataset();
    const r = await gw.getAnonymizationReport();
    expect(r.generatedAt).toBeTruthy();
    expect(typeof r.verified).toBe('boolean');
  });
});
