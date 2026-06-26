// tests/network-domain/network-signal-storage-repository.test.js
// NetworkSignalStorageRepository — PR-033
import { describe, it, expect, beforeEach } from 'vitest';
import { NetworkSignalStorageRepository } from '../../src/domains/network/network-signal-storage-repository.js';
import { buildNetworkSignal }             from '../../src/domains/network/network-signal-entity.js';

// ── Mock StorageService (IStorageService-compatible in-memory) ─────────────
class MockStorage {
  #data = {};
  get(key)        { return key in this.#data ? this.#data[key] : null; }
  set(key, value) { this.#data[key] = value; }
  remove(key)     { delete this.#data[key]; }
  has(key)        { return key in this.#data; }
}

function makeStorage() { return new MockStorage(); }

function makeRepo(storage) {
  return new NetworkSignalStorageRepository({ storage: storage ?? makeStorage() });
}

function makeSignal(overrides = {}) {
  return buildNetworkSignal({
    signalType:      'SYMPTOM',
    normalizedValue: 0.5,
    rawValue:        5,
    unit:            'severity_0_10',
    ...overrides,
  });
}

// ── Constructor ──────────────────────────────────────────────────────────────
describe('NetworkSignalStorageRepository — constructor', () => {
  it('constructs with a valid storage service', () => {
    expect(() => makeRepo()).not.toThrow();
  });

  it('throws if storage is missing', () => {
    expect(() => new NetworkSignalStorageRepository({})).toThrow('[NetworkSignalStorageRepository]');
  });

  it('throws if storage.get is missing', () => {
    expect(() => new NetworkSignalStorageRepository({ storage: { set: () => {} } })).toThrow();
  });

  it('throws if storage.set is missing', () => {
    expect(() => new NetworkSignalStorageRepository({ storage: { get: () => {} } })).toThrow();
  });

  it('exposes the storageKey', () => {
    expect(makeRepo().storageKey).toBe('ippo_network_signals_v1');
  });
});

// ── save() ───────────────────────────────────────────────────────────────────
describe('NetworkSignalStorageRepository.save()', () => {
  it('returns the saved signal', () => {
    const r = makeRepo();
    const s = makeSignal();
    expect(r.save(s)).toBe(s);
  });

  it('increments count after save', () => {
    const r = makeRepo();
    expect(r.count).toBe(0);
    r.save(makeSignal());
    expect(r.count).toBe(1);
  });

  it('appends, does not overwrite, existing signals', () => {
    const r = makeRepo();
    r.save(makeSignal({ signalType: 'PAIN' }));
    r.save(makeSignal({ signalType: 'SLEEP' }));
    expect(r.count).toBe(2);
  });

  it('persists across separate findAll calls', () => {
    const storage = makeStorage();
    const r = makeRepo(storage);
    r.save(makeSignal());
    const r2 = makeRepo(storage);  // same storage, different instance
    expect(r2.findAll()).toHaveLength(1);
  });
});

// ── saveMany() ───────────────────────────────────────────────────────────────
describe('NetworkSignalStorageRepository.saveMany()', () => {
  it('returns the saved array', () => {
    const r = makeRepo();
    const signals = [makeSignal(), makeSignal()];
    expect(r.saveMany(signals)).toEqual(signals);
  });

  it('saves all signals in a single call', () => {
    const r = makeRepo();
    r.saveMany([makeSignal(), makeSignal(), makeSignal()]);
    expect(r.count).toBe(3);
  });

  it('returns [] for empty input', () => {
    const r = makeRepo();
    expect(r.saveMany([])).toEqual([]);
    expect(r.count).toBe(0);
  });

  it('appends to existing signals', () => {
    const r = makeRepo();
    r.save(makeSignal());
    r.saveMany([makeSignal(), makeSignal()]);
    expect(r.count).toBe(3);
  });
});

// ── findAll() ────────────────────────────────────────────────────────────────
describe('NetworkSignalStorageRepository.findAll()', () => {
  it('returns [] when empty', () => {
    expect(makeRepo().findAll()).toHaveLength(0);
  });

  it('returns all saved signals', () => {
    const r = makeRepo();
    r.save(makeSignal());
    r.save(makeSignal());
    expect(r.findAll()).toHaveLength(2);
  });

  it('returns a copy — mutations do not affect stored data', () => {
    const r = makeRepo();
    r.save(makeSignal());
    const result = r.findAll();
    result.push(makeSignal());
    expect(r.count).toBe(1);
  });
});

// ── findByRecord() ───────────────────────────────────────────────────────────
describe('NetworkSignalStorageRepository.findByRecord()', () => {
  it('returns [] when no signals match recordId', () => {
    const r = makeRepo();
    r.save(makeSignal({ recordId: 'rec-a' }));
    expect(r.findByRecord('rec-z')).toHaveLength(0);
  });

  it('returns only signals matching the recordId', () => {
    const r = makeRepo();
    r.save(makeSignal({ recordId: 'rec-1' }));
    r.save(makeSignal({ recordId: 'rec-2' }));
    r.save(makeSignal({ recordId: 'rec-1' }));
    expect(r.findByRecord('rec-1')).toHaveLength(2);
    expect(r.findByRecord('rec-2')).toHaveLength(1);
  });
});

// ── findByType() ─────────────────────────────────────────────────────────────
describe('NetworkSignalStorageRepository.findByType()', () => {
  it('returns [] when no signals match type', () => {
    const r = makeRepo();
    r.save(makeSignal({ signalType: 'SLEEP' }));
    expect(r.findByType('PAIN')).toHaveLength(0);
  });

  it('returns only signals of the specified type', () => {
    const r = makeRepo();
    r.save(makeSignal({ signalType: 'PAIN' }));
    r.save(makeSignal({ signalType: 'SLEEP' }));
    r.save(makeSignal({ signalType: 'PAIN' }));
    expect(r.findByType('PAIN')).toHaveLength(2);
    expect(r.findByType('SLEEP')).toHaveLength(1);
  });
});

// ── clearCache() ──────────────────────────────────────────────────────────────
describe('NetworkSignalStorageRepository.clearCache()', () => {
  it('removes all persisted signals', () => {
    const r = makeRepo();
    r.save(makeSignal());
    r.save(makeSignal());
    r.clearCache();
    expect(r.count).toBe(0);
    expect(r.findAll()).toHaveLength(0);
  });

  it('is idempotent — calling twice does not throw', () => {
    const r = makeRepo();
    expect(() => { r.clearCache(); r.clearCache(); }).not.toThrow();
  });
});

// ── count ────────────────────────────────────────────────────────────────────
describe('NetworkSignalStorageRepository.count', () => {
  it('starts at 0', () => {
    expect(makeRepo().count).toBe(0);
  });

  it('increments with each save', () => {
    const r = makeRepo();
    r.save(makeSignal());
    r.save(makeSignal());
    expect(r.count).toBe(2);
  });

  it('resets to 0 after clearCache', () => {
    const r = makeRepo();
    r.saveMany([makeSignal(), makeSignal()]);
    r.clearCache();
    expect(r.count).toBe(0);
  });
});

// ── DI isolation ──────────────────────────────────────────────────────────────
describe('NetworkSignalStorageRepository — DI isolation', () => {
  it('two instances with different storage are independent', () => {
    const s1 = makeStorage();
    const s2 = makeStorage();
    const r1 = makeRepo(s1);
    const r2 = makeRepo(s2);
    r1.save(makeSignal());
    expect(r2.count).toBe(0);
  });
});
