// tests/symptom/admin-api-pr028.test.js
// ApiGateway PR-028: validateSymptom / getSymptomTypes / getPainTypes
import { describe, it, expect } from 'vitest';
import { ApiGateway } from '../../src/application/api-gateway.js';

function makePermission(role = 'user') {
  return {
    require: async (perm) => {
      if (perm === 'admin:dashboard' && role !== 'admin') throw new Error('Forbidden');
      return { userId: 'u1', isAdmin: role === 'admin' };
    },
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

const VALID_SYMPTOM = {
  recordId: 'rec_001', category: 'Pain', severity: 5,
  startedAt: '2026-06-26T10:00:00.000Z',
};

describe('ApiGateway PR-028 — validateSymptom', () => {
  it('returns { valid: true } for valid input', async () => {
    const symptomService = {
      validateSymptom: d => ({ valid: true, errors: [] }),
      getSymptomTypes: () => ({ values: [], registry: {} }),
      getPainTypes:    () => ({ values: [], registry: {} }),
    };
    const gw = makeGateway({ symptomService });
    const r  = await gw.validateSymptom(VALID_SYMPTOM);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('returns { valid: false, errors } for invalid input', async () => {
    const symptomService = {
      validateSymptom: () => ({ valid: false, errors: ['category is not in registry'] }),
      getSymptomTypes: () => ({ values: [], registry: {} }),
      getPainTypes:    () => ({ values: [], registry: {} }),
    };
    const gw = makeGateway({ symptomService });
    const r  = await gw.validateSymptom({ recordId: 'x', category: 'BAD', severity: 5, startedAt: new Date().toISOString() });
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('requires record:write permission', async () => {
    // makePermission('user') allows record:write — test that unauthenticated fails
    const noAuth = { require: async () => { throw new Error('Unauthorized'); } };
    const gw = makeGateway({ permissionService: noAuth, symptomService: { validateSymptom: () => ({}) } });
    await expect(gw.validateSymptom(VALID_SYMPTOM)).rejects.toThrow();
  });

  it('throws if SymptomService not wired', async () => {
    const gw = makeGateway();
    await expect(gw.validateSymptom(VALID_SYMPTOM)).rejects.toThrow('SymptomService not wired');
  });
});

describe('ApiGateway PR-028 — getSymptomTypes', () => {
  it('returns values and registry', async () => {
    const symptomService = {
      validateSymptom: () => ({}),
      getSymptomTypes: () => ({ values: ['Pain','Bleeding'], registry: { PAIN: 'Pain' } }),
      getPainTypes:    () => ({ values: [], registry: {} }),
    };
    const gw = makeGateway({ symptomService });
    const r  = await gw.getSymptomTypes();
    expect(r.values).toContain('Pain');
  });

  it('throws if SymptomService not wired', async () => {
    const gw = makeGateway();
    await expect(gw.getSymptomTypes()).rejects.toThrow('SymptomService not wired');
  });
});

describe('ApiGateway PR-028 — getPainTypes', () => {
  it('returns values and registry', async () => {
    const symptomService = {
      validateSymptom: () => ({}),
      getSymptomTypes: () => ({ values: [], registry: {} }),
      getPainTypes:    () => ({ values: ['Sharp','Dull'], registry: { SHARP: 'Sharp' } }),
    };
    const gw = makeGateway({ symptomService });
    const r  = await gw.getPainTypes();
    expect(r.values).toContain('Sharp');
  });

  it('throws if SymptomService not wired', async () => {
    const gw = makeGateway();
    await expect(gw.getPainTypes()).rejects.toThrow('SymptomService not wired');
  });
});
