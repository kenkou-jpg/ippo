// tests/wave2/wave2-integration.test.js — PR-074: Wave2 Integration Test Suite.
// E2E scenarios that cross Phase A〜F PR boundaries (Roadmap 責務①), plus the
// automated EC-13 / EC-14 / QC-01 verification scripts (Roadmap 責務②③).
// Per-PR business logic is already covered by each PR's own unit tests — this
// suite verifies WIRING: that services built in different PRs compose correctly
// through CompositionRoot and that no Wave2 Feature is silently dropped
// (the exact regression PR-073 fixed for PR-051〜072).
import { describe, it, expect, vi } from 'vitest';

import { buildDomainEvent }   from '../../src/domains/events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../../src/domains/events/domain-event-types.js';
import { EventStore }         from '../../src/domains/events/event-store.js';

import { buildDiseaseEntry }           from '../../src/domains/disease/disease-entity.js';
import { DiseaseClusterStatisticsService } from '../../src/domains/disease/disease-cluster-statistics-service.js';
import { SIGNAL_TYPES }                from '../../src/domains/network/network-signal-types.js';

import { CohortRepository }     from '../../src/domains/cohort/cohort-repository.js';
import { CohortBuilderService } from '../../src/domains/cohort/cohort-builder-service.js';
import { K_ANONYMITY_MIN }      from '../../src/domains/cohort/cohort-types.js';

import { DatasetVersionRepository } from '../../src/domains/dataset-version/dataset-version-repository.js';
import { DatasetVersionService }    from '../../src/domains/dataset-version/dataset-version-service.js';
import { DATASET_TYPES }            from '../../src/domains/dataset-version/dataset-version-types.js';

// ── EC-13: every Wave2 Domain Event type can be recorded in ippo_events ────────
// EventStore/SupabaseEventPersistenceRepository accept any DOMAIN_EVENT_TYPES value
// generically (no per-type whitelist) — this is what makes "all 46 event types are
// recorded" true structurally rather than requiring one persistence path per type.

describe('EC-13 — all Domain Event types are recorded via the generic EventStore', () => {
  const WAVE2_EVENT_SAMPLES = [
    ['EMOTION_SIGNAL_GENERATED',       AGGREGATE_TYPES.EMOTION],
    ['MENSTRUAL_PHASE_RESOLVED',       AGGREGATE_TYPES.RECORD],
    ['DISEASE_ENTITY_UPGRADED',        AGGREGATE_TYPES.DISEASE],
    ['DISEASE_CLUSTER_COMPUTED',       AGGREGATE_TYPES.DISEASE],
    ['FEATURE_VECTOR_V2_CREATED',      AGGREGATE_TYPES.SIMILARITY],
    ['LONGITUDINAL_EDGE_ENRICHED',     AGGREGATE_TYPES.SIMILARITY],
    ['KNOWLEDGE_GRAPH_NODE_ADDED',     AGGREGATE_TYPES.KNOWLEDGE],
    ['COHORT_DEFINED',                 AGGREGATE_TYPES.COHORT],
    ['DATASET_VERSION_PUBLISHED',      AGGREGATE_TYPES.DATASET_VERSION],
    ['RESEARCH_PLATFORM_AUDIT_COMPLETED', AGGREGATE_TYPES.RESEARCH_PLATFORM_AUDIT],
  ];

  it('every sampled Wave2 event type is a member of DOMAIN_EVENT_TYPES (SSOT)', () => {
    for (const [eventType] of WAVE2_EVENT_SAMPLES) {
      expect(Object.values(DOMAIN_EVENT_TYPES)).toContain(eventType);
    }
  });

  it('the EventStore records every Wave2 event type without a per-type whitelist', () => {
    const store = new EventStore();
    for (const [eventType, aggregateType] of WAVE2_EVENT_SAMPLES) {
      const event = buildDomainEvent({
        eventType, aggregateType, aggregateId: `agg-${eventType}`, payload: { sample: true },
      });
      store.append(event);
    }
    expect(store.count).toBe(WAVE2_EVENT_SAMPLES.length);
    for (const [eventType] of WAVE2_EVENT_SAMPLES) {
      expect(store.getByType(eventType)).toHaveLength(1);
    }
  });

  it('rejects an eventType that is not registered in the SSOT (structural safety net)', () => {
    expect(() => buildDomainEvent({
      eventType: 'NOT_A_REAL_EVENT', aggregateType: AGGREGATE_TYPES.RECORD, aggregateId: 'x', payload: {},
    })).toThrow(/Unknown eventType/);
  });
});

// ── EC-14 / QC-01: Wave2 Feature wiring completeness (the PR-073 regression class) ──

