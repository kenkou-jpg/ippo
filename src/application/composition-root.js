// Composition Root — the ONLY place where `new` is called for production dependencies.
// All wiring lives here.
//
// ── Contract Audit ───────────────────────────────────────────────────────────
// Token → Contract → Implementation → PR
//   StorageService       → IStorageService       → LocalStorageAdapter         (PR-012 ✓)
//   AuthService          → IAuthService          → LegacyAuthAdapter           (PR-012 ✓)
//   RecordRepository     → IRecordRepository     → DualWriteRecordRepository   (PR-014 ✓)
//                                                    ├─ RecordRepositoryImpl   (legacy)
//                                                    ├─ RecordV2Store          (shadow)
//                                                    └─ DiffLogRepository      (audit)
//   ExperimentRepository → IExperimentRepository → ExperimentRepositoryImpl   (PR-015 ✓)
//   CaseRepository       → ICaseRepository       → CaseRepositoryImpl         (PR-017 ✓)
//   ConsentRepository    → IConsentRepository    → ConsentRepositoryImpl      (PR-018 ✓)
//   SimilarityRepository → ISimilarityService    → SimilarityRepositoryImpl   (PR-019 ✓)
//   SimilarityEngine     → —                     → SimilarityEngine            (PR-019 ✓)
//   AnalyticsService     → IAnalyticsService     → null stub                  (future)
// ────────────────────────────────────────────────────────────────────────────
import { LegacyBridge }                 from '../legacy/legacy-bridge.js';
import { LocalStorageAdapter }          from '../adapters/storage/local-storage-adapter.js';
import { LegacyAuthAdapter }            from '../adapters/auth/legacy-auth-adapter.js';
import { RecordRepositoryImpl }         from '../repositories/record/record-repository.js';
import { RecordV2Store }                from '../repositories/record/record-v2-store.js';
import { DiffLogRepository }            from '../repositories/record/diff-log-repository.js';
import { DualWriteRecordRepository }    from '../repositories/record/dual-write-record-repository.js';
import { ExperimentRepositoryImpl }     from '../repositories/experiment/experiment-repository.js';
import { ExperimentLifecycleService }   from '../domains/experiment/experiment-lifecycle-service.js';
import { CaseCandidateBuilder }         from '../domains/case/case-candidate-builder.js';
import { checkEligibility, computeQualityScore } from '../domains/case/case-eligibility.js';
import { CaseRepositoryImpl }           from '../repositories/case/case-repository.js';
import { CaseGenerationService }        from '../domains/case/case-generation-service.js';
import { resolveOutcome }               from '../domains/case/outcome-resolver.js';
import { evaluateTier }                 from '../domains/case/tier-evaluator.js';
import { ConsentRepositoryImpl }        from '../repositories/consent/consent-repository.js';
import { ConsentEnforcementService }    from '../domains/consent/consent-enforcement-service.js';
import { SimilarityCandidateBuilder }   from '../domains/similarity/similarity-candidate-builder.js';
import { FeatureExtractor }             from '../domains/similarity/feature-extractor.js';
import { SimilarityRepositoryImpl }     from '../repositories/similarity/similarity-repository.js';
import { SimilarityEngine }             from '../domains/similarity/similarity-engine.js';
import { VectorBuilder }                from '../domains/similarity/vector-builder.js';
import { SimilarityCalculator }         from '../domains/similarity/similarity-calculator.js';
import { EdgeGenerator }                from '../domains/similarity/edge-generator.js';

// DI token constants — use these everywhere instead of bare strings
export const TOKENS = Object.freeze({
  Config:                     'Config',
  LegacyBridge:               'LegacyBridge',
  StorageService:             'StorageService',
  AuthService:                'AuthService',
  RecordRepository:           'RecordRepository',
  ExperimentRepository:       'ExperimentRepository',
  ExperimentLifecycleService: 'ExperimentLifecycleService',
  CaseCandidateBuilder:       'CaseCandidateBuilder',
  CaseEligibility:            'CaseEligibility',
  CaseRepository:             'CaseRepository',
  CaseGenerationService:      'CaseGenerationService',
  OutcomeResolver:            'OutcomeResolver',
  TierEvaluator:                  'TierEvaluator',
  ConsentRepository:              'ConsentRepository',
  ConsentEnforcementService:      'ConsentEnforcementService',
  SimilarityCandidateBuilder:     'SimilarityCandidateBuilder',
  SimilarityFeatureExtractor:     'SimilarityFeatureExtractor',
  SimilarityRepository:           'SimilarityRepository',
  SimilarityEngine:               'SimilarityEngine',
  VectorBuilder:                  'VectorBuilder',
  SimilarityCalculator:           'SimilarityCalculator',
  EdgeGenerator:                  'EdgeGenerator',
  AnalyticsService:           'AnalyticsService',
  SimilarityService:          'SimilarityService',
});

export class CompositionRoot {
  #container;
  #registry;
  #config;

  constructor(container, registry, config) {
    this.#container = container;
    this.#registry  = registry;
    this.#config    = config;
  }

