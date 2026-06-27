// tests/network-domain/network-signal-supabase-performance.test.js
// Performance: 1000+ signals in NetworkSignalSupabaseRepository (PR-042)
import { describe, it, expect } from 'vitest';
import { NetworkSignalSupabaseRepository } from '../../src/domains/network/network-signal-supabase-repository.js';
import { buildNetworkSignal }              from '../../src/domains/network/network-signal-entity.js';

function makeSignals(count) {
  return Array.from({ length: count }, (_, i) =>
    buildNetworkSignal({
      signalType:      ['PAIN', 'SLEEP', 'FATIGUE', 'SYMPTOM', 'MOOD', 'MENSTRUAL'][i % 6],
      normalizedValue: Math.random(),
      rawValue:        i,
      unit:            'unit',
      recordId:        `rec_${Math.floor(i / 10)}`,
    })
  );
}

describe('NetworkSignalSupabaseRepository — performance (1000+ signals)', () => {
  it('append 1000 signals in under 100ms (local cache is O(1) per append)', () => {
    const repo    = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const signals = makeSignals(1000);
    const start   = performance.now();
    for (const s of signals) repo.append(s);
    const elapsed = performance.now() - start;
    expect(repo.count).toBe(1000);
    expect(elapsed).toBeLessThan(100);
  });

  it('findAll with 1000 signals returns all records', () => {
    const repo    = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const signals = makeSignals(1000);
    for (const s of signals) repo.append(s);
    const all = repo.findAll();
    expect(all).toHaveLength(1000);
  });

  it('findByType on 1000 signals is fast (under 50ms)', () => {
    const repo    = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const signals = makeSignals(1000);
    for (const s of signals) repo.append(s);
    const start   = performance.now();
    const pains   = repo.findByType('PAIN');
    const elapsed = performance.now() - start;
    expect(pains.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
  });

  it('findByRecord on 1000 signals is fast (under 50ms)', () => {
    const repo    = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const signals = makeSignals(1000);
    for (const s of signals) repo.append(s);
    const start   = performance.now();
    const byRec   = repo.findByRecord('rec_0');
    const elapsed = performance.now() - start;
    expect(byRec.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
  });

  it('append 5000 signals in under 500ms', () => {
    const repo    = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const signals = makeSignals(5000);
    const start   = performance.now();
    for (const s of signals) repo.append(s);
    const elapsed = performance.now() - start;
    expect(repo.count).toBe(5000);
    expect(elapsed).toBeLessThan(500);
  });
});
