// tests/network-domain/persistent-network-signal-service.test.js
// PersistentNetworkSignalService — PR-033
import { describe, it, expect, beforeEach } from 'vitest';
import { PersistentNetworkSignalService }   from '../../src/domains/network/persistent-network-signal-service.js';
import { NetworkSignalRepository }          from '../../src/domains/network/network-signal-repository.js';
import { NetworkSignalStorageRepository }   from '../../src/domains/network/network-signal-storage-repository.js';
import { buildNetworkSignal }               from '../../src/domains/network/network-signal-entity.js';

class MockStorage {
  #data = {};
  get(key)        { return key in this.#data ? this.#data[key] : null; }
  set(key, value) { this.#data[key] = value; }
  remove(key)     { delete this.#data[key]; }
  has(key)        { return key in this.#data; }
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

function makeDeps() {
  const signalRepository  = new NetworkSignalRepository();
  const storageRepository = new NetworkSignalStorageRepository({ storage: new MockStorage() });
  return { signalRepository, storageRepository };
}

function makeSvc() {
  return new PersistentNetworkSignalService(makeDeps());
}

// ── Constructor ───────────────────────────────────────────────────────────────
describe('PersistentNetworkSignalService — constructor', () => {
  it('constructs with valid deps', () => {
    expect(() => makeSvc()).not.toThrow();
  });

  it('throws if signalRepository is missing', () => {
    const { storageRepository } = makeDeps();
    expect(() => new PersistentNetworkSignalService({ storageRepository })).toThrow('[PersistentNetworkSignalService]');
  });

  it('throws if storageRepository is missing', () => {
    const { signalRepository } = makeDeps();
    expect(() => new PersistentNetworkSignalService({ signalRepository })).toThrow('[PersistentNetworkSignalService]');
  });
});

// ── save() ────────────────────────────────────────────────────────────────────
describe('PersistentNetworkSignalService.save()', () => {
  it('returns the saved signal', () => {
    const svc = makeSvc();
    const s = makeSignal();
    expect(svc.save(s)).toBe(s);
  });

  it('persists to storage layer', () => {
    const svc = makeSvc();
    svc.save(makeSignal());
    expect(svc.findAll()).toHaveLength(1);
  });
});

// ── saveMany() ────────────────────────────────────────────────────────────────
describe('PersistentNetworkSignalService.saveMany()', () => {
  it('returns the saved signals', () => {
    const svc = makeSvc();
    const signals = [makeSignal(), makeSignal()];
    expect(svc.saveMany(signals)).toEqual(signals);
  });

  it('persists all signals', () => {
    const svc = makeSvc();
    svc.saveMany([makeSignal(), makeSignal(), makeSignal()]);
    expect(svc.findAll()).toHaveLength(3);
  });

  it('returns [] for empty array', () => {
    expect(makeSvc().saveMany([])).toEqual([]);
  });
});

// ── findAll() ────────────────────────────────────────────────────────────────
describe('PersistentNetworkSignalService.findAll()', () => {
  it('returns [] when nothing persisted', () => {
    expect(makeSvc().findAll()).toHaveLength(0);
  });

  it('returns all persisted signals', () => {
    const svc = makeSvc();
    svc.save(makeSignal());
    svc.save(makeSignal());
    expect(svc.findAll()).toHaveLength(2);
  });
});

// ── findByRecord() ────────────────────────────────────────────────────────────
describe('PersistentNetworkSignalService.findByRecord()', () => {
  it('returns [] when no match', () => {
    const svc = makeSvc();
    svc.save(makeSignal({ recordId: 'r1' }));
    expect(svc.findByRecord('r-other')).toHaveLength(0);
  });

  it('returns matching signals', () => {
    const svc = makeSvc();
    svc.save(makeSignal({ recordId: 'r1' }));
    svc.save(makeSignal({ recordId: 'r2' }));
    svc.save(makeSignal({ recordId: 'r1' }));
    expect(svc.findByRecord('r1')).toHaveLength(2);
  });
});

// ── findByType() ──────────────────────────────────────────────────────────────
describe('PersistentNetworkSignalService.findByType()', () => {
  it('returns [] when no match', () => {
    const svc = makeSvc();
    svc.save(makeSignal({ signalType: 'SLEEP' }));
    expect(svc.findByType('PAIN')).toHaveLength(0);
  });

  it('returns matching signals', () => {
    const svc = makeSvc();
    svc.save(makeSignal({ signalType: 'PAIN' }));
    svc.save(makeSignal({ signalType: 'SLEEP' }));
    expect(svc.findByType('PAIN')).toHaveLength(1);
  });
});

// ── clearCache() ──────────────────────────────────────────────────────────────
describe('PersistentNetworkSignalService.clearCache()', () => {
  it('clears all persisted signals', () => {
    const svc = makeSvc();
    svc.saveMany([makeSignal(), makeSignal()]);
    svc.clearCache();
    expect(svc.findAll()).toHaveLength(0);
  });

  it('is idempotent', () => {
    const svc = makeSvc();
    expect(() => { svc.clearCache(); svc.clearCache(); }).not.toThrow();
  });
});

// ── getPersistenceStatus() ────────────────────────────────────────────────────
describe('PersistentNetworkSignalService.getPersistenceStatus()', () => {
  let svc;
  beforeEach(() => { svc = makeSvc(); });

  it('returns an object', () => {
    expect(typeof svc.getPersistenceStatus()).toBe('object');
  });

  it('reports layer as storage-abstraction', () => {
    expect(svc.getPersistenceStatus().layer).toBe('storage-abstraction');
  });

  it('reports bd022Compliant:true', () => {
    expect(svc.getPersistenceStatus().bd022Compliant).toBe(true);
  });

  it('reports persistedCount:0 initially', () => {
    expect(svc.getPersistenceStatus().persistedCount).toBe(0);
  });

  it('reports persistedCount after save', () => {
    svc.save(makeSignal());
    expect(svc.getPersistenceStatus().persistedCount).toBe(1);
  });

  it('reports inMemoryCount:0 (in-mem not synced by PersistentService)', () => {
    expect(svc.getPersistenceStatus().inMemoryCount).toBe(0);
  });

  it('includes storageKey', () => {
    expect(svc.getPersistenceStatus().storageKey).toBe('ippo_network_signals_v1');
  });

  it('includes wave note', () => {
    expect(svc.getPersistenceStatus().wave).toMatch(/Wave1/);
  });
});
