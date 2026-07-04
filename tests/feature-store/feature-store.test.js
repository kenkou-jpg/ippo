// tests/feature-store/feature-store.test.js
// PR-053: Feature Store V1 — FeatureMatrix / FeatureStoreService / BD-037
import { describe, it, expect, beforeEach } from 'vitest';
import { buildFeatureMatrix }     from '../../src/domains/feature-store/feature-matrix-entity.js';
import { FeatureStoreRepository } from '../../src/domains/feature-store/feature-store-repository.js';
import { FeatureStoreService, FEATURE_KEYS } from '../../src/domains/feature-store/feature-store-service.js';
import {
  FEATURE_KEY_SET, WINDOW_DAYS, FEATURE_STORE_SCHEMA_VERSION, PHASE_KEYS,
} from '../../src/domains/feature-store/feature-store-types.js';

// ── Helper fixtures ───────────────────────────────────────────────────────────

function makeSignal({ type = 'PAIN', value = 5, daysAgo = 5, phase = 'FOLLICULAR', persistedId = 'ps_1' } = {}) {
  const ts = new Date(Date.now() - daysAgo * 86400_000).toISOString();
  return {
    signalType:      type,
    normalizedValue: value,
    rawValue:        value,
    menstrualPhase:  phase,
    timestamp:       ts,
    createdAt:       ts,
    persistedId,
  };
}

function makeService() {
  const repo = new FeatureStoreRepository();
  const svc  = new FeatureStoreService({ repository: repo });
  return { repo, svc };
}

// ── feature-store-types ───────────────────────────────────────────────────────

describe('feature-store-types', () => {
  it('FEATURE_KEYS has 6 keys', () => {
    expect(Object.keys(FEATURE_KEYS)).toHaveLength(6);
  });
  it('FEATURE_KEY_SET contains all 6 keys', () => {
    expect(FEATURE_KEY_SET.size).toBe(6);
    for (const k of Object.values(FEATURE_KEYS)) {
      expect(FEATURE_KEY_SET.has(k)).toBe(true);
    }
  });
  it('WINDOW_DAYS is 30', () => expect(WINDOW_DAYS).toBe(30));
  it('FEATURE_STORE_SCHEMA_VERSION is a string', () => expect(typeof FEATURE_STORE_SCHEMA_VERSION).toBe('string'));
  it('PHASE_KEYS has 4 entries', () => expect(PHASE_KEYS).toHaveLength(4));
  it('is frozen', () => {
    expect(Object.isFrozen(FEATURE_KEYS)).toBe(true);
    expect(Object.isFrozen(FEATURE_KEY_SET)).toBe(true);
    expect(Object.isFrozen(PHASE_KEYS)).toBe(true);
  });
});

// ── buildFeatureMatrix ────────────────────────────────────────────────────────

describe('buildFeatureMatrix', () => {
  it('returns a frozen object', () => {
    const m = buildFeatureMatrix({ userId: 'u1', features: { avg_pain_30d: 5 } });
    expect(Object.isFrozen(m)).toBe(true);
  });
  it('has required BD-018 computedAt', () => {
    const m = buildFeatureMatrix({ userId: 'u1', features: { avg_pain_30d: 5 } });
    expect(typeof m.computedAt).toBe('string');
    expect(new Date(m.computedAt).toISOString()).toBe(m.computedAt);
  });
  it('has snapshotId', () => {
    const m = buildFeatureMatrix({ userId: 'u1', features: {} });
    expect(typeof m.snapshotId).toBe('string');
    expect(m.snapshotId.length).toBeGreaterThan(0);
  });
  it('accepts explicit snapshotId', () => {
    const m = buildFeatureMatrix({ userId: 'u1', features: {}, snapshotId: 'fsm_custom' });
    expect(m.snapshotId).toBe('fsm_custom');
  });
  it('schedule is on-record-save', () => {
    const m = buildFeatureMatrix({ userId: 'u1', features: {} });
    expect(m.schedule).toBe('on-record-save');
  });
  it('schemaVersion matches FEATURE_STORE_SCHEMA_VERSION', () => {
    const m = buildFeatureMatrix({ userId: 'u1', features: {} });
    expect(m.schemaVersion).toBe(FEATURE_STORE_SCHEMA_VERSION);
  });
  it('features is frozen', () => {
    const m = buildFeatureMatrix({ userId: 'u1', features: { avg_pain_30d: 3 } });
    expect(Object.isFrozen(m.features)).toBe(true);
  });
  it('throws when userId missing', () => {
    expect(() => buildFeatureMatrix({ userId: '', features: {} })).toThrow();
  });
  it('throws on unknown feature key', () => {
    expect(() => buildFeatureMatrix({ userId: 'u1', features: { unknown_key: 1 } })).toThrow('unknown feature key');
  });
});