describe('EC-14 / QC-01 — CompositionRoot registers every Wave2 (PR-041〜072) Feature', () => {
  vi.mock('../../src/services/supabase.js', () => ({ supabase: null }));
  vi.mock('../../src/modules/auth/auth-service.js', () => ({
    getAuthState: vi.fn(() => ({ isReady: false, userId: null, isPremium: false, isAdmin: false })),
    AUTH_LIFECYCLE: { AUTH_READY: 'AUTH_READY' },
  }));
  vi.mock('../../src/legacy/legacy-bridge.js', () => ({
    LegacyBridge: class MockLegacyBridge { boot = vi.fn(); },
  }));
  vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));

  const WAVE2_FEATURES = [
    'NetworkSignalV2', 'EmotionSignal', 'MenstrualPhaseResolution', 'DiseaseEntityV2',
    'DiseaseClusterStatistics', 'FeatureVectorV2', 'LongitudinalEdgeEnricher', 'EnvironmentalSignal',
    'SignalIntelligenceV2', 'KnowledgeGraph', 'KnowledgeGraphBuilder', 'FeatureStore', 'CohortBuilder',
    'DatasetVersion', 'EvidenceLayer', 'SignalInsight', 'PatternDiscovery', 'CaseRecommendation',
    'SimilarCaseSearch', 'ResearchAssistance', 'AISafetyLayer', 'SimilarityEngineV2',
    'DiseaseNetworkScoreV2', 'SimilaritySnapshotV2', 'Phase3Validation', 'SimilarityPublicGate',
    'ResearchDatasetV2', 'CohortResearchExport', 'DoiCandidate', 'ResearchQueryAPI', 'ResearchPlatformAudit',
  ];

  it('lists exactly the 31 features PR-041〜072 register (regression guard for the Roadmap)', () => {
    expect(WAVE2_FEATURES).toHaveLength(31);
  });

  it('root.assemble() registers every one of the 31 Wave2 features (no silent drop)', async () => {
    const { CompositionRoot }     = await import('../../src/application/composition-root.js');
    const { DependencyContainer } = await import('../../src/bootstrap/dependency-container.js');
    const { RouteRegistry }       = await import('../../src/bootstrap/route-registry.js');
    const { loadBootstrapConfig } = await import('../../src/bootstrap/bootstrap-config.js');

    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    const config    = loadBootstrapConfig();
    const root      = new CompositionRoot(container, registry, config);
    root.assemble();

    const notRegistered = WAVE2_FEATURES.filter(name => !registry.isRegistered(name));
    expect(notRegistered).toEqual([]);
  });

  it('every Wave2 feature name is a member of RouteRegistry.KNOWN_FEATURES', async () => {
    const { RouteRegistry } = await import('../../src/bootstrap/route-registry.js');
    const registry = new RouteRegistry();
    for (const name of WAVE2_FEATURES) {
      expect(registry.knownFeatures).toContain(name);
    }
  });
});

// ── Cross-PR data flow: Disease Entity V2 (PR-045) → Cluster Stats (PR-046) →
//    Cohort (PR-054) → DatasetVersion (PR-055) — Phase A/B/C/F composed together ──

describe('Cross-phase integration — Disease Entity V2 → Cluster Stats → Cohort → DatasetVersion', () => {
  it('a disease-tagged signal population flows into a published, k-anonymous DatasetVersion', () => {
    // Phase A/B: Disease Entity V2 carries the full structure consumed downstream.
    const disease = buildDiseaseEntry({ name: 'ENDO', category: 'gynecological', severity: 'MODERATE', icdCode: 'N80' });
    expect(disease.diseaseKey).toBe('ENDO');

    // Phase B: cluster statistics computed from signals tagged with this diseaseKey.
    const clusterService = new DiseaseClusterStatisticsService();
    const signals = Array.from({ length: 6 }, (_, i) => ({
      recordId: `rec-${i}`, signalType: SIGNAL_TYPES.PAIN, normalizedValue: 0.1 * i,
    }));
    const profile = clusterService.computeClusterProfile(disease.diseaseKey, signals);
    expect(profile.caseCount).toBeGreaterThanOrEqual(K_ANONYMITY_MIN);

    // Phase C: only a k-anonymous cohort becomes eligible for publication.
    const cohortService = new CohortBuilderService({ repository: new CohortRepository() });
    const cohort = cohortService.defineCohort({ name: `${disease.diseaseKey} cohort`, createdBy: 'founder-1' });
    cohortService.confirmKAnonymity(cohort.cohortId, profile.caseCount);
    expect(() => cohortService.checkPublicationEligibility(cohort.cohortId)).not.toThrow();

    // Phase F: DatasetVersion is published with Founder attribution (BD-021).
    const datasetService = new DatasetVersionService({ repository: new DatasetVersionRepository() });
    const version = datasetService.publish({ type: DATASET_TYPES.FULL, createdBy: 'founder-1' });
    expect(version.createdBy).toBe('founder-1');
    expect(typeof version.versionId).toBe('string');
  });
});
