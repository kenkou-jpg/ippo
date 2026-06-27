import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DependencyContainer } from '../../src/bootstrap/dependency-container.js';
import { RouteRegistry }       from '../../src/bootstrap/route-registry.js';
import { loadBootstrapConfig } from '../../src/bootstrap/bootstrap-config.js';
import { TOKENS }              from '../../src/application/composition-root.js';
import { runArchitectureGuard } from '../../src/application/architecture-guard.js';

// ── Isolate all infra deps that pull CDN imports ─────────────────────────────
vi.mock('../../src/services/supabase.js', () => ({ supabase: null }));
vi.mock('../../src/modules/auth/auth-service.js', () => ({
  getAuthState: vi.fn(() => ({ isReady: false, userId: null, isPremium: false, isAdmin: false })),
  AUTH_LIFECYCLE: { AUTH_READY: 'AUTH_READY' },
}));
vi.mock('../../src/legacy/legacy-bridge.js', () => ({
  LegacyBridge: class MockLegacyBridge {
    boot = vi.fn();
  },
}));
vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));

// ── DependencyContainer ──────────────────────────────────────────────────────
describe('DependencyContainer', () => {
  let c: DependencyContainer;
  beforeEach(() => { c = new DependencyContainer(); });

  it('resolves a registered factory', () => {
    c.register('foo', () => 42);
    expect(c.resolve('foo')).toBe(42);
  });

  it('throws on unregistered token', () => {
    expect(() => c.resolve('missing')).toThrow('[DI] No binding for token: "missing"');
  });

  it('throws on duplicate registration', () => {
    c.register('tok', () => 1);
    expect(() => c.register('tok', () => 2)).toThrow('[DI] Token already registered: "tok"');
  });

  it('singleton: returns same instance on repeated resolve', () => {
    let calls = 0;
    c.singleton('s', () => ({ id: ++calls }));
    const a = c.resolve('s');
    const b = c.resolve('s');
    expect(a).toBe(b);
    expect(calls).toBe(1);
  });

  it('has() reflects registration state', () => {
    expect(c.has('x')).toBe(false);
    c.register('x', () => null);
    expect(c.has('x')).toBe(true);
  });
});

// ── RouteRegistry ────────────────────────────────────────────────────────────
describe('RouteRegistry', () => {
  let r: RouteRegistry;
  beforeEach(() => { r = new RouteRegistry(); });

  it('registers a known feature', () => {
    r.register('Record', { status: 'legacy' });
    expect(r.isRegistered('Record')).toBe(true);
  });

  it('getAll returns all registered features', () => {
    r.register('Record',     { status: 'legacy' });
    r.register('Experiment', { status: 'legacy' });
    expect(r.getAll().size).toBe(2);
  });

  it('logs error for unknown feature name', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    r.register('UnknownFeature' as any, { status: 'legacy' });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Unknown feature'));
    expect(r.isRegistered('UnknownFeature' as any)).toBe(false);
    spy.mockRestore();
  });

  it('logs error on duplicate registration', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    r.register('Record', { status: 'legacy' });
    r.register('Record', { status: 'migrated' });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('already registered'));
    spy.mockRestore();
  });

  it('knownFeatures includes all 8 features', () => {
    const known = r.knownFeatures;
    expect(known).toContain('Record');
    expect(known).toContain('Experiment');
    expect(known).toContain('Case');
    expect(known).toContain('Consent');
    expect(known).toContain('Analytics');
    expect(known).toContain('Similarity');
    expect(known).toContain('Auth');
    expect(known).toContain('B2BExport');
    expect(known).toContain('Communication');
    expect(known).toContain('Delivery');
    expect(known).toContain('Operations');
    expect(known).toContain('OperationsAutomation');
    expect(known).toContain('Symptom');
    expect(known).toContain('Disease');
    expect(known).toContain('NetworkSignal');
    expect(known).toContain('SignalIntelligence');
    expect(known).toContain('Longitudinal');
    expect(known).toContain('PersistentSignal');
    expect(known).toContain('DiseaseCluster');
    expect(known).toContain('SignalSnapshot');
    expect(known).toContain('SimilarityIntelligence');
    expect(known).toContain('EventSourcing');
    expect(known).toContain('Emotion');
    expect(known).toContain('MenstrualIntelligence');
    expect(known).toHaveLength(30); // PR-039: added 'MenstrualIntelligence'
  });
});

// ── loadBootstrapConfig ──────────────────────────────────────────────────────
describe('loadBootstrapConfig', () => {
  it('returns a frozen config object', () => {
    const cfg = loadBootstrapConfig();
    expect(Object.isFrozen(cfg)).toBe(true);
  });

  it('reads SUPABASE_URL from window when present', () => {
    (globalThis as any).window = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_KEY: 'key123' };
    const cfg = loadBootstrapConfig();
    expect(cfg.supabaseUrl).toBe('https://test.supabase.co');
    expect(cfg.supabaseKey).toBe('key123');
    delete (globalThis as any).window.SUPABASE_URL;
    delete (globalThis as any).window.SUPABASE_KEY;
  });

  it('falls back to empty string when window values are absent', () => {
    const cfg = loadBootstrapConfig();
    expect(typeof cfg.supabaseUrl).toBe('string');
    expect(typeof cfg.supabaseKey).toBe('string');
  });
});

