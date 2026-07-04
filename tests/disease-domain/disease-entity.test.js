// tests/disease-domain/disease-entity.test.js
// buildDiseaseEntry — immutable value object (PR-029)
import { describe, it, expect } from 'vitest';
import { buildDiseaseEntry, DiseaseCategories, DiseaseSeverity, DiseaseConfidence } from '../../src/domains/disease/disease-entity.js';

const VALID = {
  name:     '子宮内膜症',
  category: 'Gynecology',
};

describe('buildDiseaseEntry — required fields', () => {
  it('returns a frozen object', () => {
    const e = buildDiseaseEntry(VALID);
    expect(Object.isFrozen(e)).toBe(true);
  });

  it('id starts with dis_', () => {
    expect(buildDiseaseEntry(VALID).id).toMatch(/^dis_/);
  });

  it('two entries have different ids', () => {
    const a = buildDiseaseEntry(VALID);
    const b = buildDiseaseEntry(VALID);
    expect(a.id).not.toBe(b.id);
  });

  it('name is preserved', () => {
    expect(buildDiseaseEntry(VALID).name).toBe('子宮内膜症');
  });

  it('category is preserved', () => {
    expect(buildDiseaseEntry(VALID).category).toBe('Gynecology');
  });

  it('createdAt is ISO8601 string', () => {
    const e = buildDiseaseEntry(VALID);
    expect(typeof e.createdAt).toBe('string');
    expect(isNaN(Date.parse(e.createdAt))).toBe(false);
  });
});

describe('buildDiseaseEntry — defaults', () => {
  it('severity defaults to UNKNOWN', () => {
    expect(buildDiseaseEntry(VALID).severity).toBe('UNKNOWN');
  });

  it('confidence defaults to USER_REPORTED', () => {
    expect(buildDiseaseEntry(VALID).confidence).toBe('USER_REPORTED');
  });

  it('diagnosedAt defaults to null', () => {
    expect(buildDiseaseEntry(VALID).diagnosedAt).toBeNull();
  });

  it('resolvedAt defaults to null', () => {
    expect(buildDiseaseEntry(VALID).resolvedAt).toBeNull();
  });

  it('active defaults to true', () => {
    expect(buildDiseaseEntry(VALID).active).toBe(true);
  });

  it('metadata defaults to frozen empty object', () => {
    const e = buildDiseaseEntry(VALID);
    expect(Object.isFrozen(e.metadata)).toBe(true);
    expect(Object.keys(e.metadata)).toHaveLength(0);
  });
});

describe('buildDiseaseEntry — optional fields', () => {
  it('accepts severity override', () => {
    expect(buildDiseaseEntry({ ...VALID, severity: 'HIGH' }).severity).toBe('HIGH');
  });

  it('accepts confidence override', () => {
    expect(buildDiseaseEntry({ ...VALID, confidence: 'PHYSICIAN_CONFIRMED' }).confidence).toBe('PHYSICIAN_CONFIRMED');
  });

  it('accepts diagnosedAt', () => {
    const e = buildDiseaseEntry({ ...VALID, diagnosedAt: '2020-01-15' });
    expect(e.diagnosedAt).toBe('2020-01-15');
  });

  it('accepts resolvedAt', () => {
    const e = buildDiseaseEntry({ ...VALID, resolvedAt: '2024-03-01', active: false });
    expect(e.resolvedAt).toBe('2024-03-01');
    expect(e.active).toBe(false);
  });

  it('accepts metadata object (frozen copy)', () => {
    const e = buildDiseaseEntry({ ...VALID, metadata: { source: 'hospital' } });
    expect(e.metadata.source).toBe('hospital');
    expect(Object.isFrozen(e.metadata)).toBe(true);
  });
});

describe('buildDiseaseEntry — re-exports', () => {
  it('DiseaseCategories matches DISEASE_CATEGORIES', () => {
    expect(DiseaseCategories.GYNECOLOGY).toBe('Gynecology');
  });

  it('DiseaseSeverity matches DISEASE_SEVERITY', () => {
    expect(DiseaseSeverity.HIGH).toBe('HIGH');
  });

  it('DiseaseConfidence matches DISEASE_CONFIDENCE', () => {
    expect(DiseaseConfidence.PHYSICIAN_CONFIRMED).toBe('PHYSICIAN_CONFIRMED');
  });
});
