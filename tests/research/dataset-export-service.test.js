// tests/research/dataset-export-service.test.js
// Dataset Export Service — Wave1 JSON/CSV; PARQUET Wave2 Stub — PR-040
import { describe, it, expect } from 'vitest';
import { DatasetExportService }  from '../../src/domains/research/dataset-export-service.js';
import { buildResearchDataset }  from '../../src/domains/research/research-dataset-entity.js';
import { EXPORT_FORMAT }         from '../../src/domains/research/research-dataset-types.js';

const svc = new DatasetExportService();

function makeDataset(extra = {}) {
  return buildResearchDataset({
    signalCount: 2,
    signals: [
      { id: 's1', signalType: 'MOOD',  normalizedValue: 0.8, rawValue: 3, unit: 'score', timestamp: '2026-01-01T00:00:00Z' },
      { id: 's2', signalType: 'PAIN',  normalizedValue: 0.3, rawValue: 1, unit: 'score', timestamp: '2026-01-02T00:00:00Z' },
    ],
    ...extra,
  });
}

describe('exportJSON', () => {
  it('returns format=JSON', () => {
    const r = svc.exportJSON(makeDataset());
    expect(r.format).toBe(EXPORT_FORMAT.JSON);
  });

  it('returns valid JSON string', () => {
    const r = svc.exportJSON(makeDataset());
    expect(() => JSON.parse(r.data)).not.toThrow();
  });

  it('includes metadata with generatedAt', () => {
    const r = svc.exportJSON(makeDataset());
    expect(r.metadata.generatedAt).toBeTruthy();
    expect(r.metadata.format).toBe(EXPORT_FORMAT.JSON);
  });

  it('throws when dataset is missing', () => {
    expect(() => svc.exportJSON(null)).toThrow();
  });
});

describe('exportCSV', () => {
  it('returns format=CSV', () => {
    const r = svc.exportCSV(makeDataset());
    expect(r.format).toBe(EXPORT_FORMAT.CSV);
  });

  it('produces header + data rows', () => {
    const r = svc.exportCSV(makeDataset());
    const lines = r.data.split('\n');
    expect(lines[0]).toContain('id');
    expect(lines[0]).toContain('signalType');
    expect(lines.length).toBe(3); // header + 2 signals
  });

  it('includes metadata with generatedAt', () => {
    const r = svc.exportCSV(makeDataset());
    expect(r.metadata.generatedAt).toBeTruthy();
  });

  it('returns header-only CSV for empty signals dataset', () => {
    const d = buildResearchDataset({ signals: [] });
    const r = svc.exportCSV(d);
    const lines = r.data.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1); // only header
  });

  it('throws when dataset is missing', () => {
    expect(() => svc.exportCSV(null)).toThrow();
  });
});

describe('exportPARQUET (Wave2 Stub)', () => {
  it('returns format=PARQUET with stub=true', () => {
    const r = svc.exportPARQUET(makeDataset());
    expect(r.format).toBe(EXPORT_FORMAT.PARQUET);
    expect(r.stub).toBe(true);
    expect(r.data).toBeNull();
  });

  it('includes metadata', () => {
    const r = svc.exportPARQUET(makeDataset());
    expect(r.metadata.generatedAt).toBeTruthy();
  });
});

describe('getExportMetadata', () => {
  it('is frozen', () => {
    const d = makeDataset();
    const m = svc.getExportMetadata(d, EXPORT_FORMAT.JSON);
    expect(Object.isFrozen(m)).toBe(true);
  });

  it('includes all required fields', () => {
    const d = makeDataset();
    const m = svc.getExportMetadata(d, EXPORT_FORMAT.CSV);
    expect(m.generatedAt).toBeTruthy();
    expect(m.datasetId).toBe(d.id);
    expect(m.format).toBe(EXPORT_FORMAT.CSV);
    expect(typeof m.signalCount).toBe('number');
  });
});