// ── FeatureStoreRepository ───────────────────────────────────────────────────

describe('FeatureStoreRepository', () => {
  let repo;
  beforeEach(() => { repo = new FeatureStoreRepository(); });

  it('save and findByUserId', () => {
    const m = buildFeatureMatrix({ userId: 'u1', features: { avg_pain_30d: 4 } });
    repo.save(m);
    expect(repo.findByUserId('u1')).toBe(m);
  });
  it('findByUserId returns null for unknown user', () => {
    expect(repo.findByUserId('nobody')).toBeNull();
  });
  it('save replaces prior matrix for same userId', () => {
    const m1 = buildFeatureMatrix({ userId: 'u1', features: { avg_pain_30d: 1 } });
    const m2 = buildFeatureMatrix({ userId: 'u1', features: { avg_pain_30d: 9 } });
    repo.save(m1);
    repo.save(m2);
    expect(repo.findByUserId('u1')).toBe(m2);
  });
  it('findAll returns all matrices', () => {
    const m1 = buildFeatureMatrix({ userId: 'u1', features: {} });
    const m2 = buildFeatureMatrix({ userId: 'u2', features: {} });
    repo.save(m1);
    repo.save(m2);
    expect(repo.findAll()).toHaveLength(2);
  });
  it('getStats returns frozen object with matrixCount', () => {
    repo.save(buildFeatureMatrix({ userId: 'u1', features: {} }));
    const s = repo.getStats();
    expect(Object.isFrozen(s)).toBe(true);
    expect(s.matrixCount).toBe(1);
  });
  it('throws when saving matrix without userId', () => {
    expect(() => repo.save({})).toThrow();
  });
});

// ── FeatureStoreService — BD-037 enforcement ──────────────────────────────────

describe('FeatureStoreService BD-037', () => {
  it('throws if signal has no persistedId (in-memory signal)', () => {
    const { svc } = makeService();
    const signal = { signalType: 'PAIN', normalizedValue: 5, timestamp: new Date().toISOString() };
    // no persistedId → in-memory → reject
    expect(() => svc.compute({ userId: 'u1', signals: [signal] })).toThrow('BD-037');
  });
  it('passes when all signals have persistedId', () => {
    const { svc } = makeService();
    const signal = makeSignal({ persistedId: 'ps_1' });
    expect(() => svc.compute({ userId: 'u1', signals: [signal] })).not.toThrow();
  });
  it('passes when options.source === "supabase" bypasses per-signal check', () => {
    const { svc } = makeService();
    const inMemorySignal = { signalType: 'PAIN', normalizedValue: 5, timestamp: new Date().toISOString() };
    expect(() =>
      svc.compute({ userId: 'u1', signals: [inMemorySignal] }, { source: 'supabase' })
    ).not.toThrow();
  });
  it('throws if signals is not an array', () => {
    const { svc } = makeService();
    expect(() => svc.compute({ userId: 'u1', signals: null })).toThrow('array');
  });
  it('throws if userId missing', () => {
    const { svc } = makeService();
    expect(() => svc.compute({ userId: '', signals: [] })).toThrow();
  });
});

// ── FeatureStoreService — compute features ────────────────────────────────────

