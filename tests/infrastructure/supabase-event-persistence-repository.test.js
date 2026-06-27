// tests/infrastructure/supabase-event-persistence-repository.test.js
// SupabaseEventPersistenceRepository — Wave2 Event Store (PR-042)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseEventPersistenceRepository } from '../../src/infrastructure/supabase-event-persistence-repository.js';

function makeSupabaseClient({ insertError = null, selectData = [], userId = 'u1' } = {}) {
  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: [{}], error: insertError }),
      select: vi.fn().mockReturnThis(),
      order:  vi.fn().mockResolvedValue({ data: selectData, error: null }),
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: userId ? { user: { id: userId } } : null },
      }),
    },
  };
}

function makeEvent(overrides = {}) {
  return {
    eventId:      `evt_${Date.now()}_${Math.random()}`,
    eventType:    'SIGNAL_CREATED',
    aggregateId:  'sig_001',
    aggregateType: 'SIGNAL',
    occurredAt:   new Date().toISOString(),
    payload:      { signalType: 'PAIN' },
    ...overrides,
  };
}

// ── Append-Only guarantee ─────────────────────────────────────────────────────

describe('SupabaseEventPersistenceRepository — Append-Only', () => {
  it('has no delete() method', () => {
    const repo = new SupabaseEventPersistenceRepository({});
    expect(typeof repo.delete).toBe('undefined');
  });

  it('has no update() method', () => {
    const repo = new SupabaseEventPersistenceRepository({});
    expect(typeof repo.update).toBe('undefined');
  });
});

// ── Local cache (sync) ────────────────────────────────────────────────────────

describe('SupabaseEventPersistenceRepository — local cache', () => {
  let repo;
  beforeEach(() => { repo = new SupabaseEventPersistenceRepository({ supabaseClient: null }); });

  it('starts empty', () => {
    expect(repo.count).toBe(0);
    expect(repo.findAll()).toHaveLength(0);
  });

  it('append returns the event', () => {
    const event  = makeEvent();
    const result = repo.append(event);
    expect(result).toBe(event);
  });

  it('append increments count', () => {
    repo.append(makeEvent());
    repo.append(makeEvent());
    expect(repo.count).toBe(2);
  });

  it('findAll returns all events', () => {
    repo.append(makeEvent({ eventType: 'SIGNAL_CREATED' }));
    repo.append(makeEvent({ eventType: 'RECORD_CREATED' }));
    expect(repo.findAll()).toHaveLength(2);
  });

  it('findAll returns a defensive copy', () => {
    repo.append(makeEvent());
    const all = repo.findAll();
    all.push({ fake: true });
    expect(repo.findAll()).toHaveLength(1);
  });

  it('findByType filters correctly', () => {
    repo.append(makeEvent({ eventType: 'SIGNAL_CREATED' }));
    repo.append(makeEvent({ eventType: 'SIGNAL_CREATED' }));
    repo.append(makeEvent({ eventType: 'RECORD_CREATED' }));
    expect(repo.findByType('SIGNAL_CREATED')).toHaveLength(2);
    expect(repo.findByType('RECORD_CREATED')).toHaveLength(1);
  });

  it('findByAggregateId filters correctly', () => {
    repo.append(makeEvent({ aggregateId: 'agg_1' }));
    repo.append(makeEvent({ aggregateId: 'agg_2' }));
    repo.append(makeEvent({ aggregateId: 'agg_1' }));
    expect(repo.findByAggregateId('agg_1')).toHaveLength(2);
    expect(repo.findByAggregateId('agg_2')).toHaveLength(1);
  });
});

// ── Graceful degradation ──────────────────────────────────────────────────────

describe('SupabaseEventPersistenceRepository — graceful degradation', () => {
  it('works without supabaseClient (cache-only)', () => {
    const repo = new SupabaseEventPersistenceRepository({ supabaseClient: null });
    expect(() => repo.append(makeEvent())).not.toThrow();
    expect(repo.count).toBe(1);
  });

  it('warmCache returns { loaded: 0 } without client', async () => {
    const repo = new SupabaseEventPersistenceRepository({});
    const r = await repo.warmCache();
    expect(r).toEqual({ loaded: 0 });
  });
});

// ── Supabase INSERT ───────────────────────────────────────────────────────────

describe('SupabaseEventPersistenceRepository — Supabase INSERT', () => {
  it('fires INSERT to ippo_events table', async () => {
    const client = makeSupabaseClient();
    const repo   = new SupabaseEventPersistenceRepository({ supabaseClient: client });
    repo.append(makeEvent({ eventType: 'SIGNAL_CREATED' }));
    await new Promise(r => setTimeout(r, 0));
    expect(client.from).toHaveBeenCalledWith('ippo_events');
  });

  it('does not throw if INSERT fails (best-effort)', async () => {
    const client = makeSupabaseClient({ insertError: { message: 'rls error' } });
    const repo   = new SupabaseEventPersistenceRepository({ supabaseClient: client });
    repo.append(makeEvent());
    await new Promise(r => setTimeout(r, 0));
    expect(repo.count).toBe(1); // local cache preserved
  });
});

// ── warmCache ────────────────────────────────────────────────────────────────

describe('SupabaseEventPersistenceRepository — warmCache', () => {
  it('loads events from Supabase', async () => {
    const event  = makeEvent({ eventType: 'SIGNAL_CREATED' });
    const client = makeSupabaseClient({ selectData: [{ payload: event }] });
    const repo   = new SupabaseEventPersistenceRepository({ supabaseClient: client });
    const result = await repo.warmCache();
    expect(result.loaded).toBe(1);
    expect(repo.count).toBe(1);
  });

  it('returns { loaded: 0 } when not authenticated', async () => {
    const client = makeSupabaseClient({ userId: null });
    const repo   = new SupabaseEventPersistenceRepository({ supabaseClient: client });
    const result = await repo.warmCache();
    expect(result.loaded).toBe(0);
  });
});
