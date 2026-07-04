// disease-entity-upgrade.test.js — PR-045: Disease Entity V2 Upgrade tests.
// BD-004: Disease Entity昇格 (Wave2). BD-035: diseaseKey backward compat.
// BD-032: Append-Only — upgrade returns new entity, existing entries unchanged.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildDiseaseEntry }           from '../../src/domains/disease/disease-entity.js';
import { DiseaseEntityUpgradeService } from '../../src/domains/disease/disease-entity-upgrade-service.js';
import { CONFIRMED_BY, CONFIRMED_BY_VALUES } from '../../src/domains/disease/disease-types.js';
import { DOMAIN_EVENT_TYPES }          from '../../src/domains/events/domain-event-types.js';

// ── V2 Entity fields via buildDiseaseEntry ────────────────────────────────

describe('DiseaseEntity V2: buildDiseaseEntry new fields', () => {
  it('includes diseaseKey equal to name', () => {
    const e = buildDiseaseEntry({ name: 'Endometriosis', category: 'Gynecology' });
    expect(e.diseaseKey).toBe('Endometriosis');
    expect(e.diseaseKey).toBe(e.name);
  });

  it('includes icdCode (null by default)', () => {
    const e = buildDiseaseEntry({ name: 'PCOS', category: 'Gynecology' });
    expect(e.icdCode).toBeNull();
  });

  it('accepts icdCode', () => {
    const e = buildDiseaseEntry({ name: 'Endometriosis', category: 'Gynecology', icdCode: 'N80' });
    expect(e.icdCode).toBe('N80');
  });

  it('includes confirmedBy (UNKNOWN by default)', () => {
    const e = buildDiseaseEntry({ name: 'PCOS', category: 'Gynecology' });
    expect(e.confirmedBy).toBe(CONFIRMED_BY.UNKNOWN);
  });

  it('accepts confirmedBy PHYSICIAN', () => {
    const e = buildDiseaseEntry({ name: 'PCOS', category: 'Gynecology', confirmedBy: CONFIRMED_BY.PHYSICIAN });
    expect(e.confirmedBy).toBe('PHYSICIAN');
  });

  it('includes relatedSymptoms (empty array by default)', () => {
    const e = buildDiseaseEntry({ name: 'PCOS', category: 'Gynecology' });
    expect(e.relatedSymptoms).toEqual([]);
  });

  it('accepts relatedSymptoms', () => {
    const e = buildDiseaseEntry({ name: 'PCOS', category: 'Gynecology', relatedSymptoms: ['bloating', 'fatigue'] });
    expect(e.relatedSymptoms).toEqual(['bloating', 'fatigue']);
  });

  it('relatedSymptoms is frozen', () => {
    const e = buildDiseaseEntry({ name: 'PCOS', category: 'Gynecology', relatedSymptoms: ['bloating'] });
    expect(Object.isFrozen(e.relatedSymptoms)).toBe(true);
  });

  it('entity is still frozen (Append-Only)', () => {
    const e = buildDiseaseEntry({ name: 'PCOS', category: 'Gynecology' });
    expect(Object.isFrozen(e)).toBe(true);
  });

  it('backward compat: still has original V1 fields', () => {
    const e = buildDiseaseEntry({ name: 'PCOS', category: 'Gynecology', severity: 'MEDIUM' });
    expect(e.id).toBeTruthy();
    expect(e.name).toBe('PCOS');
    expect(e.category).toBe('Gynecology');
    expect(e.severity).toBe('MEDIUM');
    expect(e.active).toBe(true);
    expect(e.createdAt).toBeTruthy();
  });
});

// ── CONFIRMED_BY registry ─────────────────────────────────────────────────

describe('CONFIRMED_BY registry', () => {
  it('has SELF, PHYSICIAN, UNKNOWN', () => {
    expect(CONFIRMED_BY.SELF).toBe('SELF');
    expect(CONFIRMED_BY.PHYSICIAN).toBe('PHYSICIAN');
    expect(CONFIRMED_BY.UNKNOWN).toBe('UNKNOWN');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(CONFIRMED_BY)).toBe(true);
  });

  it('CONFIRMED_BY_VALUES set contains all values', () => {
    for (const v of Object.values(CONFIRMED_BY)) {
      expect(CONFIRMED_BY_VALUES.has(v)).toBe(true);
    }
  });
});

// ── DiseaseEntityUpgradeService ───────────────────────────────────────────