describe('FeatureStoreService compute', () => {
  let svc;
  beforeEach(() => { ({ svc } = makeService()); });

  it('returns frozen FeatureMatrix', () => {
    const m = svc.compute({ userId: 'u1', signals: [] }, { source: 'supabase' });
    expect(Object.isFrozen(m)).toBe(true);
    expect(m.userId).toBe('u1');
  });
  it('matrix has computedAt BD-018', () => {
    const m = svc.compute({ userId: 'u1', signals: [] }, { source: 'supabase' });
    expect(typeof m.computedAt).toBe('string');
    expect(new Date(m.computedAt).toISOString()).toBe(m.computedAt);
  });
  it('features object has all 6 keys', () => {
    const m = svc.compute({ userId: 'u1', signals: [] }, { source: 'supabase' });
    for (const k of Object.values(FEATURE_KEYS)) {
      expect(m.features).toHaveProperty(k);
    }
  });

  it('avg_pain_30d computes mean of PAIN signals in window', () => {
    const signals = [
      makeSignal({ type: 'PAIN', value: 4, daysAgo: 10 }),
      makeSignal({ type: 'PAIN', value: 6, daysAgo: 5  }),
    ];
    const m = svc.compute({ userId: 'u1', signals }, { source: 'supabase' });
    expect(m.features.avg_pain_30d).toBeCloseTo(5, 5);
  });
  it('avg_pain_30d is null when no PAIN signals', () => {
    const m = svc.compute({ userId: 'u1', signals: [] }, { source: 'supabase' });
    expect(m.features.avg_pain_30d).toBeNull();
  });
  it('avg_pain_30d excludes signals older than 30 days', () => {
    const signals = [
      makeSignal({ type: 'PAIN', value: 10, daysAgo: 40 }), // outside window
      makeSignal({ type: 'PAIN', value: 2,  daysAgo: 5  }),
    ];
    const m = svc.compute({ userId: 'u1', signals }, { source: 'supabase' });
    expect(m.features.avg_pain_30d).toBeCloseTo(2, 5);
  });

  it('avg_sleep_30d computes mean of SLEEP signals', () => {
    const signals = [
      makeSignal({ type: 'SLEEP', value: 7, daysAgo: 3 }),
      makeSignal({ type: 'SLEEP', value: 9, daysAgo: 7 }),
    ];
    const m = svc.compute({ userId: 'u1', signals }, { source: 'supabase' });
    expect(m.features.avg_sleep_30d).toBeCloseTo(8, 5);
  });

  it('avg_symptom_30d computes mean of SYMPTOM signals', () => {
    const signals = [ makeSignal({ type: 'SYMPTOM', value: 3, daysAgo: 1 }) ];
    const m = svc.compute({ userId: 'u1', signals }, { source: 'supabase' });
    expect(m.features.avg_symptom_30d).toBeCloseTo(3, 5);
  });

  describe('menstrual_regularity', () => {
    it('is null with < 2 MENSTRUAL signals', () => {
      const signals = [ makeSignal({ type: 'MENSTRUAL', daysAgo: 5 }) ];
      const m = svc.compute({ userId: 'u1', signals }, { source: 'supabase' });
      expect(m.features.menstrual_regularity).toBeNull();
    });
    it('returns 1.0 for perfectly regular cycles (equal intervals)', () => {
      const signals = [
        makeSignal({ type: 'MENSTRUAL', daysAgo: 56 }),
        makeSignal({ type: 'MENSTRUAL', daysAgo: 28 }),
        makeSignal({ type: 'MENSTRUAL', daysAgo: 0  }),
      ];
      const m = svc.compute({ userId: 'u1', signals }, { source: 'supabase' });
      expect(m.features.menstrual_regularity).toBeCloseTo(1.0, 5);
    });
    it('returns value in [0, 1]', () => {
      const signals = [
        makeSignal({ type: 'MENSTRUAL', daysAgo: 60 }),
        makeSignal({ type: 'MENSTRUAL', daysAgo: 20 }),
        makeSignal({ type: 'MENSTRUAL', daysAgo: 5  }),
      ];
      const m = svc.compute({ userId: 'u1', signals }, { source: 'supabase' });
      const r = m.features.menstrual_regularity;
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    });
  });

  describe('longitudinal_delta_pain', () => {
    it('is null when no PAIN signals', () => {
      const m = svc.compute({ userId: 'u1', signals: [] }, { source: 'supabase' });
      expect(m.features.longitudinal_delta_pain).toBeNull();
    });
    it('is null when only recent-window pain exists', () => {
      const signals = [ makeSignal({ type: 'PAIN', value: 5, daysAgo: 3 }) ];
      const m = svc.compute({ userId: 'u1', signals }, { source: 'supabase' });
      expect(m.features.longitudinal_delta_pain).toBeNull();
    });
    it('computes delta: recent avg minus prior avg', () => {
      const signals = [
        makeSignal({ type: 'PAIN', value: 7, daysAgo: 3 }),  // recent [0–7d]
        makeSignal({ type: 'PAIN', value: 3, daysAgo: 10 }), // prior  [7–14d]
      ];
      const m = svc.compute({ userId: 'u1', signals }, { source: 'supabase' });
      expect(m.features.longitudinal_delta_pain).toBeCloseTo(4, 5); // 7 - 3
    });
    it('negative delta when pain is decreasing', () => {
      const signals = [
        makeSignal({ type: 'PAIN', value: 2, daysAgo: 3 }),  // recent
        makeSignal({ type: 'PAIN', value: 8, daysAgo: 10 }), // prior
      ];
      const m = svc.compute({ userId: 'u1', signals }, { source: 'supabase' });
      expect(m.features.longitudinal_delta_pain).toBeCloseTo(-6, 5);
    });
  });

  describe('phase_pain_distribution', () => {
    it('returns a frozen object with 4 phase keys', () => {
      const m = svc.compute({ userId: 'u1', signals: [] }, { source: 'supabase' });
      const dist = m.features.phase_pain_distribution;
      expect(Object.isFrozen(dist)).toBe(true);
      for (const p of PHASE_KEYS) {
        expect(dist).toHaveProperty(p);
      }
    });
    it('nulls when no PAIN signals', () => {
      const m = svc.compute({ userId: 'u1', signals: [] }, { source: 'supabase' });
      for (const v of Object.values(m.features.phase_pain_distribution)) {
        expect(v).toBeNull();
      }
    });
    it('computes avg per phase', () => {
      const signals = [
        makeSignal({ type: 'PAIN', value: 8, phase: 'MENSTRUAL', daysAgo: 2 }),
        makeSignal({ type: 'PAIN', value: 4, phase: 'FOLLICULAR', daysAgo: 3 }),
      ];
      const m = svc.compute({ userId: 'u1', signals }, { source: 'supabase' });
      const dist = m.features.phase_pain_distribution;
      expect(dist['MENSTRUAL']).toBeCloseTo(8, 5);
      expect(dist['FOLLICULAR']).toBeCloseTo(4, 5);
      expect(dist['OVULATION']).toBeNull();
      expect(dist['LUTEAL']).toBeNull();
    });
  });

  it('persists matrix to repository', () => {
    const { repo, svc: s } = makeService();
    s.compute({ userId: 'u1', signals: [] }, { source: 'supabase' });
    expect(repo.findByUserId('u1')).not.toBeNull();
  });
});