// ── CompositionRoot ──────────────────────────────────────────────────────────
describe('CompositionRoot', () => {
  it('assembles container with all tokens', async () => {
    const { CompositionRoot } = await import('../../src/application/composition-root.js');
    const c = new DependencyContainer();
    const r = new RouteRegistry();
    const cfg = loadBootstrapConfig();

    const root = new CompositionRoot(c, r, cfg);
    root.assemble();

    expect(c.has(TOKENS.Config)).toBe(true);
    expect(c.has(TOKENS.LegacyBridge)).toBe(true);
    expect(c.has(TOKENS.StorageService)).toBe(true);
    expect(c.has(TOKENS.RecordRepository)).toBe(true);
    expect(c.has(TOKENS.ExperimentRepository)).toBe(true);
    expect(c.has(TOKENS.ConsentRepository)).toBe(true);
    expect(c.has(TOKENS.CaseRepository)).toBe(true);
    expect(c.has(TOKENS.AnalyticsService)).toBe(true);
    expect(c.has(TOKENS.SimilarityService)).toBe(true);
  });

  it('registers all 8 features in the registry', async () => {
    const { CompositionRoot } = await import('../../src/application/composition-root.js');
    const c = new DependencyContainer();
    const r = new RouteRegistry();
    const root = new CompositionRoot(c, r, loadBootstrapConfig());
    root.assemble();

    expect(r.isRegistered('Record')).toBe(true);
    expect(r.isRegistered('Experiment')).toBe(true);
    expect(r.isRegistered('Case')).toBe(true);
    expect(r.isRegistered('Consent')).toBe(true);
    expect(r.isRegistered('Analytics')).toBe(true);
    expect(r.isRegistered('Similarity')).toBe(true);
    expect(r.isRegistered('Auth')).toBe(true);
    expect(r.isRegistered('B2BExport')).toBe(true);
  });

  it('Config token resolves the injected config', async () => {
    const { CompositionRoot } = await import('../../src/application/composition-root.js');
    const c = new DependencyContainer();
    const r = new RouteRegistry();
    const cfg = loadBootstrapConfig();
    new CompositionRoot(c, r, cfg).assemble();

    expect(c.resolve(TOKENS.Config)).toBe(cfg);
  });
});

// ── Application ──────────────────────────────────────────────────────────────
describe('Application', () => {
  it('initialize() calls bridge.boot()', async () => {
    const { Application } = await import('../../src/application/app.js');
    const { LegacyBridge } = await import('../../src/legacy/legacy-bridge.js');

    const bridge = new LegacyBridge();
    const c = new DependencyContainer();
    c.singleton(TOKENS.LegacyBridge, () => bridge);

    const app = new Application(c);
    app.initialize();

    expect(bridge.boot).toHaveBeenCalledOnce();
  });

  it('initialize() installs __ippoArchGuard on window', async () => {
    const { Application } = await import('../../src/application/app.js');
    const { LegacyBridge } = await import('../../src/legacy/legacy-bridge.js');

    const c = new DependencyContainer();
    c.singleton(TOKENS.LegacyBridge, () => new LegacyBridge());

    delete (globalThis as any).window.__ippoArchGuard;
    new Application(c).initialize();

    expect((globalThis as any).window.__ippoArchGuard).toBeDefined();
    expect(typeof (globalThis as any).window.__ippoArchGuard.check).toBe('function');
  });
});

// ── Architecture Guard ────────────────────────────────────────────────────────
describe('runArchitectureGuard', () => {
  beforeEach(() => { delete (globalThis as any).window.__ippoArchGuard; });

  it('installs __ippoArchGuard on window', () => {
    runArchitectureGuard();
    expect(window.__ippoArchGuard).toBeDefined();
  });

  it('check() records feature→feature violations', () => {
    runArchitectureGuard();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__ippoArchGuard.check('/src/features/record/index.js', '/src/features/experiment/index.js');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('feature→feature'));
    expect(window.__ippoArchGuard.violations).toHaveLength(1);
    spy.mockRestore();
  });

  it('check() records repository→ui violations', () => {
    runArchitectureGuard();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__ippoArchGuard.check('/src/repositories/RecordRepo.js', '/src/screens/RecordScreen.js');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('repository→ui'));
    spy.mockRestore();
  });

  it('check() does NOT flag legitimate paths', () => {
    runArchitectureGuard();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__ippoArchGuard.check('/src/domains/record/RecordDomain.js', '/src/application/app.js');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
