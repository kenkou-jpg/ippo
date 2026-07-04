// tests/arch/architecture-guard-pr073.test.js
// PR-073: Architecture Guard Wave2 Complete.
// 責務①: PR-042 / PR-050 / PR-057〜062 の禁止依存ルール追加
// 責務③: AI service domains → Research Dataset internals の直接アクセス禁止
// 責務⑤: KNOWN_FEATURES に Wave2 全 Feature（PR-051〜072）を追加
import { describe, it, expect, vi } from 'vitest';
import { runArchitectureGuard } from '../../src/application/architecture-guard.js';
import { RouteRegistry } from '../../src/bootstrap/route-registry.js';

function withWindow(fn) {
  const win  = { __ippoArchGuard: null };
  const orig = globalThis.window;
  globalThis.window = win;
  try {
    runArchitectureGuard();
    fn(win.__ippoArchGuard);
  } finally {
    globalThis.window = orig;
  }
}

// ── 責務① PR-042 — Supabase Persistence ─────────────────────────────────────

describe('ArchGuard PR-073 — PR-042 NetworkSignalSupabaseRepository / SupabaseEventPersistenceRepository', () => {
  it('flags screen/feature → network-signal-supabase-repository', () => {
    withWindow((g) => {
      g.check('/screens/record/', '/domains/network/network-signal-supabase-repository.js');
      g.check('/features/signals/', '/domains/network/network-signal-supabase-repository.js');
      expect(g.violations.some(v => v.label === 'screen→NetworkSignalSupabaseRepository')).toBe(true);
      expect(g.violations.some(v => v.label === 'feature→NetworkSignalSupabaseRepository')).toBe(true);
    });
  });

  it('flags screen/feature → supabase-event-persistence-repository', () => {
    withWindow((g) => {
      g.check('/screens/timeline/', '/infrastructure/supabase-event-persistence-repository.js');
      g.check('/features/events/', '/infrastructure/supabase-event-persistence-repository.js');
      expect(g.violations.some(v => v.label === 'screen→SupabaseEventPersistenceRepository')).toBe(true);
      expect(g.violations.some(v => v.label === 'feature→SupabaseEventPersistenceRepository')).toBe(true);
    });
  });
});

// ── 責務① PR-050 — Signal Intelligence V2 ───────────────────────────────────

describe('ArchGuard PR-073 — PR-050 SignalIntelligenceV2Service', () => {
  it('flags screen/feature → signal-intelligence-v2-service', () => {
    withWindow((g) => {
      g.check('/screens/dashboard/', '/domains/network/signal-intelligence-v2-service.js');
      g.check('/features/signals/', '/domains/network/signal-intelligence-v2-service.js');
      expect(g.violations.some(v => v.label === 'screen→SignalIntelligenceV2Service')).toBe(true);
      expect(g.violations.some(v => v.label === 'feature→SignalIntelligenceV2Service')).toBe(true);
    });
  });
});

// ── 責務① PR-057〜062 — Phase D AI Platform ──────────────────────────────────

describe('ArchGuard PR-073 — PR-057〜062 Phase D AI service domains', () => {
  const cases = [
    ['signal-insight-service', 'signal-insight', 'SignalInsightService'],
    ['pattern-discovery-service', 'pattern-discovery', 'PatternDiscoveryService'],
    ['case-recommendation-service', 'case-recommendation', 'CaseRecommendationService'],
    ['similar-case-search-service', 'similar-case-search', 'SimilarCaseSearchService'],
    ['research-assistance-service', 'research-assistance', 'ResearchAssistanceService'],
    ['ai-safety-validator', 'ai-safety', 'AISafetyValidator'],
  ];

  for (const [file, dir, label] of cases) {
    it(`flags screen/feature → ${file}`, () => {
      withWindow((g) => {
        g.check('/screens/insights/', `/domains/${dir}/${file}.js`);
        g.check('/features/insights/', `/domains/${dir}/${file}.js`);
        expect(g.violations.some(v => v.label === `screen→${label}`)).toBe(true);
        expect(g.violations.some(v => v.label === `feature→${label}`)).toBe(true);
      });
    });
  }
});

// ── 責務③ AI service → Research Dataset 直接アクセス禁止 ───────────────────

