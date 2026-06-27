// tests/network-domain/network-signal-memory-repository.test.js
// NetworkSignalMemoryRepository — Wave2 in-memory adapter (PR-041)
import { describe, it, expect, beforeEach } from 'vitest';
import { NetworkSignalMemoryRepository } from '../../src/domains/network/network-signal-memory-repository.js';
import { INetworkSignalRepository }       from '../../src/domains/network/network-signal-repository-interface.js';
import { buildNetworkSignal }             from '../../src/domains/network/network-signal-entity.js';

function makeRepo() { return new NetworkSignalMemoryRepository(); }

function makeSignal(overrides = {}) {
  return buildNetworkSignal({
    signalType:      'SYMPTOM',
    normalizedValue: 0.5,
    rawValue:        5,
    unit:            'severity_0_10',
    ...overrides,
  });
}

describe('NetworkSignalMemoryRepository — extends INetworkSignalRepository', () => {
  it('is an instance of INetworkSignalRepository', () => {
    expect(makeRepo()).toBeInstanceOf(INetworkSignalRepository);
  });

  it('repositoryType is "memory"', () => {
    expect(makeRepo().repositoryType).toBe('memory');
  });

  it('capabilities reports appendOnly:true, persistent:false, supabase:false', () => {
    expect(makeRepo().capabilities).toEqual({
      appendOnly: true, persistent: false, supabase: false,
    });
  });
});

describe('NetworkSignalMemoryRepository.append', () => {
  it('returns the appended signal', () => {
    const r = makeRepo();
    const s = makeSignal();
    expect(r.append(s)).toBe(s);
  });

  it('increments count after each append', () => {
    const r = makeRepo();
    expect(r.count).toBe(0);
    r.append(makeSignal());
    expect(r.count).toBe(1);
    r.append(makeSignal({ signalType: 'PAIN' }));
    expect(r.count).toBe(2);
  });
});

describe('NetworkSignalMemoryRepository.findAll', () => {
  it('returns [] when empty', () => {
    expect(makeRepo().findAll()).toHaveLength(0);
  });

  it('returns all appended signals', () => {
    const r = makeRepo();
    r.append(makeSignal());
    r.append(makeSignal({ signalType: 'PAIN' }));
    expect(r.findAll()).toHaveLength(2);
  });

  it('returns a defensive copy — mutation does not affect internal state', () => {
    const r = makeRepo();
    const arr = r.findAll();
    arr.push(makeSignal());
    expect(r.findAll()).toHaveLength(0);
  });
});

describe('NetworkSignalMemoryRepository.findByRecord', () => {
  it('returns only signals matching the given recordId', () => {
    const r = makeRepo();
    r.append(makeSignal({ recordId: 'rec_A' }));
    r.append(makeSignal({ recordId: 'rec_A' }));
    r.append(makeSignal({ recordId: 'rec_B' }));
    expect(r.findByRecord('rec_A')).toHaveLength(2);
    expect(r.findByRecord('rec_B')).toHaveLength(1);
    expect(r.findByRecord('rec_C')).toHaveLength(0);
  });
});

describe('NetworkSignalMemoryRepository.findByType', () => {
  it('returns only signals of the requested type', () => {
    const r = makeRepo();
    r.append(makeSignal({ signalType: 'SYMPTOM' }));
    r.append(makeSignal({ signalType: 'SYMPTOM' }));
    r.append(makeSignal({ signalType: 'PAIN' }));
    expect(r.findByType('SYMPTOM')).toHaveLength(2);
    expect(r.findByType('PAIN')).toHaveLength(1);
    expect(r.findByType('SLEEP')).toHaveLength(0);
  });
});

describe('NetworkSignalMemoryRepository — instance isolation', () => {
  it('separate instances do not share state', () => {
    const r1 = makeRepo();
    const r2 = makeRepo();
    r1.append(makeSignal());
    expect(r2.count).toBe(0);
  });
});

describe('NetworkSignalMemoryRepository — append-only (no delete/update)', () => {
  it('has no delete() method', () => {
    expect(typeof makeRepo().delete).toBe('undefined');
  });

  it('has no update() method', () => {
    expect(typeof makeRepo().update).toBe('undefined');
  });
});
