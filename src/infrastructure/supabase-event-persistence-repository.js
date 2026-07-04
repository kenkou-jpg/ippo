// supabase-event-persistence-repository.js — Wave2 Event Store (PR-042).
// Persists domain events to the `ippo_events` Supabase table.
//
// Design:
//   Append-Only Event Store with Write-Through Local Cache.
//   All sync reads use local cache; Supabase INSERTs are fire-and-forget.
//
// BD-015: All domain events are replayable (ippo_events is the persistent store).
// BD-017: ippo_events rows are immutable once written — no UPDATE/DELETE.
// BD-021: Append-Only — no delete() method.
// BD-034: Wave2 persistence targets Supabase.
// AP-02:  Append-Only enforced structurally.
// PR-042: Supabase Event Store Foundation (Wave2 Phase A-2)

export class SupabaseEventPersistenceRepository {
  /** @type {object|null} */
  #supabaseClient;

  /** Local cache — all domain events appended in this session. */
  #cache = [];

  static #TABLE = 'ippo_events';

  /**
   * @param {{ supabaseClient: object|null }} deps
   *   supabaseClient — null triggers graceful degradation (cache-only mode).
   */
  constructor({ supabaseClient } = {}) {
    this.#supabaseClient = supabaseClient ?? null;
  }

  // ── Public API (Append-Only) ────────────────────────────────────────────────

  /**
   * Append a domain event.
   * Writes to local cache synchronously; fires async Supabase INSERT (best-effort).
   *
   * @param {object} event — Domain event with at least { eventType, aggregateId, occurredAt }.
   * @returns {object} The same event object.
   */
  append(event) {
    this.#cache = [...this.#cache, event];
    this.#persistEvent(event); // fire-and-forget
    return event;
  }

  /**
   * Return all events in the local cache.
   * @returns {object[]}
   */
  findAll() {
    return [...this.#cache];
  }

  /**
   * Return all events for a given aggregate ID.
   * @param {string} aggregateId
   * @returns {object[]}
   */
  findByAggregateId(aggregateId) {
    return this.#cache.filter(e => e.aggregateId === aggregateId);
  }

  /**
   * Return all events of a given type.
   * @param {string} eventType
   * @returns {object[]}
   */
  findByType(eventType) {
    return this.#cache.filter(e => e.eventType === eventType);
  }

  /** Total events in local cache. @returns {number} */
  get count() {
    return this.#cache.length;
  }

  // ── Startup warm-up ─────────────────────────────────────────────────────────

  /**
   * Load persisted events from Supabase into the local cache.
   * Call once at startup after authentication is confirmed.
   *
   * @returns {Promise<{ loaded: number, error?: string }>}
   */
  async warmCache() {
    if (!this.#supabaseClient) return { loaded: 0 };
    try {
      const { data: { session } } = await this.#supabaseClient.auth.getSession();
      if (!session?.user?.id) return { loaded: 0 };

      const { data, error } = await this.#supabaseClient
        .from(SupabaseEventPersistenceRepository.#TABLE)
        .select('payload')
        .order('occurred_at', { ascending: true });

      if (error) {
        console.warn('[SupabaseEventPersistenceRepository] warmCache failed:', error.message);
        return { loaded: 0, error: error.message };
      }

      const remoteEvents = (data ?? []).map(r => r.payload).filter(Boolean);
      const cacheIds     = new Set(this.#cache.map(e => e.eventId ?? e.id));
      const newFromRemote = remoteEvents.filter(e => !cacheIds.has(e.eventId ?? e.id));
      this.#cache = [...newFromRemote, ...this.#cache];

      return { loaded: newFromRemote.length };
    } catch (err) {
      console.warn('[SupabaseEventPersistenceRepository] warmCache error:', err?.message ?? err);
      return { loaded: 0, error: String(err?.message ?? err) };
    }
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  /**
   * Fire-and-forget Supabase INSERT for a domain event.
   * Failures are logged but do not affect local cache (which is authoritative).
   *
   * @param {object} event
   */
  async #persistEvent(event) {
    if (!this.#supabaseClient) return;
    try {
      const { error } = await this.#supabaseClient
        .from(SupabaseEventPersistenceRepository.#TABLE)
        .insert({
          event_type:   event.eventType,
          aggregate_id: event.aggregateId,
          payload:      event,
          occurred_at:  event.occurredAt ?? new Date().toISOString(),
        });

      if (error) {
        console.warn(
          '[SupabaseEventPersistenceRepository] INSERT failed (local cache preserved):',
          error.message
        );
      }
    } catch (err) {
      console.warn(
        '[SupabaseEventPersistenceRepository] #persistEvent error (best-effort):',
        err?.message ?? err
      );
    }
  }
}
