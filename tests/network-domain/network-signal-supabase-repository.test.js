// tests/network-domain/network-signal-supabase-repository.test.js
// NetworkSignalSupabaseRepository — Wave2 Phase A-2 (PR-042)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NetworkSignalSupabaseRepository } from '../../src/domains/network/network-signal-supabase-repository.js';
import { INetworkSignalRepository }         from '../../src/domains/network/network-signal-repository-interface.js';
import { buildNetworkSignal }               from '../../src/domains/network/network-signal-entity.js';

// ── Mock Supabase client ──────────────────────────────────────────────────────

function makeSupabaseClient({ insertError = null, selectData = [], userId = 'u1' } = {}) {
  const from = vi.fn().mockReturnValue({
    insert: vi.fn().mockReturnValue(
      Promise.resolve({ data: [{}], error: insertError })
    ),
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnValue(
      Promise.resolve({ data: selectData, error: null })
    ),
  });
  return {
    from,
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: userId ? { user: { id: userId } } : null },
      }),
    },
  };
}

function makeSignal(overrides = {}) {
  return buildNetworkSignal({
    signalType: 'PAIN', normalizedValue: 0.5, rawValue: 5, unit: 'pain_level_0_10',
    ...overrides,
  });
}

// ── Interface compliance ──────────────────────────────────────────────────────

describe('NetworkSignalSupabaseRepository — interface compliance', () => {
  it('is an instance of INetworkSignalRepository', () => {
    const repo = new NetworkSignalSupabaseRepository({});
    expect(repo).toBeInstanceOf(INetworkSignalRepository);
  });

  it('repositoryType is "supabase"', () => {
    const repo = new NetworkSignalSupabaseRepository({});
    expect(repo.repositoryType).toBe('supabase');
  });

  it('capabilities.persistent is true', () => {
    const repo = new NetworkSignalSupabaseRepository({});
    expect(repo.capabilities.persistent).toBe(true);
  });

  it('capabilities.supabase is true', () => {
    const repo = new NetworkSignalSupabaseRepository({});
    expect(repo.capabilities.supabase).toBe(true);
  });

  it('capabilities.appendOnly is true', () => {
    const repo = new NetworkSignalSupabaseRepository({});
    expect(repo.capabilities.appendOnly).toBe(true);
  });
});

// ── Append-Only guarantee ─────────────────────────────────────────────────────

describe('NetworkSignalSupabaseRepository — Append-Only', () => {
  it('has no delete() method', () => {
    const repo = new NetworkSignalSupabaseRepository({});
    expect(typeof repo.delete).toBe('undefined');
  });

  it('has no update() method', () => {
    const repo = new NetworkSignalSupabaseRepository({});
    expect(typeof repo.update).toBe('undefined');
  });

  it('has no remove() method', () => {
    const repo = new NetworkSignalSupabaseRepository({});
    expect(typeof repo.remove).toBe('undefined');
  });
});

// ── Local cache — sync operations ────────────────────────────────────────────

