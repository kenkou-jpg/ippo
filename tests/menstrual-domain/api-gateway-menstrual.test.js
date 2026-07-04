// tests/menstrual-domain/api-gateway-menstrual.test.js
// ApiGateway Menstrual endpoints — PR-039
import { describe, it, expect } from 'vitest';
import { ApiGateway }           from '../../src/application/api-gateway.js';
import { MenstrualService }     from '../../src/domains/menstrual/menstrual-service.js';
import { MenstrualRepository }  from '../../src/domains/menstrual/menstrual-repository.js';
import { EventStore }           from '../../src/domains/events/event-store.js';
import { EventBus }             from '../../src/domains/events/event-bus.js';
import { EventPublisher }       from '../../src/domains/events/event-publisher.js';
import { EventReplayService }   from '../../src/domains/events/event-replay-service.js';
import { AuditTimelineService } from '../../src/domains/events/audit-timeline-service.js';

const makePermission = () => ({ require: async () => ({ userId: 'u1', isAdmin: false }) });
const makeNoPermission = () => ({ require: async () => { throw new Error('Unauthorized'); } });

function makeGateway(opts = {}) {
  const store     = new EventStore();
  const bus       = new EventBus();
  const publisher = new EventPublisher({ store, bus });
  const menstrualService = opts.menstrualService ?? new MenstrualService({
    repository: new MenstrualRepository(),
    eventPublisher: publisher,
  });
  return new ApiGateway({
    permissionService:         opts.permissionService ?? makePermission(),
    similarityAccessGuard:     { assertAccess: () => {}, filterEdges: e => e },
    consentEnforcementService: { validate: () => {} },
    recordQueryService:        { findByUser: async () => [] },
    recordCommandService:      { save: async d => d },
    experimentQueryService:    { findByUser: async () => [] },
    experimentCommandService:  { create: async d => d },
    caseGenerationService:     { generate: async () => ({}) },
    similarityEngine:          { findSimilar: async () => [] },
    eventPublisher:            publisher,
    eventReplayService:        new EventReplayService({ store }),
    auditTimelineService:      new AuditTimelineService({ store }),
    menstrualService,
  });
}

describe('ApiGateway.validateMenstrual()', () => {
  it('returns { valid: true } for valid input', async () => {
    const r = await makeGateway().validateMenstrual({ cycleDay: 1 });
    expect(r.valid).toBe(true);
  });
  it('returns { valid: false } for missing cycleDay', async () => {
    const r = await makeGateway().validateMenstrual({});
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
  it('returns errors for invalid phase', async () => {
    const r = await makeGateway().validateMenstrual({ cycleDay: 1, phase: 'SUPER' });
    expect(r.valid).toBe(false);
  });
  it('throws without permission', async () => {
    await expect(makeGateway({ permissionService: makeNoPermission() })
      .validateMenstrual({ cycleDay: 1 })).rejects.toThrow();
  });
});

describe('ApiGateway.createMenstrualRecord()', () => {
  it('creates a record', async () => {
    const rec = await makeGateway().createMenstrualRecord({ cycleDay: 1, phase: 'MENSTRUAL' });
    expect(rec.id).toMatch(/^men_/);
    expect(rec.cycleDay).toBe(1);
  });
  it('throws on invalid input', async () => {
    await expect(makeGateway().createMenstrualRecord({ cycleDay: 0 })).rejects.toThrow();
  });
  it('throws without permission', async () => {
    await expect(makeGateway({ permissionService: makeNoPermission() })
      .createMenstrualRecord({ cycleDay: 1 })).rejects.toThrow();
  });
});

describe('ApiGateway.getMenstrualRecords()', () => {
  it('returns an empty array initially', async () => {
    const r = await makeGateway().getMenstrualRecords();
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(0);
  });
  it('throws without permission', async () => {
    await expect(makeGateway({ permissionService: makeNoPermission() })
      .getMenstrualRecords()).rejects.toThrow();
  });
  it('returns created records', async () => {
    const gw = makeGateway();
    await gw.createMenstrualRecord({ cycleDay: 2 });
    const r = await gw.getMenstrualRecords();
    expect(r.length).toBeGreaterThan(0);
  });
});

describe('ApiGateway.getCurrentCycle()', () => {
  it('returns an array', async () => {
    expect(Array.isArray(await makeGateway().getCurrentCycle())).toBe(true);
  });
  it('throws without permission', async () => {
    await expect(makeGateway({ permissionService: makeNoPermission() })
      .getCurrentCycle()).rejects.toThrow();
  });
});

describe('ApiGateway.getCycleStatistics()', () => {
  it('returns bd018Compliant:true', async () => {
    const r = await makeGateway().getCycleStatistics();
    expect(r.bd018Compliant).toBe(true);
  });
  it('throws without permission', async () => {
    await expect(makeGateway({ permissionService: makeNoPermission() })
      .getCycleStatistics()).rejects.toThrow();
  });
});

describe('ApiGateway.estimateNextCycle()', () => {
  it('returns wave1Stub:true', async () => {
    const r = await makeGateway().estimateNextCycle();
    expect(r.wave1Stub).toBe(true);
  });
  it('throws without permission', async () => {
    await expect(makeGateway({ permissionService: makeNoPermission() })
      .estimateNextCycle()).rejects.toThrow();
  });
});
