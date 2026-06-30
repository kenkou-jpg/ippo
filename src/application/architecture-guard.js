// Architecture Guard — runtime safety net for forbidden dependency patterns.
// Primary enforcement is static (import graph analysis); this catches dynamic violations.
//
// PR-011:   feature→feature, repository→ui, domain→ui
// PR-011.5: contract must be a leaf node (no domain/repo/ui imports)
// PR-012:   feature must not reach localStorage/Supabase/legacy directly
// PR-013:   UI/screens must not import repositories directly; Repository → StorageService only
// PR-014:   feature/screen must not reach RecordV2Store or DiffLog directly
const FORBIDDEN = [
  // PR-011
  { from: /\/features\/[^/]+\//, to: /\/features\/[^/]+\//, label: 'feature→feature'      },
  { from: /\/repositories\//,    to: /\/(screens|ui)\//,    label: 'repository→ui'        },
  { from: /\/domains\//,         to: /\/(screens|ui)\//,    label: 'domain→ui'            },
  // PR-011.5 — contracts are leaf nodes
  { from: /\/contracts\//,       to: /\/domains\//,         label: 'contract→domain'      },
  { from: /\/contracts\//,       to: /\/repositories\//,    label: 'contract→repository'  },
  { from: /\/contracts\//,       to: /\/(screens|ui)\//,    label: 'contract→ui'          },
  // PR-012 — features/screens bypass adapter layer
  { from: /\/features\//,        to: /\/services\/supabase/, label: 'feature→supabase'    },
  { from: /\/features\//,        to: /\/legacy\//,           label: 'feature→legacy'      },
  { from: /\/screens\//,         to: /\/services\/supabase/, label: 'screen→supabase'     },
  // PR-013 — UI must not reach repositories directly
  { from: /\/screens\//,         to: /\/repositories\//,    label: 'screen→repository'    },
  { from: /\/features\//,        to: /\/repositories\//,    label: 'feature→repository'   },
  // PR-013 — repositories must only depend on StorageService (not UI, not other repos)
  { from: /\/repositories\//,    to: /\/repositories\//,    label: 'repository→repository'},
  // PR-014 — features/screens must not reach RecordV2Store or DiffLog directly
  //           (they are internal to DualWriteRecordRepository; access via RecordCommandService)
  { from: /\/features\//,        to: /record-v2-store/,     label: 'feature→RecordV2Store'  },
  { from: /\/screens\//,         to: /record-v2-store/,     label: 'screen→RecordV2Store'   },
  { from: /\/features\//,        to: /diff-log-repository/, label: 'feature→DiffLog'        },
  { from: /\/screens\//,         to: /diff-log-repository/, label: 'screen→DiffLog'         },
  // PR-015 — UI must not reach ExperimentRepository directly;
  //           use ExperimentQueryService / ExperimentCommandService
  { from: /\/features\//,        to: /experiment-repository/, label: 'feature→ExperimentRepository' },
  { from: /\/screens\//,         to: /experiment-repository/, label: 'screen→ExperimentRepository'  },
  // PR-016 — UI must not reach ExperimentLifecycleService internals (StateMachine / TransitionAudit) directly;
  //           status changes MUST flow through ExperimentLifecycleService
  { from: /\/features\//,        to: /experiment-state-machine/, label: 'feature→ExperimentStateMachine' },
  { from: /\/screens\//,         to: /experiment-state-machine/, label: 'screen→ExperimentStateMachine'  },
  { from: /\/features\//,        to: /transition-audit/,         label: 'feature→TransitionAudit'        },
  { from: /\/screens\//,         to: /transition-audit/,         label: 'screen→TransitionAudit'         },
  // PR-017 — UI must not reach CaseRepository or TierEvaluator directly;
  //           Case creation MUST flow through CaseGenerationService
  { from: /\/features\//,        to: /case-repository/,          label: 'feature→CaseRepository'  },
  { from: /\/screens\//,         to: /case-repository/,          label: 'screen→CaseRepository'   },
  { from: /\/features\//,        to: /tier-evaluator/,           label: 'feature→TierEvaluator'   },
  { from: /\/screens\//,         to: /tier-evaluator/,           label: 'screen→TierEvaluator'    },
  // PR-018 — UI must not reach ConsentRepository or SimilarityFeatureExtractor directly
  { from: /\/features\//,        to: /consent-repository/,       label: 'feature→ConsentRepository'           },
  { from: /\/screens\//,         to: /consent-repository/,       label: 'screen→ConsentRepository'            },
  { from: /\/features\//,        to: /feature-extractor/,        label: 'feature→SimilarityFeatureExtractor'  },
  { from: /\/screens\//,         to: /feature-extractor/,        label: 'screen→SimilarityFeatureExtractor'   },
  // PR-019 — UI must not reach SimilarityRepository, EdgeGenerator, VectorBuilder,
  //           or SimilarityCalculator directly; use SimilarityEngine (the only entry point).
  { from: /\/features\//,        to: /similarity-repository/,    label: 'feature→SimilarityRepository'        },
  { from: /\/screens\//,         to: /similarity-repository/,    label: 'screen→SimilarityRepository'         },
  { from: /\/features\//,        to: /edge-generator/,           label: 'feature→EdgeGenerator'               },
  { from: /\/screens\//,         to: /edge-generator/,           label: 'screen→EdgeGenerator'                },
  { from: /\/features\//,        to: /vector-builder/,           label: 'feature→VectorBuilder'               },
  { from: /\/screens\//,         to: /vector-builder/,           label: 'screen→VectorBuilder'                },
  { from: /\/features\//,        to: /similarity-calculator/,    label: 'feature→SimilarityCalculator'        },
  { from: /\/screens\//,         to: /similarity-calculator/,    label: 'screen→SimilarityCalculator'         },
  // PR-020 — UI must not reach AuthAdapter, Repositories, or window.supabase directly;
  //           all access MUST flow through ApiGateway.
  { from: /\/features\//,        to: /legacy-auth-adapter/,      label: 'feature→LegacyAuthAdapter'           },
  { from: /\/screens\//,         to: /legacy-auth-adapter/,      label: 'screen→LegacyAuthAdapter'            },
  { from: /\/features\//,        to: /\/adapters\//,             label: 'feature→AdapterDirect'               },
  { from: /\/screens\//,         to: /\/adapters\//,             label: 'screen→AdapterDirect'                },
  // PR-022 — UI must not reach Engagement domain, StorageService, or localStorage directly.
  { from: /\/features\//,        to: /\/engagement\//,                    label: 'feature→EngagementDomain'                   },
  { from: /\/screens\//,         to: /\/engagement\//,                    label: 'screen→EngagementDomain'                    },
  { from: /\/features\//,        to: /\/adapters\/storage\//,             label: 'feature→StorageService'                     },
  { from: /\/screens\//,         to: /\/adapters\/storage\//,             label: 'screen→StorageService'                      },
  // PR-028 — UI must not reach Symptom internals directly;
  //           access via ApiGateway → validateSymptom / getSymptomTypes / getPainTypes
  { from: /\/screens\//,   to: /symptom-repository/,   label: 'screen→SymptomRepository'  },
  { from: /\/features\//,  to: /symptom-repository/,   label: 'feature→SymptomRepository' },
  { from: /\/screens\//,   to: /symptom-validator/,    label: 'screen→SymptomValidator'   },
  { from: /\/features\//,  to: /symptom-validator/,    label: 'feature→SymptomValidator'  },
  // PR-029 — UI must not reach Disease internals directly;
  //           access via ApiGateway → createDisease / getDiseases / getActiveDiseases / getResolvedDiseases
  { from: /\/screens\//,   to: /disease-repository/,   label: 'screen→DiseaseRepository'  },
  { from: /\/features\//,  to: /disease-repository/,   label: 'feature→DiseaseRepository' },
  { from: /\/screens\//,   to: /disease-service/,      label: 'screen→DiseaseService'     },
  { from: /\/features\//,  to: /disease-service/,      label: 'feature→DiseaseService'    },
  // PR-027 — UI must not reach Automation domain services directly;
  //           access via ApiGateway → retryFailedDeliveries / getSnapshotScheduleStatus / getAnalyticsStatus
  { from: /\/screens\//,   to: /delivery-retry-service/,    label: 'screen→DeliveryRetryService'   },
  { from: /\/features\//,  to: /delivery-retry-service/,    label: 'feature→DeliveryRetryService'  },
  { from: /\/screens\//,   to: /kpi-scheduler-service/,     label: 'screen→KpiSchedulerService'    },
  { from: /\/features\//,  to: /kpi-scheduler-service/,     label: 'feature→KpiSchedulerService'   },
  { from: /\/screens\//,   to: /analytics-service/,         label: 'screen→AnalyticsService'       },
  { from: /\/features\//,  to: /analytics-service/,         label: 'feature→AnalyticsService'      },
  // PR-030 — UI must not reach NetworkSignal internals directly;
  //           access via ApiGateway → createNetworkSignal / getNetworkSignals / getSignalsByRecord / getSignalsByType
  { from: /\/screens\//,   to: /network-signal-repository/, label: 'screen→NetworkSignalRepository'  },
  { from: /\/features\//,  to: /network-signal-repository/, label: 'feature→NetworkSignalRepository' },
  { from: /\/screens\//,   to: /network-signal-service/,    label: 'screen→NetworkSignalService'     },
  { from: /\/features\//,  to: /network-signal-service/,    label: 'feature→NetworkSignalService'    },
  // PR-032 — UI must not reach Longitudinal services directly;
  //           access via ApiGateway → getLongitudinalSummary / getBaseline / getMovingAverage / getTrendWindow
  { from: /\/screens\//,   to: /longitudinal-signal-service/,   label: 'screen→LongitudinalSignalService'    },
  { from: /\/features\//,  to: /longitudinal-signal-service/,   label: 'feature→LongitudinalSignalService'   },
  { from: /\/screens\//,   to: /moving-average-service/,        label: 'screen→MovingAverageService'         },
  { from: /\/features\//,  to: /moving-average-service/,        label: 'feature→MovingAverageService'        },
  { from: /\/screens\//,   to: /baseline-service/,              label: 'screen→BaselineService'              },
  { from: /\/features\//,  to: /baseline-service/,              label: 'feature→BaselineService'             },
  { from: /\/screens\//,   to: /trend-window-builder/,          label: 'screen→TrendWindowBuilder'           },
  { from: /\/features\//,  to: /trend-window-builder/,          label: 'feature→TrendWindowBuilder'          },
  { from: /\/screens\//,   to: /longitudinal-summary-service/,  label: 'screen→LongitudinalSummaryService'   },
  { from: /\/features\//,  to: /longitudinal-summary-service/,  label: 'feature→LongitudinalSummaryService'  },
  // PR-031 — UI must not reach Signal Intelligence services directly;
  //           access via ApiGateway → getSignalAggregation / getSignalTrend / getSignalTimeline / getSignalSummary
  { from: /\/screens\//,   to: /signal-aggregation-service/, label: 'screen→SignalAggregationService'  },
  { from: /\/features\//,  to: /signal-aggregation-service/, label: 'feature→SignalAggregationService' },
  { from: /\/screens\//,   to: /signal-trend-service/,       label: 'screen→SignalTrendService'        },
  { from: /\/features\//,  to: /signal-trend-service/,       label: 'feature→SignalTrendService'       },
  { from: /\/screens\//,   to: /signal-timeline-service/,    label: 'screen→SignalTimelineService'     },
  { from: /\/features\//,  to: /signal-timeline-service/,    label: 'feature→SignalTimelineService'    },
  { from: /\/screens\//,   to: /signal-summary-service/,     label: 'screen→SignalSummaryService'      },
  { from: /\/features\//,  to: /signal-summary-service/,     label: 'feature→SignalSummaryService'     },
  // PR-034 — UI must not reach DiseaseCluster internals directly;
  //           access via ApiGateway → createDiseaseCluster / getDiseaseClusters / getClusterStatistics /
  //           findDiseaseCluster / getDiseaseSignalMapping
  { from: /\/screens\//,   to: /disease-cluster-repository/,   label: 'screen→DiseaseClusterRepository'   },
  { from: /\/features\//,  to: /disease-cluster-repository/,   label: 'feature→DiseaseClusterRepository'  },
  { from: /\/screens\//,   to: /disease-cluster-service/,      label: 'screen→DiseaseClusterService'      },
  { from: /\/features\//,  to: /disease-cluster-service/,      label: 'feature→DiseaseClusterService'     },
  { from: /\/screens\//,   to: /disease-signal-mapper/,        label: 'screen→DiseaseSignalMapper'        },
  { from: /\/features\//,  to: /disease-signal-mapper/,        label: 'feature→DiseaseSignalMapper'       },
  { from: /\/screens\//,   to: /cluster-similarity-adapter/,   label: 'screen→ClusterSimilarityAdapter'   },
  { from: /\/features\//,  to: /cluster-similarity-adapter/,   label: 'feature→ClusterSimilarityAdapter'  },
  // PR-037 — UI must not reach Event Sourcing internals directly;
  //           access via ApiGateway → publishEvent / getEvents / getEventsByType /
  //           getEventsByAggregate / replayEvents / getAuditTimeline
  { from: /\/screens\//,   to: /event-store/,             label: 'screen→EventStore'             },
  { from: /\/features\//,  to: /event-store/,             label: 'feature→EventStore'            },
  { from: /\/screens\//,   to: /event-bus/,               label: 'screen→EventBus'               },
  { from: /\/features\//,  to: /event-bus/,               label: 'feature→EventBus'              },
  { from: /\/screens\//,   to: /event-replay-service/,    label: 'screen→EventReplayService'     },
  { from: /\/features\//,  to: /event-replay-service/,    label: 'feature→EventReplayService'    },
  { from: /\/screens\//,   to: /audit-timeline-service/,  label: 'screen→AuditTimelineService'   },
  { from: /\/features\//,  to: /audit-timeline-service/,  label: 'feature→AuditTimelineService'  },
  // PR-036 — UI must not reach Signal Similarity / FeatureVector internals directly;
  //           access via ApiGateway → buildFeatureVector / getFeatureVectors /
  //           calculateSimilarity / compareUsers / findTopMatches / getSimilaritySummary
  { from: /\/screens\//,   to: /feature-vector-repository/,   label: 'screen→FeatureVectorRepository'   },
  { from: /\/features\//,  to: /feature-vector-repository/,   label: 'feature→FeatureVectorRepository'  },
  { from: /\/screens\//,   to: /feature-vector-service/,      label: 'screen→FeatureVectorService'      },
  { from: /\/features\//,  to: /feature-vector-service/,      label: 'feature→FeatureVectorService'     },
  { from: /\/screens\//,   to: /fv-similarity-engine/,        label: 'screen→FvSimilarityEngine'        },
  { from: /\/features\//,  to: /fv-similarity-engine/,        label: 'feature→FvSimilarityEngine'       },
  { from: /\/screens\//,   to: /signal-similarity-service/,   label: 'screen→SignalSimilarityService'   },
  { from: /\/features\//,  to: /signal-similarity-service/,   label: 'feature→SignalSimilarityService'  },
  // PR-035 — UI must not reach Snapshot internals directly;
  //           access via ApiGateway → createSignalSnapshot / getSignalSnapshots /
  //           createLongitudinalSnapshot / getLongitudinalSnapshots / createDiseaseSnapshot / getDiseaseSnapshots
  { from: /\/screens\//,   to: /signal-snapshot-repository/,       label: 'screen→SignalSnapshotRepository'       },
  { from: /\/features\//,  to: /signal-snapshot-repository/,       label: 'feature→SignalSnapshotRepository'      },
  { from: /\/screens\//,   to: /signal-snapshot-service/,          label: 'screen→SignalSnapshotService'          },
  { from: /\/features\//,  to: /signal-snapshot-service/,          label: 'feature→SignalSnapshotService'         },
  { from: /\/screens\//,   to: /longitudinal-snapshot-service/,    label: 'screen→LongitudinalSnapshotService'    },
  { from: /\/features\//,  to: /longitudinal-snapshot-service/,    label: 'feature→LongitudinalSnapshotService'   },
  { from: /\/screens\//,   to: /disease-snapshot-service/,         label: 'screen→DiseaseSnapshotService'         },
  { from: /\/features\//,  to: /disease-snapshot-service/,         label: 'feature→DiseaseSnapshotService'        },
  // PR-033 — UI must not reach PersistentNetworkSignalService, NetworkSignalStorageRepository,
  //           or SignalReconstructionService directly;
  //           access via ApiGateway → saveNetworkSignals / getPersistentSignals / getPersistenceStatus /
  //           verifySignalIntegrity / rebuildSignals
  { from: /\/screens\//,   to: /persistent-network-signal-service/, label: 'screen→PersistentNetworkSignalService'   },
  { from: /\/features\//,  to: /persistent-network-signal-service/, label: 'feature→PersistentNetworkSignalService'  },
  { from: /\/screens\//,   to: /network-signal-storage-repository/, label: 'screen→NetworkSignalStorageRepository'   },
  { from: /\/features\//,  to: /network-signal-storage-repository/, label: 'feature→NetworkSignalStorageRepository'  },
  { from: /\/screens\//,   to: /signal-reconstruction-service/,     label: 'screen→SignalReconstructionService'      },
  { from: /\/features\//,  to: /signal-reconstruction-service/,     label: 'feature→SignalReconstructionService'     },
  // PR-026 — UI must not reach Operations domain services directly;
  //           access via ApiGateway → getDeliveryHealth / getLatestKpiSnapshot / getKpiHistory
  { from: /\/screens\//,         to: /delivery-operations-service/,       label: 'screen→DeliveryOperationsService'           },
  { from: /\/features\//,        to: /delivery-operations-service/,       label: 'feature→DeliveryOperationsService'          },
  { from: /\/screens\//,         to: /kpi-snapshot-automation-service/,   label: 'screen→KpiSnapshotAutomationService'        },
  { from: /\/features\//,        to: /kpi-snapshot-automation-service/,   label: 'feature→KpiSnapshotAutomationService'       },
  { from: /\/screens\//,         to: /delivery-health-metrics/,           label: 'screen→DeliveryHealthMetrics'               },
  { from: /\/features\//,        to: /delivery-health-metrics/,           label: 'feature→DeliveryHealthMetrics'              },
  // PR-038 — UI must not reach Emotion domain internals directly;
  //           access via ApiGateway → createEmotion / getEmotions / getEmotionStatistics /
  //           convertEmotionSignals / validateEmotion
  { from: /\/screens\//,   to: /emotion-repository/,    label: 'screen→EmotionRepository'    },
  { from: /\/features\//,  to: /emotion-repository/,    label: 'feature→EmotionRepository'   },
  { from: /\/screens\//,   to: /emotion-service/,       label: 'screen→EmotionService'       },
  { from: /\/features\//,  to: /emotion-service/,       label: 'feature→EmotionService'      },
  { from: /\/screens\//,   to: /emotion-signal-mapper/, label: 'screen→EmotionSignalMapper'  },
  { from: /\/features\//,  to: /emotion-signal-mapper/, label: 'feature→EmotionSignalMapper' },
  // PR-039 — UI must not reach Menstrual domain internals directly;
  //           access via ApiGateway → createMenstrualRecord / getMenstrualRecords /
  //           getCurrentCycle / getCycleStatistics / estimateNextCycle / validateMenstrual
  { from: /\/screens\//,   to: /menstrual-repository/,    label: 'screen→MenstrualRepository'    },
  { from: /\/features\//,  to: /menstrual-repository/,    label: 'feature→MenstrualRepository'   },
  { from: /\/screens\//,   to: /menstrual-service/,       label: 'screen→MenstrualService'       },
  { from: /\/features\//,  to: /menstrual-service/,       label: 'feature→MenstrualService'      },
  { from: /\/screens\//,   to: /cycle-analysis-service/,  label: 'screen→CycleAnalysisService'   },
  { from: /\/features\//,  to: /cycle-analysis-service/,  label: 'feature→CycleAnalysisService'  },
  { from: /\/screens\//,   to: /phase-calculator/,        label: 'screen→PhaseCalculator'        },
  { from: /\/features\//,  to: /phase-calculator/,        label: 'feature→PhaseCalculator'       },
  // PR-040 — UI must not reach Research domain internals directly;
  //           access via ApiGateway → createResearchDataset / getResearchDatasets /
  //           verifyResearchDataset / exportResearchDataset / getResearchStatistics /
  //           getAnonymizationReport
  { from: /\/screens\//,   to: /research-dataset-repository/,  label: 'screen→ResearchDatasetRepository'  },
  { from: /\/features\//,  to: /research-dataset-repository/,  label: 'feature→ResearchDatasetRepository' },
  { from: /\/screens\//,   to: /research-dataset-builder/,     label: 'screen→ResearchDatasetBuilder'     },
  { from: /\/features\//,  to: /research-dataset-builder/,     label: 'feature→ResearchDatasetBuilder'    },
  { from: /\/screens\//,   to: /dataset-export-service/,       label: 'screen→DatasetExportService'       },
  { from: /\/features\//,  to: /dataset-export-service/,       label: 'feature→DatasetExportService'      },
  { from: /\/screens\//,   to: /anonymization-service/,        label: 'screen→AnonymizationService'       },
  { from: /\/features\//,  to: /anonymization-service/,        label: 'feature→AnonymizationService'      },
  // PR-041 — UI must not reach Wave2 Repository Interface / Adapter / Factory / Provider directly;
  //           all NetworkSignal access via ApiGateway only.
  { from: /\/screens\//,   to: /network-signal-repository-interface/,  label: 'screen→INetworkSignalRepository'         },
  { from: /\/features\//,  to: /network-signal-repository-interface/,  label: 'feature→INetworkSignalRepository'        },
  { from: /\/screens\//,   to: /network-signal-memory-repository/,     label: 'screen→NetworkSignalMemoryRepository'    },
  { from: /\/features\//,  to: /network-signal-memory-repository/,     label: 'feature→NetworkSignalMemoryRepository'   },
  { from: /\/screens\//,   to: /network-signal-persistence-service/,   label: 'screen→NetworkSignalPersistenceService'  },
  { from: /\/features\//,  to: /network-signal-persistence-service/,   label: 'feature→NetworkSignalPersistenceService' },
  { from: /\/screens\//,   to: /repository-factory/,                   label: 'screen→NetworkSignalRepositoryFactory'   },
  { from: /\/features\//,  to: /repository-factory/,                   label: 'feature→NetworkSignalRepositoryFactory'  },
  { from: /\/screens\//,   to: /repository-provider/,                  label: 'screen→RepositoryProvider'               },
  { from: /\/features\//,  to: /repository-provider/,                  label: 'feature→RepositoryProvider'              },
  { from: /\/screens\//,   to: /persistence-config/,                   label: 'screen→PersistenceConfig'                },
  { from: /\/features\//,  to: /persistence-config/,                   label: 'feature→PersistenceConfig'               },
  // PR-043 — UI must not reach EmotionSignalGenerator or EmotionRules directly;
  //           access via ApiGateway → generateEmotionSignals / initializeSession.
  //           Generator → Repository is the only allowed direction (not UI → Generator).
  { from: /\/screens\//,   to: /emotion-signal-generator/,             label: 'screen→EmotionSignalGenerator'           },
  { from: /\/features\//,  to: /emotion-signal-generator/,             label: 'feature→EmotionSignalGenerator'          },
  { from: /\/screens\//,   to: /emotion-rules/,                        label: 'screen→EmotionRules'                     },
  { from: /\/features\//,  to: /emotion-rules/,                        label: 'feature→EmotionRules'                    },
  // PR-045 — UI must not reach DiseaseEntityUpgradeService directly;
  //           access via ApiGateway → upgradeDiseaseEntity().
  { from: /\/screens\//,   to: /disease-entity-upgrade-service/, label: 'screen→DiseaseEntityUpgradeService' },
  { from: /\/features\//,  to: /disease-entity-upgrade-service/, label: 'feature→DiseaseEntityUpgradeService' },
  // PR-044 — UI must not reach MenstrualPhaseResolverService directly;
  //           access via ApiGateway → saveRecord (auto-resolved at write time).
  { from: /\/screens\//,   to: /menstrual-phase-resolver/,             label: 'screen→MenstrualPhaseResolver'           },
  { from: /\/features\//,  to: /menstrual-phase-resolver/,             label: 'feature→MenstrualPhaseResolver'          },
  // PR-049 — UI must not reach EnvironmentalSignalCollector directly (BD-003 / BD-043).
  //           lunarPhase data is background-only; access via ApiGateway admin methods.
  { from: /\/screens\//,   to: /environmental-signal-collector/,        label: 'screen→EnvironmentalSignalCollector'       },
  { from: /\/features\//,  to: /environmental-signal-collector/,        label: 'feature→EnvironmentalSignalCollector'      },
  { from: /\/screens\//,   to: /environmental-signal-snapshot-service/, label: 'screen→EnvironmentalSignalSnapshotService' },
  { from: /\/features\//,  to: /environmental-signal-snapshot-service/, label: 'feature→EnvironmentalSignalSnapshotService'},
  // PR-048 — UI must not reach LongitudinalEdgeEnricher directly;
  //           access via ApiGateway → enrichSimilarityEdge / enrichSimilarityEdges.
  //           rawScore threshold enforcement stays in EdgeGenerator — enricher only adds displayScore.
  { from: /\/screens\//,   to: /longitudinal-edge-enricher/, label: 'screen→LongitudinalEdgeEnricher'  },
  { from: /\/features\//,  to: /longitudinal-edge-enricher/, label: 'feature→LongitudinalEdgeEnricher' },
  // PR-047 — UI must not reach FeatureVector V2 internals directly;
  //           access via ApiGateway → buildFeatureVectorV2 / getFeatureVectorsV2 / getLatestFeatureVectorV2.
  //           BD-042: SimilarityEngine must never mix V1 and V2 vectors — guard at both layers.
  { from: /\/screens\//,   to: /feature-vector-v2-builder/,    label: 'screen→FeatureVectorV2Builder'    },
  { from: /\/features\//,  to: /feature-vector-v2-builder/,    label: 'feature→FeatureVectorV2Builder'   },
  { from: /\/screens\//,   to: /feature-vector-v2-repository/, label: 'screen→FeatureVectorV2Repository' },
  { from: /\/features\//,  to: /feature-vector-v2-repository/, label: 'feature→FeatureVectorV2Repository'},
  { from: /\/screens\//,   to: /feature-vector-v2-service/,    label: 'screen→FeatureVectorV2Service'    },
  { from: /\/features\//,  to: /feature-vector-v2-service/,    label: 'feature→FeatureVectorV2Service'   },
  // PR-046 — UI must not reach DiseaseClusterStatisticsService or DiseaseClusterSnapshot internals directly;
  //           access via ApiGateway → computeClusterProfile / createClusterSnapshot / getCaseRankInCluster.
  { from: /\/screens\//,   to: /disease-cluster-statistics-service/,   label: 'screen→DiseaseClusterStatisticsService'  },
  { from: /\/features\//,  to: /disease-cluster-statistics-service/,   label: 'feature→DiseaseClusterStatisticsService' },
  { from: /\/screens\//,   to: /disease-cluster-snapshot-entity/,      label: 'screen→DiseaseClusterSnapshotEntity'     },
  { from: /\/features\//,  to: /disease-cluster-snapshot-entity/,      label: 'feature→DiseaseClusterSnapshotEntity'    },
  // PR-051 — UI must not reach Knowledge Graph internals directly;
  //           access via ApiGateway → addKgNode / getKgNodes / addKgEdge / getKgEdges /
  //           updateKgEdgeConfidence / getKgStatus.
  //           BD-036: DELETE is permanently forbidden — guard enforces no direct repo access.
  { from: /\/screens\//,   to: /knowledge-graph-repository/,   label: 'screen→KnowledgeGraphRepository'   },
  { from: /\/features\//,  to: /knowledge-graph-repository/,   label: 'feature→KnowledgeGraphRepository'  },
  { from: /\/screens\//,   to: /knowledge-graph-service/,      label: 'screen→KnowledgeGraphService'      },
  { from: /\/features\//,  to: /knowledge-graph-service/,      label: 'feature→KnowledgeGraphService'     },
  { from: /\/screens\//,   to: /knowledge-graph-node-entity/,  label: 'screen→KnowledgeGraphNodeEntity'   },
  { from: /\/features\//,  to: /knowledge-graph-node-entity/,  label: 'feature→KnowledgeGraphNodeEntity'  },
  { from: /\/screens\//,   to: /knowledge-graph-edge-entity/,  label: 'screen→KnowledgeGraphEdgeEntity'   },
  { from: /\/features\//,  to: /knowledge-graph-edge-entity/,  label: 'feature→KnowledgeGraphEdgeEntity'  },
  // PR-052 — UI must not reach KnowledgeGraphBuilder or KgSnapshot internals directly;
  //           access via ApiGateway → buildKnowledgeGraph.
  //           BD-031: no AI/LLM — builder is deterministic; direct calls bypass permission gate.
  { from: /\/screens\//,   to: /knowledge-graph-builder/,         label: 'screen→KnowledgeGraphBuilder'         },
  { from: /\/features\//,  to: /knowledge-graph-builder/,         label: 'feature→KnowledgeGraphBuilder'        },
  { from: /\/screens\//,   to: /knowledge-graph-snapshot-entity/,  label: 'screen→KnowledgeGraphSnapshotEntity'  },
  { from: /\/features\//,  to: /knowledge-graph-snapshot-entity/,  label: 'feature→KnowledgeGraphSnapshotEntity' },
  // PR-053 — UI must not reach Feature Store internals directly;
  //           access via ApiGateway → computeFeatureMatrix / getFeatureMatrix / getFeatureStoreStatus.
  //           BD-037: in-memory Signal 禁止 — guard enforces no direct service/repository access.
  { from: /\/screens\//,   to: /feature-store-repository/,         label: 'screen→FeatureStoreRepository'         },
  { from: /\/features\//,  to: /feature-store-repository/,         label: 'feature→FeatureStoreRepository'        },
  { from: /\/screens\//,   to: /feature-store-service/,            label: 'screen→FeatureStoreService'            },
  { from: /\/features\//,  to: /feature-store-service/,            label: 'feature→FeatureStoreService'           },
  { from: /\/screens\//,   to: /feature-matrix-entity/,            label: 'screen→FeatureMatrixEntity'            },
  { from: /\/features\//,  to: /feature-matrix-entity/,            label: 'feature→FeatureMatrixEntity'           },
  { from: /\/screens\//,   to: /feature-store-types/,              label: 'screen→FeatureStoreTypes'              },
  { from: /\/features\//,  to: /feature-store-types/,              label: 'feature→FeatureStoreTypes'             },
  // PR-054 — UI must not reach Cohort domain internals directly;
  //           access via ApiGateway → defineCohort / confirmCohortKAnonymity /
  //           checkCohortPublicationEligibility / getCohorts / getVerifiedCohorts.
  //           BD-039: k-anonymity gate must not be bypassed by direct service access.
  { from: /\/screens\//,   to: /cohort-repository/,               label: 'screen→CohortRepository'               },
  { from: /\/features\//,  to: /cohort-repository/,               label: 'feature→CohortRepository'              },
  { from: /\/screens\//,   to: /cohort-builder-service/,          label: 'screen→CohortBuilderService'           },
  { from: /\/features\//,  to: /cohort-builder-service/,          label: 'feature→CohortBuilderService'          },
  { from: /\/screens\//,   to: /cohort-definition-entity/,        label: 'screen→CohortDefinitionEntity'         },
  { from: /\/features\//,  to: /cohort-definition-entity/,        label: 'feature→CohortDefinitionEntity'        },
  { from: /\/screens\//,   to: /cohort-types/,                    label: 'screen→CohortTypes'                    },
  { from: /\/features\//,  to: /cohort-types/,                    label: 'feature→CohortTypes'                   },
  // PR-055 — UI must not reach Dataset Version internals directly;
  //           access via ApiGateway → publishDatasetVersion / getDatasetVersion / getDatasetVersions.
  //           BD-021: Append-Only — mutation bypass via direct repo access is forbidden.
  { from: /\/screens\//,   to: /dataset-version-repository/,      label: 'screen→DatasetVersionRepository'       },
  { from: /\/features\//,  to: /dataset-version-repository/,      label: 'feature→DatasetVersionRepository'      },
  { from: /\/screens\//,   to: /dataset-version-service/,         label: 'screen→DatasetVersionService'          },
  { from: /\/features\//,  to: /dataset-version-service/,         label: 'feature→DatasetVersionService'         },
  { from: /\/screens\//,   to: /dataset-version-entity/,          label: 'screen→DatasetVersionEntity'           },
  { from: /\/features\//,  to: /dataset-version-entity/,          label: 'feature→DatasetVersionEntity'          },
  { from: /\/screens\//,   to: /dataset-version-types/,           label: 'screen→DatasetVersionTypes'            },
  { from: /\/features\//,  to: /dataset-version-types/,           label: 'feature→DatasetVersionTypes'           },
  // PR-056 — UI must not reach Evidence Layer internals directly;
  //           access via ApiGateway → compileEvidence / getEvidenceLayerStatus.
  //           Evidence compilation requires admin:research — bypass via direct import is forbidden.
  { from: /\/screens\//,   to: /evidence-layer-service/,          label: 'screen→EvidenceLayerService'           },
  { from: /\/features\//,  to: /evidence-layer-service/,          label: 'feature→EvidenceLayerService'          },
  { from: /\/screens\//,   to: /evidence-summary-entity/,         label: 'screen→EvidenceSummaryEntity'          },
  { from: /\/features\//,  to: /evidence-summary-entity/,         label: 'feature→EvidenceSummaryEntity'         },
  { from: /\/screens\//,   to: /evidence-types/,                  label: 'screen→EvidenceTypes'                  },
  { from: /\/features\//,  to: /evidence-types/,                  label: 'feature→EvidenceTypes'                 },
];

export function runArchitectureGuard() {
  if (typeof window === 'undefined') return;

  window.__ippoArchGuard = {
    violations: [],
    check(from, to) {
      for (const { from: fRe, to: tRe, label } of FORBIDDEN) {
        if (fRe.test(from) && tRe.test(to)) {
          const msg = `[ArchGuard] Forbidden dependency: ${label} — "${from}" → "${to}"`;
          console.error(msg);
          this.violations.push({ from, to, label, ts: Date.now() });
        }
      }
    },
  };
}

/**
 * Verify that a class extends the expected contract base.
 * Called at adapter/repository module load time.
 */
export function assertImplementsContract(impl, contract, token) {
  if (!(impl.prototype instanceof contract)) {
    const msg = `[ArchGuard] "${token}" does not extend ${contract.name}. ` +
                `All Repository and Adapter classes must extend their contract.`;
    console.error(msg);
    if (typeof window !== 'undefined' && window.__ippoArchGuard) {
      window.__ippoArchGuard.violations.push({
        from: impl.name ?? 'unknown',
        to:   contract.name,
        label: 'missing-contract',
        ts: Date.now(),
      });
    }
  }
}
