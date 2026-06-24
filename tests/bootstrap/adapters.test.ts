import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Module mocks (must be hoisted before any import) ─────────────────────────
vi.mock('../../src/legacy/legacy-bridge.js', () => ({
  LegacyBridge: class MockLegacyBridge { boot = vi.fn(); },
}));
vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));
vi.mock('../../src/services/supabase.js', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' }, session: {} }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));
vi.mock('../../src/modules/auth/auth-service.js', () => ({
  getAuthState: vi.fn(() => ({ isReady: true, userId: 'user-123', isPremium: false, isAdmin: false })),
  AUTH_LIFECYCLE: { AUTH_READY: 'AUTH_READY' },
}));

import { LocalStorageAdapter }  from '../../src/adapters/storage/local-storage-adapter.js';
import { LegacyAuthAdapter }    from '../../src/adapters/auth/legacy-auth-adapter.js';
import { AdapterRegistry }      from '../../src/adapters/adapter-registry.js';
import { DependencyContainer }  from '../../src/bootstrap/dependency-container.js';
import { RouteRegistry }        from '../../src/bootstrap/route-registry.js';
import { loadBootstrapConfig }  from '../../src/bootstrap/bootstrap-config.js';
import { TOKENS }               from '../../src/application/composition-root.js';
import {
  IStorageService,
  IAuthService,
} from '../../src/contracts/index.js';
import {
  getViolationCount,
  getViolations,
  runAccessAudit,
} from '../../src/application/legacy-access-audit.js';

// ── LocalStorageAdapter ──────────────────────────────────────────────────────
describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  it('extends IStorageService', () => {
    expect(adapter).toBeInstanceOf(IStorageService);
  });

  it('set + get round-trips an object', () => {
    adapter.set('foo', { bar: 42 });
    expect(adapter.get('foo')).toEqual({ bar: 42 });
  });

  it('set + get round-trips a string without double-encoding', () => {
    adapter.set('str', 'hello');
    expect(adapter.get('str')).toBe('hello');
  });

  it('get returns null for missing key', () => {
    expect(adapter.get('missing')).toBeNull();
  });

  it('has returns true for existing key', () => {
    adapter.set('k', 1);
    expect(adapter.has('k')).toBe(true);
  });

  it('has returns false for missing key', () => {
    expect(adapter.has('nope')).toBe(false);
  });

  it('remove deletes a key', () => {
    adapter.set('del', 'x');
    adapter.remove('del');
    expect(adapter.get('del')).toBeNull();
  });

  it('clear() removes only ippo_* keys', () => {
    localStorage.setItem('ippo_state', '{}');
    localStorage.setItem('ippo_settings', '{}');
    localStorage.setItem('other_key', 'keep');
    adapter.clear();
    expect(localStorage.getItem('ippo_state')).toBeNull();
    expect(localStorage.getItem('ippo_settings')).toBeNull();
    expect(localStorage.getItem('other_key')).toBe('keep');
  });

  it('get returns raw string when value is not valid JSON', () => {
    localStorage.setItem('raw', 'not-json');
    expect(adapter.get('raw')).toBe('not-json');
  });

  it('singleton: multiple resolves return same value', () => {
    adapter.set('s', { x: 1 });
    expect(adapter.get('s')).toEqual(adapter.get('s'));
  });
});

