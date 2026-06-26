// tests/network-domain/composition-root-pr032.test.js
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

describe('TOKENS — PR-032 Longitudinal tokens', () => {
  it('TOKENS.LongitudinalSignalService is defined', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.LongitudinalSignalService).toBe('LongitudinalSignalService');
  });
  it('TOKENS.MovingAverageService is defined', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.MovingAverageService).toBe('MovingAverageService');
  });
  it('TOKENS.BaselineService is defined', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.BaselineService).toBe('BaselineService');
  });
  it('TOKENS.TrendWindowBuilder is defined', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.TrendWindowBuilder).toBe('TrendWindowBuilder');
  });
  it('TOKENS.LongitudinalSummaryService is defined', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.LongitudinalSummaryService).toBe('LongitudinalSummaryService');
  });
});

describe('CompositionRoot PR-032 — Longitudinal DI registration', () => {
  describe('DI container', () => {
    it('has LongitudinalSignalService token', async () => {
      const { container, TOKENS } = await makeRoot();
      expect(container.has(TOKENS.LongitudinalSignalService)).toBe(true);
    });
    it('has MovingAverageService token', async () => {
      const { container, TOKENS } = await makeRoot();
      expect(container.has(TOKENS.MovingAverageService)).toBe(true);
    });
    it('has BaselineService token', async () => {
      const { container, TOKENS } = await makeRoot();
      expect(container.has(TOKENS.BaselineService)).toBe(true);
    });
    it('has TrendWindowBuilder token', async () => {
      const { container, TOKENS } = await makeRoot();
      expect(container.has(TOKENS.TrendWindowBuilder)).toBe(true);
    });
    it('has LongitudinalSummaryService token', async () => {
      const { container, TOKENS } = await makeRoot();
      expect(container.has(TOKENS.LongitudinalSummaryService)).toBe(true);
    });

    it('LongitudinalSummaryService resolves with summarize()', async () => {
      const { container, TOKENS } = await makeRoot();
      const svc = container.resolve(TOKENS.LongitudinalSummaryService);
      expect(typeof svc.summarize).toBe('function');
    });

    it('MovingAverageService resolves with compute()', async () => {
      const { container, TOKENS } = await makeRoot();
      const svc = container.resolve(TOKENS.MovingAverageService);
      expect(typeof svc.compute).toBe('function');
    });

    it('BaselineService resolves with computeWave1()', async () => {
      const { container, TOKENS } = await makeRoot();
      const svc = container.resolve(TOKENS.BaselineService);
      expect(typeof svc.computeWave1).toBe('function');
    });
  });

  describe('Feature Registry', () => {
    it('Longitudinal is registered', async () => {
      const { registry } = await makeRoot();
      expect(registry.isRegistered('Longitudinal')).toBe(true);
    });
    it('Longitudinal has status: active and migratesIn: PR-032', async () => {
      const { registry } = await makeRoot();
      const desc = [...registry.getAll().values()].find(f => f.name === 'Longitudinal');
      expect(desc.status).toBe('active');
      expect(desc.migratesIn).toBe('PR-032');
    });
  });
});
