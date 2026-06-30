// tests/evidence/evidence-layer.test.js
// PR-056: Evidence Layer — EvidenceSummary / EvidenceLayerService / Phase C capstone
import { describe, it, expect } from 'vitest';
import { buildEvidenceSummary }   from '../../src/domains/evidence/evidence-summary-entity.js';
import {
  EvidenceLayerService, EVIDENCE_SOURCE_TYPES, EVIDENCE_SCHEMA_VERSION, PLATFORM_VERSION,
} from '../../src/domains/evidence/evidence-layer-service.js';
import {
  EVIDENCE_SOURCE_TYPE_SET,
} from '../../src/domains/evidence/evidence-types.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DATASET = {
  versionId: 'dv_1', versionName: 'IPPO-DATASET-SIGNAL-v1.0-20260630',
  type: 'SIGNAL', doiCandidate: 'abc123-uuid',
};
const CLUSTER = { clusterId: 'ENDO', diseaseKey: 'ENDO', caseCount: 12 };
const PATTERN = { patternType: 'PHASE_CORRELATION', description: 'Sleep↔Pain' };
const EVENT   = { eventType: 'SIGNAL_CREATED', aggregateId: 'sig_1' };
const KG_SNAP = { nodeCount: 5, edgeCount: 8, lowConfidenceEdges: 2, kgVersion: 'KG-v1.0-20260630' };

function makeSvc(publisher = null) {
  return new EvidenceLayerService({ eventPublisher: publisher });
}

// ── evidence-types ────────────────────────────────────────────────────────────

describe('evidence-types', () => {
  it('EVIDENCE_SOURCE_TYPES has 5 types', () => {
    expect(Object.keys(EVIDENCE_SOURCE_TYPES)).toHaveLength(5);
  });
  it('EVIDENCE_SOURCE_TYPES is frozen', () => {
    expect(Object.isFrozen(EVIDENCE_SOURCE_TYPES)).toBe(true);
  });
  it('EVIDENCE_SOURCE_TYPE_SET contains all types', () => {
    for (const t of Object.values(EVIDENCE_SOURCE_TYPES)) {
      expect(EVIDENCE_SOURCE_TYPE_SET.has(t)).toBe(true);
    }
  });
  it('EVIDENCE_SCHEMA_VERSION is a string', () => {
    expect(typeof EVIDENCE_SCHEMA_VERSION).toBe('string');
  });
  it('PLATFORM_VERSION is IPPO-Wave2', () => {
    expect(PLATFORM_VERSION).toBe('IPPO-Wave2');
  });
});

// ── buildEvidenceSummary ──────────────────────────────────────────────────────

