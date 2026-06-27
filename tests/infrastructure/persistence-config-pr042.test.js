// tests/infrastructure/persistence-config-pr042.test.js
// PersistenceConfig — backend switched to 'supabase' in PR-042
import { describe, it, expect } from 'vitest';
import { PERSISTENCE_CONFIG, PERSISTENCE_BACKEND } from '../../src/infrastructure/persistence-config.js';

describe('PersistenceConfig — PR-042 Supabase switch', () => {
  it('networkSignal.backend is "supabase" (PR-042 default)', () => {
    expect(PERSISTENCE_CONFIG.networkSignal.backend).toBe(PERSISTENCE_BACKEND.SUPABASE);
  });

  it('PERSISTENCE_CONFIG is frozen (immutable)', () => {
    expect(Object.isFrozen(PERSISTENCE_CONFIG)).toBe(true);
    expect(Object.isFrozen(PERSISTENCE_CONFIG.networkSignal)).toBe(true);
  });

  it('migrateFromStorage is still true (Wave1 migration preserved)', () => {
    expect(PERSISTENCE_CONFIG.networkSignal.migrateFromStorage).toBe(true);
  });

  it('storageKey is still set (Wave1 localStorage key preserved)', () => {
    expect(PERSISTENCE_CONFIG.networkSignal.storageKey).toBe('ippo_network_signals_v1');
  });

  it('PERSISTENCE_BACKEND constants are frozen', () => {
    expect(Object.isFrozen(PERSISTENCE_BACKEND)).toBe(true);
  });

  it('PERSISTENCE_BACKEND.SUPABASE is "supabase"', () => {
    expect(PERSISTENCE_BACKEND.SUPABASE).toBe('supabase');
  });

  it('PERSISTENCE_BACKEND.MEMORY is "memory"', () => {
    expect(PERSISTENCE_BACKEND.MEMORY).toBe('memory');
  });
});
