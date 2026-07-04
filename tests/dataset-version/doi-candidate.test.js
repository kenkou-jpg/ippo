// tests/dataset-version/doi-candidate.test.js — PR-070 tests.
// DOICandidateService — Dataset Version → DOI候補ID付与 / Citation生成（APA/Nature）.
import { describe, it, expect } from 'vitest';
import { DOICandidateService, CITATION_FORMATS } from '../../src/domains/dataset-version/doi-candidate-service.js';
import { generateCitation }     from '../../src/domains/dataset-version/citation-generator.js';
import { IPPO_DOI_PREFIX, DOI_CANDIDATE_SCHEMA_VERSION } from '../../src/domains/dataset-version/doi-candidate-types.js';
import { DatasetVersionRepository } from '../../src/domains/dataset-version/dataset-version-repository.js';
import { DatasetVersionService }    from '../../src/domains/dataset-version/dataset-version-service.js';
import { buildResearchDatasetV2 }   from '../../src/domains/research/research-dataset-v2-entity.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeVersion(overrides = {}) {
  const repo = new DatasetVersionRepository();
  const svc  = new DatasetVersionService({ repository: repo });
  return svc.publish({ type: 'FULL', major: 2, minor: 0, createdBy: 'researcher_1', ...overrides });
}

// ── DOICandidateService.assignDoiCandidate ────────────────────────────────────

describe('DOICandidateService.assignDoiCandidate()', () => {
  it('throws when datasetVersion.versionId is missing', () => {
    const svc = new DOICandidateService();
    expect(() => svc.assignDoiCandidate({})).toThrow();
  });

  it('completion condition ①: produces 10.{prefix}/{datasetVersionId} format', () => {
    const svc = new DOICandidateService();
    const version = makeVersion();
    const assignment = svc.assignDoiCandidate(version);
    expect(assignment.doiCandidate).toBe(`${IPPO_DOI_PREFIX}/${version.versionId}`);
  });

  it('carries datasetVersionId and versionName', () => {
    const svc = new DOICandidateService();
    const version = makeVersion();
    const assignment = svc.assignDoiCandidate(version);
    expect(assignment.datasetVersionId).toBe(version.versionId);
    expect(assignment.versionName).toBe(version.versionName);
  });

  it('is frozen and carries assignedAt ISO string (BD-018)', () => {
    const svc = new DOICandidateService();
    const assignment = svc.assignDoiCandidate(makeVersion());
    expect(Object.isFrozen(assignment)).toBe(true);
    expect(new Date(assignment.assignedAt).toISOString()).toBe(assignment.assignedAt);
  });

  it('two different DatasetVersions get distinct DOI candidates', () => {
    const svc = new DOICandidateService();
    const a = svc.assignDoiCandidate(makeVersion());
    const b = svc.assignDoiCandidate(makeVersion());
    expect(a.doiCandidate).not.toBe(b.doiCandidate);
  });
});

// ── DOICandidateService.attachDoiCandidateToDatasetV2 ─────────────────────────

describe('DOICandidateService.attachDoiCandidateToDatasetV2()', () => {
  it('throws when datasetV2 is missing', () => {
    const svc = new DOICandidateService();
    expect(() => svc.attachDoiCandidateToDatasetV2(null, makeVersion())).toThrow();
  });

  it('completion condition ①③: sets metadata.doi_candidate on the Dataset V2', () => {
    const svc = new DOICandidateService();
    const version   = makeVersion();
    const datasetV2 = buildResearchDatasetV2({});
    const result    = svc.attachDoiCandidateToDatasetV2(datasetV2, version);
    expect(result.metadata.doi_candidate).toBe(`${IPPO_DOI_PREFIX}/${version.versionId}`);
  });

  it('does not mutate the source datasetV2 (BD-021)', () => {
    const svc = new DOICandidateService();
    const version   = makeVersion();
    const datasetV2 = buildResearchDatasetV2({});
    svc.attachDoiCandidateToDatasetV2(datasetV2, version);
    expect(datasetV2.metadata.doi_candidate).toBeUndefined();
  });

  it('preserves existing metadata fields alongside doi_candidate', () => {
    const svc = new DOICandidateService();
    const version   = makeVersion();
    const datasetV2 = buildResearchDatasetV2({ metadata: { note: 'test' } });
    const result    = svc.attachDoiCandidateToDatasetV2(datasetV2, version);
    expect(result.metadata.note).toBe('test');
    expect(result.metadata.doi_candidate).toBeDefined();
  });

  it('returns a frozen object', () => {
    const svc = new DOICandidateService();
    const result = svc.attachDoiCandidateToDatasetV2(buildResearchDatasetV2({}), makeVersion());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.metadata)).toBe(true);
  });
});