// ── FeatureStoreService — getMatrix / getAllMatrices / getStatus ──────────────

describe('FeatureStoreService reads', () => {
  it('getMatrix returns null before compute', () => {
    const { svc } = makeService();
    expect(svc.getMatrix('u1')).toBeNull();
  });
  it('getMatrix returns matrix after compute', () => {
    const { svc } = makeService();
    svc.compute({ userId: 'u1', signals: [] }, { source: 'supabase' });
    expect(svc.getMatrix('u1')).not.toBeNull();
  });
  it('getAllMatrices returns all stored matrices', () => {
    const { svc } = makeService();
    svc.compute({ userId: 'u1', signals: [] }, { source: 'supabase' });
    svc.compute({ userId: 'u2', signals: [] }, { source: 'supabase' });
    expect(svc.getAllMatrices()).toHaveLength(2);
  });

  it('getStatus returns ready:true', () => {
    const { svc } = makeService();
    const status = svc.getStatus();
    expect(status.ready).toBe(true);
    expect(status.windowDays).toBe(WINDOW_DAYS);
    expect(status.schemaVersion).toBe(FEATURE_STORE_SCHEMA_VERSION);
    expect(Object.isFrozen(status)).toBe(true);
  });
  it('getStatus bd037 field is defined', () => {
    const { svc } = makeService();
    expect(typeof svc.getStatus().bd037).toBe('string');
  });
});

// ── FEATURE_STORE_UPDATED domain event ──────────────────────────────────────

describe('FEATURE_STORE_UPDATED domain event', () => {
  it('is defined in DOMAIN_EVENT_TYPES', async () => {
    const { DOMAIN_EVENT_TYPES } = await import('../../src/domains/events/domain-event-types.js');
    expect(DOMAIN_EVENT_TYPES.FEATURE_STORE_UPDATED).toBe('FEATURE_STORE_UPDATED');
  });
  it('AGGREGATE_TYPES.FEATURE_STORE is defined', async () => {
    const { AGGREGATE_TYPES } = await import('../../src/domains/events/domain-event-types.js');
    expect(AGGREGATE_TYPES.FEATURE_STORE).toBe('FEATURE_STORE');
  });
  it('event publisher is called on compute', () => {
    let published = null;
    const publisher = { publish: (e) => { published = e; } };
    const svc = new FeatureStoreService({ repository: new FeatureStoreRepository(), eventPublisher: publisher });
    svc.compute({ userId: 'u1', signals: [] }, { source: 'supabase' });
    expect(published).not.toBeNull();
    expect(published.eventType).toBe('FEATURE_STORE_UPDATED');
  });
  it('compute still works when eventPublisher is null', () => {
    const svc = new FeatureStoreService({ repository: new FeatureStoreRepository(), eventPublisher: null });
    expect(() => svc.compute({ userId: 'u1', signals: [] }, { source: 'supabase' })).not.toThrow();
  });
});
