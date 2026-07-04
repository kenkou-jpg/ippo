// tests/network-domain/network-signal-supabase-append-only.test.js
// Append-Only structural enforcement for Supabase backend (PR-042)
import { describe, it, expect } from 'vitest';
import { NetworkSignalSupabaseRepository } from '../../src/domains/network/network-signal-supabase-repository.js';
import { SupabaseEventPersistenceRepository } from '../../src/infrastructure/supabase-event-persistence-repository.js';
import { buildNetworkSignal }              from '../../src/domains/network/network-signal-entity.js';

describe('NetworkSignalSupabaseRepository — Append-Only structural guarantee (BD-022 / AP-02)', () => {
  const MUTATION_METHODS = ['delete', 'update', 'remove', 'clear', 'reset', 'upsert', 'put', 'set'];

  for (const method of MUTATION_METHODS) {
    it(`has no ${method}() method`, () => {
      const repo = new NetworkSignalSupabaseRepository({});
      expect((repo)[method]).toBeUndefined();
    });
  }

  it('findAll returns a defensive copy (external mutations do not affect internal state)', () => {
    const repo = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const s    = buildNetworkSignal({ signalType: 'PAIN', normalizedValue: 0.5, rawValue: 5, unit: 'u' });
    repo.append(s);
    const copy = repo.findAll();
    copy.length = 0;
    expect(repo.count).toBe(1);
  });

  it('append preserves immutability of signal objects', () => {
    const repo   = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const signal = buildNetworkSignal({ signalType: 'SLEEP', normalizedValue: 0.8, rawValue: 6, unit: 'h' });
    repo.append(signal);
    expect(Object.isFrozen(repo.findAll()[0])).toBe(true);
  });
});

describe('SupabaseEventPersistenceRepository — Append-Only structural guarantee (BD-017 / BD-021)', () => {
  const MUTATION_METHODS = ['delete', 'update', 'remove', 'clear', 'reset', 'upsert', 'put', 'set'];

  for (const method of MUTATION_METHODS) {
    it(`has no ${method}() method`, () => {
      const repo = new SupabaseEventPersistenceRepository({});
      expect((repo)[method]).toBeUndefined();
    });
  }

  it('findAll returns a defensive copy', () => {
    const repo  = new SupabaseEventPersistenceRepository({ supabaseClient: null });
    const event = { eventId: 'e1', eventType: 'SIGNAL_CREATED', aggregateId: 'a1' };
    repo.append(event);
    const copy = repo.findAll();
    copy.length = 0;
    expect(repo.count).toBe(1);
  });
});
