// tests/dataset-version/dataset-version.test.js
// PR-055: Dataset Version Management — DatasetVersion / DatasetVersionService / BD-021 Append-Only
import { describe, it, expect, beforeEach } from 'vitest';
import { buildDatasetVersion, rejectMutation } from '../../src/domains/dataset-version/dataset-version-entity.js';
import { DatasetVersionRepository }           from '../../src/domains/dataset-version/dataset-version-repository.js';
import {
  DatasetVersionService, DATASET_TYPES, DATASET_VERSION_SCHEMA_VERSION, APPEND_ONLY_MSG,
} from '../../src/domains/dataset-version/dataset-version-service.js';
import {
  DATASET_TYPE_SET,
} from '../../src/domains/dataset-version/dataset-version-types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeService() {
  const repo = new DatasetVersionRepository();
  const svc  = new DatasetVersionService({ repository: repo });
  return { repo, svc };
}

const BASE = { type: 'SIGNAL', createdBy: 'researcher_1' };

// ── dataset-version-types ────────────────────────────────────────────────────

describe('dataset-version-types', () => {
  it('DATASET_TYPES has 6 types', () => {
    expect(Object.keys(DATASET_TYPES)).toHaveLength(6);
  });
  it('DATASET_TYPES is frozen', () => expect(Object.isFrozen(DATASET_TYPES)).toBe(true));
  it('DATASET_TYPE_SET contains all types', () => {
    for (const t of Object.values(DATASET_TYPES)) {
      expect(DATASET_TYPE_SET.has(t)).toBe(true);
    }
  });
  it('DATASET_VERSION_SCHEMA_VERSION is a string', () => {
    expect(typeof DATASET_VERSION_SCHEMA_VERSION).toBe('string');
  });
  it('APPEND_ONLY_MSG is a non-empty string', () => {
    expect(typeof APPEND_ONLY_MSG).toBe('string');
    expect(APPEND_ONLY_MSG.length).toBeGreaterThan(0);
  });
});

// ── buildDatasetVersion ───────────────────────────────────────────────────────

