// tests/network-domain/composition-root-pr031.test.js
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

describe('TOKENS — PR-031 Signal Intelligence tokens', () => {
  it('TOKENS.SignalAggregationService is defined', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.SignalAggregationService).toBe('SignalAggregationService');
  });

  it('TOKENS.SignalTrendService is defined', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.SignalTrendService).toBe('SignalTrendService');
  });

  it('TOKENS.SignalTimelineService is defined', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.SignalTimelineService).toBe('SignalTimelineService');
  });

  it('TOKENS.SignalSummaryService is defined', async () => {
    const { TOKENS } = await import('../../src/application/composition-root.js');
    expect(TOKENS.SignalSummaryService).toBe('SignalSummaryService');
  });
});

describe('CompositionRoot PR-031 — Signal Intelligence DI registration', () => {
  describe('DI container registration', () => {
    it('has SignalAggregationService token', async () => {
      const { container, TOKENS } = await makeRoot();
      expect(container.has(TOKENS.SignalAggregationService)).toBe(true);
    });

    it('has SignalTrendService token', async () => {
      const { container, TOKENS } = await makeRoot();
      expect(container.has(TOKENS.SignalTrendService)).toBe(true);
    });

    it('has SignalTimelineService token', async () => {
      const { container, TOKENS } = await makeRoot();
      expect(container.has(TOKENS.SignalTimelineService)).toBe(true);
    });

    it('has SignalSummaryService token', async () => {
      const { container, TOKENS } = await makeRoot();
      expect(container.has(TOKENS.SignalSummaryService)).toBe(true);
    });

    it('resolves SignalAggregationService with aggregate()', async () => {
      const { container, TOKENS } = await makeRoot();
      const svc = container.resolve(TOKENS.SignalAggregationService);
      expect(typeof svc.aggregate).toBe('function');
    });

    it('resolves SignalTrendService with trend()', async () => {
      const { container, TOKENS } = await makeRoot();
      const svc = container.resolve(TOKENS.SignalTrendService);
      expect(typeof svc.trend).toBe('function');
    });

    it('resolves SignalTimelineService with buildTimeline()', async () => {
      const { container, TOKENS } = await makeRoot();
      const svc = container.resolve(TOKENS.SignalTimelineService);
      expect(typeof svc.buildTimeline).toBe('function');
    });

    it('resolves SignalSummaryService with summarize()', async () => {
      const { container, TOKENS } = await makeRoot();
      const svc = container.resolve(TOKENS.SignalSummaryService);
      expect(typeof svc.summarize).toBe('function');
    });
  });

  describe('Feature Registry', () => {
    it('SignalIntelligence is registered', async () => {
      const { registry } = await makeRoot();
      expect(registry.isRegistered('SignalIntelligence')).toBe(true);
    });

    it('SignalIntelligence descriptor has status: active and migratesIn: PR-031', async () => {
      const { registry } = await makeRoot();
      const desc = [...registry.getAll().values()].find(f => f.name === 'SignalIntelligence');
      expect(desc.status).toBe('active');
      expect(desc.migratesIn).toBe('PR-031');
    });
  });
});
