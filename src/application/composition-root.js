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
import { PermissionService }            from '../domains/auth/permission-service.js';
import { SimilarityAccessGuard }        from '../domains/auth/similarity-access-guard.js';
import { ApiGateway }                   from './api-gateway.js';
import { RecordQueryService }           from './record-query-service.js';
import { RecordCommandService }         from './record-command-service.js';
import { ExperimentQueryService }       from './experiment-query-service.js';
import { ExperimentCommandService }     from './experiment-command-service.js';
// PR-021
import { RecordV2Repository }           from '../repositories/record/record-v2-repository.js';
// PR-022
import { ExperimentNudgeService }       from '../domains/engagement/experiment-nudge-service.js';
import { CommitmentService }            from '../domains/engagement/commitment-service.js';
import { OutcomeReminderService }       from '../domains/engagement/outcome-reminder-service.js';
import { ConsentMotivationService }     from '../domains/consent/consent-motivation-service.js';
import { B2BExportRepositoryImpl }      from '../repositories/b2b/b2b-export-repository.js';
import { RecordReadSwitch }             from '../repositories/record/record-read-switch.js';
import { RecordReadSwitchRepository }   from '../repositories/record/record-read-switch-repository.js';
import { RecordMigrationService }       from './record-migration-service.js';
import { CaseGeneratedEvent }           from '../domains/case/case-generated-event.js';
import { TierProgressService }          from './tier-progress-service.js';
import { ProfileFormationService }      from './profile-formation-service.js';
import { DiseaseTagValidator }          from './disease-tag-validator.js';
import { Wave1MetricsService }          from './wave1-metrics-service.js';

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
  // PR-020
  PermissionService:          'PermissionService',
  SimilarityAccessGuard:      'SimilarityAccessGuard',
  RecordQueryService:         'RecordQueryService',
  RecordCommandService:       'RecordCommandService',
  ExperimentQueryService:     'ExperimentQueryService',
  ExperimentCommandService:   'ExperimentCommandService',
  ApiGateway:                 'ApiGateway',
  // PR-021
  RecordV2Repository:         'RecordV2Repository',
  RecordReadSwitch:           'RecordReadSwitch',
  RecordMigrationService:     'RecordMigrationService',
  CaseGeneratedEvent:         'CaseGeneratedEvent',
  TierProgressService:        'TierProgressService',
  ProfileFormationService:    'ProfileFormationService',
  DiseaseTagValidator:        'DiseaseTagValidator',
  Wave1MetricsService:        'Wave1MetricsService',
  // PR-022
  ExperimentNudgeService:     'ExperimentNudgeService',
  CommitmentService:          'CommitmentService',
  OutcomeReminderService:     'OutcomeReminderService',
  ConsentMotivationService:   'ConsentMotivationService',
  B2BExportRepository:        'B2BExportRepository',
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

    // ── Record (PR-014 + PR-021) ───────────────────────────────────────────
    //
    //   RecordReadSwitchRepository (PR-021)
    //     ├─ DualWriteRecordRepository (writes always; reads when switch=off)
    //     │    ├─ RecordRepositoryImpl   (legacy source-of-truth)
    //     │    ├─ RecordV2Store          (shadow, key=ippo_state_v2)
    //     │    └─ DiffLogRepository      (append-only diff log, key=ippo_diff_log)
    //     └─ RecordV2Repository (reads when switch=on, promoted after matchRate≥99.9%)
    //
    c.singleton(TOKENS.RecordReadSwitch, () => new RecordReadSwitch());

    c.singleton(TOKENS.RecordRepository, (container) => {
      const storage    = container.resolve(TOKENS.StorageService);
      const legacy     = new RecordRepositoryImpl(storage);
      const v2Store    = new RecordV2Store(storage);
      const diffLog    = new DiffLogRepository(storage);

      // Expose DiffLogRepository on window for MigrationDashboard DevTools access
      if (typeof window !== 'undefined') window.__ippoDiffLog = diffLog;

      const dualWrite  = new DualWriteRecordRepository(legacy, v2Store, diffLog);
      const v2Repo     = new RecordV2Repository(v2Store);
      const readSwitch = container.resolve(TOKENS.RecordReadSwitch);

      return new RecordReadSwitchRepository(dualWrite, v2Repo, readSwitch);
    });

    c.singleton(TOKENS.RecordV2Repository, (container) => {
      const storage = container.resolve(TOKENS.StorageService);
      const v2Store = new RecordV2Store(storage);
      return new RecordV2Repository(v2Store);
    });

    c.singleton(TOKENS.RecordMigrationService, (container) =>
      new RecordMigrationService(container.resolve(TOKENS.RecordReadSwitch)));

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
    // CaseGenerationService wired in PR-021 block (with CaseGeneratedEvent)
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

    // ── Auth Domain (PR-020) ──────────────────────────────────────────────
    c.singleton(TOKENS.PermissionService, (container) => {
      const auth = container.resolve(TOKENS.AuthService);
      return new PermissionService(auth);
    });
    c.singleton(TOKENS.SimilarityAccessGuard, () => new SimilarityAccessGuard());

    // ── Application Services (PR-020) — wired for ApiGateway ─────────────
    c.singleton(TOKENS.RecordQueryService, (container) => {
      const repo = container.resolve(TOKENS.RecordRepository);
      return new RecordQueryService(repo);
    });
    c.singleton(TOKENS.RecordCommandService, (container) => {
      const repo = container.resolve(TOKENS.RecordRepository);
      return new RecordCommandService(repo);
    });
    c.singleton(TOKENS.ExperimentQueryService, (container) => {
      const repo = container.resolve(TOKENS.ExperimentRepository);
      return new ExperimentQueryService(repo);
    });
    c.singleton(TOKENS.ExperimentCommandService, (container) => {
      const repo = container.resolve(TOKENS.ExperimentRepository);
      return new ExperimentCommandService(repo);
    });

    // ── PR-021: UX Foundation Services ───────────────────────────────────
    c.singleton(TOKENS.CaseGeneratedEvent, (container) =>
      new CaseGeneratedEvent(container.resolve(TOKENS.StorageService)));

    c.singleton(TOKENS.TierProgressService,     () => new TierProgressService());
    c.singleton(TOKENS.ProfileFormationService, (container) =>
      new ProfileFormationService(container.resolve(TOKENS.TierProgressService)));
    c.singleton(TOKENS.DiseaseTagValidator,     () => new DiseaseTagValidator());
    c.singleton(TOKENS.Wave1MetricsService,     () => new Wave1MetricsService());

    // ── CaseGenerationService — rewire with CaseGeneratedEvent (PR-021) ──
    // Override the PR-017 registration to inject the event publisher.
    c.singleton(TOKENS.CaseGenerationService, (container) => {
      const repo  = container.resolve(TOKENS.CaseRepository);
      const event = container.resolve(TOKENS.CaseGeneratedEvent);
      return new CaseGenerationService(repo, event);
    });

    // ── Engagement Layer (PR-022) ─────────────────────────────────────────
    c.singleton(TOKENS.ExperimentNudgeService,   () => new ExperimentNudgeService());
    c.singleton(TOKENS.OutcomeReminderService,    () => new OutcomeReminderService());
    c.singleton(TOKENS.ConsentMotivationService,  () => new ConsentMotivationService());
    c.singleton(TOKENS.CommitmentService, (container) =>
      new CommitmentService(container.resolve(TOKENS.StorageService)));

    // ── B2BExport Migration (PR-022) ──────────────────────────────────────
    c.singleton(TOKENS.B2BExportRepository, (container) =>
      new B2BExportRepositoryImpl(container.resolve(TOKENS.StorageService)));

    // ── API Gateway (PR-020) — single public entry point for UI ──────────
    c.singleton(TOKENS.ApiGateway, (container) => new ApiGateway({
      permissionService:         container.resolve(TOKENS.PermissionService),
      similarityAccessGuard:     container.resolve(TOKENS.SimilarityAccessGuard),
      consentEnforcementService: container.resolve(TOKENS.ConsentEnforcementService),
      recordQueryService:        container.resolve(TOKENS.RecordQueryService),
      recordCommandService:      container.resolve(TOKENS.RecordCommandService),
      experimentQueryService:    container.resolve(TOKENS.ExperimentQueryService),
      experimentCommandService:  container.resolve(TOKENS.ExperimentCommandService),
      caseGenerationService:     container.resolve(TOKENS.CaseGenerationService),
      similarityEngine:          container.resolve(TOKENS.SimilarityEngine),
      // PR-021
      diseaseTagValidator:       container.resolve(TOKENS.DiseaseTagValidator),
      tierProgressService:       container.resolve(TOKENS.TierProgressService),
      profileFormationService:   container.resolve(TOKENS.ProfileFormationService),
      caseGeneratedEvent:        container.resolve(TOKENS.CaseGeneratedEvent),
      // PR-022
      experimentNudgeService:   container.resolve(TOKENS.ExperimentNudgeService),
      commitmentService:        container.resolve(TOKENS.CommitmentService),
      outcomeReminderService:   container.resolve(TOKENS.OutcomeReminderService),
      consentMotivationService: container.resolve(TOKENS.ConsentMotivationService),
    }));

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
    r.register('Auth',       { status: 'active',     migratesIn: 'PR-020' }); // PR-020 ✓
    r.register('API',        { status: 'active',     migratesIn: 'PR-020' }); // PR-020 ✓
    r.register('RecordV2',    { status: 'read-switch-ready', migratesIn: 'PR-021' }); // PR-021 ✓
    r.register('Engagement',  { status: 'active',           migratesIn: 'PR-022' }); // PR-022 ✓
    r.register('B2BExport',   { status: 'bridged',          migratesIn: 'PR-022' }); // PR-022 ✓
  }
}
