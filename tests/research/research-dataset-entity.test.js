// tests/research/research-dataset-entity.test.js
// Research Dataset Entity — PR-040
import { describe, it, expect } from 'vitest';
import { buildResearchDataset, withStatus } from '../../src/domains/research/research-dataset-entity.js';
import { DATASET_STATUS, ANONYMIZATION_LEVEL } from '../../src/domains/research/research-dataset-types.js';

describe('buildResearchDataset', () => {
  it('returns a frozen object', () => {
    const d = buildResearchDataset();
    expect(Object.isFrozen(d)).toBe(true);
  });

  it('has required fields', () => {
    const d = buildResearchDataset();
    expect(d.id).toMatch(/^dataset_/);
    expect(d.generatedAt).toBeTruthy();
    expect(d.createdAt).toBeTruthy();
    expect(d.schemaVersion).toBeTruthy();
    expect(d.status).toBe(DATASET_STATUS.DRAFT);
    expect(d.anonymizationLevel).toBe(ANONYMIZATION_LEVEL.NONE);
  });

  it('defaults counts to 0', () => {
    const d = buildResearchDataset();
    expect(d.recordCount).toBe(0);
    expect(d.signalCount).toBe(0);
    expect(d.diseaseCount).toBe(0);
    expect(d.snapshotCount).toBe(0);
    expect(d.eventCount).toBe(0);
  });

  it('accepts custom params', () => {
    const d = buildResearchDataset({
      signalCount: 5,
      diseaseCount: 2,
      anonymizationLevel: ANONYMIZATION_LEVEL.K_ANONYMITY,
    });
    expect(d.signalCount).toBe(5);
    expect(d.diseaseCount).toBe(2);
    expect(d.anonymizationLevel).toBe(ANONYMIZATION_LEVEL.K_ANONYMITY);
  });

  it('throws on unknown anonymizationLevel', () => {
    expect(() => buildResearchDataset({ anonymizationLevel: 'INVALID' })).toThrow();
  });

  it('freezes signals, diseases, events, snapshots arrays', () => {
    const d = buildResearchDataset({ signals: [{ id: 's1' }] });
    expect(Object.isFrozen(d.signals)).toBe(true);
    expect(Object.isFrozen(d.diseases)).toBe(true);
  });

  it('generates unique ids', () => {
    const a = buildResearchDataset();
    const b = buildResearchDataset();
    expect(a.id).not.toBe(b.id);
  });
});

describe('withStatus', () => {
  it('returns new frozen object with updated status', () => {
    const d = buildResearchDataset();
    const ready = withStatus(d, DATASET_STATUS.READY);
    expect(ready.status).toBe(DATASET_STATUS.READY);
    expect(Object.isFrozen(ready)).toBe(true);
    expect(d.status).toBe(DATASET_STATUS.DRAFT); // original unchanged
  });

  it('throws on unknown status', () => {
    const d = buildResearchDataset();
    expect(() => withStatus(d, 'INVALID')).toThrow();
  });

  it('throws when dataset is null', () => {
    expect(() => withStatus(null, DATASET_STATUS.READY)).toThrow();
  });
});
