// tests/network-domain/api-gateway-snapshot.test.js
// ApiGateway — PR-035 snapshot methods
import { describe, it, expect } from 'vitest';
import { ApiGateway }               from '../../src/application/api-gateway.js';
import { SignalSnapshotService }    from '../../src/domains/network/signal-snapshot-service.js';
import { SignalSnapshotRepository } from '../../src/domains/network/signal-snapshot-repository.js';
import { SignalSummaryService }     from '../../src/domains/network/signal-summary-service.js';
import { LongitudinalSnapshotService } from '../../src/domains/network/longitudinal-snapshot-service.js';
import { LongitudinalSummaryService }  from '../../src/domains/network/longitudinal-summary-service.js';
import { BaselineService }          from '../../src/domains/network/baseline-service.js';
import { MovingAverageService }     from '../../src/domains/network/moving-average-service.js';
import { SignalTrendService }       from '../../src/domains/network/signal-trend-service.js';
import { TrendWindowBuilder }       from '../../src/domains/network/trend-window-builder.js';
import { DiseaseSnapshotService }   from '../../src/domains/disease/disease-snapshot-service.js';
import { DiseaseService }           from '../../src/domains/disease/disease-service.js';
import { DiseaseRepository }        from '../../src/domains/disease/disease-repository.js';
import { DiseaseValidator }         from '../../src/domains/disease/disease-validator.js';
import { DiseaseClusterService }    from '../../src/domains/disease/disease-cluster-service.js';
import { DiseaseClusterRepository } from '../../src/domains/disease/disease-cluster-repository.js';
import { DiseaseSignalMapper }      from '../../src/domains/disease/disease-signal-mapper.js';

const makePermission = () => ({
  require: async () => ({ userId: 'u1', isAdmin: false }),
});

function makeSignalSnapshotService() {
  return new SignalSnapshotService({
    repository:          new SignalSnapshotRepository(),
    signalSummaryService: new SignalSummaryService(),
  });
}

function makeLongitudinalSnapshotService() {
  return new LongitudinalSnapshotService({
    longitudinalSummaryService: new LongitudinalSummaryService({
      baselineService:      new BaselineService(),
      movingAverageService: new MovingAverageService(),
      trendService:         new SignalTrendService(),
      windowBuilder:        new TrendWindowBuilder(),
    }),
  });
}

function makeDiseaseSnapshotService() {
  return new DiseaseSnapshotService({
    diseaseService:        new DiseaseService({ repository: new DiseaseRepository(), validator: new DiseaseValidator() }),
    diseaseClusterService: new DiseaseClusterService({ repository: new DiseaseClusterRepository(), mapper: new DiseaseSignalMapper() }),
  });
}

function makeGateway(overrides = {}) {
  return new ApiGateway({
    permissionService:         makePermission(),
    similarityAccessGuard:     { assertAccess: () => {}, filterEdges: (e) => e },
    consentEnforcementService: { validate: () => {} },
    recordQueryService:        { findByUser: async () => [] },
    recordCommandService:      { save: async (d) => d },
    experimentQueryService:    { findByUser: async () => [] },
    experimentCommandService:  { create: async (d) => d },
    caseGenerationService:     { generate: async () => ({}) },
    similarityEngine:          { findSimilar: async () => [] },
    signalSnapshotService:       makeSignalSnapshotService(),
    longitudinalSnapshotService: makeLongitudinalSnapshotService(),
    diseaseSnapshotService:      makeDiseaseSnapshotService(),
    ...overrides,
  });
}

// ── createSignalSnapshot() ────────────────────────────────────────────────────
describe('ApiGateway.createSignalSnapshot()', () => {
  it('creates and returns a snapshot', async () => {
    const s = await makeGateway().createSignalSnapshot([], 'MANUAL');
    expect(s.generatedAt).toBeTruthy();
    expect(s.vectorVersion).toBeTruthy();
  });

  it('snapshot has schedule', async () => {
    const s = await makeGateway().createSignalSnapshot([], 'DAILY');
    expect(s.schedule).toBe('DAILY');
  });

  it('requires record:read permission', async () => {
    let perm = null;
    const gw = makeGateway({
      permissionService: { require: async (p) => { perm = p; return {}; } },
    });
    await gw.createSignalSnapshot([]).catch(() => {});
    expect(perm).toBe('record:read');
  });

  it('throws when SignalSnapshotService not wired', async () => {
    await expect(makeGateway({ signalSnapshotService: null }).createSignalSnapshot([]))
      .rejects.toThrow('[ApiGateway] SignalSnapshotService not wired');
  });
});