  assemble() {
    const c = this.#container;

    // ── Infrastructure (PR-012) ────────────────────────────────────────────
    c.singleton(TOKENS.Config,         () => this.#config);
    c.singleton(TOKENS.LegacyBridge,   () => new LegacyBridge());
    c.singleton(TOKENS.StorageService, () => new LocalStorageAdapter());
    c.singleton(TOKENS.AuthService,    () => new LegacyAuthAdapter());

    // ── Record (PR-014) — DualWrite replaces bare RecordRepositoryImpl ─────
    //
    //   DualWriteRecordRepository
    //     ├─ RecordRepositoryImpl   (legacy source-of-truth, reads always from here)
    //     ├─ RecordV2Store          (shadow, same StorageService, key=ippo_state_v2)
    //     └─ DiffLogRepository      (append-only diff log, key=ippo_diff_log)
    //
    c.singleton(TOKENS.RecordRepository, (container) => {
      const storage   = container.resolve(TOKENS.StorageService);
      const legacy    = new RecordRepositoryImpl(storage);
      const v2        = new RecordV2Store(storage);
      const diffLog   = new DiffLogRepository(storage);

      // Expose DiffLogRepository on window for MigrationDashboard DevTools access
      if (typeof window !== 'undefined') window.__ippoDiffLog = diffLog;

      return new DualWriteRecordRepository(legacy, v2, diffLog);
    });

    // ── Experiment (PR-015) ────────────────────────────────────────────────
    c.singleton(TOKENS.ExperimentRepository, (container) => {
      const storage = container.resolve(TOKENS.StorageService);
      return new ExperimentRepositoryImpl(storage);
    });

    // ── Experiment Lifecycle (PR-016) ─────────────────────────────────────
    c.singleton(TOKENS.ExperimentLifecycleService, (container) => {
      const repo = container.resolve(TOKENS.ExperimentRepository);
      return new ExperimentLifecycleService(repo);
    });

    // ── Case Foundation (PR-016) ──────────────────────────────────────────
    c.singleton(TOKENS.CaseCandidateBuilder, () => new CaseCandidateBuilder());
    c.singleton(TOKENS.CaseEligibility,      () => ({ computeQualityScore, checkEligibility }));

    // ── Case Generation Engine (PR-017) ───────────────────────────────────
    c.singleton(TOKENS.CaseRepository, (container) => {
      const storage = container.resolve(TOKENS.StorageService);
      return new CaseRepositoryImpl(storage);
    });
    c.singleton(TOKENS.CaseGenerationService, (container) => {
      const repo = container.resolve(TOKENS.CaseRepository);
      return new CaseGenerationService(repo);
    });
    c.singleton(TOKENS.OutcomeResolver, () => ({ resolveOutcome }));
    c.singleton(TOKENS.TierEvaluator,   () => ({ evaluateTier }));

    // ── Consent (PR-018) ──────────────────────────────────────────────────
    c.singleton(TOKENS.ConsentRepository, (container) => {
      const storage = container.resolve(TOKENS.StorageService);
      return new ConsentRepositoryImpl(storage);
    });
    c.singleton(TOKENS.ConsentEnforcementService, () => new ConsentEnforcementService());

    // ── Similarity Foundation (PR-018) ────────────────────────────────────
    c.singleton(TOKENS.SimilarityFeatureExtractor,  () => new FeatureExtractor());
    c.singleton(TOKENS.SimilarityCandidateBuilder,  () => new SimilarityCandidateBuilder());

    // ── Similarity Engine (PR-019) ────────────────────────────────────────
    c.singleton(TOKENS.SimilarityRepository, (container) => {
      const storage = container.resolve(TOKENS.StorageService);
      return new SimilarityRepositoryImpl(storage);
    });
    c.singleton(TOKENS.VectorBuilder,        () => new VectorBuilder());
    c.singleton(TOKENS.SimilarityCalculator, () => new SimilarityCalculator());
    c.singleton(TOKENS.EdgeGenerator,        () => new EdgeGenerator());
    c.singleton(TOKENS.SimilarityEngine,     (container) => {
      const repo      = container.resolve(TOKENS.SimilarityRepository);
      const extractor = container.resolve(TOKENS.SimilarityFeatureExtractor);
      return new SimilarityEngine({ repository: repo, featureExtractor: extractor });
    });
    c.singleton(TOKENS.SimilarityService,    (container) =>
      container.resolve(TOKENS.SimilarityEngine)); // SimilarityEngine IS the SimilarityService

    // ── Null stubs — replaced in listed PRs ───────────────────────────────
    c.singleton(TOKENS.AnalyticsService,     () => null); // PR-018

    this._registerFeatures();
  }

  _registerFeatures() {
    const r = this.#registry;
    r.register('Record',     { status: 'dual-write', migratesIn: 'PR-014' }); // PR-014 ✓
    r.register('Experiment', { status: 'state-machine', migratesIn: 'PR-016' }); // PR-016 ✓
    r.register('Case',       { status: 'generating',    migratesIn: 'PR-017' }); // PR-017 ✓
    r.register('Consent',    { status: 'enforced',      migratesIn: 'PR-018' }); // PR-018 ✓
    r.register('Analytics',  { status: 'legacy',     migratesIn: 'PR-018' });
    r.register('Similarity', { status: 'active',       migratesIn: 'PR-019' }); // PR-019 ✓
    r.register('Auth',       { status: 'adapter',    migratesIn: 'PR-012' });
    r.register('B2BExport',  { status: 'legacy',     migratesIn: 'PR-020' });
  }
}
