// tests/infrastructure/persistence-config.test.js
// PersistenceConfig — Wave2 infrastructure constants (PR-041)
import { describe, it, expect } from 'vitest';
import {
  PERSISTENCE_BACKEND,
  PERSISTENCE_CONFIG,
} from '../../src/infrastructure/persistence-config.js';

describe('PERSISTENCE_BACKEND', () => {
  it('exports MEMORY and SUPABASE constants', () => {
    expect(PERSISTENCE_BACKEND.MEMORY).toBe('memory');
    expect(PERSISTENCE_BACKEND.SUPABASE).toBe('supabase');
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(PERSISTENCE_BACKEND)).toBe(true);
  });

  it('cannot be mutated', () => {
    expect(() => { PERSISTENCE_BACKEND.MEMORY = 'other'; }).toThrow();
  });
});

describe('PERSISTENCE_CONFIG', () => {
  it('exports networkSignal config', () => {
    expect(PERSISTENCE_CONFIG.networkSignal).toBeDefined();
  });

  it('networkSignal.backend is SUPABASE for Wave2 Phase A-2 (PR-042)', () => {
    expect(PERSISTENCE_CONFIG.networkSignal.backend).toBe(PERSISTENCE_BACKEND.SUPABASE);
  });

  it('networkSignal.migrateFromStorage is true', () => {
    expect(PERSISTENCE_CONFIG.networkSignal.migrateFromStorage).toBe(true);
  });

  it('networkSignal.storageKey matches Wave1 key', () => {
    expect(PERSISTENCE_CONFIG.networkSignal.storageKey).toBe('ippo_network_signals_v1');
  });

  it('PERSISTENCE_CONFIG is frozen', () => {
    expect(Object.isFrozen(PERSISTENCE_CONFIG)).toBe(true);
    expect(Object.isFrozen(PERSISTENCE_CONFIG.networkSignal)).toBe(true);
  });
});
