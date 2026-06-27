// tests/research/research-dataset-service.test.js
// Research Dataset Service — PR-040
import { describe, it, expect, beforeEach } from 'vitest';
import { ResearchDatasetService }    from '../../src/domains/research/research-dataset-service.js';
import { ResearchDatasetRepository } from '../../src/domains/research/research-dataset-repository.js';
import { ResearchDatasetBuilder }    from '../../src/domains/research/research-dataset-builder.js';
import { DATASET_STATUS, ANONYMIZATION_LEVEL } from '../../src/domains/research/research-dataset-types.js';

function makeService(extraDeps = {}) {
  const repo    = new ResearchDatasetRepository();
  const builder = new ResearchDatasetBuilder();
  return { service: new ResearchDatasetService({ repository: repo, builder, ...extraDeps }), repo, builder };
}

describe('ResearchDatasetService — constructor', () => {
  it('throws without repository', () => {
    expect(() => new ResearchDatasetService({ builder: new ResearchDatasetBuilder() })).toThrow('repository');
  });
  it('throws without builder', () => {
    expect(() => new ResearchDatasetService({ repository: new ResearchDatasetRepository() })).toThrow('builder');
  });
});

describe('ResearchDatasetService — createDataset', () => {
  it('returns a dataset with READY status', () => {
    const { service } = makeService();
    const d = service.createDataset();
    expect(d.status).toBe(DATASET_STATUS.READY);
  });

  it('persists dataset in repository', () => {
    const { service, repo } = makeService();
    service.createDataset();
    expect(repo.count).toBe(1);
  });

  it('accepts anonymizationLevel', () => {
    const { service } = makeService();
    const d = service.createDataset({ anonymizationLevel: ANONYMIZATION_LEVEL.K_ANONYMITY });
    expect(d.anonymizationLevel).toBe(ANONYMIZATION_LEVEL.K_ANONYMITY);
  });

  it('publishes RESEARCH_DATASET_CREATED event when publisher present', () => {
    const published = [];
    const publisher = { publish: (e) => published.push(e) };
    const { service } = makeService({ eventPublisher: publisher });
    service.createDataset();
    expect(published).toHaveLength(1);
    expect(published[0].eventType).toBe('RESEARCH_DATASET_CREATED');
  });
});

describe('ResearchDatasetService — getDatasets', () => {
  it('returns empty array initially', () => {
    const { service } = makeService();
    expect(service.getDatasets()).toEqual([]);
  });

  it('returns all datasets after creation', () => {
    const { service } = makeService();
    service.createDataset();
    service.createDataset();
    expect(service.getDatasets()).toHaveLength(2);
  });
});

describe('ResearchDatasetService — findLatest', () => {
  it('returns null when empty', () => {
    const { service } = makeService();
    expect(service.findLatest()).toBeNull();
  });

  it('returns the most recent dataset', () => {
    const { service } = makeService();
    service.createDataset();
    const d2 = service.createDataset();
    expect(service.findLatest().id).toBe(d2.id);
  });
});

describe('ResearchDatasetService — verifyDataset', () => {
  it('returns not found when id does not exist', () => {
    const { service } = makeService();
    const r = service.verifyDataset('nonexistent');
    expect(r.verified).toBe(false);
    expect(r.issues[0]).toContain('not found');
  });

  it('verifies valid dataset', () => {
    const { service } = makeService();
    const d = service.createDataset();
    const r = service.verifyDataset(d.id);
    expect(r.verified).toBe(true);
    expect(r.issues).toHaveLength(0);
  });
});

describe('ResearchDatasetService — getStatistics', () => {
  it('returns generatedAt', () => {
    const { service } = makeService();
    const stats = service.getStatistics();
    expect(stats.generatedAt).toBeTruthy();
  });

  it('counts datasets', () => {
    const { service } = makeService();
    service.createDataset();
    service.createDataset();
    const stats = service.getStatistics();
    expect(stats.datasetCount).toBe(2);
  });
});