// ── Citation Generator ─────────────────────────────────────────────────────────

describe('generateCitation()', () => {
  const version = { versionName: 'IPPO-DATASET-FULL-v2.0-20260702', createdBy: 'researcher_1', publishedAt: '2026-07-02T00:00:00.000Z' };

  it('throws when versionName is missing', () => {
    expect(() => generateCitation({}, '10.99999/dv_1')).toThrow();
  });

  it('throws when doiCandidate is missing', () => {
    expect(() => generateCitation(version, null)).toThrow();
  });

  it('completion condition ②: generates an APA-format citation by default', () => {
    const citation = generateCitation(version, '10.99999/dv_1');
    expect(citation).toContain('researcher_1');
    expect(citation).toContain('(2026)');
    expect(citation).toContain('IPPO-DATASET-FULL-v2.0-20260702');
    expect(citation).toContain('https://doi.org/10.99999/dv_1');
  });

  it('completion condition ②: generates a Nature-format citation', () => {
    const citation = generateCitation(version, '10.99999/dv_1', 'NATURE');
    expect(citation).toContain('researcher_1');
    expect(citation).toContain('IPPO-DATASET-FULL-v2.0-20260702');
    expect(citation).toContain('https://doi.org/10.99999/dv_1');
  });

  it('APA and Nature formats produce different strings', () => {
    const apa    = generateCitation(version, '10.99999/dv_1', 'APA');
    const nature = generateCitation(version, '10.99999/dv_1', 'NATURE');
    expect(apa).not.toBe(nature);
  });

  it('throws on unknown format', () => {
    expect(() => generateCitation(version, '10.99999/dv_1', 'MLA')).toThrow();
  });

  it('falls back to current year when publishedAt is missing', () => {
    const citation = generateCitation({ versionName: 'X', createdBy: 'r1' }, '10.99999/dv_1');
    expect(citation).toContain(String(new Date().getFullYear()));
  });
});

// ── DOICandidateService.generateCitation (delegation) ─────────────────────────

describe('DOICandidateService.generateCitation()', () => {
  it('delegates to citation-generator with the assigned DOI candidate', () => {
    const svc = new DOICandidateService();
    const version = makeVersion();
    const citation = svc.generateCitation(version);
    expect(citation).toContain(`https://doi.org/${IPPO_DOI_PREFIX}/${version.versionId}`);
  });

  it('supports NATURE format', () => {
    const svc = new DOICandidateService();
    const citation = svc.generateCitation(makeVersion(), CITATION_FORMATS.NATURE);
    expect(citation).toContain('https://doi.org/');
  });
});

// ── getStatus ────────────────────────────────────────────────────────────────

describe('DOICandidateService.getStatus()', () => {
  it('returns frozen compliance metadata', () => {
    const svc = new DOICandidateService();
    const status = svc.getStatus();
    expect(Object.isFrozen(status)).toBe(true);
    expect(status.doiPrefix).toBe(IPPO_DOI_PREFIX);
    expect(status.schemaVersion).toBe(DOI_CANDIDATE_SCHEMA_VERSION);
    expect(status.formats).toContain('APA');
    expect(status.formats).toContain('NATURE');
  });
});
