// tests/network-domain/network-signal-repository.test.js
// NetworkSignalRepository — in-memory stub (PR-030)
import { describe, it, expect, beforeEach } from 'vitest';
import { NetworkSignalRepository } from '../../src/domains/network/network-signal-repository.js';
import { buildNetworkSignal }       from '../../src/domains/network/network-signal-entity.js';

function repo() { return new NetworkSignalRepository(); }

function makeSignal(overrides = {}) {
  return buildNetworkSignal({
    signalType:      'SYMPTOM',
    normalizedValue: 0.5,
    rawValue:        5,
    unit:            'severity_0_10',
    ...overrides,
  });
}

describe('NetworkSignalRepository.append', () => {
  it('returns the appended signal', () => {
    const r = repo();
    const s = makeSignal();
    expect(r.append(s)).toBe(s);
  });

  it('increments count after append', () => {
    const r = repo();
    expect(r.count).toBe(0);
    r.append(makeSignal());
    expect(r.count).toBe(1);
    r.append(makeSignal());
    expect(r.count).toBe(2);
  });
});

describe('NetworkSignalRepository.findAll', () => {
  it('returns [] when empty', () => {
    expect(repo().findAll()).toHaveLength(0);
  });

  it('returns all appended signals', () => {
    const r = repo();
    r.append(makeSignal());
    r.append(makeSignal({ signalType: 'PAIN' }));
    expect(r.findAll()).toHaveLength(2);
  });

  it('returns a copy (not the internal array)', () => {
    const r = repo();
    const a = r.findAll();
    a.push(makeSignal());
    expect(r.findAll()).toHaveLength(0);
  });
});

describe('NetworkSignalRepository.findByRecord', () => {
  it('returns only signals with matching recordId', () => {
    const r = repo();
    r.append(makeSignal({ recordId: 'rec_A' }));
    r.append(makeSignal({ recordId: 'rec_A' }));
    r.append(makeSignal({ recordId: 'rec_B' }));
    expect(r.findByRecord('rec_A')).toHaveLength(2);
    expect(r.findByRecord('rec_B')).toHaveLength(1);
    expect(r.findByRecord('rec_C')).toHaveLength(0);
  });

  it('returns [] when no match', () => {
    expect(repo().findByRecord('nonexistent')).toHaveLength(0);
  });
});

describe('NetworkSignalRepository.findByType', () => {
  it('returns only signals of the requested type', () => {
    const r = repo();
    r.append(makeSignal({ signalType: 'SYMPTOM' }));
    r.append(makeSignal({ signalType: 'SYMPTOM' }));
    r.append(makeSignal({ signalType: 'PAIN' }));
    expect(r.findByType('SYMPTOM')).toHaveLength(2);
    expect(r.findByType('PAIN')).toHaveLength(1);
    expect(r.findByType('SLEEP')).toHaveLength(0);
  });
});

describe('NetworkSignalRepository — immutability guarantee', () => {
  it('each instance has independent storage', () => {
    const r1 = repo();
    const r2 = repo();
    r1.append(makeSignal());
    expect(r2.count).toBe(0);
  });
});