describe('buildDatasetVersion', () => {
  it('returns a frozen object', () => {
    const v = buildDatasetVersion(BASE);
    expect(Object.isFrozen(v)).toBe(true);
  });
  it('has BD-018 publishedAt ISO string', () => {
    const v = buildDatasetVersion(BASE);
    expect(typeof v.publishedAt).toBe('string');
    expect(new Date(v.publishedAt).toISOString()).toBe(v.publishedAt);
  });
  it('has versionId', () => {
    const v = buildDatasetVersion(BASE);
    expect(typeof v.versionId).toBe('string');
    expect(v.versionId.length).toBeGreaterThan(0);
  });
  it('accepts explicit versionId', () => {
    const v = buildDatasetVersion({ ...BASE, versionId: 'dv_custom' });
    expect(v.versionId).toBe('dv_custom');
  });
  it('versionName matches IPPO-DATASET-{TYPE}-v{MAJOR}.{MINOR}-{YYYYMMDD} pattern', () => {
    const v = buildDatasetVersion({ ...BASE, major: 2, minor: 3 });
    expect(v.versionName).toMatch(/^IPPO-DATASET-SIGNAL-v2\.3-\d{8}$/);
  });
  it('default major=1, minor=0 in versionName', () => {
    const v = buildDatasetVersion(BASE);
    expect(v.versionName).toMatch(/^IPPO-DATASET-SIGNAL-v1\.0-\d{8}$/);
  });
  it('doiCandidate is a UUID-like string', () => {
    const v = buildDatasetVersion(BASE);
    expect(v.doiCandidate).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
  it('each build produces a unique doiCandidate', () => {
    const v1 = buildDatasetVersion(BASE);
    const v2 = buildDatasetVersion(BASE);
    expect(v1.doiCandidate).not.toBe(v2.doiCandidate);
  });
  it('appendOnly is true', () => {
    const v = buildDatasetVersion(BASE);
    expect(v.appendOnly).toBe(true);
  });
  it('schemaVersion matches DATASET_VERSION_SCHEMA_VERSION', () => {
    const v = buildDatasetVersion(BASE);
    expect(v.schemaVersion).toBe(DATASET_VERSION_SCHEMA_VERSION);
  });
  it('content and metadata are frozen', () => {
    const v = buildDatasetVersion({ ...BASE, content: { rows: 100 }, metadata: { note: 'test' } });
    expect(Object.isFrozen(v.content)).toBe(true);
    expect(Object.isFrozen(v.metadata)).toBe(true);
  });
  it('cohortId and datasetId default to null', () => {
    const v = buildDatasetVersion(BASE);
    expect(v.cohortId).toBeNull();
    expect(v.datasetId).toBeNull();
  });
  it('accepts cohortId and datasetId', () => {
    const v = buildDatasetVersion({ ...BASE, cohortId: 'coh_1', datasetId: 'ds_1' });
    expect(v.cohortId).toBe('coh_1');
    expect(v.datasetId).toBe('ds_1');
  });
  it('all DATASET_TYPES are accepted', () => {
    for (const t of Object.values(DATASET_TYPES)) {
      expect(() => buildDatasetVersion({ type: t, createdBy: 'r1' })).not.toThrow();
    }
  });
  it('throws on unknown type', () => {
    expect(() => buildDatasetVersion({ type: 'INVALID', createdBy: 'r1' })).toThrow();
  });
  it('throws when createdBy is missing', () => {
    expect(() => buildDatasetVersion({ type: 'SIGNAL', createdBy: '' })).toThrow();
  });
  it('throws when major < 1', () => {
    expect(() => buildDatasetVersion({ ...BASE, major: 0 })).toThrow();
  });
  it('throws when minor < 0', () => {
    expect(() => buildDatasetVersion({ ...BASE, minor: -1 })).toThrow();
  });
});

// ── rejectMutation ────────────────────────────────────────────────────────────

describe('rejectMutation', () => {
  it('always throws with BD-021 message', () => {
    expect(() => rejectMutation()).toThrow('Append-Only');
  });
});

// ── DatasetVersionRepository ──────────────────────────────────────────────────

describe('DatasetVersionRepository', () => {
  let repo;
  beforeEach(() => { repo = new DatasetVersionRepository(); });

  it('append and findById', () => {
    const v = buildDatasetVersion({ ...BASE, versionId: 'dv_1' });
    repo.append(v);
    expect(repo.findById('dv_1')).toBe(v);
  });
  it('findById returns null for unknown id', () => {
    expect(repo.findById('no_such')).toBeNull();
  });
  it('BD-021: append throws if versionId already exists', () => {
    const v = buildDatasetVersion({ ...BASE, versionId: 'dv_dup' });
    repo.append(v);
    expect(() => repo.append(v)).toThrow('BD-021');
  });
  it('findAll returns all versions', () => {
    repo.append(buildDatasetVersion({ ...BASE, versionId: 'dv_a' }));
    repo.append(buildDatasetVersion({ ...BASE, versionId: 'dv_b' }));
    expect(repo.findAll()).toHaveLength(2);
  });
  it('findAll with datasetId filter', () => {
    repo.append(buildDatasetVersion({ ...BASE, versionId: 'dv_1', datasetId: 'ds_A' }));
    repo.append(buildDatasetVersion({ ...BASE, versionId: 'dv_2', datasetId: 'ds_B' }));
    expect(repo.findAll('ds_A')).toHaveLength(1);
    expect(repo.findAll('ds_A')[0].versionId).toBe('dv_1');
  });
  it('findByType returns versions of given type', () => {
    repo.append(buildDatasetVersion({ type: 'SIGNAL',  createdBy: 'r1', versionId: 'dv_s' }));
    repo.append(buildDatasetVersion({ type: 'CLUSTER', createdBy: 'r1', versionId: 'dv_c' }));
    expect(repo.findByType('SIGNAL')).toHaveLength(1);
    expect(repo.findByType('CLUSTER')).toHaveLength(1);
    expect(repo.findByType('COHORT')).toHaveLength(0);
  });
  it('getStats returns frozen object with versionCount', () => {
    repo.append(buildDatasetVersion({ ...BASE, versionId: 'dv_1' }));
    const s = repo.getStats();
    expect(Object.isFrozen(s)).toBe(true);
    expect(s.versionCount).toBe(1);
  });
  it('BD-021: delete() always throws', () => {
    expect(() => repo.delete()).toThrow('Append-Only');
  });
  it('BD-021: update() always throws', () => {
    expect(() => repo.update()).toThrow('Append-Only');
  });
});

// ── DatasetVersionService — publish ───────────────────────────────────────────

describe('DatasetVersionService publish', () => {
  it('returns a frozen DatasetVersion', () => {
    const { svc } = makeService();
    const v = svc.publish(BASE);
    expect(Object.isFrozen(v)).toBe(true);
  });
  it('has publishedAt BD-018', () => {
    const { svc } = makeService();
    const v = svc.publish(BASE);
    expect(typeof v.publishedAt).toBe('string');
  });
  it('has doiCandidate', () => {
    const { svc } = makeService();
    const v = svc.publish(BASE);
    expect(typeof v.doiCandidate).toBe('string');
    expect(v.doiCandidate.length).toBeGreaterThan(0);
  });
  it('versionName follows naming pattern', () => {
    const { svc } = makeService();
    const v = svc.publish({ type: 'COHORT', major: 3, minor: 1, createdBy: 'r1' });
    expect(v.versionName).toMatch(/^IPPO-DATASET-COHORT-v3\.1-\d{8}$/);
  });
  it('persists to repository', () => {
    const { repo, svc } = makeService();
    const v = svc.publish(BASE);
    expect(repo.findById(v.versionId)).not.toBeNull();
  });
  it('throws on unknown type', () => {
    const { svc } = makeService();
    expect(() => svc.publish({ type: 'BAD', createdBy: 'r1' })).toThrow();
  });
  it('publishes DATASET_VERSION_PUBLISHED event', () => {
    let published = null;
    const svc = new DatasetVersionService({
      repository:     new DatasetVersionRepository(),
      eventPublisher: { publish: (e) => { published = e; } },
    });
    svc.publish(BASE);
    expect(published?.eventType).toBe('DATASET_VERSION_PUBLISHED');
  });
  it('works without eventPublisher', () => {
    const svc = new DatasetVersionService({ repository: new DatasetVersionRepository() });
    expect(() => svc.publish(BASE)).not.toThrow();
  });
  it('each publish produces a unique versionId', () => {
    const { svc } = makeService();
    const v1 = svc.publish(BASE);
    const v2 = svc.publish(BASE);
    expect(v1.versionId).not.toBe(v2.versionId);
  });
});

// ── DatasetVersionService — BD-021 Append-Only guard ─────────────────────────

describe('DatasetVersionService BD-021 mutate guard', () => {
  it('mutate() always throws', () => {
    const { svc } = makeService();
    expect(() => svc.mutate()).toThrow('Append-Only');
  });
});

// ── DatasetVersionService — reads ─────────────────────────────────────────────

describe('DatasetVersionService reads', () => {
  it('getVersion returns null before publish', () => {
    const { svc } = makeService();
    expect(svc.getVersion('no_such')).toBeNull();
  });
  it('getVersion returns version after publish', () => {
    const { svc } = makeService();
    const v = svc.publish(BASE);
    expect(svc.getVersion(v.versionId)).toBe(v);
  });
  it('getVersions returns all versions', () => {
    const { svc } = makeService();
    svc.publish(BASE);
    svc.publish(BASE);
    expect(svc.getVersions()).toHaveLength(2);
  });
  it('getVersions filtered by datasetId', () => {
    const { svc } = makeService();
    svc.publish({ ...BASE, datasetId: 'ds_A' });
    svc.publish({ ...BASE, datasetId: 'ds_B' });
    expect(svc.getVersions('ds_A')).toHaveLength(1);
  });
  it('getVersionsByType filters correctly', () => {
    const { svc } = makeService();
    svc.publish({ type: 'SIGNAL',  createdBy: 'r1' });
    svc.publish({ type: 'CLUSTER', createdBy: 'r1' });
    expect(svc.getVersionsByType('SIGNAL')).toHaveLength(1);
    expect(svc.getVersionsByType('CLUSTER')).toHaveLength(1);
  });
  it('getStatus returns frozen object', () => {
    const { svc } = makeService();
    const s = svc.getStatus();
    expect(Object.isFrozen(s)).toBe(true);
    expect(s.ready).toBe(true);
    expect(s.appendOnly).toBe(true);
    expect(s.schemaVersion).toBe(DATASET_VERSION_SCHEMA_VERSION);
    expect(s.namingPattern).toContain('IPPO-DATASET');
  });
  it('getStatus bd021 field references APPEND_ONLY_MSG', () => {
    const { svc } = makeService();
    expect(svc.getStatus().bd021).toBe(APPEND_ONLY_MSG);
  });
});

// ── DATASET_VERSION_PUBLISHED domain event ────────────────────────────────────

describe('DATASET_VERSION_PUBLISHED domain event', () => {
  it('is defined in DOMAIN_EVENT_TYPES', async () => {
    const { DOMAIN_EVENT_TYPES } = await import('../../src/domains/events/domain-event-types.js');
    expect(DOMAIN_EVENT_TYPES.DATASET_VERSION_PUBLISHED).toBe('DATASET_VERSION_PUBLISHED');
  });
  it('AGGREGATE_TYPES.DATASET_VERSION is defined', async () => {
    const { AGGREGATE_TYPES } = await import('../../src/domains/events/domain-event-types.js');
    expect(AGGREGATE_TYPES.DATASET_VERSION).toBe('DATASET_VERSION');
  });
});
