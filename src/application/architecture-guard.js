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
  // PR-027 — UI must not reach Automation domain services directly;
  //           access via ApiGateway → retryFailedDeliveries / getSnapshotScheduleStatus / getAnalyticsStatus
  { from: /\/screens\//,   to: /delivery-retry-service/,    label: 'screen→DeliveryRetryService'   },
  { from: /\/features\//,  to: /delivery-retry-service/,    label: 'feature→DeliveryRetryService'  },
  { from: /\/screens\//,   to: /kpi-scheduler-service/,     label: 'screen→KpiSchedulerService'    },
  { from: /\/features\//,  to: /kpi-scheduler-service/,     label: 'feature→KpiSchedulerService'   },
  { from: /\/screens\//,   to: /analytics-service/,         label: 'screen→AnalyticsService'       },
  { from: /\/features\//,  to: /analytics-service/,         label: 'feature→AnalyticsService'      },
  // PR-026 — UI must not reach Operations domain services directly;
  //           access via ApiGateway → getDeliveryHealth / getLatestKpiSnapshot / getKpiHistory
  { from: /\/screens\//,         to: /delivery-operations-service/,       label: 'screen→DeliveryOperationsService'           },
  { from: /\/features\//,        to: /delivery-operations-service/,       label: 'feature→DeliveryOperationsService'          },
  { from: /\/screens\//,         to: /kpi-snapshot-automation-service/,   label: 'screen→KpiSnapshotAutomationService'        },
  { from: /\/features\//,        to: /kpi-snapshot-automation-service/,   label: 'feature→KpiSnapshotAutomationService'       },
  { from: /\/screens\//,         to: /delivery-health-metrics/,           label: 'screen→DeliveryHealthMetrics'               },
  { from: /\/features\//,        to: /delivery-health-metrics/,           label: 'feature→DeliveryHealthMetrics'              },
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