describe('buildEvidenceSummary', () => {
  it('returns a frozen object', () => {
    const s = buildEvidenceSummary();
    expect(Object.isFrozen(s)).toBe(true);
  });
  it('has BD-018 generatedAt ISO string', () => {
    const s = buildEvidenceSummary();
    expect(typeof s.generatedAt).toBe('string');
    expect(new Date(s.generatedAt).toISOString()).toBe(s.generatedAt);
  });
  it('has summaryId', () => {
    const s = buildEvidenceSummary();
    expect(typeof s.summaryId).toBe('string');
    expect(s.summaryId.startsWith('evs_')).toBe(true);
  });
  it('accepts explicit summaryId', () => {
    const s = buildEvidenceSummary({ summaryId: 'evs_custom' });
    expect(s.summaryId).toBe('evs_custom');
  });
  it('schemaVersion matches EVIDENCE_SCHEMA_VERSION', () => {
    const s = buildEvidenceSummary();
    expect(s.schemaVersion).toBe(EVIDENCE_SCHEMA_VERSION);
  });

  describe('counts', () => {
    it('empty input → all counts 0', () => {
      const s = buildEvidenceSummary();
      expect(s.datasetCount).toBe(0);
      expect(s.clusterStatCount).toBe(0);
      expect(s.patternCount).toBe(0);
      expect(s.eventLogCount).toBe(0);
    });
    it('counts datasets', () => {
      const s = buildEvidenceSummary({ datasets: [DATASET, DATASET] });
      expect(s.datasetCount).toBe(2);
    });
    it('counts clusterStats', () => {
      const s = buildEvidenceSummary({ clusterStats: [CLUSTER] });
      expect(s.clusterStatCount).toBe(1);
    });
    it('counts patternEvidence', () => {
      const s = buildEvidenceSummary({ patternEvidence: [PATTERN, PATTERN, PATTERN] });
      expect(s.patternCount).toBe(3);
    });
    it('counts eventLogs', () => {
      const s = buildEvidenceSummary({ eventLogs: [EVENT] });
      expect(s.eventLogCount).toBe(1);
    });
  });

  describe('evidenceScore', () => {
    it('0 when all inputs empty', () => {
      expect(buildEvidenceSummary().evidenceScore).toBe(0);
    });
    it('1 per non-empty source', () => {
      const s = buildEvidenceSummary({ datasets: [DATASET], clusterStats: [CLUSTER] });
      expect(s.evidenceScore).toBe(2);
    });
    it('5 when all 5 sources present', () => {
      const s = buildEvidenceSummary({
        datasets: [DATASET], clusterStats: [CLUSTER], patternEvidence: [PATTERN],
        eventLogs: [EVENT], kgSnapshot: KG_SNAP,
      });
      expect(s.evidenceScore).toBe(5);
    });
    it('kgSnapshot contributes 1 point', () => {
      const s = buildEvidenceSummary({ kgSnapshot: KG_SNAP });
      expect(s.evidenceScore).toBe(1);
    });
  });

  describe('datasetVersionRefs', () => {
    it('is frozen array', () => {
      const s = buildEvidenceSummary({ datasets: [DATASET] });
      expect(Object.isFrozen(s.datasetVersionRefs)).toBe(true);
    });
    it('maps dataset fields correctly', () => {
      const s = buildEvidenceSummary({ datasets: [DATASET] });
      expect(s.datasetVersionRefs[0].versionId).toBe('dv_1');
      expect(s.datasetVersionRefs[0].doiCandidate).toBe('abc123-uuid');
    });
    it('doiCandidates extracted from datasets', () => {
      const s = buildEvidenceSummary({ datasets: [DATASET] });
      expect(s.doiCandidates).toContain('abc123-uuid');
    });
    it('doiCandidates filters out null/undefined', () => {
      const noDoi = { versionId: 'dv_x', type: 'SIGNAL' };
      const s = buildEvidenceSummary({ datasets: [noDoi] });
      expect(s.doiCandidates).toHaveLength(0);
    });
  });

  describe('clusterRefs', () => {
    it('is frozen array', () => {
      const s = buildEvidenceSummary({ clusterStats: [CLUSTER] });
      expect(Object.isFrozen(s.clusterRefs)).toBe(true);
    });
    it('maps cluster fields', () => {
      const s = buildEvidenceSummary({ clusterStats: [CLUSTER] });
      expect(s.clusterRefs[0].clusterId).toBe('ENDO');
      expect(s.clusterRefs[0].caseCount).toBe(12);
    });
  });

  describe('patternSummary', () => {
    it('patternCount and types', () => {
      const s = buildEvidenceSummary({
        patternEvidence: [
          { patternType: 'PHASE_CORRELATION' },
          { patternType: 'SIGNAL_CO_OCCURRENCE' },
          { patternType: 'PHASE_CORRELATION' }, // duplicate
        ],
      });
      expect(s.patternSummary.patternCount).toBe(3);
      expect(s.patternSummary.types).toHaveLength(2); // deduped
      expect(s.patternSummary.types).toContain('PHASE_CORRELATION');
      expect(Object.isFrozen(s.patternSummary)).toBe(true);
    });
  });

  describe('eventLogSummary', () => {
    it('eventCount and eventTypes', () => {
      const s = buildEvidenceSummary({
        eventLogs: [
          { eventType: 'SIGNAL_CREATED' },
          { eventType: 'RECORD_CREATED' },
          { eventType: 'SIGNAL_CREATED' }, // duplicate
        ],
      });
      expect(s.eventLogSummary.eventCount).toBe(3);
      expect(s.eventLogSummary.eventTypes).toHaveLength(2);
      expect(Object.isFrozen(s.eventLogSummary)).toBe(true);
    });
  });

  describe('kgSummary', () => {
    it('null when no kgSnapshot', () => {
      expect(buildEvidenceSummary().kgSummary).toBeNull();
    });
    it('maps kgSnapshot fields', () => {
      const s = buildEvidenceSummary({ kgSnapshot: KG_SNAP });
      expect(s.kgSummary.nodeCount).toBe(5);
      expect(s.kgSummary.edgeCount).toBe(8);
      expect(s.kgSummary.lowConfidenceEdges).toBe(2);
      expect(s.kgSummary.kgVersion).toBe('KG-v1.0-20260630');
      expect(Object.isFrozen(s.kgSummary)).toBe(true);
    });
  });

  describe('citationMetadata (Wave3 foundation)', () => {
    it('is frozen', () => {
      const s = buildEvidenceSummary({ datasets: [DATASET], kgSnapshot: KG_SNAP });
      expect(Object.isFrozen(s.citationMetadata)).toBe(true);
    });
    it('platformVersion is IPPO-Wave2', () => {
      const s = buildEvidenceSummary();
      expect(s.citationMetadata.platformVersion).toBe('IPPO-Wave2');
    });
    it('schemaVersion in citationMetadata', () => {
      const s = buildEvidenceSummary();
      expect(s.citationMetadata.schemaVersion).toBe(EVIDENCE_SCHEMA_VERSION);
    });
    it('doiCandidates in citationMetadata', () => {
      const s = buildEvidenceSummary({ datasets: [DATASET] });
      expect(s.citationMetadata.doiCandidates).toContain('abc123-uuid');
    });
    it('datasetVersionRefs in citationMetadata', () => {
      const s = buildEvidenceSummary({ datasets: [DATASET] });
      expect(s.citationMetadata.datasetVersionRefs).toHaveLength(1);
    });
    it('clusterRefs in citationMetadata', () => {
      const s = buildEvidenceSummary({ clusterStats: [CLUSTER] });
      expect(s.citationMetadata.clusterRefs).toHaveLength(1);
    });
    it('kgVersion from kgSnapshot', () => {
      const s = buildEvidenceSummary({ kgSnapshot: KG_SNAP });
      expect(s.citationMetadata.kgVersion).toBe('KG-v1.0-20260630');
    });
    it('kgVersion is null when no kgSnapshot', () => {
      const s = buildEvidenceSummary();
      expect(s.citationMetadata.kgVersion).toBeNull();
    });
    it('generatedAt ISO string in citationMetadata', () => {
      const s = buildEvidenceSummary();
      expect(new Date(s.citationMetadata.generatedAt).toISOString()).toBe(s.citationMetadata.generatedAt);
    });
    it('evidenceScore in citationMetadata', () => {
      const s = buildEvidenceSummary({ datasets: [DATASET] });
      expect(s.citationMetadata.evidenceScore).toBe(1);
    });
  });
});

