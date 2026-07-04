// tests/network-domain/signal-snapshot-service.test.js
// SignalSnapshotService — PR-035
import { describe, it, expect } from 'vitest';
import { SignalSnapshotService }    from '../../src/domains/network/signal-snapshot-service.js';
import { SignalSnapshotRepository } from '../../src/domains/network/signal-snapshot-repository.js';
import { SignalSummaryService }     from '../../src/domains/network/signal-summary-service.js';
import { SNAPSHOT_SCHEDULE }        from '../../src/domains/network/signal-snapshot-types.js';

function makeService() {
  return new SignalSnapshotService({
    repository:          new SignalSnapshotRepository(),
    signalSummaryService: new SignalSummaryService(),
  });
}

describe('SignalSnapshotService — constructor', () => {
  it('throws when repository is missing', () => {
    expect(() => new SignalSnapshotService({ signalSummaryService: new SignalSummaryService() }))
      .toThrow(/repository is required/);
  });

  it('throws when signalSummaryService is missing', () => {
    expect(() => new SignalSnapshotService({ repository: new SignalSnapshotRepository() }))
      .toThrow(/signalSummaryService is required/);
  });
});

describe('SignalSnapshotService.createSnapshot()', () => {
  it('returns a frozen snapshot', () => {
    const s = makeService().createSnapshot([], SNAPSHOT_SCHEDULE.MANUAL);
    expect(Object.isFrozen(s)).toBe(true);
  });

  it('snapshot has generatedAt (BD-018)', () => {
    expect(makeService().createSnapshot([]).generatedAt).toBeTruthy();
  });

  it('snapshot has vectorVersion (BD-018)', () => {
    expect(makeService().createSnapshot([]).vectorVersion).toBeTruthy();
  });

  it('snapshot has schedule', () => {
    const s = makeService().createSnapshot([], SNAPSHOT_SCHEDULE.DAILY);
    expect(s.schedule).toBe(SNAPSHOT_SCHEDULE.DAILY);
  });

  it('defaults schedule to MANUAL', () => {
    expect(makeService().createSnapshot([]).schedule).toBe(SNAPSHOT_SCHEDULE.MANUAL);
  });

  it('snapshot has signalSummary', () => {
    expect(makeService().createSnapshot([]).signalSummary).toBeDefined();
  });
});

describe('SignalSnapshotService.getSnapshots()', () => {
  it('returns [] initially', () => {
    expect(makeService().getSnapshots()).toEqual([]);
  });

  it('returns created snapshots', () => {
    const svc = makeService();
    svc.createSnapshot([]);
    svc.createSnapshot([]);
    expect(svc.getSnapshots()).toHaveLength(2);
  });
});

describe('SignalSnapshotService.getLatestSnapshot()', () => {
  it('returns null when empty', () => {
    expect(makeService().getLatestSnapshot()).toBeNull();
  });

  it('returns the snapshot after creation', () => {
    const svc = makeService();
    svc.createSnapshot([]);
    expect(svc.getLatestSnapshot()).toBeTruthy();
  });
});

describe('SignalSnapshotService.getSnapshotsBySchedule()', () => {
  it('filters by schedule', () => {
    const svc = makeService();
    svc.createSnapshot([], SNAPSHOT_SCHEDULE.DAILY);
    svc.createSnapshot([], SNAPSHOT_SCHEDULE.WEEKLY);
    expect(svc.getSnapshotsBySchedule(SNAPSHOT_SCHEDULE.DAILY)).toHaveLength(1);
  });
});

describe('SignalSnapshotService.getSnapshotStatistics()', () => {
  it('returns object with totalSnapshots', () => {
    const stats = makeService().getSnapshotStatistics();
    expect(stats.totalSnapshots).toBe(0);
  });

  it('reports bd018Compliant: true', () => {
    expect(makeService().getSnapshotStatistics().bd018Compliant).toBe(true);
  });

  it('increments totalSnapshots after createSnapshot', () => {
    const svc = makeService();
    svc.createSnapshot([]);
    expect(svc.getSnapshotStatistics().totalSnapshots).toBe(1);
  });
});
