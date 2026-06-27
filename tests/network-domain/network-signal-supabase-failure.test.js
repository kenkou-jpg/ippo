// tests/network-domain/network-signal-supabase-failure.test.js
// Graceful Failure — Supabase connection errors (PR-042)
import { describe, it, expect, vi } from 'vitest';
import { NetworkSignalSupabaseRepository } from '../../src/domains/network/network-signal-supabase-repository.js';
import { SupabaseEventPersistenceRepository } from '../../src/infrastructure/supabase-event-persistence-repository.js';
import { buildNetworkSignal }              from '../../src/domains/network/network-signal-entity.js';

function makeFailingClient(reason = 'network error') {
  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockRejectedValue(new Error(reason)),
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockRejectedValue(new Error(reason)),
    }),
    auth: {
      getSession: vi.fn().mockRejectedValue(new Error(reason)),
    },
  };
}

function makeSignal() {
  return buildNetworkSignal({ signalType: 'PAIN', normalizedValue: 0.5, rawValue: 5, unit: 'u' });
}

describe('NetworkSignalSupabaseRepository — graceful failure', () => {
  it('append does not throw when Supabase INSERT fails (best-effort)', async () => {
    const repo = new NetworkSignalSupabaseRepository({ supabaseClient: makeFailingClient() });
    expect(() => repo.append(makeSignal())).not.toThrow();
    await new Promise(r => setTimeout(r, 10));
    expect(repo.count).toBe(1);
  });

  it('local cache is preserved when Supabase INSERT throws', async () => {
    const repo = new NetworkSignalSupabaseRepository({ supabaseClient: makeFailingClient() });
    repo.append(makeSignal());
    repo.append(makeSignal());
    await new Promise(r => setTimeout(r, 10));
    expect(repo.count).toBe(2);
    expect(repo.findAll()).toHaveLength(2);
  });

  it('warmCache returns error descriptor when Supabase throws', async () => {
    const repo   = new NetworkSignalSupabaseRepository({ supabaseClient: makeFailingClient() });
    const result = await repo.warmCache();
    expect(result.loaded).toBe(0);
    expect(result.error).toBeDefined();
  });

  it('reads (findAll, findByType, findByRecord) still work with failed Supabase', async () => {
    const repo = new NetworkSignalSupabaseRepository({ supabaseClient: makeFailingClient() });
    repo.append(buildNetworkSignal({ signalType: 'SLEEP', normalizedValue: 0.8, rawValue: 8, unit: 'h', recordId: 'r1' }));
    await new Promise(r => setTimeout(r, 10));
    expect(repo.findAll()).toHaveLength(1);
    expect(repo.findByType('SLEEP')).toHaveLength(1);
    expect(repo.findByRecord('r1')).toHaveLength(1);
  });
});

describe('SupabaseEventPersistenceRepository — graceful failure', () => {
  it('append does not throw when Supabase INSERT fails', async () => {
    const repo  = new SupabaseEventPersistenceRepository({ supabaseClient: makeFailingClient() });
    const event = { eventId: 'e1', eventType: 'SIGNAL_CREATED', aggregateId: 'a1', occurredAt: new Date().toISOString() };
    expect(() => repo.append(event)).not.toThrow();
    await new Promise(r => setTimeout(r, 10));
    expect(repo.count).toBe(1);
  });

  it('warmCache returns error descriptor when Supabase throws', async () => {
    const repo   = new SupabaseEventPersistenceRepository({ supabaseClient: makeFailingClient() });
    const result = await repo.warmCache();
    expect(result.loaded).toBe(0);
    expect(result.error).toBeDefined();
  });
});
