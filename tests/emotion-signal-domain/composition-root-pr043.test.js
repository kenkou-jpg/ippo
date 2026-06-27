// tests/emotion-signal-domain/composition-root-pr043.test.js
// PR-043: CompositionRoot — EmotionSignalGenerator DI token registration.
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/services/supabase.js', () => ({ supabase: null }));
vi.mock('../../src/modules/auth/auth-service.js', () => ({
  getAuthState: vi.fn(() => ({ isReady: false, userId: null, isPremium: false, isAdmin: false })),
  AUTH_LIFECYCLE: { AUTH_READY: 'AUTH_READY' },
}));
vi.mock('../../src/legacy/legacy-bridge.js', () => ({
  LegacyBridge: class MockLegacyBridge { boot = vi.fn(); },
}));
vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));

import { EmotionSignalGenerator } from '../../src/domains/network/emotion-signal-generator.js';

describe('TOKENS — PR-043 EmotionSignalGenerator', () => {
  it('exports EmotionSignalGenerator token', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.EmotionSignalGenerator).toBe('EmotionSignalGenerator');
  });

  it('preserves all pre-existing Wave2 tokens', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.PersistenceConfig).toBe('PersistenceConfig');
    expect(TOKENS.NetworkSignalPersistenceServiceV2).toBe('NetworkSignalPersistenceServiceV2');
    expect(TOKENS.RepositoryProvider).toBe('RepositoryProvider');
    expect(TOKENS.SupabaseEventPersistenceRepository).toBe('SupabaseEventPersistenceRepository');
  });
});

describe('EmotionSignalGenerator — direct construction', () => {
  it('can be constructed with a mock persistenceService', () => {
    const mockService = {
      append:         (s) => s,
      findAll:        () => [],
      findByRecord:   () => [],
      findByType:     () => [],
      get count()     { return 0; },
      get repositoryType() { return 'mock'; },
      initialize:     () => ({ migrated: 0, skipped: 0, alreadyInitialized: false }),
    };
    const gen = new EmotionSignalGenerator({ persistenceService: mockService });
    expect(gen).toBeDefined();
    expect(gen.repositoryType).toBe('mock');
  });

  it('generate() returns empty array when no emotion fields present', () => {
    const stored = [];
    const mockService = { append: (s) => { stored.push(s); return s; }, repositoryType: 'mock' };
    const gen = new EmotionSignalGenerator({ persistenceService: mockService });
    expect(gen.generate({ id: 'r1' })).toEqual([]);
    expect(stored).toHaveLength(0);
  });

  it('generate() calls persistenceService.append() for each rule match', () => {
    const stored = [];
    const mockService = { append: (s) => { stored.push(s); return s; }, repositoryType: 'mock' };
    const gen = new EmotionSignalGenerator({ persistenceService: mockService });
    gen.generate({ id: 'r1', moodScore: 5, stressLevel: 7 });
    expect(stored).toHaveLength(2);
  });
});