describe('DiseaseEntityUpgradeService', () => {
  let service;
  let baseEntry;

  beforeEach(() => {
    service   = new DiseaseEntityUpgradeService();
    baseEntry = buildDiseaseEntry({ name: 'Endometriosis', category: 'Gynecology' });
  });

  it('returns a new frozen object with V2 fields', () => {
    const upgraded = service.upgrade(baseEntry, { icdCode: 'N80', confirmedBy: CONFIRMED_BY.PHYSICIAN });
    expect(Object.isFrozen(upgraded)).toBe(true);
    expect(upgraded.icdCode).toBe('N80');
    expect(upgraded.confirmedBy).toBe('PHYSICIAN');
  });

  it('diseaseKey === name on upgraded entity (BD-035)', () => {
    const upgraded = service.upgrade(baseEntry);
    expect(upgraded.diseaseKey).toBe(upgraded.name);
    expect(upgraded.diseaseKey).toBe('Endometriosis');
  });

  it('preserves all original V1 fields', () => {
    const upgraded = service.upgrade(baseEntry);
    expect(upgraded.id).toBe(baseEntry.id);
    expect(upgraded.name).toBe(baseEntry.name);
    expect(upgraded.category).toBe(baseEntry.category);
    expect(upgraded.severity).toBe(baseEntry.severity);
    expect(upgraded.active).toBe(baseEntry.active);
    expect(upgraded.createdAt).toBe(baseEntry.createdAt);
  });

  it('adds upgradedAt timestamp', () => {
    const upgraded = service.upgrade(baseEntry);
    expect(typeof upgraded.upgradedAt).toBe('string');
    expect(() => new Date(upgraded.upgradedAt)).not.toThrow();
  });

  it('accepts relatedSymptoms', () => {
    const upgraded = service.upgrade(baseEntry, { relatedSymptoms: ['bloating', 'pain'] });
    expect(upgraded.relatedSymptoms).toEqual(['bloating', 'pain']);
    expect(Object.isFrozen(upgraded.relatedSymptoms)).toBe(true);
  });

  it('defaults: icdCode null, confirmedBy UNKNOWN, relatedSymptoms []', () => {
    const upgraded = service.upgrade(baseEntry);
    expect(upgraded.icdCode).toBeNull();
    expect(upgraded.confirmedBy).toBe(CONFIRMED_BY.UNKNOWN);
    expect(upgraded.relatedSymptoms).toEqual([]);
  });

  it('throws for invalid entry (no id)', () => {
    expect(() => service.upgrade({ name: 'X' })).toThrow();
  });

  it('throws for null entry', () => {
    expect(() => service.upgrade(null)).toThrow();
  });

  it('throws for invalid confirmedBy value', () => {
    expect(() => service.upgrade(baseEntry, { confirmedBy: 'INVALID' })).toThrow();
  });

  it('throws for non-array relatedSymptoms', () => {
    expect(() => service.upgrade(baseEntry, { relatedSymptoms: 'bloating' })).toThrow();
  });

  it('original entry is NOT mutated (Append-Only / BD-032)', () => {
    const originalName = baseEntry.name;
    service.upgrade(baseEntry, { icdCode: 'N80' });
    expect(baseEntry.name).toBe(originalName);
    // baseEntry was built with buildDiseaseEntry (V2), so icdCode defaults to null
    expect(baseEntry.icdCode).toBeNull();
  });
});

// ── Event publishing ──────────────────────────────────────────────────────

describe('DiseaseEntityUpgradeService: DISEASE_ENTITY_UPGRADED event', () => {
  it('DISEASE_ENTITY_UPGRADED is registered in DOMAIN_EVENT_TYPES', () => {
    expect(DOMAIN_EVENT_TYPES.DISEASE_ENTITY_UPGRADED).toBe('DISEASE_ENTITY_UPGRADED');
  });

  it('publishes DISEASE_ENTITY_UPGRADED via eventPublisher', () => {
    const published = [];
    const mockPublisher = { publish: (e) => published.push(e) };
    const svc     = new DiseaseEntityUpgradeService({ eventPublisher: mockPublisher });
    const entry   = buildDiseaseEntry({ name: 'PCOS', category: 'Endocrine' });
    const upgraded = svc.upgrade(entry, { icdCode: 'E28.2', confirmedBy: CONFIRMED_BY.PHYSICIAN });

    expect(published).toHaveLength(1);
    const evt = published[0];
    expect(evt.eventType).toBe('DISEASE_ENTITY_UPGRADED');
    expect(evt.payload.diseaseKey).toBe('PCOS');
    expect(evt.payload.icdCode).toBe('E28.2');
    expect(evt.payload.confirmedBy).toBe('PHYSICIAN');
  });

  it('upgrade succeeds even if eventPublisher throws (best-effort)', () => {
    const badPublisher = { publish: () => { throw new Error('bus down'); } };
    const svc     = new DiseaseEntityUpgradeService({ eventPublisher: badPublisher });
    const entry   = buildDiseaseEntry({ name: 'Fibroid', category: 'Gynecology' });
    expect(() => svc.upgrade(entry)).not.toThrow();
  });

  it('works without eventPublisher', () => {
    const svc   = new DiseaseEntityUpgradeService();
    const entry = buildDiseaseEntry({ name: 'Adenomyosis', category: 'Gynecology' });
    const upgraded = svc.upgrade(entry);
    expect(upgraded.diseaseKey).toBe('Adenomyosis');
  });
});
