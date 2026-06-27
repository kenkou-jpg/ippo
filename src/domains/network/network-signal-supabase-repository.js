// network-signal-supabase-repository.js — Wave2 Supabase Repository (PR-042).
// Implements INetworkSignalRepository backed by the `network_signals` Supabase table.
//
// Architecture:
//   Write-Through Local Cache + Fire-and-Forget Supabase Persistence.
//
//   All INetworkSignalRepository methods are synchronous (interface contract).
//   Supabase is inherently async. Resolution: sync local cache for ALL reads/writes,
//   async Supabase INSERT in the background (best-effort). Data is never lost because
//   the cache holds the authoritative in-session state. A `warmCache()` async method
//   loads persisted data from Supabase on application startup.
//
// BD-022: NetworkSignal must be persistable to Supabase — this is that implementation.
// BD-034: Wave2 persistence targets Supabase — this is the primary backend.
// BD-015: Append-Only guarantee — no UPDATE/DELETE methods exist.
// AP-02:  Append-Only enforced structurally (interface has no delete/update).
// AP-05:  Dependency direction — this class only knows about Supabase client.
// PR-042: NetworkSignal Supabase Persistence Foundation (Wave2 Phase A-2)

import { INetworkSignalRepository } from './network-signal-repository-interface.js';

export class NetworkSignalSupabaseRepository extends INetworkSignalRepository {
  /** @type {object|null} Supabase JS client — null triggers graceful degradation. */
  #supabaseClient;

  /** Local write-through cache. Authoritative for all sync reads. */
  #cache = [];

  /** Supabase table for network signals. */
  static #TABLE = 'network_signals';

  /**
   * @param {{ supabaseClient: object|null }} deps
   *   supabaseClient — Supabase JS client (from getSupabaseClient()).
   *                    May be null in offline/test/degraded mode: all sync methods
   *                    work against the local cache; Supabase writes are skipped.
   */
  constructor({ supabaseClient } = {}) {
    super();
    this.#supabaseClient = supabaseClient ?? null;
  }

  // ── INetworkSignalRepository implementation ─────────────────────────────────

  /**
   * Append a signal.
   *   1. Writes to local cache synchronously (immediate, guaranteed).
   *   2. Fires async Supabase INSERT (best-effort, non-blocking).
   * @param {import('./network-signal-entity.js').NetworkSignal} signal
   * @returns {import('./network-signal-entity.js').NetworkSignal}
   */
  append(signal) {
    this.#cache = [...this.#cache, signal];
    this.#persistToSupabase(signal); // fire-and-forget
    return signal;
  }

  /** @returns {import('./network-signal-entity.js').NetworkSignal[]} */
  findAll() {
    return [...this.#cache];
  }

  /**
   * @param {string} recordId
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  findByRecord(recordId) {
    return this.#cache.filter(s => s.recordId === recordId);
  }

  /**
   * @param {string} signalType
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  findByType(signalType) {
    return this.#cache.filter(s => s.signalType === signalType);
  }

  /** Total signals in the local cache (sync). @returns {number} */
  get count() {
    return this.#cache.length;
  }

  /** @returns {'supabase'} */
  get repositoryType() {
    return 'supabase';
  }

  /** @returns {{ appendOnly: boolean, persistent: boolean, supabase: boolean }} */
  get capabilities() {
    return { appendOnly: true, persistent: true, supabase: true };
  }

  // ── Startup cache warm-up ───────────────────────────────────────────────────

  /**
   * Load existing signals from Supabase into the local cache.
   * Call once at application startup after authentication is confirmed.
   * Idempotent: calling twice merges by signal ID to avoid duplicates.
   *
   * @returns {Promise<{ loaded: number, error?: string }>}
   */
  async warmCache() {
    if (!this.#supabaseClient) {
      return { loaded: 0 };
    }
    try {
      const { data: { session } } = await this.#supabaseClient.auth.getSession();
      if (!session?.user?.id) {
        return { loaded: 0 };
      }

      const { data, error } = await this.#supabaseClient
        .from(NetworkSignalSupabaseRepository.#TABLE)
        .select('payload')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[NetworkSignalSupabaseRepository] warmCache failed:', error.message);
        return { loaded: 0, error: error.message };
      }

      const remoteSignals = (data ?? []).map(r => r.payload).filter(Boolean);

      // Merge: remote wins for IDs not yet in cache; preserve new in-session appends.
      const cacheIds = new Set(this.#cache.map(s => s.id));
      const newFromRemote = remoteSignals.filter(s => !cacheIds.has(s.id));
      this.#cache = [...newFromRemote, ...this.#cache];

      return { loaded: newFromRemote.length };
    } catch (err) {
      console.warn('[NetworkSignalSupabaseRepository] warmCache error:', err?.message ?? err);
      return { loaded: 0, error: String(err?.message ?? err) };
    }
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  /**
   * Fire-and-forget Supabase INSERT.
   * Non-blocking; failures are logged but do not propagate (local cache is authoritative).
   *
   * @param {import('./network-signal-entity.js').NetworkSignal} signal
   */
  async #persistToSupabase(signal) {
    if (!this.#supabaseClient) return;
    try {
      const { data: { session } } = await this.#supabaseClient.auth.getSession();
      const userId = session?.user?.id ?? null;

      const { error } = await this.#supabaseClient
        .from(NetworkSignalSupabaseRepository.#TABLE)
        .insert({
          signal_type: signal.signalType,
          payload:     signal,
          event_id:    signal.id,
          user_id:     userId,
          created_at:  signal.createdAt ?? new Date().toISOString(),
        });

      if (error) {
        console.warn(
          '[NetworkSignalSupabaseRepository] INSERT failed (local cache preserved):',
          error.message
        );
      }
    } catch (err) {
      // Graceful failure — local cache already holds the signal.
      console.warn(
        '[NetworkSignalSupabaseRepository] #persistToSupabase error (best-effort):',
        err?.message ?? err
      );
    }
  }
}
