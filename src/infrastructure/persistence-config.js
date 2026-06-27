// persistence-config.js — Wave2 Persistence Configuration Constants.
// Defines which backend each domain repository uses.
// BD-034: All Wave2 persistence targets Supabase — this config drives the migration.
// BD-041: PR ordering enforced — backend defaults to 'memory' until PR-042 lands.
// PR-041: NetworkSignal Persistence Migration (Wave2 Phase A-1)

/**
 * Available persistence backends.
 * @readonly
 */
export const PERSISTENCE_BACKEND = Object.freeze({
  MEMORY:   'memory',   // in-memory, session-scoped (Wave2 Phase A-1 default)
  SUPABASE: 'supabase', // Supabase PostgreSQL (Wave2 Phase A-2 / PR-042)
});

/**
 * Repository configuration per domain.
 * Switch `backend` from 'memory' to 'supabase' when the Supabase adapter is ready (PR-042).
 * @readonly
 */
export const PERSISTENCE_CONFIG = Object.freeze({
  networkSignal: Object.freeze({
    /** Active backend. PR-042 will change this to PERSISTENCE_BACKEND.SUPABASE. */
    backend:            PERSISTENCE_BACKEND.MEMORY,
    /** Whether to ingest Wave1 localStorage data on initialize(). */
    migrateFromStorage: true,
    /** Storage key used by the Wave1 NetworkSignalStorageRepository (PR-033). */
    storageKey:         'ippo_network_signals_v1',
  }),
});
