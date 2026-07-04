// tests/network-domain/composition-root-pr030.test.js
// CompositionRoot — PR-030 NetworkSignal DI registration
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

async function makeRoot() {
  const { TOKENS, CompositionRoot } = await import('../../src/application/composition-root.js');
  const { DependencyContainer }     = await import('../../src/bootstrap/dependency-container.js');
  const { RouteRegistry }           = await import('../../src/bootstrap/route-registry.js');
  const { loadBootstrapConfig }     = await import('../../src/bootstrap/bootstrap-config.js');
  const container = new DependencyContainer();
  const registry  = new RouteRegistry();
  const config    = loadBootstrapConfig();
  const root      = new CompositionRoot(container, registry, config);
  root.assemble();
  return { container, registry, TOKENS };
}

describe('TOKENS — PR-030 NetworkSignal tokens', () => {
  it('TOKENS.NetworkSignalRepository is defined', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.NetworkSignalRepository).toBe('NetworkSignalRepository');
  });

  it('TOKENS.NetworkSignalValidator is defined', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.NetworkSignalValidator).toBe('NetworkSignalValidator');
  });

  it('TOKENS.NetworkSignalService is defined', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.NetworkSignalService).toBe('NetworkSignalService');
  });

  it('TOKENS object is frozen', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(Object.isFrozen(TOKENS)).toBe(true);
  });

  it('PR-030 tokens are distinct', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    const all = Object.values(TOKENS);
    const pr030 = [TOKENS.NetworkSignalRepository, TOKENS.NetworkSignalValidator, TOKENS.NetworkSignalService];
    for (const token of pr030) {
      expect(all.filter(t => t === token).length).toBe(1);
    }
  });
});

describe('CompositionRoot.assemble — PR-030 DI wiring', () => {
  it('registers NetworkSignalRepository', async () => {
    const { container, TOKENS } = await makeRoot();
    expect(container.has(TOKENS.NetworkSignalRepository)).toBe(true);
  });

  it('registers NetworkSignalValidator', async () => {
    const { container, TOKENS } = await makeRoot();
    expect(container.has(TOKENS.NetworkSignalValidator)).toBe(true);
  });

  it('registers NetworkSignalService', async () => {
    const { container, TOKENS } = await makeRoot();
    expect(container.has(TOKENS.NetworkSignalService)).toBe(true);
  });

  it('NetworkSignalService resolves and has createSignal method', async () => {
    const { container, TOKENS } = await makeRoot();
    const svc = container.resolve(TOKENS.NetworkSignalService);
    expect(svc).toBeTruthy();
    expect(typeof svc.createSignal).toBe('function');
  });

  it('NetworkSignalService resolves and has listSignals method', async () => {
    const { container, TOKENS } = await makeRoot();
    const svc = container.resolve(TOKENS.NetworkSignalService);
    expect(typeof svc.listSignals).toBe('function');
  });

  it('registers NetworkSignal feature in RouteRegistry', async () => {
    const { registry } = await makeRoot();
    expect(registry.isRegistered('NetworkSignal')).toBe(true);
  });

  it('NetworkSignal feature has correct status and migratesIn', async () => {
    const { registry } = await makeRoot();
    const desc = [...registry.getAll().values()].find(f => f.name === 'NetworkSignal');
    expect(desc.status).toBe('active');
    expect(desc.migratesIn).toBe('PR-030');
  });
});
