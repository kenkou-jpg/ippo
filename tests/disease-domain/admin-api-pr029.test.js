// tests/disease-domain/admin-api-pr029.test.js
// ApiGateway PR-029: createDisease / getDiseases / getActiveDiseases / getResolvedDiseases
import { describe, it, expect } from 'vitest';
import { ApiGateway } from '../../src/application/api-gateway.js';

function makePermission() {
  return {
    require: async () => ({ userId: 'u1', isAdmin: false }),
  };
}

function makeGateway(overrides = {}) {
  return new ApiGateway({
    permissionService:         overrides.permissionService ?? makePermission(),
    similarityAccessGuard:     { assertAccess: () => {}, filterEdges: e => e },
    consentEnforcementService: { validate: () => {} },
    recordQueryService:        { findByUser: async () => [] },
    recordCommandService:      { save: async d => d },
    experimentQueryService:    { findActive: async () => [] },
    experimentCommandService:  { create: async d => d },
    caseGenerationService:     { generate: async () => ({}) },
    similarityEngine:          { findSimilar: async () => [] },
    ...overrides,
  });
}

const VALID_DISEASE = { name: '子宮内膜症', category: 'Gynecology' };

function makeDiseaseService(store = []) {
  return {
    create:       (d) => { const e = { id: 'dis_1', ...d, active: d.active ?? true, createdAt: new Date().toISOString() }; store.push(e); return e; },
    list:         () => [...store],
    findActive:   () => store.filter(e => e.active === true),
    findResolved: () => store.filter(e => e.active === false),
    validate:     () => ({ valid: true, errors: [] }),
  };
}

describe('ApiGateway PR-029 — createDisease', () => {
  it('returns the created entry', async () => {
    const diseaseService = makeDiseaseService();
    const gw = makeGateway({ diseaseService });
    const r  = await gw.createDisease(VALID_DISEASE);
    expect(r.name).toBe('子宮内膜症');
    expect(r.category).toBe('Gynecology');
  });

  it('throws if DiseaseService not wired', async () => {
    const gw = makeGateway();
    await expect(gw.createDisease(VALID_DISEASE)).rejects.toThrow('DiseaseService not wired');
  });

  it('throws if permission fails', async () => {
    const noAuth = { require: async () => { throw new Error('Unauthorized'); } };
    const gw = makeGateway({ permissionService: noAuth, diseaseService: makeDiseaseService() });
    await expect(gw.createDisease(VALID_DISEASE)).rejects.toThrow('Unauthorized');
  });
});

describe('ApiGateway PR-029 — getDiseases', () => {
  it('returns all disease entries', async () => {
    const store = [];
    const diseaseService = makeDiseaseService(store);
    const gw = makeGateway({ diseaseService });
    await gw.createDisease(VALID_DISEASE);
    const r = await gw.getDiseases();
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(1);
  });

  it('throws if DiseaseService not wired', async () => {
    const gw = makeGateway();
    await expect(gw.getDiseases()).rejects.toThrow('DiseaseService not wired');
  });
});

describe('ApiGateway PR-029 — getActiveDiseases', () => {
  it('returns only active entries', async () => {
    const store = [];
    const diseaseService = makeDiseaseService(store);
    const gw = makeGateway({ diseaseService });
    await gw.createDisease(VALID_DISEASE);
    await gw.createDisease({ name: 'resolved', category: 'Mental', active: false });
    const r = await gw.getActiveDiseases();
    expect(r.every(e => e.active === true)).toBe(true);
    expect(r).toHaveLength(1);
  });

  it('throws if DiseaseService not wired', async () => {
    const gw = makeGateway();
    await expect(gw.getActiveDiseases()).rejects.toThrow('DiseaseService not wired');
  });
});

describe('ApiGateway PR-029 — getResolvedDiseases', () => {
  it('returns only resolved entries', async () => {
    const store = [];
    const diseaseService = makeDiseaseService(store);
    const gw = makeGateway({ diseaseService });
    await gw.createDisease(VALID_DISEASE);
    await gw.createDisease({ name: 'resolved', category: 'Mental', active: false });
    const r = await gw.getResolvedDiseases();
    expect(r.every(e => e.active === false)).toBe(true);
    expect(r).toHaveLength(1);
  });

  it('throws if DiseaseService not wired', async () => {
    const gw = makeGateway();
    await expect(gw.getResolvedDiseases()).rejects.toThrow('DiseaseService not wired');
  });
});
