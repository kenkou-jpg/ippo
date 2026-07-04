// tests/disease-domain/disease-repository.test.js
// DiseaseRepository — Wave1 in-memory stub (PR-029)
import { describe, it, expect, beforeEach } from 'vitest';
import { DiseaseRepository } from '../../src/domains/disease/disease-repository.js';
import { buildDiseaseEntry } from '../../src/domains/disease/disease-entity.js';

const ACTIVE_ENTRY   = buildDiseaseEntry({ name: '子宮内膜症', category: 'Gynecology', active: true });
const RESOLVED_ENTRY = buildDiseaseEntry({ name: 'PCOS',       category: 'Gynecology', active: false });

describe('DiseaseRepository — Wave1 in-memory stub', () => {
  let repo;

  beforeEach(() => {
    repo = new DiseaseRepository();
  });

  it('findAll returns empty array initially', () => {
    expect(repo.findAll()).toHaveLength(0);
  });

  it('findActive returns empty array initially', () => {
    expect(repo.findActive()).toHaveLength(0);
  });

  it('findResolved returns empty array initially', () => {
    expect(repo.findResolved()).toHaveLength(0);
  });

  it('append returns the appended entry', () => {
    const r = repo.append(ACTIVE_ENTRY);
    expect(r).toEqual(ACTIVE_ENTRY);
  });

  it('findAll returns appended entries', () => {
    repo.append(ACTIVE_ENTRY);
    repo.append(RESOLVED_ENTRY);
    expect(repo.findAll()).toHaveLength(2);
  });

  it('findAll returns a copy (not a reference to internal state)', () => {
    repo.append(ACTIVE_ENTRY);
    const first = repo.findAll();
    first.push('injected');
    expect(repo.findAll()).toHaveLength(1);
  });

  it('findActive returns only active entries', () => {
    repo.append(ACTIVE_ENTRY);
    repo.append(RESOLVED_ENTRY);
    const active = repo.findActive();
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe('子宮内膜症');
  });

  it('findResolved returns only resolved entries', () => {
    repo.append(ACTIVE_ENTRY);
    repo.append(RESOLVED_ENTRY);
    const resolved = repo.findResolved();
    expect(resolved).toHaveLength(1);
    expect(resolved[0].name).toBe('PCOS');
  });

  it('does not use StorageService (no constructor arg required)', () => {
    expect(() => new DiseaseRepository()).not.toThrow();
  });

  it('is session-scoped: each instance starts fresh', () => {
    repo.append(ACTIVE_ENTRY);
    const repo2 = new DiseaseRepository();
    expect(repo2.findAll()).toHaveLength(0);
  });
});