// ── LegacyAuthAdapter ────────────────────────────────────────────────────────
describe('LegacyAuthAdapter', () => {
  let adapter: LegacyAuthAdapter;

  beforeEach(() => {
    adapter = new LegacyAuthAdapter();
  });

  it('extends IAuthService', () => {
    expect(adapter).toBeInstanceOf(IAuthService);
  });

  it('getCurrentUser returns user when auth is ready', async () => {
    const user = await adapter.getCurrentUser();
    expect(user).toEqual({ id: 'user-123', email: null });
  });

  it('getCurrentUser returns null when not ready', async () => {
    const { getAuthState } = await import('../../src/modules/auth/auth-service.js');
    vi.mocked(getAuthState).mockReturnValueOnce({ isReady: false, userId: null, isPremium: false, isAdmin: false });
    const user = await adapter.getCurrentUser();
    expect(user).toBeNull();
  });

  it('signIn delegates to supabase.auth.signInWithPassword', async () => {
    const { supabase } = await import('../../src/services/supabase.js');
    const result = await adapter.signIn('test@example.com', 'password');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
    expect(result).toHaveProperty('user');
  });

  it('signOut delegates to supabase.auth.signOut', async () => {
    const { supabase } = await import('../../src/services/supabase.js');
    await adapter.signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('hasPermission("admin") returns false for non-admin', async () => {
    expect(await adapter.hasPermission('admin')).toBe(false);
  });

  it('hasPermission("premium") returns false for non-premium user', async () => {
    expect(await adapter.hasPermission('premium')).toBe(false);
  });

  it('hasPermission("admin") returns true for admin user', async () => {
    const { getAuthState } = await import('../../src/modules/auth/auth-service.js');
    vi.mocked(getAuthState).mockReturnValueOnce({ isReady: true, userId: 'u', isPremium: false, isAdmin: true });
    expect(await adapter.hasPermission('admin')).toBe(true);
  });

  it('onAuthStateChange returns an object with unsubscribe()', () => {
    const sub = adapter.onAuthStateChange(() => {});
    expect(typeof sub.unsubscribe).toBe('function');
    sub.unsubscribe();
  });
});

// ── AdapterRegistry ──────────────────────────────────────────────────────────
describe('AdapterRegistry', () => {
  let registry: AdapterRegistry;

  beforeEach(() => { registry = new AdapterRegistry(); });

  it('registers a known adapter', () => {
    registry.register('StorageService', new LocalStorageAdapter());
    expect(registry.isRegistered('StorageService')).toBe(true);
  });

  it('get returns the registered instance', () => {
    const adapter = new LocalStorageAdapter();
    registry.register('StorageService', adapter);
    expect(registry.get('StorageService')).toBe(adapter);
  });

  it('get returns null for unregistered adapter', () => {
    expect(registry.get('StorageService')).toBeNull();
  });

  it('logs error for unknown adapter name', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    registry.register('UnknownAdapter' as any, {});
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Unknown adapter'));
    spy.mockRestore();
  });

  it('knownAdapters includes StorageService and AuthService', () => {
    expect(registry.knownAdapters).toContain('StorageService');
    expect(registry.knownAdapters).toContain('AuthService');
  });

  it('getAll returns all registered adapters', () => {
    registry.register('StorageService', new LocalStorageAdapter());
    registry.register('AuthService', new LegacyAuthAdapter());
    expect(registry.getAll().size).toBe(2);
  });
});

// ── Composition Root — StorageService and AuthService resolve ─────────────────
describe('CompositionRoot PR-012 — adapter resolution', () => {
  it('StorageService resolves to a LocalStorageAdapter instance', async () => {
    const { CompositionRoot } = await import('../../src/application/composition-root.js');
    const c = new DependencyContainer();
    const r = new RouteRegistry();
    new CompositionRoot(c, r, loadBootstrapConfig()).assemble();

    const storage = c.resolve(TOKENS.StorageService);
    expect(storage).toBeInstanceOf(LocalStorageAdapter);
    expect(storage).toBeInstanceOf(IStorageService);
  });

  it('AuthService resolves to a LegacyAuthAdapter instance', async () => {
    const { CompositionRoot } = await import('../../src/application/composition-root.js');
    const c = new DependencyContainer();
    const r = new RouteRegistry();
    new CompositionRoot(c, r, loadBootstrapConfig()).assemble();

    const auth = c.resolve(TOKENS.AuthService);
    expect(auth).toBeInstanceOf(LegacyAuthAdapter);
    expect(auth).toBeInstanceOf(IAuthService);
  });

  it('RecordRepository remains null stub (not yet migrated)', async () => {
    const { CompositionRoot } = await import('../../src/application/composition-root.js');
    const c = new DependencyContainer();
    const r = new RouteRegistry();
    new CompositionRoot(c, r, loadBootstrapConfig()).assemble();
    expect(c.resolve(TOKENS.RecordRepository)).toBeNull();
  });
});

// ── Legacy Access Audit ──────────────────────────────────────────────────────
describe('LegacyAccessAudit', () => {
  it('getViolationCount returns a positive number', () => {
    expect(getViolationCount()).toBeGreaterThan(0);
  });

  it('getViolations returns an array with file and note fields', () => {
    const violations = getViolations();
    expect(Array.isArray(violations)).toBe(true);
    expect(violations[0]).toHaveProperty('file');
    expect(violations[0]).toHaveProperty('key');
    expect(violations[0]).toHaveProperty('note');
  });

  it('runAccessAudit logs with console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    runAccessAudit();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('violations include localStorage category', () => {
    const violations = getViolations();
    expect(violations.some(v => v.key === 'localStorage')).toBe(true);
  });

  it('violations include window.supabase category', () => {
    const violations = getViolations();
    expect(violations.some(v => v.key === 'window.supabase')).toBe(true);
  });
});

// ── Architecture Guard — PR-012 rules ────────────────────────────────────────
describe('ArchGuard PR-012 — feature layer rules', () => {
  beforeEach(() => {
    const { runArchitectureGuard } = require('../../src/application/architecture-guard.js');
    delete (globalThis as any).window.__ippoArchGuard;
    runArchitectureGuard();
  });

  it('flags feature→supabase violation', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__ippoArchGuard.check('/src/features/record/index.js', '/src/services/supabase.js');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('feature→supabase'));
    spy.mockRestore();
  });

  it('flags feature→legacy violation', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__ippoArchGuard.check('/src/features/record/index.js', '/src/legacy/legacy-bridge.js');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('feature→legacy'));
    spy.mockRestore();
  });

  it('flags screen→supabase violation', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__ippoArchGuard.check('/src/screens/record/RecordScreen.js', '/src/services/supabase.js');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('screen→supabase'));
    spy.mockRestore();
  });

  it('allows adapters/auth → services/supabase (legitimate use)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__ippoArchGuard.check('/src/adapters/auth/legacy-auth-adapter.js', '/src/services/supabase.js');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
