// tests/disease-domain/disease-service.test.js
// DiseaseService — validate / create / list / findActive / findResolved (PR-029)
import { describe, it, expect, beforeEach } from 'vitest';
import { DiseaseService }    from '../../src/domains/disease/disease-service.js';
import { DiseaseValidator }  from '../../src/domains/disease/disease-validator.js';
import { DiseaseRepository } from '../../src/domains/disease/disease-repository.js';

function makeSvc() {
  return new DiseaseService({
    validator:  new DiseaseValidator(),
    repository: new DiseaseRepository(),
  });
}

const VALID_ENDO = { name: '子宮内膜症', category: 'Gynecology' };
const VALID_PCOS = { name: 'PCOS',       category: 'Endocrine' };

describe('DiseaseService.validate', () => {
  it('returns { valid: true } for valid input', () => {
    expect(makeSvc().validate(VALID_ENDO).valid).toBe(true);
  });

  it('returns { valid: false } for missing category', () => {
    expect(makeSvc().validate({ name: 'x' }).valid).toBe(false);
  });

  it('returns { valid: false } for unknown category', () => {
    expect(makeSvc().validate({ name: 'x', category: 'Oncology' }).valid).toBe(false);
  });

  it('detects duplicate name at service level', () => {
    const svc = makeSvc();
    svc.create(VALID_ENDO);
    const r = svc.validate(VALID_ENDO);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('already exists'))).toBe(true);
  });
});

describe('DiseaseService.create', () => {
  it('returns a frozen DiseaseEntry', () => {
    const e = makeSvc().create(VALID_ENDO);
    expect(Object.isFrozen(e)).toBe(true);
  });

  it('entry has correct name and category', () => {
    const e = makeSvc().create(VALID_ENDO);
    expect(e.name).toBe('子宮内膜症');
    expect(e.category).toBe('Gynecology');
  });

  it('entry defaults: severity=UNKNOWN, confidence=USER_REPORTED, active=true', () => {
    const e = makeSvc().create(VALID_ENDO);
    expect(e.severity).toBe('UNKNOWN');
    expect(e.confidence).toBe('USER_REPORTED');
    expect(e.active).toBe(true);
  });

  it('throws on invalid input', () => {
    expect(() => makeSvc().create({ name: 'x' })).toThrow('[DiseaseService]');
  });

  it('throws on duplicate name', () => {
    const svc = makeSvc();
    svc.create(VALID_ENDO);
    expect(() => svc.create(VALID_ENDO)).toThrow('[DiseaseService]');
  });

  it('accepts severity and confidence overrides', () => {
    const e = makeSvc().create({ ...VALID_ENDO, severity: 'HIGH', confidence: 'PHYSICIAN_CONFIRMED' });
    expect(e.severity).toBe('HIGH');
    expect(e.confidence).toBe('PHYSICIAN_CONFIRMED');
  });

  it('accepts resolved disease (active: false)', () => {
    const e = makeSvc().create({ ...VALID_ENDO, active: false, resolvedAt: '2024-01-01' });
    expect(e.active).toBe(false);
    expect(e.resolvedAt).toBe('2024-01-01');
  });
});

describe('DiseaseService.list', () => {
  it('returns [] when empty', () => {
    expect(makeSvc().list()).toHaveLength(0);
  });

  it('returns all created entries', () => {
    const svc = makeSvc();
    svc.create(VALID_ENDO);
    svc.create(VALID_PCOS);
    expect(svc.list()).toHaveLength(2);
  });
});

describe('DiseaseService.findActive', () => {
  it('returns only active entries', () => {
    const svc = makeSvc();
    svc.create(VALID_ENDO);
    svc.create({ name: 'resolved', category: 'Mental', active: false });
    const active = svc.findActive();
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe('子宮内膜症');
  });
});

describe('DiseaseService.findResolved', () => {
  it('returns only resolved entries', () => {
    const svc = makeSvc();
    svc.create(VALID_ENDO);
    svc.create({ name: 'Resolved Disease', category: 'Mental', active: false });
    const resolved = svc.findResolved();
    expect(resolved).toHaveLength(1);
    expect(resolved[0].name).toBe('Resolved Disease');
  });
});

describe('DiseaseService — registry methods', () => {
  it('getDiseaseCategories returns 7 values', () => {
    const { values } = makeSvc().getDiseaseCategories();
    expect(values).toHaveLength(7);
    expect(values).toContain('Gynecology');
  });

  it('getDiseaseSeverities returns 4 values', () => {
    const { values } = makeSvc().getDiseaseSeverities();
    expect(values).toHaveLength(4);
    expect(values).toContain('HIGH');
  });

  it('getDiseaseConfidenceLevels returns 3 values', () => {
    const { values } = makeSvc().getDiseaseConfidenceLevels();
    expect(values).toHaveLength(3);
    expect(values).toContain('PHYSICIAN_CONFIRMED');
  });
});