describe('ArchGuard PR-073 — 責務③ AI service domains must not reach Research Dataset internals', () => {
  const aiServiceDirs = [
    'signal-insight', 'pattern-discovery', 'case-recommendation',
    'similar-case-search', 'research-assistance', 'ai-safety',
  ];
  const targets = [
    ['research-dataset-repository.js', 'aiService→ResearchDatasetRepository'],
    ['research-dataset-builder.js',    'aiService→ResearchDatasetBuilder'],
    ['research-dataset-v2-entity.js',  'aiService→ResearchDatasetV2Entity'],
  ];

  for (const dir of aiServiceDirs) {
    for (const [targetFile, label] of targets) {
      it(`flags /domains/${dir}/ → ${targetFile}`, () => {
        withWindow((g) => {
          g.check(`/domains/${dir}/${dir}-service.js`, `/domains/research/${targetFile}`);
          expect(g.violations.some(v => v.label === label)).toBe(true);
        });
      });
    }
  }

  it('does NOT flag EvidenceLayerService (PR-056) → research-dataset internals', () => {
    withWindow((g) => {
      g.check('/domains/evidence/evidence-layer-service.js', '/domains/research/research-dataset-repository.js');
      expect(g.violations.some(v => v.label === 'aiService→ResearchDatasetRepository')).toBe(false);
    });
  });
});

// ── 責務⑤ KNOWN_FEATURES — Wave2 全 Feature（PR-051〜072）────────────────────

describe('RouteRegistry.KNOWN_FEATURES — Wave2 PR-051〜072 (PR-073 責務⑤)', () => {
  const wave2Features = [
    'KnowledgeGraph', 'KnowledgeGraphBuilder', 'FeatureStore', 'CohortBuilder',
    'DatasetVersion', 'EvidenceLayer', 'SignalInsight', 'PatternDiscovery',
    'CaseRecommendation', 'SimilarCaseSearch', 'ResearchAssistance', 'AISafetyLayer',
    'SimilarityEngineV2', 'DiseaseNetworkScoreV2', 'SimilaritySnapshotV2',
    'Phase3Validation', 'SimilarityPublicGate', 'ResearchDatasetV2',
    'CohortResearchExport', 'DoiCandidate', 'ResearchQueryAPI', 'ResearchPlatformAudit',
  ];

  it('includes all 22 Wave2 Phase C〜F feature names', () => {
    const registry = new RouteRegistry();
    for (const name of wave2Features) {
      expect(registry.knownFeatures).toContain(name);
    }
  });

  it('registers every Wave2 feature without an "Unknown feature" error', () => {
    const spy = [];
    const orig = console.error;
    console.error = (...a) => spy.push(a.join(' '));
    const registry = new RouteRegistry();
    for (const name of wave2Features) {
      registry.register(name, { status: 'active' });
    }
    console.error = orig;
    expect(spy.some(s => s.includes('Unknown feature'))).toBe(false);
    for (const name of wave2Features) {
      expect(registry.isRegistered(name)).toBe(true);
    }
  });
});

// ── 責務① + ⑤ 統合: CompositionRoot が Wave2 全 Feature を登録する ──────────

describe('CompositionRoot.assemble() registers all Wave2 features (PR-073 gap closure)', () => {
  vi.mock('../../src/services/supabase.js', () => ({ supabase: null }));
  vi.mock('../../src/modules/auth/auth-service.js', () => ({
    getAuthState: vi.fn(() => ({ isReady: false, userId: null, isPremium: false, isAdmin: false })),
    AUTH_LIFECYCLE: { AUTH_READY: 'AUTH_READY' },
  }));
  vi.mock('../../src/legacy/legacy-bridge.js', () => ({
    LegacyBridge: class MockLegacyBridge { boot = vi.fn(); },
  }));
  vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));

  const wave2Features = [
    'KnowledgeGraph', 'KnowledgeGraphBuilder', 'FeatureStore', 'CohortBuilder',
    'DatasetVersion', 'EvidenceLayer', 'SignalInsight', 'PatternDiscovery',
    'CaseRecommendation', 'SimilarCaseSearch', 'ResearchAssistance', 'AISafetyLayer',
    'SimilarityEngineV2', 'DiseaseNetworkScoreV2', 'SimilaritySnapshotV2',
    'Phase3Validation', 'SimilarityPublicGate', 'ResearchDatasetV2',
    'CohortResearchExport', 'DoiCandidate', 'ResearchQueryAPI', 'ResearchPlatformAudit',
  ];

  async function makeRoot() {
    const { CompositionRoot }     = await import('../../src/application/composition-root.js');
    const { DependencyContainer } = await import('../../src/bootstrap/dependency-container.js');
    const { loadBootstrapConfig } = await import('../../src/bootstrap/bootstrap-config.js');
    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    const config    = loadBootstrapConfig();
    const root      = new CompositionRoot(container, registry, config);
    root.assemble();
    return { registry };
  }

  it('every Wave2 feature (PR-051〜072) is registered after assemble()', async () => {
    const { registry } = await makeRoot();
    for (const name of wave2Features) {
      expect(registry.isRegistered(name)).toBe(true);
    }
  });
});