// ── EvidenceLayerService ──────────────────────────────────────────────────────

describe('EvidenceLayerService compile', () => {
  it('returns frozen EvidenceSummary', () => {
    const s = makeSvc().compile();
    expect(Object.isFrozen(s)).toBe(true);
  });
  it('has BD-018 generatedAt', () => {
    const s = makeSvc().compile();
    expect(new Date(s.generatedAt).toISOString()).toBe(s.generatedAt);
  });
  it('throws if datasets is not array', () => {
    expect(() => makeSvc().compile({ datasets: 'bad' })).toThrow('array');
  });
  it('throws if clusterStats is not array', () => {
    expect(() => makeSvc().compile({ clusterStats: 'bad' })).toThrow('array');
  });
  it('throws if patternEvidence is not array', () => {
    expect(() => makeSvc().compile({ patternEvidence: 'bad' })).toThrow('array');
  });
  it('throws if eventLogs is not array', () => {
    expect(() => makeSvc().compile({ eventLogs: 'bad' })).toThrow('array');
  });
  it('compiles all 5 sources', () => {
    const s = makeSvc().compile({
      datasets: [DATASET], clusterStats: [CLUSTER], patternEvidence: [PATTERN],
      eventLogs: [EVENT], kgSnapshot: KG_SNAP,
    });
    expect(s.evidenceScore).toBe(5);
  });
  it('publishes EVIDENCE_SUMMARY_CREATED event', () => {
    let published = null;
    const svc = new EvidenceLayerService({ eventPublisher: { publish: (e) => { published = e; } } });
    svc.compile({ datasets: [DATASET] });
    expect(published?.eventType).toBe('EVIDENCE_SUMMARY_CREATED');
    expect(published?.aggregateId).toBe(published?.payload?.summaryId ?? published?.aggregateId);
  });
  it('works without eventPublisher', () => {
    const svc = new EvidenceLayerService();
    expect(() => svc.compile()).not.toThrow();
  });
  it('empty compile yields evidenceScore 0', () => {
    expect(makeSvc().compile().evidenceScore).toBe(0);
  });
});

describe('EvidenceLayerService getStatus', () => {
  it('returns frozen object', () => {
    expect(Object.isFrozen(makeSvc().getStatus())).toBe(true);
  });
  it('ready is true — Phase C complete', () => {
    expect(makeSvc().getStatus().ready).toBe(true);
  });
  it('phaseCComplete is true', () => {
    expect(makeSvc().getStatus().phaseCComplete).toBe(true);
  });
  it('platformVersion is IPPO-Wave2', () => {
    expect(makeSvc().getStatus().platformVersion).toBe('IPPO-Wave2');
  });
  it('sources lists all EVIDENCE_SOURCE_TYPES', () => {
    const status = makeSvc().getStatus();
    for (const t of Object.values(EVIDENCE_SOURCE_TYPES)) {
      expect(status.sources).toContain(t);
    }
  });
});

// ── EVIDENCE_SUMMARY_CREATED domain event ─────────────────────────────────────

describe('EVIDENCE_SUMMARY_CREATED domain event', () => {
  it('is defined in DOMAIN_EVENT_TYPES', async () => {
    const { DOMAIN_EVENT_TYPES } = await import('../../src/domains/events/domain-event-types.js');
    expect(DOMAIN_EVENT_TYPES.EVIDENCE_SUMMARY_CREATED).toBe('EVIDENCE_SUMMARY_CREATED');
  });
  it('AGGREGATE_TYPES.EVIDENCE is defined', async () => {
    const { AGGREGATE_TYPES } = await import('../../src/domains/events/domain-event-types.js');
    expect(AGGREGATE_TYPES.EVIDENCE).toBe('EVIDENCE');
  });
});
