// tests/operations/kpi-scheduler-service.test.js
// KpiSchedulerService — getScheduleStatus / captureDueSnapshots
import { describe, it, expect, beforeEach } from 'vitest';
import { KpiSchedulerService } from '../../src/domains/analytics/kpi-scheduler-service.js';

function makeAutomationSvc(latestSnapshot = null, captured = []) {
  return {
    getLatestSnapshot: () => latestSnapshot,
    captureSnapshot:   (users) => {
      const s = { id: `kpi_${Date.now()}`, capturedAt: new Date().toISOString(), day1Retention: 0 };
      captured.push(s);
      return s;
    },
  };
}

describe('KpiSchedulerService — getScheduleStatus', () => {
  it('due = true when no snapshot exists', () => {
    const svc = new KpiSchedulerService({ kpiSnapshotAutomationService: makeAutomationSvc(null) });
    const { due, lastCapturedAt } = svc.getScheduleStatus();
    expect(due).toBe(true);
    expect(lastCapturedAt).toBeNull();
  });

  it('due = false when last capture is within interval', () => {
    const recent = { capturedAt: new Date().toISOString() };
    const svc = new KpiSchedulerService({
      kpiSnapshotAutomationService: makeAutomationSvc(recent),
      intervalMs: 3_600_000,
    });
    const { due } = svc.getScheduleStatus();
    expect(due).toBe(false);
  });

  it('due = true when last capture exceeded interval', () => {
    const old = { capturedAt: new Date(Date.now() - 10_000).toISOString() };
    const svc = new KpiSchedulerService({
      kpiSnapshotAutomationService: makeAutomationSvc(old),
      intervalMs: 5_000,
    });
    const { due } = svc.getScheduleStatus();
    expect(due).toBe(true);
  });

  it('returns lastCapturedAt ISO8601 when snapshot exists', () => {
    const snap = { capturedAt: new Date().toISOString() };
    const svc  = new KpiSchedulerService({ kpiSnapshotAutomationService: makeAutomationSvc(snap) });
    expect(svc.getScheduleStatus().lastCapturedAt).toBe(snap.capturedAt);
  });
});

describe('KpiSchedulerService — captureDueSnapshots', () => {
  it('captures and returns snapshot when due', () => {
    const captured = [];
    const svc = new KpiSchedulerService({
      kpiSnapshotAutomationService: makeAutomationSvc(null, captured),
    });
    const result = svc.captureDueSnapshots([]);
    expect(result).not.toBeNull();
    expect(result.capturedAt).toBeDefined();
    expect(captured).toHaveLength(1);
  });

  it('returns null and skips capture when not due', () => {
    const captured = [];
    const recent   = { capturedAt: new Date().toISOString() };
    const svc = new KpiSchedulerService({
      kpiSnapshotAutomationService: makeAutomationSvc(recent, captured),
      intervalMs: 3_600_000,
    });
    const result = svc.captureDueSnapshots([]);
    expect(result).toBeNull();
    expect(captured).toHaveLength(0);
  });
});
