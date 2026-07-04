// tests/architecture/wave2-supabase-guard.test.js
// ArchitectureGuard — Wave2 Supabase PR-042 forbidden dependency rules
import { describe, it, expect } from 'vitest';

const FORBIDDEN = [
  // Supabase Repository must NOT be imported from screens/features — use ApiGateway
  { from: /\/screens\//,   to: /network-signal-supabase-repository/, label: 'screen→SupabaseRepository'  },
  { from: /\/features\//,  to: /network-signal-supabase-repository/, label: 'feature→SupabaseRepository' },
  { from: /\/screens\//,   to: /supabase-event-persistence-repository/, label: 'screen→EventPersistenceRepo'  },
  { from: /\/features\//,  to: /supabase-event-persistence-repository/, label: 'feature→EventPersistenceRepo' },
  // Supabase client must not be accessed directly from domain or screen layers
  { from: /\/screens\//,   to: /services\/supabase/,  label: 'screen→SupabaseService'  },
  { from: /\/features\//,  to: /services\/supabase/,  label: 'feature→SupabaseService' },
  { from: /\/domains\//,   to: /services\/supabase/,  label: 'domain→SupabaseService'  },
  // Repository must not depend on screens
  { from: /network-signal-supabase-repository/, to: /\/screens\//, label: 'SupabaseRepository→screen' },
];

function checkViolation(from, to) {
  return FORBIDDEN.filter(rule => rule.from.test(from) && rule.to.test(to));
}

describe('ArchitectureGuard — Wave2 PR-042 Supabase forbidden dependencies', () => {
  it('screen must not import NetworkSignalSupabaseRepository directly', () => {
    const violations = checkViolation(
      '/screens/main-screen.js',
      '/domains/network/network-signal-supabase-repository.js'
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].label).toBe('screen→SupabaseRepository');
  });

  it('feature must not import NetworkSignalSupabaseRepository directly', () => {
    const violations = checkViolation(
      '/features/signal-view/index.js',
      '/domains/network/network-signal-supabase-repository.js'
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].label).toBe('feature→SupabaseRepository');
  });

  it('screen must not import SupabaseEventPersistenceRepository directly', () => {
    const violations = checkViolation(
      '/screens/record-entry/view.js',
      '/infrastructure/supabase-event-persistence-repository.js'
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].label).toBe('screen→EventPersistenceRepo');
  });

  it('feature must not access services/supabase directly', () => {
    const violations = checkViolation(
      '/features/network/network-feature.js',
      '/services/supabase.js'
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].label).toBe('feature→SupabaseService');
  });

  it('domain must not access services/supabase directly', () => {
    const violations = checkViolation(
      '/domains/network/network-signal-service.js',
      '/services/supabase.js'
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].label).toBe('domain→SupabaseService');
  });

  it('SupabaseRepository must not depend on screens', () => {
    const violations = checkViolation(
      '/domains/network/network-signal-supabase-repository.js',
      '/screens/main-screen.js'
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].label).toBe('SupabaseRepository→screen');
  });

  it('application (ApiGateway) CAN import supabase service — not forbidden', () => {
    const violations = checkViolation(
      '/application/composition-root.js',
      '/services/supabase.js'
    );
    expect(violations).toHaveLength(0);
  });

  it('infrastructure CAN import supabase service — not forbidden', () => {
    const violations = checkViolation(
      '/infrastructure/repository-provider.js',
      '/services/supabase.js'
    );
    expect(violations).toHaveLength(0);
  });
});
