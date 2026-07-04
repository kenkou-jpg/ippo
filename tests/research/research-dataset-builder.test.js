// tests/research/research-dataset-builder.test.js
// Dataset Builder — PR-040
import { describe, it, expect, beforeEach } from 'vitest';
import { ResearchDatasetBuilder } from '../../src/domains/research/research-dataset-builder.js';
import { ANONYMIZATION_LEVEL, DATASET_STATUS } from '../../src/domains/research/research-dataset-types.js';

function makeSignalService(signals = []) {
  return { listSignals: () => signals };
}
function makeDiseaseService(diseases = []) {
  return { getDiseases: () => diseases };
}
function makeEventStore(events = []) {
  return { getEvents: () => events };
}
function makeSnapshotService(snapshots = []) {
  return { getSnapshots: () => snapshots };
}

describe('ResearchDatasetBuilder — collectSignals', () => {
  it('returns [] when no service', () => {
    const b = new ResearchDatasetBuilder();
    expect(b.collectSignals()).toEqual([]);
  });

  it('returns signals from service', () => {
    const signals = [{ id: 's1', signalType: 'MOOD' }];
    const b = new ResearchDatasetBuilder({ signalService: makeSignalService(signals) });
    expect(b.collectSignals()).toEqual(signals);
  });
});

describe('ResearchDatasetBuilder — collectDiseases', () => {
  it('returns [] when no service', () => {
    const b = new ResearchDatasetBuilder();
    expect(b.collectDiseases()).toEqual([]);
  });

  it('returns diseases from service', () => {
    const diseases = [{ id: 'd1', diseaseKey: 'IBS' }];
    const b = new ResearchDatasetBuilder({ diseaseService: makeDiseaseService(diseases) });
    expect(b.collectDiseases()).toEqual(diseases);
  });
});

describe('ResearchDatasetBuilder — collectEvents', () => {
  it('returns [] when no store', () => {
    const b = new ResearchDatasetBuilder();
    expect(b.collectEvents()).toEqual([]);
  });

  it('returns events from store', () => {
    const events = [{ id: 'e1', eventType: 'SIGNAL_CREATED' }];
    const b = new ResearchDatasetBuilder({ eventStore: makeEventStore(events) });
    expect(b.collectEvents()).toEqual(events);
  });
});

describe('ResearchDatasetBuilder — collectSnapshots', () => {
  it('returns [] when no service', () => {
    const b = new ResearchDatasetBuilder();
    expect(b.collectSnapshots()).toEqual([]);
  });

  it('returns snapshots from service', () => {
    const snaps = [{ id: 'snap1', schedule: 'DAILY' }];
    const b = new ResearchDatasetBuilder({ snapshotService: makeSnapshotService(snaps) });
    expect(b.collectSnapshots()).toEqual(snaps);
  });
});

describe('ResearchDatasetBuilder — verifyCompleteness', () => {
  const b = new ResearchDatasetBuilder();

  it('complete when all arrays', () => {
    const r = b.verifyCompleteness({ signals: [], diseases: [], events: [], snapshots: [] });
    expect(r.complete).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  it('incomplete when signals is not an array', () => {
    const r = b.verifyCompleteness({ signals: null, diseases: [], events: [], snapshots: [] });
    expect(r.complete).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });
});

describe('ResearchDatasetBuilder — buildMetadata', () => {
  it('returns frozen metadata object', () => {
    const b = new ResearchDatasetBuilder();
    const m = b.buildMetadata({
      signals: [{ signalType: 'MOOD' }, { signalType: 'MOOD' }],
      diseases: [],
      events: [{ eventType: 'SIGNAL_CREATED' }],
      snapshots: [],
      featureVectors: [],
      similarityEdges: [],
    });
    expect(Object.isFrozen(m)).toBe(true);
    expect(m.signalTypes).toContain('MOOD');
    expect(m.eventTypes).toContain('SIGNAL_CREATED');
    expect(m.signalTypes.length).toBe(1); // deduplicated
  });
});

describe('ResearchDatasetBuilder — build', () => {
  it('returns a frozen dataset with READY status from withStatus in service', () => {
    const signals  = [{ id: 's1', signalType: 'MOOD' }];
    const diseases = [{ id: 'd1', diseaseKey: 'IBS' }];
    const b = new ResearchDatasetBuilder({
      signalService:  makeSignalService(signals),
      diseaseService: makeDiseaseService(diseases),
      eventStore:     makeEventStore([]),
      snapshotService: makeSnapshotService([]),
    });
    const dataset = b.build({ anonymizationLevel: ANONYMIZATION_LEVEL.NONE, signalsConsentVerified: true });
    expect(Object.isFrozen(dataset)).toBe(true);
    expect(dataset.id).toMatch(/^dataset_/);
    expect(dataset.signalCount).toBe(1);
    expect(dataset.diseaseCount).toBe(1);
    expect(dataset.anonymizationLevel).toBe(ANONYMIZATION_LEVEL.NONE);
  });

  it('build with no deps returns empty dataset', () => {
    const b = new ResearchDatasetBuilder();
    const dataset = b.build();
    expect(dataset.signalCount).toBe(0);
    expect(dataset.diseaseCount).toBe(0);
  });
});

// ── BD-049 Research Consent gate (Release Readiness Recovery PR-076) ──────────

describe('ResearchDatasetBuilder — build BD-049', () => {
  it('throws ResearchConsentNotVerifiedError when signals are present without signalsConsentVerified', () => {
    const signals = [{ id: 's1', signalType: 'MOOD' }];
    const b = new ResearchDatasetBuilder({ signalService: makeSignalService(signals) });
    expect(() => b.build()).toThrow(/BD-049/);
  });

  it('does not throw for BD-049 when there are no signals at all', () => {
    const b = new ResearchDatasetBuilder();
    expect(() => b.build()).not.toThrow();
  });
});
