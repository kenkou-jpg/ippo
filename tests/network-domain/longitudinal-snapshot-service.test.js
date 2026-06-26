// tests/network-domain/longitudinal-snapshot-service.test.js
// LongitudinalSnapshotService — BD-018, PR-035
import { describe, it, expect } from 'vitest';
import { LongitudinalSnapshotService } from '../../src/domains/network/longitudinal-snapshot-service.js';
import { LongitudinalSummaryService }  from '../../src/domains/network/longitudinal-summary-service.js';
import { BaselineService }             from '../../src/domains/network/baseline-service.js';
import { MovingAverageService }        from '../../src/domains/network/moving-average-service.js';
import { SignalTrendService }          from '../../src/domains/network/signal-trend-service.js';
import { TrendWindowBuilder }          from '../../src/domains/network/trend-window-builder.js';

function makeLongitudinalSummary() {
  return new LongitudinalSummaryService({
    baselineService:      new BaselineService(),
    movingAverageService: new MovingAverageService(),
    trendService:         new SignalTrendService(),
    windowBuilder:        new TrendWindowBuilder(),
  });
}

function makeService() {
  return new LongitudinalSnapshotService({
    longitudinalSummaryService: makeLongitudinalSummary(),
  });
}

describe('LongitudinalSnapshotService — constructor', () => {
  it('throws when longitudinalSummaryService is missing', () => {
    expect(() => new LongitudinalSnapshotService({}))
      .toThrow(/longitudinalSummaryService is required/);
  });
});

describe('LongitudinalSnapshotService.createLongitudinalSnapshot()', () => {
  it('returns a frozen snapshot', () => {
    const s = makeService().createLongitudinalSnapshot([]);
    expect(Object.isFrozen(s)).toBe(true);
  });

  it('has generatedAt (BD-018)', () => {
    expect(makeService().createLongitudinalSnapshot([]).generatedAt).toBeTruthy();
  });

  it('has vectorVersion (BD-018)', () => {
    expect(makeService().createLongitudinalSnapshot([]).vectorVersion).toBeTruthy();
  });

  it('has id field', () => {
    expect(makeService().createLongitudinalSnapshot([]).id).toBeTruthy();
  });

  it('has baseline field', () => {
    expect(makeService().createLongitudinalSnapshot([])).toHaveProperty('baseline');
  });

  it('has movingAverage field', () => {
    expect(makeService().createLongitudinalSnapshot([])).toHaveProperty('movingAverage');
  });

  it('has trend field', () => {
    expect(makeService().createLongitudinalSnapshot([])).toHaveProperty('trend');
  });

  it('has window field', () => {
    expect(makeService().createLongitudinalSnapshot([])).toHaveProperty('window');
  });

  it('has frozen metadata', () => {
    expect(Object.isFrozen(makeService().createLongitudinalSnapshot([]).metadata)).toBe(true);
  });
});

describe('LongitudinalSnapshotService.getLongitudinalSnapshots()', () => {
  it('returns [] initially', () => {
    expect(makeService().getLongitudinalSnapshots()).toEqual([]);
  });

  it('accumulates snapshots', () => {
    const svc = makeService();
    svc.createLongitudinalSnapshot([]);
    svc.createLongitudinalSnapshot([]);
    expect(svc.getLongitudinalSnapshots()).toHaveLength(2);
  });

  it('returns copy (no mutation)', () => {
    const svc = makeService();
    svc.createLongitudinalSnapshot([]);
    const arr = svc.getLongitudinalSnapshots();
    arr.push('x');
    expect(svc.count).toBe(1);
  });
});

describe('LongitudinalSnapshotService.getLatestLongitudinalSnapshot()', () => {
  it('returns null when empty', () => {
    expect(makeService().getLatestLongitudinalSnapshot()).toBeNull();
  });

  it('returns non-null after creation', () => {
    const svc = makeService();
    svc.createLongitudinalSnapshot([]);
    expect(svc.getLatestLongitudinalSnapshot()).not.toBeNull();
  });
});

describe('LongitudinalSnapshotService.getStatistics()', () => {
  it('returns bd018Compliant: true', () => {
    expect(makeService().getStatistics().bd018Compliant).toBe(true);
  });

  it('returns totalLongitudinalSnapshots', () => {
    const svc = makeService();
    expect(svc.getStatistics().totalLongitudinalSnapshots).toBe(0);
    svc.createLongitudinalSnapshot([]);
    expect(svc.getStatistics().totalLongitudinalSnapshots).toBe(1);
  });
});
