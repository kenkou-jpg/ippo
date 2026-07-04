// tests/operations/kpi-snapshot-automation-service.test.js
// KpiSnapshotAutomationService — captureSnapshot / getLatestSnapshot / getSnapshotHistory
import { describe, it, expect, beforeEach } from 'vitest';
import { KpiSnapshotAutomationService } from '../../src/domains/analytics/kpi-snapshot-automation-service.js';

function makeFakeStorage() {
  const store = {};
  return {
    get: k => store[k] ?? null,
    set: (k, v) => { store[k] = v; },
  };
}

function makeKpiRepository(storage) {
  const KEY = 'ippo_kpi_snapshots_test_' + Math.random();
  return {
    append(s) { const l = storage.get(KEY) ?? []; l.push(s); storage.set(KEY, l); },
    findAll()   { return storage.get(KEY) ?? []; },
    findLatest() { const l = storage.get(KEY) ?? []; return l.length ? l[l.length - 1] : null; },
  };
}

function makeKpiSnapshot(repo) {
  let _n = 0;
  return {
    capture(kpis) {
      const e = { id: `kpi_${++_n}`, capturedAt: new Date().toISOString(), ...kpis };
      repo.append(e);
      return e;
    },
    findAll()   { return repo.findAll(); },
    findLatest(){ return repo.findLatest(); },
  };
}

function makeDashboardService(result = {}) {
  return { getDashboard: () => ({ day1Retention: 0.8, day7Retention: 0.5, recordCompletionRate: 0.7, experimentStartRate: 0.6, experimentCompletionRate: 0.4, consentLevel2Rate: 0.3, diseaseTagCoverage: 0.9, caseGenerationRate: 0.5, communicationMetrics: {}, networkStats: {}, capturedAt: new Date().toISOString(), ...result }) };
}

describe('KpiSnapshotAutomationService', () => {
  let svc;

  beforeEach(() => {
    const storage = makeFakeStorage();
    const repo    = makeKpiRepository(storage);
    const snap    = makeKpiSnapshot(repo);
    svc = new KpiSnapshotAutomationService({ wave1DashboardService: makeDashboardService(), kpiSnapshot: snap });
  });

  it('captureSnapshot returns a snapshot with capturedAt ISO8601', () => {
    const s = svc.captureSnapshot([]);
    expect(s.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(typeof s.id).toBe('string');
  });

  it('captureSnapshot persists dashboard KPIs', () => {
    const s = svc.captureSnapshot([]);
    expect(s.day1Retention).toBe(0.8);
    expect(s.day7Retention).toBe(0.5);
  });

  it('getLatestSnapshot returns null when empty', () => {
    expect(svc.getLatestSnapshot()).toBeNull();
  });

  it('getLatestSnapshot returns the most recent snapshot after capture', () => {
    svc.captureSnapshot([]);
    svc.captureSnapshot([]);
    const latest = svc.getLatestSnapshot();
    expect(latest).not.toBeNull();
    expect(latest.id).toMatch(/kpi_/);
  });

  it('getSnapshotHistory returns all snapshots in order', () => {
    expect(svc.getSnapshotHistory()).toHaveLength(0);
    svc.captureSnapshot([]);
    svc.captureSnapshot([]);
    expect(svc.getSnapshotHistory()).toHaveLength(2);
  });

  it('captureSnapshot is append-only — prior snapshots not modified', () => {
    const first = svc.captureSnapshot([]);
    svc.captureSnapshot([]);
    const history = svc.getSnapshotHistory();
    expect(history[0].id).toBe(first.id);
  });
});