// ── getSignalSnapshots() ──────────────────────────────────────────────────────
describe('ApiGateway.getSignalSnapshots()', () => {
  it('returns [] initially', async () => {
    expect(await makeGateway().getSignalSnapshots()).toEqual([]);
  });

  it('returns created snapshots', async () => {
    const gw = makeGateway();
    await gw.createSignalSnapshot([]);
    const all = await gw.getSignalSnapshots();
    expect(all).toHaveLength(1);
  });

  it('throws when SignalSnapshotService not wired', async () => {
    await expect(makeGateway({ signalSnapshotService: null }).getSignalSnapshots())
      .rejects.toThrow('[ApiGateway] SignalSnapshotService not wired');
  });
});

// ── createLongitudinalSnapshot() ─────────────────────────────────────────────
describe('ApiGateway.createLongitudinalSnapshot()', () => {
  it('returns a longitudinal snapshot', async () => {
    const s = await makeGateway().createLongitudinalSnapshot([]);
    expect(s.generatedAt).toBeTruthy();
    expect(s.vectorVersion).toBeTruthy();
  });

  it('has required longitudinal fields', async () => {
    const s = await makeGateway().createLongitudinalSnapshot([]);
    expect(s).toHaveProperty('baseline');
    expect(s).toHaveProperty('movingAverage');
    expect(s).toHaveProperty('trend');
    expect(s).toHaveProperty('window');
  });

  it('throws when LongitudinalSnapshotService not wired', async () => {
    await expect(makeGateway({ longitudinalSnapshotService: null }).createLongitudinalSnapshot([]))
      .rejects.toThrow('[ApiGateway] LongitudinalSnapshotService not wired');
  });
});

// ── getLongitudinalSnapshots() ────────────────────────────────────────────────
describe('ApiGateway.getLongitudinalSnapshots()', () => {
  it('returns [] initially', async () => {
    expect(await makeGateway().getLongitudinalSnapshots()).toEqual([]);
  });

  it('returns created snapshots', async () => {
    const gw = makeGateway();
    await gw.createLongitudinalSnapshot([]);
    expect(await gw.getLongitudinalSnapshots()).toHaveLength(1);
  });

  it('throws when LongitudinalSnapshotService not wired', async () => {
    await expect(makeGateway({ longitudinalSnapshotService: null }).getLongitudinalSnapshots())
      .rejects.toThrow('[ApiGateway] LongitudinalSnapshotService not wired');
  });
});

// ── createDiseaseSnapshot() ───────────────────────────────────────────────────
describe('ApiGateway.createDiseaseSnapshot()', () => {
  it('returns a disease snapshot', async () => {
    const s = await makeGateway().createDiseaseSnapshot();
    expect(s.generatedAt).toBeTruthy();
    expect(s.vectorVersion).toBeTruthy();
  });

  it('has activeDiseases, resolvedDiseases, clusterStatistics', async () => {
    const s = await makeGateway().createDiseaseSnapshot();
    expect(Array.isArray(s.activeDiseases)).toBe(true);
    expect(Array.isArray(s.resolvedDiseases)).toBe(true);
    expect(typeof s.clusterStatistics).toBe('object');
  });

  it('throws when DiseaseSnapshotService not wired', async () => {
    await expect(makeGateway({ diseaseSnapshotService: null }).createDiseaseSnapshot())
      .rejects.toThrow('[ApiGateway] DiseaseSnapshotService not wired');
  });
});

// ── getDiseaseSnapshots() ─────────────────────────────────────────────────────
describe('ApiGateway.getDiseaseSnapshots()', () => {
  it('returns [] initially', async () => {
    expect(await makeGateway().getDiseaseSnapshots()).toEqual([]);
  });

  it('returns created snapshots', async () => {
    const gw = makeGateway();
    await gw.createDiseaseSnapshot();
    expect(await gw.getDiseaseSnapshots()).toHaveLength(1);
  });

  it('throws when DiseaseSnapshotService not wired', async () => {
    await expect(makeGateway({ diseaseSnapshotService: null }).getDiseaseSnapshots())
      .rejects.toThrow('[ApiGateway] DiseaseSnapshotService not wired');
  });
});
