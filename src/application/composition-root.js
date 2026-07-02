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
// PR-023
import { NotificationScheduleService }  from '../domains/communication/notification-schedule-service.js';
import { NotificationTemplateService }  from '../domains/communication/notification-template-service.js';
import { CommunicationRepository }      from '../domains/communication/communication-repository.js';
import { CommunicationAuditLog }        from '../domains/communication/communication-audit-log.js';
import { CommunicationMetrics }         from '../domains/communication/communication-metrics.js';
// PR-024
import { DeliveryRepository }           from '../domains/delivery/delivery-repository.js';
import { DeliveryQueue }                from '../domains/delivery/delivery-queue.js';
import { DeliveryAuditLog }             from '../domains/delivery/delivery-audit-log.js';
import { DeliveryScheduler }            from '../domains/delivery/delivery-scheduler.js';
import { KpiRepository }                from '../domains/analytics/kpi-repository.js';
import { KpiSnapshot }                  from '../domains/analytics/kpi-snapshot.js';
import { Wave1DashboardService }        from '../domains/analytics/wave1-dashboard-service.js';
// PR-025
import { MockNotificationProvider }     from '../adapters/notification/mock-notification-provider.js';
import { NotificationProviderAdapter }  from '../adapters/notification/notification-provider-adapter.js';
import { DeliveryProcessor }            from '../domains/delivery/delivery-processor.js';
import { DeliveryMetrics }              from '../domains/delivery/delivery-metrics.js';
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
// PR-028
import { SymptomService }               from '../domains/symptom/symptom-service.js';
import { SymptomValidator }             from '../domains/symptom/symptom-validator.js';
import { SymptomRepository }            from '../domains/symptom/symptom-repository.js';
// PR-029
import { DiseaseService }               from '../domains/disease/disease-service.js';
import { DiseaseValidator }             from '../domains/disease/disease-validator.js';
import { DiseaseRepository }            from '../domains/disease/disease-repository.js';
// PR-030
import { NetworkSignalService }         from '../domains/network/network-signal-service.js';
import { NetworkSignalValidator }       from '../domains/network/network-signal-validator.js';
import { NetworkSignalRepository }      from '../domains/network/network-signal-repository.js';
// PR-031
import { SignalAggregationService }     from '../domains/network/signal-aggregation-service.js';
import { SignalTrendService }           from '../domains/network/signal-trend-service.js';
import { SignalTimelineService }        from '../domains/network/signal-timeline-service.js';
import { SignalSummaryService }         from '../domains/network/signal-summary-service.js';
// PR-032
import { LongitudinalSignalService }   from '../domains/network/longitudinal-signal-service.js';
import { MovingAverageService }        from '../domains/network/moving-average-service.js';
import { BaselineService }             from '../domains/network/baseline-service.js';
import { TrendWindowBuilder }          from '../domains/network/trend-window-builder.js';
import { LongitudinalSummaryService }  from '../domains/network/longitudinal-summary-service.js';
// PR-034
import { DiseaseClusterRepository }   from '../domains/disease/disease-cluster-repository.js';
import { DiseaseClusterService }      from '../domains/disease/disease-cluster-service.js';
import { DiseaseSignalMapper }        from '../domains/disease/disease-signal-mapper.js';
import { ClusterSimilarityAdapter }   from '../domains/disease/cluster-similarity-adapter.js';
// PR-037
import { EventStore }              from '../domains/events/event-store.js';
import { EventBus }                from '../domains/events/event-bus.js';
import { EventPublisher }          from '../domains/events/event-publisher.js';
import { EventReplayService }      from '../domains/events/event-replay-service.js';
import { AuditTimelineService }    from '../domains/events/audit-timeline-service.js';
import { ResearchEventAdapter }    from '../domains/events/research-event-adapter.js';
// PR-036
import { FeatureVectorRepository }        from '../domains/similarity/feature-vector-repository.js';
import { FeatureVectorService }           from '../domains/similarity/feature-vector-service.js';
import { SignalSimilarityService }        from '../domains/similarity/signal-similarity-service.js';
// PR-035
import { SignalSnapshotRepository }       from '../domains/network/signal-snapshot-repository.js';
import { SignalSnapshotService }          from '../domains/network/signal-snapshot-service.js';
import { LongitudinalSnapshotService }    from '../domains/network/longitudinal-snapshot-service.js';
import { DiseaseSnapshotService }         from '../domains/disease/disease-snapshot-service.js';
// PR-039
import { MenstrualRepository }  from '../domains/menstrual/menstrual-repository.js';
import { MenstrualService }     from '../domains/menstrual/menstrual-service.js';
// PR-038
import { EmotionRepository }   from '../domains/emotion/emotion-repository.js';
import { EmotionService }      from '../domains/emotion/emotion-service.js';
import { EmotionSignalMapper } from '../domains/emotion/emotion-signal-mapper.js';
// PR-033
import { NetworkSignalStorageRepository } from '../domains/network/network-signal-storage-repository.js';
import { PersistentNetworkSignalService } from '../domains/network/persistent-network-signal-service.js';
import { SignalReconstructionService }    from '../domains/network/signal-reconstruction-service.js';
import { ASSET_PERSISTENCE_POLICY }      from '../domains/network/network-snapshot-policy.js';
// PR-040
import { ResearchDatasetRepository } from '../domains/research/research-dataset-repository.js';
import { ResearchDatasetBuilder }    from '../domains/research/research-dataset-builder.js';
import { ResearchDatasetService }    from '../domains/research/research-dataset-service.js';
import { AnonymizationService }      from '../domains/research/anonymization-service.js';
import { DatasetExportService }      from '../domains/research/dataset-export-service.js';
// PR-041 — Wave2 NetworkSignal Repository V2
import { PERSISTENCE_CONFIG }               from '../infrastructure/persistence-config.js';
import { RepositoryProvider }               from '../infrastructure/repository-provider.js';
import { NetworkSignalPersistenceService }  from '../domains/network/network-signal-persistence-service.js';
import { NetworkSignalMemoryRepository }    from '../domains/network/network-signal-memory-repository.js';
import { NetworkSignalRepositoryFactory }   from '../domains/network/repository-factory.js';
// PR-042 — Wave2 Supabase Persistence Foundation
import { SupabaseEventPersistenceRepository } from '../infrastructure/supabase-event-persistence-repository.js';
// PR-043 — Emotion Signal Generation Foundation
import { EmotionSignalGenerator } from '../domains/network/emotion-signal-generator.js';
// PR-044 — MenstrualPhase Auto-Resolution
import { MenstrualPhaseResolverService } from '../domains/menstrual/menstrual-phase-resolver.js';
// PR-045 — Disease Entity V2 Upgrade
import { DiseaseEntityUpgradeService } from '../domains/disease/disease-entity-upgrade-service.js';
// PR-046 — Disease Cluster Statistics
import { DiseaseClusterStatisticsService } from '../domains/disease/disease-cluster-statistics-service.js';
// PR-047 — FeatureVector V2
import { FeatureVectorV2Repository } from '../domains/similarity/feature-vector-v2-repository.js';
import { FeatureVectorV2Service }    from '../domains/similarity/feature-vector-v2-service.js';
// PR-048 — Longitudinal Edge Enricher
import { LongitudinalEdgeEnricher }  from '../domains/similarity/longitudinal-edge-enricher.js';
// PR-049 — Environmental Signal Collector
import { EnvironmentalSignalCollector }        from '../domains/record/environmental-signal-collector.js';
import { EnvironmentalSignalSnapshotService }  from '../domains/record/environmental-signal-snapshot-service.js';
// PR-050 — Signal Intelligence V2
import { SignalIntelligenceV2Service }         from '../domains/network/signal-intelligence-v2-service.js';
// PR-051 — Knowledge Graph Foundation
import { KnowledgeGraphRepository } from '../domains/knowledge/knowledge-graph-repository.js';
import { KnowledgeGraphService }    from '../domains/knowledge/knowledge-graph-service.js';
// PR-052 — Knowledge Graph Builder
import { KnowledgeGraphBuilder } from '../domains/knowledge/knowledge-graph-builder.js';
// PR-053
import { FeatureStoreRepository } from '../domains/feature-store/feature-store-repository.js';
import { FeatureStoreService }    from '../domains/feature-store/feature-store-service.js';
// PR-054
import { CohortRepository }       from '../domains/cohort/cohort-repository.js';
import { CohortBuilderService }   from '../domains/cohort/cohort-builder-service.js';
// PR-055
import { DatasetVersionRepository } from '../domains/dataset-version/dataset-version-repository.js';
import { DatasetVersionService }    from '../domains/dataset-version/dataset-version-service.js';
// PR-056
import { EvidenceLayerService }     from '../domains/evidence/evidence-layer-service.js';
// PR-057
import { SignalInsightService }     from '../domains/signal-insight/signal-insight-service.js';
// PR-058
import { PatternDiscoveryService }  from '../domains/pattern-discovery/pattern-discovery-service.js';
// PR-059
import { CaseRecommendationService }  from '../domains/case-recommendation/case-recommendation-service.js';
// PR-060
import { SimilarCaseSearchService }   from '../domains/similar-case-search/similar-case-search-service.js';
// PR-061
import { ResearchAssistanceService }  from '../domains/research-assistance/research-assistance-service.js';
// PR-062
import { AISafetyValidator }          from '../domains/ai-safety/ai-safety-validator.js';
// PR-063 — Similarity Engine V2
import { SimilarityEngineV2 }          from '../domains/similarity/similarity-engine-v2.js';
// PR-064 — Disease Network Score V2
import { DiseaseNetworkScoreV2Service } from '../domains/similarity/disease-network-score-v2-service.js';
// PR-065 — Similarity Snapshot V2
import { SimilaritySnapshotV2Repository } from '../domains/similarity/similarity-snapshot-v2-repository.js';
import { SimilaritySnapshotV2Service }    from '../domains/similarity/similarity-snapshot-v2-service.js';
// PR-066 — Phase 3 Completion Validator
import { Phase3CompletionValidator }      from '../domains/network-evolution/phase3-completion-validator.js';
// PR-067 — Similarity UI Public Gate
import { SimilarityPublicGateRepository } from '../domains/network-evolution/similarity-public-gate-repository.js';
import { SimilarityPublicGateService }    from '../domains/network-evolution/similarity-public-gate-service.js';
// PR-068 — Research Dataset V2
import { ResearchDatasetV2Service }       from '../domains/research/research-dataset-v2-service.js';
// PR-069 — Cohort Research Export
import { CohortResearchExportService }    from '../domains/cohort/cohort-research-export-service.js';
// PR-070 — Dataset DOI Candidate
import { DOICandidateService }            from '../domains/dataset-version/doi-candidate-service.js';
// PR-071 — Research Query API
import { ResearchQueryApiService }        from '../domains/research-query/research-query-api-service.js';
// PR-072 — Research Platform Audit
import { ResearchPlatformAuditService }   from '../domains/research-platform-audit/research-platform-audit-service.js';

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
  // PR-023
  CommunicationRepository:        'CommunicationRepository',
  CommunicationAuditLog:          'CommunicationAuditLog',
  CommunicationMetrics:           'CommunicationMetrics',
  NotificationScheduleService:    'NotificationScheduleService',
  NotificationTemplateService:    'NotificationTemplateService',
  // PR-024
  DeliveryRepository:             'DeliveryRepository',
  DeliveryQueue:                  'DeliveryQueue',
  DeliveryAuditLog:               'DeliveryAuditLog',
  DeliveryScheduler:              'DeliveryScheduler',
  KpiRepository:                  'KpiRepository',
  KpiSnapshot:                    'KpiSnapshot',
  Wave1DashboardService:          'Wave1DashboardService',
  // PR-025
  NotificationProvider:           'NotificationProvider',
  NotificationProviderAdapter:    'NotificationProviderAdapter',
  DeliveryProcessor:              'DeliveryProcessor',
  DeliveryMetrics:                'DeliveryMetrics',
  // PR-028
  SymptomRepository:              'SymptomRepository',
  SymptomValidator:               'SymptomValidator',
  SymptomService:                 'SymptomService',
  // PR-029
  DiseaseRepository:              'DiseaseRepository',
  DiseaseValidator:               'DiseaseValidator',
  DiseaseService:                 'DiseaseService',
  // PR-030
  NetworkSignalRepository:        'NetworkSignalRepository',
  NetworkSignalValidator:         'NetworkSignalValidator',
  NetworkSignalService:           'NetworkSignalService',
  // PR-031
  SignalAggregationService:       'SignalAggregationService',
  SignalTrendService:             'SignalTrendService',
  SignalTimelineService:          'SignalTimelineService',
  SignalSummaryService:           'SignalSummaryService',
  // PR-032
  LongitudinalSignalService:      'LongitudinalSignalService',
  MovingAverageService:           'MovingAverageService',
  BaselineService:                'BaselineService',
  TrendWindowBuilder:             'TrendWindowBuilder',
  LongitudinalSummaryService:     'LongitudinalSummaryService',
  // PR-034
  DiseaseClusterRepository:   'DiseaseClusterRepository',
  DiseaseClusterService:      'DiseaseClusterService',
  DiseaseSignalMapper:        'DiseaseSignalMapper',
  ClusterSimilarityAdapter:   'ClusterSimilarityAdapter',
  // PR-033
  NetworkSignalStorageRepository: 'NetworkSignalStorageRepository',
  PersistentNetworkSignalService: 'PersistentNetworkSignalService',
  SignalReconstructionService:    'SignalReconstructionService',
  SnapshotPolicy:                 'SnapshotPolicy',
  // PR-039
  MenstrualRepository:     'MenstrualRepository',
  MenstrualService:        'MenstrualService',
  // PR-038
  EmotionRepository:       'EmotionRepository',
  EmotionService:          'EmotionService',
  EmotionSignalMapper:     'EmotionSignalMapper',
  // PR-040
  ResearchDatasetRepository: 'ResearchDatasetRepository',
  ResearchDatasetBuilder:    'ResearchDatasetBuilder',
  ResearchDatasetService:    'ResearchDatasetService',
  AnonymizationService:      'AnonymizationService',
  DatasetExportService:      'DatasetExportService',
  // PR-041 — Wave2 NetworkSignal Repository V2
  PersistenceConfig:                   'PersistenceConfig',
  RepositoryProvider:                  'RepositoryProvider',
  NetworkSignalMemoryRepository:       'NetworkSignalMemoryRepository',
  NetworkSignalRepositoryFactory:      'NetworkSignalRepositoryFactory',
  NetworkSignalPersistenceServiceV2:   'NetworkSignalPersistenceServiceV2',
  // PR-042 — Wave2 Supabase Persistence Foundation
  SupabaseClient:                      'SupabaseClient',
  SupabaseEventPersistenceRepository:  'SupabaseEventPersistenceRepository',
  // PR-043 — Emotion Signal Generation Foundation
  EmotionSignalGenerator:              'EmotionSignalGenerator',
  // PR-044 — MenstrualPhase Auto-Resolution
  MenstrualPhaseResolverService:       'MenstrualPhaseResolverService',
  // PR-045 — Disease Entity V2 Upgrade
  DiseaseEntityUpgradeService:         'DiseaseEntityUpgradeService',
  // PR-046 — Disease Cluster Statistics
  DiseaseClusterStatisticsService:     'DiseaseClusterStatisticsService',
  // PR-047 — FeatureVector V2
  FeatureVectorV2Repository:           'FeatureVectorV2Repository',
  FeatureVectorV2Service:              'FeatureVectorV2Service',
  // PR-048 — Longitudinal Edge Enricher
  LongitudinalEdgeEnricher:            'LongitudinalEdgeEnricher',
  // PR-049 — Environmental Signal Collector
  EnvironmentalSignalCollector:         'EnvironmentalSignalCollector',
  EnvironmentalSignalSnapshotService:   'EnvironmentalSignalSnapshotService',
  // PR-050 — Signal Intelligence V2
  SignalIntelligenceV2Service:          'SignalIntelligenceV2Service',
  // PR-051 — Knowledge Graph Foundation
  KnowledgeGraphRepository:            'KnowledgeGraphRepository',
  KnowledgeGraphService:               'KnowledgeGraphService',
  // PR-052 — Knowledge Graph Builder
  KnowledgeGraphBuilder:               'KnowledgeGraphBuilder',
  // PR-053 — Feature Store V1
  FeatureStoreRepository:              'FeatureStoreRepository',
  FeatureStoreService:                 'FeatureStoreService',
  // PR-054 — Cohort Builder
  CohortRepository:                    'CohortRepository',
  CohortBuilderService:                'CohortBuilderService',
  // PR-055 — Dataset Version Management
  DatasetVersionRepository:            'DatasetVersionRepository',
  DatasetVersionService:               'DatasetVersionService',
  // PR-056 — Evidence Layer
  EvidenceLayerService:                'EvidenceLayerService',
  // PR-057 — Signal Insight Service
  SignalInsightService:                'SignalInsightService',
  // PR-058 — Pattern Discovery Service
  PatternDiscoveryService:             'PatternDiscoveryService',
  // PR-059 — Case Recommendation Foundation
  CaseRecommendationService:           'CaseRecommendationService',
  // PR-060 — Similar Case Search
  SimilarCaseSearchService:            'SimilarCaseSearchService',
  ResearchAssistanceService:           'ResearchAssistanceService',
  AISafetyValidator:                   'AISafetyValidator',
  // PR-063 — Similarity Engine V2
  SimilarityEngineV2:                  'SimilarityEngineV2',
  // PR-064 — Disease Network Score V2
  DiseaseNetworkScoreV2Service:        'DiseaseNetworkScoreV2Service',
  // PR-065 — Similarity Snapshot V2
  SimilaritySnapshotV2Repository:      'SimilaritySnapshotV2Repository',
  SimilaritySnapshotV2Service:         'SimilaritySnapshotV2Service',
  // PR-066 — Phase 3 Completion Validator
  Phase3CompletionValidator:           'Phase3CompletionValidator',
  // PR-067 — Similarity UI Public Gate
  SimilarityPublicGateRepository:      'SimilarityPublicGateRepository',
  SimilarityPublicGateService:         'SimilarityPublicGateService',
  // PR-068 — Research Dataset V2
  ResearchDatasetV2Service:            'ResearchDatasetV2Service',
  // PR-069 — Cohort Research Export
  CohortResearchExportService:         'CohortResearchExportService',
  // PR-070 — Dataset DOI Candidate
  DOICandidateService:                 'DOICandidateService',
  // PR-071 — Research Query API
  ResearchQueryApiService:             'ResearchQueryApiService',
  // PR-072 — Research Platform Audit
  ResearchPlatformAuditService:        'ResearchPlatformAuditService',
  // PR-037
  EventStore:              'EventStore',
  EventBus:                'EventBus',
  EventPublisher:          'EventPublisher',
  EventReplayService:      'EventReplayService',
  AuditTimelineService:    'AuditTimelineService',
  ResearchEventAdapter:    'ResearchEventAdapter',
  // PR-036
  FeatureVectorRepository:        'FeatureVectorRepository',
  FeatureVectorService:           'FeatureVectorService',
  SignalSimilarityService:        'SignalSimilarityService',
  // PR-035
  SignalSnapshotRepository:       'SignalSnapshotRepository',
  SignalSnapshotService:          'SignalSnapshotService',
  LongitudinalSnapshotService:    'LongitudinalSnapshotService',
  DiseaseSnapshotService:         'DiseaseSnapshotService',
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

    // ── Communication Layer (PR-023) ──────────────────────────────────────
    c.singleton(TOKENS.CommunicationRepository, (container) =>
      new CommunicationRepository(container.resolve(TOKENS.StorageService)));

    c.singleton(TOKENS.CommunicationAuditLog, (container) =>
      new CommunicationAuditLog(container.resolve(TOKENS.CommunicationRepository)));

    c.singleton(TOKENS.CommunicationMetrics, (container) =>
      new CommunicationMetrics(container.resolve(TOKENS.CommunicationRepository)));

    c.singleton(TOKENS.NotificationScheduleService, () => new NotificationScheduleService());
    c.singleton(TOKENS.NotificationTemplateService, () => new NotificationTemplateService());

    // ── Delivery Layer (PR-024) ───────────────────────────────────────────
    c.singleton(TOKENS.DeliveryRepository, (container) =>
      new DeliveryRepository(container.resolve(TOKENS.StorageService)));

    c.singleton(TOKENS.DeliveryQueue, (container) =>
      new DeliveryQueue(container.resolve(TOKENS.DeliveryRepository)));

    c.singleton(TOKENS.DeliveryAuditLog, (container) =>
      new DeliveryAuditLog(container.resolve(TOKENS.DeliveryRepository)));

    c.singleton(TOKENS.DeliveryScheduler, (container) =>
      new DeliveryScheduler({
        notificationScheduleService: container.resolve(TOKENS.NotificationScheduleService),
        deliveryQueue:               container.resolve(TOKENS.DeliveryQueue),
        deliveryAuditLog:            container.resolve(TOKENS.DeliveryAuditLog),
        communicationAuditLog:       container.resolve(TOKENS.CommunicationAuditLog),
        communicationMetrics:        container.resolve(TOKENS.CommunicationMetrics),
      }));

    // ── Admin Analytics (PR-024) ──────────────────────────────────────────
    c.singleton(TOKENS.KpiRepository, (container) =>
      new KpiRepository(container.resolve(TOKENS.StorageService)));

    c.singleton(TOKENS.KpiSnapshot, (container) =>
      new KpiSnapshot(container.resolve(TOKENS.KpiRepository)));

    c.singleton(TOKENS.Wave1DashboardService, (container) =>
      new Wave1DashboardService({
        wave1MetricsService:  container.resolve(TOKENS.Wave1MetricsService),
        communicationMetrics: container.resolve(TOKENS.CommunicationMetrics),
        deliveryQueue:        container.resolve(TOKENS.DeliveryQueue),
      }));

    // ── Delivery Infrastructure (PR-025) ──────────────────────────────────
    c.singleton(TOKENS.NotificationProvider, () => new MockNotificationProvider());

    c.singleton(TOKENS.NotificationProviderAdapter, (container) =>
      new NotificationProviderAdapter(container.resolve(TOKENS.NotificationProvider)));

    c.singleton(TOKENS.DeliveryMetrics, (container) =>
      new DeliveryMetrics(
        container.resolve(TOKENS.StorageService),
        container.resolve(TOKENS.DeliveryQueue),
      ));

    c.singleton(TOKENS.DeliveryProcessor, (container) =>
      new DeliveryProcessor({
        deliveryQueue:               container.resolve(TOKENS.DeliveryQueue),
        deliveryAuditLog:            container.resolve(TOKENS.DeliveryAuditLog),
        notificationProviderAdapter: container.resolve(TOKENS.NotificationProviderAdapter),
        notificationTemplateService: container.resolve(TOKENS.NotificationTemplateService),
        deliveryMetrics:             container.resolve(TOKENS.DeliveryMetrics),
      }));

    // ── Symptom Domain (PR-028) ───────────────────────────────────────────
    c.singleton(TOKENS.SymptomRepository, (container) =>
      new SymptomRepository(container.resolve(TOKENS.StorageService)));

    c.singleton(TOKENS.SymptomValidator, () => new SymptomValidator());

    c.singleton(TOKENS.SymptomService, (container) =>
      new SymptomService({ validator: container.resolve(TOKENS.SymptomValidator) }));

    // ── Disease Domain (PR-029) ───────────────────────────────────────────
    // Storage禁止: DiseaseRepository is in-memory only (BD-004 — Wave2 elevation target)
    c.singleton(TOKENS.DiseaseRepository, () => new DiseaseRepository());

    c.singleton(TOKENS.DiseaseValidator, () => new DiseaseValidator());

    c.singleton(TOKENS.DiseaseService, (container) =>
      new DiseaseService({
        validator:  container.resolve(TOKENS.DiseaseValidator),
        repository: container.resolve(TOKENS.DiseaseRepository),
      }));

    // ── Disease Cluster Domain (PR-034) ───────────────────────────────────
    // BD-009: Wave1 cluster keys identical to diseaseKey.
    // BD-022: No Supabase / DB — in-memory only.
    c.singleton(TOKENS.DiseaseClusterRepository, () => new DiseaseClusterRepository());
    c.singleton(TOKENS.DiseaseSignalMapper,      () => new DiseaseSignalMapper());
    c.singleton(TOKENS.ClusterSimilarityAdapter, () => new ClusterSimilarityAdapter());
    c.singleton(TOKENS.DiseaseClusterService, (container) =>
      new DiseaseClusterService({
        repository: container.resolve(TOKENS.DiseaseClusterRepository),
        mapper:     container.resolve(TOKENS.DiseaseSignalMapper),
      }));

    // ── Network Signal Domain (PR-030) ────────────────────────────────────
    // NETWORK ASSET COUNCIL (IPPO-COUNCIL-002) NAC-01 / NAC-02.
    // Storage禁止 / DB禁止: NetworkSignalRepository is in-memory only.
    // BD-012: Longitudinal Signal is Wave2 scope — not wired here.
    // BD-009: DiseaseCluster is Wave2 scope — not wired here.
    c.singleton(TOKENS.NetworkSignalRepository, () => new NetworkSignalRepository());

    c.singleton(TOKENS.NetworkSignalValidator, () => new NetworkSignalValidator());

    c.singleton(TOKENS.NetworkSignalService, (container) =>
      new NetworkSignalService({
        validator:  container.resolve(TOKENS.NetworkSignalValidator),
        repository: container.resolve(TOKENS.NetworkSignalRepository),
      }));

    // ── Signal Intelligence Domain (PR-031) ───────────────────────────────
    // Wave1: stateless services — all computation is over NetworkSignal[] in-memory.
    // No DB, no Supabase, no Similarity, no DiseaseCluster, no AI.
    c.singleton(TOKENS.SignalAggregationService, () => new SignalAggregationService());
    c.singleton(TOKENS.SignalTrendService,       () => new SignalTrendService());
    c.singleton(TOKENS.SignalTimelineService,    () => new SignalTimelineService());
    c.singleton(TOKENS.SignalSummaryService,     () => new SignalSummaryService());

    // ── Persistent Signal Domain (PR-033) ────────────────────────────────────
    // BD-022: Storage abstraction only. Supabase is Wave2 scope.
    // BD-016: StorageRepository is the SSOT for persisted signals.
    c.singleton(TOKENS.SnapshotPolicy, () => Object.freeze({ ...ASSET_PERSISTENCE_POLICY }));

    c.singleton(TOKENS.NetworkSignalStorageRepository, (container) =>
      new NetworkSignalStorageRepository({ storage: container.resolve(TOKENS.StorageService) }));

    c.singleton(TOKENS.PersistentNetworkSignalService, (container) =>
      new PersistentNetworkSignalService({
        signalRepository:  container.resolve(TOKENS.NetworkSignalRepository),
        storageRepository: container.resolve(TOKENS.NetworkSignalStorageRepository),
      }));

    c.singleton(TOKENS.SignalReconstructionService, () => new SignalReconstructionService());

    // ── Wave2 NetworkSignal Repository V2 (PR-041) + Supabase (PR-042) ──────
    // BD-022: NetworkSignalSupabaseRepository is the active backend (PR-042).
    // BD-015: PersistenceService publishes SIGNAL_CREATED events for Replay.
    // AP-02: Append-Only enforced — no delete/update methods exist.
    // Migration: initialize() loads Wave1 localStorage signals into the V2 repo.
    // PR-042: SupabaseClient token wired via window.supabase (set by supabase.js at boot).
    //         No direct import of supabase.js here to keep this module test-friendly.
    c.singleton(TOKENS.PersistenceConfig, () => PERSISTENCE_CONFIG);
    c.singleton(TOKENS.NetworkSignalRepositoryFactory, () => NetworkSignalRepositoryFactory);
    // Always memory — used by Wave1 code paths that bypass the V2 service.
    c.singleton(TOKENS.NetworkSignalMemoryRepository, () =>
      NetworkSignalRepositoryFactory.create({ backend: 'memory' }));
    // SupabaseClient: use the window global set by supabase.js (avoids CDN import here).
    c.singleton(TOKENS.SupabaseClient, () =>
      (typeof window !== 'undefined' && window.supabase) ? window.supabase : null);
    // RepositoryProvider: wired after EventPublisher is available (lazy singleton).
    c.singleton(TOKENS.RepositoryProvider, (container) =>
      new RepositoryProvider({
        config:          container.resolve(TOKENS.PersistenceConfig),
        migrationSource: container.resolve(TOKENS.NetworkSignalStorageRepository),
        eventPublisher:  container.resolve(TOKENS.EventPublisher),
        supabaseClient:  container.resolve(TOKENS.SupabaseClient),
      }));
    c.singleton(TOKENS.NetworkSignalPersistenceServiceV2, (container) =>
      container.resolve(TOKENS.RepositoryProvider)
               .createAndInitializeNetworkSignalPersistenceService());
    // SupabaseEventPersistenceRepository: ippo_events Append-Only Event Store (PR-042).
    c.singleton(TOKENS.SupabaseEventPersistenceRepository, (container) =>
      new SupabaseEventPersistenceRepository({
        supabaseClient: container.resolve(TOKENS.SupabaseClient),
      }));

    // ── Knowledge Graph Foundation (PR-051) — Wave2 Phase C-1 ───────────
    // BD-036: Append-Only — DELETE is permanently forbidden on kg_nodes / kg_edges.
    // BD-028: edges with evidenceCount < 5 carry lowConfidence = true.
    // BD-031: No AI/LLM — pure structural storage; Builder in PR-052 populates content.
    c.singleton(TOKENS.KnowledgeGraphRepository, () => new KnowledgeGraphRepository());
    c.singleton(TOKENS.KnowledgeGraphService, (container) =>
      new KnowledgeGraphService({
        repository:     container.resolve(TOKENS.KnowledgeGraphRepository),
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Evidence Layer (PR-056) — Wave2 Phase C-6 (Phase C capstone) ─────
    // Integrates DatasetVersion + ClusterStats + PatternEvidence + EventLogs → EvidenceSummary.
    // BD-018: EvidenceSummary carries generatedAt ISO string.
    // BD-031: Pure deterministic aggregation — no AI/LLM.
    // phaseCComplete: true — Phase D (AI Platform) entry condition met.
    // citationMetadata: Wave3 academic citation foundation (doiCandidates / platformVersion).
    c.singleton(TOKENS.EvidenceLayerService, (container) =>
      new EvidenceLayerService({
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Signal Insight Service (PR-057) — Wave2 Phase D-1 ────────────────────
    // BD-031: rule-based template generation only — no LLM.
    // BD-038: isMedicalAdvice:false machine-stamped; forbidden words auto-blocked.
    //         LOW confidence insights suppressed before returning.
    c.singleton(TOKENS.SignalInsightService, (container) =>
      new SignalInsightService({
        featureStoreService: container.resolve(TOKENS.FeatureStoreService),
        eventPublisher:      container.resolve(TOKENS.EventPublisher),
      }));

    // ── Pattern Discovery Service (PR-058) — Wave2 Phase D-2 ─────────────────
    // BD-031: rule-based Pearson correlation — no LLM.
    // BD-038: isMedicalAdvice:false machine-stamped; causal words auto-blocked.
    //         LOW confidence patterns are returned (flagged), not suppressed.
    c.singleton(TOKENS.PatternDiscoveryService, (container) =>
      new PatternDiscoveryService({
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Case Recommendation Foundation (PR-059) — Wave2 Phase D-3 ─────────────
    // BD-026: user-facing access blocked until Phase 3 Founder verification.
    // BD-029: admin:research permission required.
    // BD-030: k-anonymity k≥5 ZERO TOLERANCE — KAnonymityError on violation.
    c.singleton(TOKENS.CaseRecommendationService, (container) =>
      new CaseRecommendationService({
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Similar Case Search (PR-060) — Wave2 Phase D-4 ───────────────────────
    // BD-030: k < 5 → KAnonymityError (ZERO TOLERANCE).
    // BD-021: case data is read-only (no mutations).
    // Access: admin:research only via ApiGateway permission check.
    c.singleton(TOKENS.SimilarCaseSearchService, (container) =>
      new SimilarCaseSearchService({
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── AI Safety Layer (PR-062) — Wave2 Phase D capstone ────────────────────
    // BD-031: audits all Phase D service statuses for rule-based compliance.
    // BD-038: canonical forbidden word check + isMedicalAdvice:false enforcement.
    // Phase D complete when all 5 Phase D services pass audit.
    c.singleton(TOKENS.AISafetyValidator, (container) =>
      new AISafetyValidator({
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Similarity Engine V2 (PR-063) — Wave2 Phase E-1 ──────────────────────
    // BD-042: 12-dim FeatureVector V2 cosine similarity. V1/V2 mixing rejected at input.
    // BD-001: V1 edges are never touched — reuses the SAME SimilarityRepository
    //         (similarity_edges table); V2 edges are additive rows (vectorVersion='2').
    // Threshold parity with V1: uses EdgeGenerator.DEFAULT_THRESHOLD (0.5).
    c.singleton(TOKENS.SimilarityEngineV2, (container) =>
      new SimilarityEngineV2({
        repository:     container.resolve(TOKENS.SimilarityRepository),
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Disease Network Score V2 (PR-064) — Wave2 Phase E-2 ──────────────────
    // Integrates DiseaseClusterStatisticsService profile × SimilarityEngineV2 edges ×
    // LongitudinalEdgeEnricher context. BD-042: V1 edges filtered out internally.
    // BD-018: every NetworkScore carries generatedAt + vectorVersion='2'.
    c.singleton(TOKENS.DiseaseNetworkScoreV2Service, (container) =>
      new DiseaseNetworkScoreV2Service({
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Similarity Snapshot V2 (PR-065) — Wave2 Phase E-3 ────────────────────
    // BD-042: SimilaritySnapshotV2Repository rejects non-'2' snapshots — V1/V2 generation
    //         separation is structural (two independent stores), not just filtering.
    // BD-023: SimilaritySnapshotV2Service never overwrites — each createSnapshot() appends
    //         a brand-new snapshotId (Append-Only, BD-032).
    c.singleton(TOKENS.SimilaritySnapshotV2Repository, () => new SimilaritySnapshotV2Repository());
    c.singleton(TOKENS.SimilaritySnapshotV2Service, (container) =>
      new SimilaritySnapshotV2Service({
        repository:     container.resolve(TOKENS.SimilaritySnapshotV2Repository),
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Phase 3 Completion Validator (PR-066) — Wave2 Phase E-4 ──────────────
    // NETWORK_EVOLUTION_COUNCIL Section 2-C / BD-026: mechanically verifies Phase 3
    // completion (per-disease Case count >= 50 + statistics confidence, across >= 5
    // clusters). assertComplete() is the hard gate PR-067 must call before Similarity
    // UI publication.
    c.singleton(TOKENS.Phase3CompletionValidator, (container) =>
      new Phase3CompletionValidator({
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Similarity UI Public Gate (PR-067) — Wave2 Phase E capstone ──────────
    // BD-026 / BD-027: Founder approval is hard-blocked (Phase3IncompleteError) unless
    // Phase3CompletionValidator confirms Phase 3 completion. Approval records are
    // Append-Only (BD-032) — this service never flips CaseRecommendationService's
    // structural PHASE3_COMPLETE constant; that remains a deliberate code change.
    c.singleton(TOKENS.SimilarityPublicGateRepository, () => new SimilarityPublicGateRepository());
    c.singleton(TOKENS.SimilarityPublicGateService, (container) =>
      new SimilarityPublicGateService({
        phase3Validator: container.resolve(TOKENS.Phase3CompletionValidator),
        repository:      container.resolve(TOKENS.SimilarityPublicGateRepository),
        eventPublisher:  container.resolve(TOKENS.EventPublisher),
      }));

    // ── Research Dataset V2 (PR-068) — Wave2 Phase F開始 ─────────────────────
    // Composes Layer 2〜9 assets (Signal/Disease/Case/V2 Edge/ClusterStats/KG) and
    // publishes through DatasetVersionService (PR-055) under explicit Founder approval.
    // BD-030: any included cluster with caseCount < 5 blocks generation entirely.
    c.singleton(TOKENS.ResearchDatasetV2Service, (container) =>
      new ResearchDatasetV2Service({
        datasetVersionService: container.resolve(TOKENS.DatasetVersionService),
        eventPublisher:        container.resolve(TOKENS.EventPublisher),
      }));

    // ── Cohort Research Export (PR-069) — Wave2 Phase F継続 ──────────────────
    // BD-039: re-verifies cohort eligibility via CohortBuilderService immediately before
    // every export. Reuses DatasetExportService (PR-040) for JSON/CSV/PARQUET serialization
    // and DatasetVersionService (PR-055, cohortId-aware naming) for Append-Only publication.
    c.singleton(TOKENS.CohortResearchExportService, (container) =>
      new CohortResearchExportService({
        cohortBuilderService:  container.resolve(TOKENS.CohortBuilderService),
        datasetVersionService: container.resolve(TOKENS.DatasetVersionService),
      }));

    // ── Dataset DOI Candidate (PR-070) — Wave2 Phase F継続 ───────────────────
    // Stateless: assigns 10.{ippo-prefix}/{datasetVersionId} DOI candidates and generates
    // APA/Nature citations from already-published DatasetVersion records (PR-055).
    c.singleton(TOKENS.DOICandidateService, () => new DOICandidateService());

    // ── Research Query API (PR-071) — Wave2 Phase F継続 ──────────────────────
    // BD-030: COHORT_STATS / SIGNAL_CORRELATION / DISEASE_CLUSTER_COMPARE are k-anonymity
    // gated (k>=5); KG_PATH_QUERY is structural-only (read-only KG traversal, BD-036).
    // Integrates Cohort Builder (PR-054) / Research Assistance (PR-061, wraps Evidence
    // Layer PR-056) / Knowledge Graph (PR-051/052) into 4 QueryTypes.
    c.singleton(TOKENS.ResearchQueryApiService, (container) =>
      new ResearchQueryApiService({
        evidenceLayerService:      container.resolve(TOKENS.EvidenceLayerService),
        researchAssistanceService: container.resolve(TOKENS.ResearchAssistanceService),
        cohortBuilderService:      container.resolve(TOKENS.CohortBuilderService),
        knowledgeGraphService:     container.resolve(TOKENS.KnowledgeGraphService),
        eventPublisher:            container.resolve(TOKENS.EventPublisher),
      }));

    // ── Research Platform Audit (PR-072) — Wave2 Phase F capstone ────────────
    // BD-021 / BD-030 / BD-036 / BD-037 / BD-039 の全チェック + k-anonymity 全 Dataset 再検証 +
    // AI Safety Layer（PR-062）整合性確認を統合し、Founder確認用の Research Platform Audit
    // Report を生成する。allPass 時に phaseFComplete=true（Phase G 入口条件成立）。
    c.singleton(TOKENS.ResearchPlatformAuditService, (container) =>
      new ResearchPlatformAuditService({
        datasetVersionService:    container.resolve(TOKENS.DatasetVersionService),
        cohortBuilderService:     container.resolve(TOKENS.CohortBuilderService),
        knowledgeGraphRepository: container.resolve(TOKENS.KnowledgeGraphRepository),
        aiSafetyValidator:        container.resolve(TOKENS.AISafetyValidator),
        eventPublisher:           container.resolve(TOKENS.EventPublisher),
      }));

    // ── Research Assistance (PR-061) — Wave2 Phase D-5 ───────────────────────
    // BD-031: rule-based descriptive statistics + Pearson r — no LLM.
    // BD-038: isMedicalAdvice:false stamped; causal language auto-blocked.
    // Access: admin:research only via ApiGateway permission check.
    c.singleton(TOKENS.ResearchAssistanceService, (container) =>
      new ResearchAssistanceService({
        eventPublisher:      container.resolve(TOKENS.EventPublisher),
        evidenceLayerService: container.resolve(TOKENS.EvidenceLayerService),
      }));

    // ── Dataset Version Management (PR-055) — Wave2 Phase C-5 ───────────
    // BD-021: DatasetVersion は Append-Only — バージョン固定後の内容変更禁止。
    // BD-018: publishedAt ISO string 必須（via buildDatasetVersion）。
    // 命名: IPPO-DATASET-{TYPE}-v{MAJOR}.{MINOR}-{YYYYMMDD}
    // doi_candidate: UUID v4-like 文字列（将来の DOI 申請用）。
    c.singleton(TOKENS.DatasetVersionRepository, () => new DatasetVersionRepository());
    c.singleton(TOKENS.DatasetVersionService, (container) =>
      new DatasetVersionService({
        repository:     container.resolve(TOKENS.DatasetVersionRepository),
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Cohort Builder (PR-054) — Wave2 Phase C-4 ───────────────────────
    // BD-039: k-anonymity k >= K_ANONYMITY_MIN (5) — cohorts with fewer cases are forbidden from publication.
    // BD-018: CohortDefinition carries createdAt ISO string.
    // BD-032: confirmKAnonymity() returns a new frozen object — no in-place mutation.
    // BD-031: Pure deterministic service — no AI / LLM.
    c.singleton(TOKENS.CohortRepository,     () => new CohortRepository());
    c.singleton(TOKENS.CohortBuilderService, (container) =>
      new CohortBuilderService({
        repository:     container.resolve(TOKENS.CohortRepository),
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Feature Store V1 (PR-053) — Wave2 Phase C-3 ─────────────────────
    // BD-037: compute() enforces Supabase-only signal source; in-memory signals rejected.
    // BD-018: FeatureMatrix has computedAt ISO string (via buildFeatureMatrix).
    // BD-031: Pure deterministic computation — no AI/LLM.
    // 6 features: avg_pain_30d / avg_sleep_30d / avg_symptom_30d /
    //             menstrual_regularity / longitudinal_delta_pain / phase_pain_distribution
    c.singleton(TOKENS.FeatureStoreRepository, () => new FeatureStoreRepository());
    c.singleton(TOKENS.FeatureStoreService, (container) =>
      new FeatureStoreService({
        repository:     container.resolve(TOKENS.FeatureStoreRepository),
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Knowledge Graph Builder (PR-052) — Wave2 Phase C-2 ───────────────
    // BD-028: Disease × Symptom × Outcome KG 骨格を Research Dataset から構築。
    // BD-031: 純粋ルールベース — AI/LLM 禁止。
    // BD-018: KnowledgeGraphSnapshot には generatedAt 必須。
    // BD-036: すべての insert は KgService 経由 (Append-Only)。
    c.singleton(TOKENS.KnowledgeGraphBuilder, (container) =>
      new KnowledgeGraphBuilder({
        kgService:      container.resolve(TOKENS.KnowledgeGraphService),
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Signal Intelligence V2 (PR-050) — Wave2 Phase B-5 ───────────────
    // BD-024: Emotion Signal now included in all aggregations (Wave2 active).
    // BD-022: signal source = NetworkSignalPersistenceServiceV2 (persistent store).
    // BD-038: Rule-based computation — no AI, no LLM.
    // Delegates to Wave1 stateless services; adds aggregateByPhase() + createDailySnapshot().
    c.singleton(TOKENS.SignalIntelligenceV2Service, (container) =>
      new SignalIntelligenceV2Service({
        persistenceService: container.resolve(TOKENS.NetworkSignalPersistenceServiceV2),
        aggregationService: container.resolve(TOKENS.SignalAggregationService),
        trendService:       container.resolve(TOKENS.SignalTrendService),
        timelineService:    container.resolve(TOKENS.SignalTimelineService),
        summaryService:     container.resolve(TOKENS.SignalSummaryService),
        snapshotService:    container.resolve(TOKENS.SignalSnapshotService),
      }));

    // ── Environmental Signal Collector (PR-049) — Wave2 Phase B-4 ───────
    // BD-003: Lunar Calendar UI FORBIDDEN — background data only.
    // BD-043: Environmental Signal UI display FORBIDDEN — Wave3+ scope.
    // BD-032: collect() returns NEW frozen record — original never mutated.
    c.singleton(TOKENS.EnvironmentalSignalCollector, (container) =>
      new EnvironmentalSignalCollector({
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));
    c.singleton(TOKENS.EnvironmentalSignalSnapshotService, () =>
      new EnvironmentalSignalSnapshotService());

    // ── Longitudinal Edge Enricher (PR-048) — Wave2 Phase B-3 ───────────
    // BD-012: Longitudinal Signal の Edge 付与は Wave2 スコープ — now active.
    // BD-032: enrich() returns NEW frozen edge — original never mutated.
    // trendBonus(0.05) は displayScore のみ。rawScore は EdgeGenerator が管理。
    c.singleton(TOKENS.LongitudinalEdgeEnricher, (container) =>
      new LongitudinalEdgeEnricher({
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── FeatureVector V2 Service (PR-047) — Wave2 Phase B-2 ─────────────
    // BD-010: VECTOR_VERSION='2'. BD-035: 12 dimensions.
    // BD-042: V2Repository rejects V1 vectors — no cross-version mixing.
    // BD-022: Wave1 in-memory only; Wave2 Supabase: feature_vectors_v2 table.
    c.singleton(TOKENS.FeatureVectorV2Repository, () => new FeatureVectorV2Repository());
    c.singleton(TOKENS.FeatureVectorV2Service, (container) =>
      new FeatureVectorV2Service({
        repository:     container.resolve(TOKENS.FeatureVectorV2Repository),
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Disease Cluster Statistics Service (PR-046) — Wave2 Phase B-1 ──
    // BD-009: clusterId === diseaseKey. BD-028: caller enforces k>=5 before publishing.
    // BD-018: all snapshots have generatedAt. BD-032: Append-Only snapshots.
    // Pure stateless service — no AI, no LLM (BD-031/BD-038).
    c.singleton(TOKENS.DiseaseClusterStatisticsService, (container) =>
      new DiseaseClusterStatisticsService({
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Disease Entity Upgrade Service (PR-045) — Wave2 Phase A-5 ───────
    // BD-004: Disease Entity Wave2昇格. BD-032: Append-Only.
    // BD-035: diseaseKey backward compat for Case / SimilarityEdge.
    c.singleton(TOKENS.DiseaseEntityUpgradeService, (container) =>
      new DiseaseEntityUpgradeService({
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── MenstrualPhase Resolver (PR-044) — Wave2 Phase A-4 ──────────────
    // BD-014: MenstrualPhase auto-resolution is Wave2 scope (now active).
    // Pure deterministic service — no repository dependency, no AI/LLM (BD-031/BD-038).
    c.singleton(TOKENS.MenstrualPhaseResolverService,
      () => new MenstrualPhaseResolverService());

    // ── Emotion Signal Generator (PR-043) — Wave2 Phase A-3 ──────────────
    // BD-024: Emotion Signal auto-generation is now active (Wave2).
    // BD-031: Rule-based only — no AI, no LLM, no diagnosis.
    // Uses the V2 persistence service so signals are Supabase-backed (BD-022).
    c.singleton(TOKENS.EmotionSignalGenerator, (container) =>
      new EmotionSignalGenerator({
        persistenceService: container.resolve(TOKENS.NetworkSignalPersistenceServiceV2),
        eventPublisher:     container.resolve(TOKENS.EventPublisher),
      }));

    // ── Event Sourcing Domain (PR-037) ───────────────────────────────────
    // BD-015: All events replayable. BD-018: occurredAt required.
    // BD-019: Audit trail. BD-021: no deletion. BD-022: Wave1 in-memory.
    c.singleton(TOKENS.EventStore,   () => new EventStore());
    c.singleton(TOKENS.EventBus,     () => new EventBus());
    c.singleton(TOKENS.EventPublisher, (container) =>
      new EventPublisher({
        store: container.resolve(TOKENS.EventStore),
        bus:   container.resolve(TOKENS.EventBus),
      }));
    c.singleton(TOKENS.EventReplayService, (container) =>
      new EventReplayService({ store: container.resolve(TOKENS.EventStore) }));
    c.singleton(TOKENS.AuditTimelineService, (container) =>
      new AuditTimelineService({ store: container.resolve(TOKENS.EventStore) }));
    c.singleton(TOKENS.ResearchEventAdapter, () => new ResearchEventAdapter());

    // ── Research Dataset Domain (PR-040) ─────────────────────────────────
    // BD-015: RESEARCH_DATASET_CREATED events replayable.
    // BD-021: Append-Only. BD-022: Wave1 in-memory only.
    c.singleton(TOKENS.ResearchDatasetRepository, () => new ResearchDatasetRepository());
    c.singleton(TOKENS.AnonymizationService,      () => new AnonymizationService());
    c.singleton(TOKENS.DatasetExportService,      () => new DatasetExportService());
    c.singleton(TOKENS.ResearchDatasetBuilder, (container) =>
      new ResearchDatasetBuilder({
        signalService:  container.resolve(TOKENS.NetworkSignalService),
        diseaseService: container.resolve(TOKENS.DiseaseService),
        eventStore:     container.resolve(TOKENS.EventStore),
        snapshotService: container.resolve(TOKENS.SignalSnapshotService),
        featureVectorService: container.resolve(TOKENS.FeatureVectorService),
      }));
    c.singleton(TOKENS.ResearchDatasetService, (container) =>
      new ResearchDatasetService({
        repository:     container.resolve(TOKENS.ResearchDatasetRepository),
        builder:        container.resolve(TOKENS.ResearchDatasetBuilder),
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Menstrual Intelligence Domain (PR-039) ───────────────────────────
    // BD-003/BD-005: Menstrual is a core health + Research Asset.
    // NAC-01/NAC-04: MENSTRUAL signal + Longitudinal cycle integration.
    // BD-022: Wave1 in-memory only — no Supabase.
    c.singleton(TOKENS.MenstrualRepository, () => new MenstrualRepository());
    c.singleton(TOKENS.MenstrualService, (container) =>
      new MenstrualService({
        repository:     container.resolve(TOKENS.MenstrualRepository),
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Emotion Domain (PR-038) ──────────────────────────────────────────
    // BD-005: Emotion is a Research Asset (NAC-01 → SIGNAL_TYPES.EMOTION).
    // BD-015: EmotionCreated events are replayable.
    // BD-022: Wave1 in-memory only — no Supabase.
    c.singleton(TOKENS.EmotionRepository,   () => new EmotionRepository());
    c.singleton(TOKENS.EmotionSignalMapper, () => new EmotionSignalMapper());
    c.singleton(TOKENS.EmotionService, (container) =>
      new EmotionService({
        repository:     container.resolve(TOKENS.EmotionRepository),
        eventPublisher: container.resolve(TOKENS.EventPublisher),
      }));

    // ── Similarity Intelligence Domain (PR-036) ──────────────────────────
    // BD-009: DiseaseCluster integration (Wave1 partial; Wave2 full cluster-aware vectors).
    // BD-010/BD-011: vectorVersion on every FeatureVector.
    // BD-018: generatedAt on every FeatureVector.
    // BD-022: Wave1 in-memory only — no Supabase.
    c.singleton(TOKENS.FeatureVectorRepository, () => new FeatureVectorRepository());
    c.singleton(TOKENS.FeatureVectorService, (container) =>
      new FeatureVectorService({
        repository: container.resolve(TOKENS.FeatureVectorRepository),
      }));
    c.singleton(TOKENS.SignalSimilarityService, (container) =>
      new SignalSimilarityService({
        featureVectorService:  container.resolve(TOKENS.FeatureVectorService),
        diseaseClusterService: container.resolve(TOKENS.DiseaseClusterService),
      }));

    // ── Snapshot Domain (PR-035) ─────────────────────────────────────────
    // BD-018: ALL snapshots must carry generatedAt + vectorVersion.
    // BD-022: Wave1 in-memory only — no Supabase.
    c.singleton(TOKENS.SignalSnapshotRepository,    () => new SignalSnapshotRepository());
    c.singleton(TOKENS.SignalSnapshotService, (container) =>
      new SignalSnapshotService({
        repository:          container.resolve(TOKENS.SignalSnapshotRepository),
        signalSummaryService: container.resolve(TOKENS.SignalSummaryService),
      }));
    c.singleton(TOKENS.LongitudinalSnapshotService, (container) =>
      new LongitudinalSnapshotService({
        longitudinalSummaryService: container.resolve(TOKENS.LongitudinalSummaryService),
      }));
    c.singleton(TOKENS.DiseaseSnapshotService, (container) =>
      new DiseaseSnapshotService({
        diseaseService:        container.resolve(TOKENS.DiseaseService),
        diseaseClusterService: container.resolve(TOKENS.DiseaseClusterService),
      }));

    // ── Longitudinal Domain (PR-032) ──────────────────────────────────────
    // NAC-04 Wave1: Moving Average / Baseline / TrendWindow / LongitudinalSummary
    // No DB, no Supabase, no Similarity, no DiseaseCluster, no AI, no Prediction.
    c.singleton(TOKENS.LongitudinalSignalService,  () => new LongitudinalSignalService());
    c.singleton(TOKENS.MovingAverageService,       () => new MovingAverageService());
    c.singleton(TOKENS.BaselineService,            () => new BaselineService());
    c.singleton(TOKENS.TrendWindowBuilder,         () => new TrendWindowBuilder());
    c.singleton(TOKENS.LongitudinalSummaryService, (container) =>
      new LongitudinalSummaryService({
        baselineService:      container.resolve(TOKENS.BaselineService),
        movingAverageService: container.resolve(TOKENS.MovingAverageService),
        trendService:         container.resolve(TOKENS.SignalTrendService),
        windowBuilder:        container.resolve(TOKENS.TrendWindowBuilder),
      }));

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
      // PR-023
      notificationScheduleService: container.resolve(TOKENS.NotificationScheduleService),
      notificationTemplateService: container.resolve(TOKENS.NotificationTemplateService),
      communicationMetrics:        container.resolve(TOKENS.CommunicationMetrics),
      // PR-024
      deliveryScheduler:    container.resolve(TOKENS.DeliveryScheduler),
      wave1DashboardService: container.resolve(TOKENS.Wave1DashboardService),
      kpiSnapshot:          container.resolve(TOKENS.KpiSnapshot),
      // PR-025
      deliveryProcessor: container.resolve(TOKENS.DeliveryProcessor),
      deliveryMetrics:   container.resolve(TOKENS.DeliveryMetrics),
      // PR-028
      symptomService:    container.resolve(TOKENS.SymptomService),
      // PR-029
      diseaseService:       container.resolve(TOKENS.DiseaseService),
      // PR-030
      networkSignalService: container.resolve(TOKENS.NetworkSignalService),
      // PR-031
      signalAggregationService: container.resolve(TOKENS.SignalAggregationService),
      signalTrendService:       container.resolve(TOKENS.SignalTrendService),
      signalTimelineService:    container.resolve(TOKENS.SignalTimelineService),
      signalSummaryService:     container.resolve(TOKENS.SignalSummaryService),
      // PR-032
      longitudinalSignalService:  container.resolve(TOKENS.LongitudinalSignalService),
      movingAverageService:       container.resolve(TOKENS.MovingAverageService),
      baselineService:            container.resolve(TOKENS.BaselineService),
      trendWindowBuilder:         container.resolve(TOKENS.TrendWindowBuilder),
      longitudinalSummaryService: container.resolve(TOKENS.LongitudinalSummaryService),
      // PR-033
      persistentNetworkSignalService: container.resolve(TOKENS.PersistentNetworkSignalService),
      signalReconstructionService:    container.resolve(TOKENS.SignalReconstructionService),
      // PR-034
      diseaseClusterService:    container.resolve(TOKENS.DiseaseClusterService),
      diseaseSignalMapper:      container.resolve(TOKENS.DiseaseSignalMapper),
      clusterSimilarityAdapter: container.resolve(TOKENS.ClusterSimilarityAdapter),
      // PR-037
      eventPublisher:       container.resolve(TOKENS.EventPublisher),
      eventReplayService:   container.resolve(TOKENS.EventReplayService),
      auditTimelineService: container.resolve(TOKENS.AuditTimelineService),
      // PR-039
      menstrualService:     container.resolve(TOKENS.MenstrualService),
      // PR-038
      emotionService:       container.resolve(TOKENS.EmotionService),
      // PR-040
      researchDatasetService: container.resolve(TOKENS.ResearchDatasetService),
      datasetExportService:   container.resolve(TOKENS.DatasetExportService),
      anonymizationService:   container.resolve(TOKENS.AnonymizationService),
      // PR-036
      signalSimilarityService: container.resolve(TOKENS.SignalSimilarityService),
      // PR-035
      signalSnapshotService:       container.resolve(TOKENS.SignalSnapshotService),
      longitudinalSnapshotService: container.resolve(TOKENS.LongitudinalSnapshotService),
      diseaseSnapshotService:      container.resolve(TOKENS.DiseaseSnapshotService),
      // PR-041
      networkSignalPersistenceServiceV2: container.resolve(TOKENS.NetworkSignalPersistenceServiceV2),
      // PR-043
      emotionSignalGenerator: container.resolve(TOKENS.EmotionSignalGenerator),
      // PR-044
      menstrualPhaseResolver: container.resolve(TOKENS.MenstrualPhaseResolverService),
      // PR-045
      diseaseEntityUpgradeService: container.resolve(TOKENS.DiseaseEntityUpgradeService),
      // PR-046
      diseaseClusterStatisticsService: container.resolve(TOKENS.DiseaseClusterStatisticsService),
      // PR-047
      featureVectorV2Service: container.resolve(TOKENS.FeatureVectorV2Service),
      // PR-048
      longitudinalEdgeEnricher: container.resolve(TOKENS.LongitudinalEdgeEnricher),
      // PR-049
      environmentalSignalCollector:        container.resolve(TOKENS.EnvironmentalSignalCollector),
      environmentalSignalSnapshotService:  container.resolve(TOKENS.EnvironmentalSignalSnapshotService),
      // PR-050
      signalIntelligenceV2Service: container.resolve(TOKENS.SignalIntelligenceV2Service),
      // PR-051
      knowledgeGraphService: container.resolve(TOKENS.KnowledgeGraphService),
      // PR-052
      knowledgeGraphBuilder: container.resolve(TOKENS.KnowledgeGraphBuilder),
      // PR-053
      featureStoreService: container.resolve(TOKENS.FeatureStoreService),
      // PR-054
      cohortBuilderService: container.resolve(TOKENS.CohortBuilderService),
      // PR-055
      datasetVersionService: container.resolve(TOKENS.DatasetVersionService),
      // PR-056
      evidenceLayerService: container.resolve(TOKENS.EvidenceLayerService),
      // PR-057
      signalInsightService: container.resolve(TOKENS.SignalInsightService),
      // PR-058
      patternDiscoveryService: container.resolve(TOKENS.PatternDiscoveryService),
      // PR-059
      caseRecommendationService: container.resolve(TOKENS.CaseRecommendationService),
      // PR-060
      similarCaseSearchService: container.resolve(TOKENS.SimilarCaseSearchService),
      // PR-061
      researchAssistanceService: container.resolve(TOKENS.ResearchAssistanceService),
      // PR-062
      aiSafetyValidator: container.resolve(TOKENS.AISafetyValidator),
      // PR-063
      similarityEngineV2: container.resolve(TOKENS.SimilarityEngineV2),
      // PR-064
      diseaseNetworkScoreV2Service: container.resolve(TOKENS.DiseaseNetworkScoreV2Service),
      // PR-065
      similaritySnapshotV2Service: container.resolve(TOKENS.SimilaritySnapshotV2Service),
      // PR-066
      phase3CompletionValidator: container.resolve(TOKENS.Phase3CompletionValidator),
      // PR-067
      similarityPublicGateService: container.resolve(TOKENS.SimilarityPublicGateService),
      // PR-068
      researchDatasetV2Service: container.resolve(TOKENS.ResearchDatasetV2Service),
      // PR-069
      cohortResearchExportService: container.resolve(TOKENS.CohortResearchExportService),
      // PR-070
      doiCandidateService: container.resolve(TOKENS.DOICandidateService),
      // PR-071
      researchQueryApiService: container.resolve(TOKENS.ResearchQueryApiService),
      // PR-072
      researchPlatformAuditService: container.resolve(TOKENS.ResearchPlatformAuditService),
    }));

    this._registerFeatures();
  }

  _registerFeatures() {
    const r = this.#registry;
    r.register('Record',     { status: 'dual-write', migratesIn: 'PR-014' }); // PR-014 ✓
    r.register('Experiment', { status: 'state-machine', migratesIn: 'PR-016' }); // PR-016 ✓
    r.register('Case',       { status: 'generating',    migratesIn: 'PR-017' }); // PR-017 ✓
    r.register('Consent',    { status: 'enforced',      migratesIn: 'PR-018' }); // PR-018 ✓
    r.register('Analytics',  { status: 'active',      migratesIn: 'PR-024' }); // PR-024: Wave1DashboardService
    r.register('Similarity', { status: 'active',       migratesIn: 'PR-019' }); // PR-019 ✓
    r.register('Auth',       { status: 'active',     migratesIn: 'PR-020' }); // PR-020 ✓
    r.register('API',        { status: 'active',     migratesIn: 'PR-020' }); // PR-020 ✓
    r.register('RecordV2',    { status: 'read-switch-ready', migratesIn: 'PR-021' }); // PR-021 ✓
    r.register('Engagement',    { status: 'active',  migratesIn: 'PR-022' }); // PR-022 ✓
    r.register('B2BExport',    { status: 'bridged', migratesIn: 'PR-022' }); // PR-022 ✓
    r.register('Communication', { status: 'active', migratesIn: 'PR-023' }); // PR-023 ✓
    r.register('Delivery',      { status: 'active', migratesIn: 'PR-024' }); // PR-024 ✓
    r.register('Symptom',       { status: 'active', migratesIn: 'PR-028' }); // PR-028 ✓
    r.register('Disease',       { status: 'active', migratesIn: 'PR-029' }); // PR-029 ✓
    r.register('NetworkSignal',      { status: 'active', migratesIn: 'PR-030' }); // PR-030 ✓
    r.register('SignalIntelligence', { status: 'active', migratesIn: 'PR-031' }); // PR-031 ✓
    r.register('Longitudinal',       { status: 'active', migratesIn: 'PR-032' }); // PR-032 ✓
    r.register('PersistentSignal',   { status: 'active', migratesIn: 'PR-033' }); // PR-033 ✓
    r.register('DiseaseCluster',     { status: 'active', migratesIn: 'PR-034' }); // PR-034 ✓
    r.register('SignalSnapshot',          { status: 'active', migratesIn: 'PR-035' }); // PR-035 ✓
    r.register('SimilarityIntelligence', { status: 'active', migratesIn: 'PR-036' }); // PR-036 ✓
    r.register('EventSourcing',          { status: 'active', migratesIn: 'PR-037' }); // PR-037 ✓
    r.register('Emotion',                { status: 'active', migratesIn: 'PR-038' }); // PR-038 ✓
    r.register('MenstrualIntelligence', { status: 'active', migratesIn: 'PR-039' }); // PR-039 ✓
    r.register('ResearchDataset',       { status: 'active', migratesIn: 'PR-040' }); // PR-040 ✓
    r.register('NetworkSignalV2',       { status: 'active', migratesIn: 'PR-041' }); // PR-041 ✓
    r.register('EmotionSignal',         { status: 'active', migratesIn: 'PR-043' }); // PR-043 ✓
    r.register('MenstrualPhaseResolution', { status: 'active', migratesIn: 'PR-044' }); // PR-044 ✓
    r.register('DiseaseEntityV2',          { status: 'active', migratesIn: 'PR-045' }); // PR-045 ✓
    r.register('DiseaseClusterStatistics', { status: 'active', migratesIn: 'PR-046' }); // PR-046 ✓
    r.register('FeatureVectorV2',          { status: 'active', migratesIn: 'PR-047' }); // PR-047 ✓
    r.register('LongitudinalEdgeEnricher', { status: 'active', migratesIn: 'PR-048' }); // PR-048 ✓
    r.register('EnvironmentalSignal',      { status: 'active', migratesIn: 'PR-049' }); // PR-049 ✓
    r.register('SignalIntelligenceV2',     { status: 'active', migratesIn: 'PR-050' }); // PR-050 ✓
    r.register('KnowledgeGraph',           { status: 'active', migratesIn: 'PR-051' }); // PR-051 ✓
    r.register('KnowledgeGraphBuilder',    { status: 'active', migratesIn: 'PR-052' }); // PR-052 ✓
    r.register('FeatureStore',             { status: 'active', migratesIn: 'PR-053' }); // PR-053 ✓
    r.register('CohortBuilder',            { status: 'active', migratesIn: 'PR-054' }); // PR-054 ✓
    r.register('DatasetVersion',           { status: 'active', migratesIn: 'PR-055' }); // PR-055 ✓
    r.register('EvidenceLayer',            { status: 'active', migratesIn: 'PR-056' }); // PR-056 ✓ Phase C完了
    r.register('SignalInsight',            { status: 'active', migratesIn: 'PR-057' }); // PR-057 ✓ Phase D開始
    r.register('PatternDiscovery',         { status: 'active', migratesIn: 'PR-058' }); // PR-058 ✓
    r.register('CaseRecommendation',       { status: 'active', migratesIn: 'PR-059' }); // PR-059 ✓ admin:research only
    r.register('SimilarCaseSearch',        { status: 'active', migratesIn: 'PR-060' }); // PR-060 ✓ admin:research only
    r.register('ResearchAssistance',       { status: 'active', migratesIn: 'PR-061' }); // PR-061 ✓ admin:research only
    r.register('AISafetyLayer',            { status: 'active', migratesIn: 'PR-062' }); // PR-062 ✓ Phase D capstone
    r.register('SimilarityEngineV2',       { status: 'active', migratesIn: 'PR-063' }); // PR-063 ✓ Phase E開始
    r.register('DiseaseNetworkScoreV2',    { status: 'active', migratesIn: 'PR-064' }); // PR-064 ✓
    r.register('SimilaritySnapshotV2',     { status: 'active', migratesIn: 'PR-065' }); // PR-065 ✓
    r.register('ResearchQueryAPI',         { status: 'active', migratesIn: 'PR-071' }); // PR-071 ✓ admin:research only
    r.register('ResearchPlatformAudit',    { status: 'active', migratesIn: 'PR-072' }); // PR-072 ✓ Phase F capstone
  }
}
