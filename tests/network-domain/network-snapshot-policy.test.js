// tests/network-domain/network-snapshot-policy.test.js
// SnapshotPolicy — PR-033
import { describe, it, expect } from 'vitest';
import {
  PERSISTENCE_CATEGORY,
  ASSET_PERSISTENCE_POLICY,
  getPersistenceCategory,
  isKeepForever,
  isSnapshot,
  isCache,
} from '../../src/domains/network/network-snapshot-policy.js';

describe('PERSISTENCE_CATEGORY constants', () => {
  it('defines KEEP_FOREVER', () => {
    expect(PERSISTENCE_CATEGORY.KEEP_FOREVER).toBe('KEEP_FOREVER');
  });

  it('defines SNAPSHOT', () => {
    expect(PERSISTENCE_CATEGORY.SNAPSHOT).toBe('SNAPSHOT');
  });

  it('defines CACHE', () => {
    expect(PERSISTENCE_CATEGORY.CACHE).toBe('CACHE');
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(PERSISTENCE_CATEGORY)).toBe(true);
  });

  it('has exactly 3 keys', () => {
    expect(Object.keys(PERSISTENCE_CATEGORY)).toHaveLength(3);
  });
});

describe('ASSET_PERSISTENCE_POLICY', () => {
  it('is frozen (SSOT — immutable)', () => {
    expect(Object.isFrozen(ASSET_PERSISTENCE_POLICY)).toBe(true);
  });

  it('NetworkSignal is KEEP_FOREVER (BD-022)', () => {
    expect(ASSET_PERSISTENCE_POLICY.NetworkSignal).toBe('KEEP_FOREVER');
  });

  it('Record is KEEP_FOREVER', () => {
    expect(ASSET_PERSISTENCE_POLICY.Record).toBe('KEEP_FOREVER');
  });

  it('DiseaseEntity is KEEP_FOREVER', () => {
    expect(ASSET_PERSISTENCE_POLICY.DiseaseEntity).toBe('KEEP_FOREVER');
  });

  it('Case is KEEP_FOREVER', () => {
    expect(ASSET_PERSISTENCE_POLICY.Case).toBe('KEEP_FOREVER');
  });

  it('Experiment is KEEP_FOREVER', () => {
    expect(ASSET_PERSISTENCE_POLICY.Experiment).toBe('KEEP_FOREVER');
  });

  it('ConsentEvent is KEEP_FOREVER (BD-002)', () => {
    expect(ASSET_PERSISTENCE_POLICY.ConsentEvent).toBe('KEEP_FOREVER');
  });

  it('SimilarityEdge is KEEP_FOREVER (BD-001)', () => {
    expect(ASSET_PERSISTENCE_POLICY.SimilarityEdge).toBe('KEEP_FOREVER');
  });

  it('ResearchDataset is KEEP_FOREVER (BD-021)', () => {
    expect(ASSET_PERSISTENCE_POLICY.ResearchDataset).toBe('KEEP_FOREVER');
  });

  it('Profile is SNAPSHOT', () => {
    expect(ASSET_PERSISTENCE_POLICY.Profile).toBe('SNAPSHOT');
  });

  it('KpiSnapshot is SNAPSHOT', () => {
    expect(ASSET_PERSISTENCE_POLICY.KpiSnapshot).toBe('SNAPSHOT');
  });

  it('SignalSummary is SNAPSHOT', () => {
    expect(ASSET_PERSISTENCE_POLICY.SignalSummary).toBe('SNAPSHOT');
  });

  it('LongitudinalSummary is SNAPSHOT', () => {
    expect(ASSET_PERSISTENCE_POLICY.LongitudinalSummary).toBe('SNAPSHOT');
  });

  it('MovingAverage is CACHE', () => {
    expect(ASSET_PERSISTENCE_POLICY.MovingAverage).toBe('CACHE');
  });

  it('TrendWindow is CACHE', () => {
    expect(ASSET_PERSISTENCE_POLICY.TrendWindow).toBe('CACHE');
  });

  it('SignalTimeline is CACHE', () => {
    expect(ASSET_PERSISTENCE_POLICY.SignalTimeline).toBe('CACHE');
  });

  it('FeatureVector is CACHE', () => {
    expect(ASSET_PERSISTENCE_POLICY.FeatureVector).toBe('CACHE');
  });
});

describe('getPersistenceCategory()', () => {
  it('returns KEEP_FOREVER for NetworkSignal', () => {
    expect(getPersistenceCategory('NetworkSignal')).toBe('KEEP_FOREVER');
  });

  it('returns SNAPSHOT for Profile', () => {
    expect(getPersistenceCategory('Profile')).toBe('SNAPSHOT');
  });

  it('returns CACHE for MovingAverage', () => {
    expect(getPersistenceCategory('MovingAverage')).toBe('CACHE');
  });

  it('throws for unknown asset name', () => {
    expect(() => getPersistenceCategory('UnknownAsset')).toThrow('[SnapshotPolicy]');
  });
});

describe('isKeepForever()', () => {
  it('returns true for Record', () => {
    expect(isKeepForever('Record')).toBe(true);
  });

  it('returns true for NetworkSignal', () => {
    expect(isKeepForever('NetworkSignal')).toBe(true);
  });

  it('returns false for Profile (SNAPSHOT)', () => {
    expect(isKeepForever('Profile')).toBe(false);
  });

  it('returns false for MovingAverage (CACHE)', () => {
    expect(isKeepForever('MovingAverage')).toBe(false);
  });
});

describe('isSnapshot()', () => {
  it('returns true for Profile', () => {
    expect(isSnapshot('Profile')).toBe(true);
  });

  it('returns true for KpiSnapshot', () => {
    expect(isSnapshot('KpiSnapshot')).toBe(true);
  });

  it('returns false for Record', () => {
    expect(isSnapshot('Record')).toBe(false);
  });

  it('returns false for MovingAverage', () => {
    expect(isSnapshot('MovingAverage')).toBe(false);
  });
});

describe('isCache()', () => {
  it('returns true for MovingAverage', () => {
    expect(isCache('MovingAverage')).toBe(true);
  });

  it('returns true for TrendWindow', () => {
    expect(isCache('TrendWindow')).toBe(true);
  });

  it('returns true for FeatureVector', () => {
    expect(isCache('FeatureVector')).toBe(true);
  });

  it('returns false for NetworkSignal', () => {
    expect(isCache('NetworkSignal')).toBe(false);
  });

  it('returns false for Profile', () => {
    expect(isCache('Profile')).toBe(false);
  });
});