describe('NetworkSignalSupabaseRepository — local cache (sync)', () => {
  let repo;
  beforeEach(() => { repo = new NetworkSignalSupabaseRepository({ supabaseClient: null }); });

  it('starts empty', () => {
    expect(repo.count).toBe(0);
    expect(repo.findAll()).toHaveLength(0);
  });

  it('append returns the signal synchronously', () => {
    const signal = makeSignal();
    const result = repo.append(signal);
    expect(result).toBe(signal);
  });

  it('append increments count', () => {
    repo.append(makeSignal({ signalType: 'PAIN' }));
    repo.append(makeSignal({ signalType: 'SLEEP' }));
    expect(repo.count).toBe(2);
  });

  it('findAll returns all appended signals', () => {
    const s1 = makeSignal({ signalType: 'PAIN' });
    const s2 = makeSignal({ signalType: 'SLEEP' });
    repo.append(s1);
    repo.append(s2);
    expect(repo.findAll()).toHaveLength(2);
  });

  it('findAll returns a copy (immutable externally)', () => {
    repo.append(makeSignal());
    const all = repo.findAll();
    all.push({ fake: true });
    expect(repo.findAll()).toHaveLength(1);
  });

  it('findByRecord filters by recordId', () => {
    repo.append(buildNetworkSignal({ signalType: 'PAIN', normalizedValue: 0.5, rawValue: 5, unit: 'u', recordId: 'r1' }));
    repo.append(buildNetworkSignal({ signalType: 'SLEEP', normalizedValue: 0.8, rawValue: 6, unit: 'u', recordId: 'r2' }));
    expect(repo.findByRecord('r1')).toHaveLength(1);
    expect(repo.findByRecord('r1')[0].signalType).toBe('PAIN');
  });

  it('findByType filters by signalType', () => {
    repo.append(makeSignal({ signalType: 'PAIN' }));
    repo.append(makeSignal({ signalType: 'PAIN' }));
    repo.append(makeSignal({ signalType: 'SLEEP' }));
    expect(repo.findByType('PAIN')).toHaveLength(2);
    expect(repo.findByType('SLEEP')).toHaveLength(1);
    expect(repo.findByType('UNKNOWN')).toHaveLength(0);
  });
});

// ── Graceful degradation (null supabaseClient) ────────────────────────────────

describe('NetworkSignalSupabaseRepository — graceful degradation (no client)', () => {
  it('append works without supabaseClient (cache-only mode)', () => {
    const repo = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const signal = makeSignal();
    expect(() => repo.append(signal)).not.toThrow();
    expect(repo.count).toBe(1);
  });

  it('warmCache returns { loaded: 0 } without supabaseClient', async () => {
    const repo = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    const result = await repo.warmCache();
    expect(result).toEqual({ loaded: 0 });
  });
});

// ── Supabase INSERT (fire-and-forget) ─────────────────────────────────────────

describe('NetworkSignalSupabaseRepository — Supabase INSERT', () => {
  it('fires Supabase INSERT when client is wired', async () => {
    const client = makeSupabaseClient();
    const repo   = new NetworkSignalSupabaseRepository({ supabaseClient: client });
    repo.append(makeSignal({ signalType: 'SLEEP' }));
    // Give the microtask queue a tick to run the async INSERT
    await new Promise(r => setTimeout(r, 0));
    expect(client.from).toHaveBeenCalledWith('network_signals');
  });

  it('does not throw if Supabase INSERT fails (best-effort)', async () => {
    const client = makeSupabaseClient({ insertError: { message: 'network error' } });
    const repo   = new NetworkSignalSupabaseRepository({ supabaseClient: client });
    repo.append(makeSignal());
    await new Promise(r => setTimeout(r, 0));
    expect(repo.count).toBe(1); // local cache preserved
  });
});

// ── warmCache ─────────────────────────────────────────────────────────────────

describe('NetworkSignalSupabaseRepository — warmCache', () => {
  it('loads signals from Supabase into cache', async () => {
    const signal = makeSignal({ signalType: 'FATIGUE' });
    const client = makeSupabaseClient({ selectData: [{ payload: signal }] });
    const repo   = new NetworkSignalSupabaseRepository({ supabaseClient: client });
    const result = await repo.warmCache();
    expect(result.loaded).toBe(1);
    expect(repo.findAll()).toHaveLength(1);
    expect(repo.findAll()[0].signalType).toBe('FATIGUE');
  });

  it('does not duplicate signals already in cache', async () => {
    const signal = makeSignal({ signalType: 'PAIN' });
    const client = makeSupabaseClient({ selectData: [{ payload: signal }] });
    const repo   = new NetworkSignalSupabaseRepository({ supabaseClient: client });
    repo.append(signal); // already in cache
    const result = await repo.warmCache();
    expect(result.loaded).toBe(0); // no duplicates
    expect(repo.count).toBe(1);
  });

  it('returns { loaded: 0 } when not authenticated', async () => {
    const client = makeSupabaseClient({ userId: null });
    const repo   = new NetworkSignalSupabaseRepository({ supabaseClient: client });
    const result = await repo.warmCache();
    expect(result.loaded).toBe(0);
  });
});
