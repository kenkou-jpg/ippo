// tests/wave2/wave2-exit-criteria.test.js — PR-074: Wave2 Integration Test Suite.
// Automated verification script for WAVE2_MASTER_DESIGN.md Section 12 Exit Criteria.
// Each describe block corresponds 1:1 to one EC-xx / QC-xx entry (BD-040).
// This suite verifies the criterion is STRUCTURALLY true today; the Founder-facing
// aggregate report + BD-001〜BD-043 full audit + WAVE2_EXIT_CONFIRMED event are PR-075 scope.
import { describe, it, expect } from 'vitest';

import { NetworkSignalPersistenceService }  from '../../src/domains/network/network-signal-persistence-service.js';
import { NetworkSignalSupabaseRepository }  from '../../src/domains/network/network-signal-supabase-repository.js';
import { NetworkSignalMemoryRepository }    from '../../src/domains/network/network-signal-memory-repository.js';

import { MenstrualPhaseResolverService } from '../../src/domains/menstrual/menstrual-phase-resolver.js';
import { MENSTRUAL_PHASES, CYCLE_LENGTH_TYPICAL } from '../../src/domains/menstrual/menstrual-types.js';

import { buildDiseaseEntry } from '../../src/domains/disease/disease-entity.js';
import { DiseaseEntityUpgradeService } from '../../src/domains/disease/disease-entity-upgrade-service.js';
import { DiseaseClusterStatisticsService } from '../../src/domains/disease/disease-cluster-statistics-service.js';

import { EventStore } from '../../src/domains/events/event-store.js';
import { SupabaseEventPersistenceRepository } from '../../src/infrastructure/supabase-event-persistence-repository.js';

import { VECTOR_VERSION_V2, FV_V2_DIMENSION_COUNT } from '../../src/domains/similarity/feature-vector-v2-types.js';
import { LongitudinalEdgeEnricher } from '../../src/domains/similarity/longitudinal-edge-enricher.js';

import { KnowledgeGraphRepository } from '../../src/domains/knowledge/knowledge-graph-repository.js';
import { KnowledgeGraphService }    from '../../src/domains/knowledge/knowledge-graph-service.js';

import { validateOutput, ForbiddenWordError } from '../../src/domains/signal-insight/forbidden-word-validator.js';

import { CohortRepository }     from '../../src/domains/cohort/cohort-repository.js';
import { CohortBuilderService } from '../../src/domains/cohort/cohort-builder-service.js';
import { K_ANONYMITY_MIN }      from '../../src/domains/cohort/cohort-types.js';

import { DatasetVersionRepository } from '../../src/domains/dataset-version/dataset-version-repository.js';
import { DatasetVersionService }    from '../../src/domains/dataset-version/dataset-version-service.js';
import { DATASET_TYPES }            from '../../src/domains/dataset-version/dataset-version-types.js';

import { SIGNAL_TYPES } from '../../src/domains/network/network-signal-types.js';
import { EMOTION_TYPES } from '../../src/domains/emotion/emotion-types.js';
import { EmotionSignalMapper } from '../../src/domains/emotion/emotion-signal-mapper.js';

// ── EC-01: NetworkSignal is persisted to Supabase (no in-memory-only backend) ──

describe('EC-01 — NetworkSignal persisted to Supabase (not in-memory)', () => {
  it('NetworkSignalSupabaseRepository reports supabase:true capability', () => {
    const repo = new NetworkSignalSupabaseRepository({ supabaseClient: null });
    expect(repo.repositoryType).toBe('supabase');
    expect(repo.capabilities.supabase).toBe(true);
    expect(repo.capabilities.persistent).toBe(true);
  });

  it('NetworkSignalPersistenceService surfaces the Supabase backend via getStatus()', () => {
    const service = new NetworkSignalPersistenceService({
      repository: new NetworkSignalSupabaseRepository({ supabaseClient: null }),
    });
    const status = service.getStatus();
    expect(status.capabilities.supabase).toBe(true);
  });

  it('Wave1 in-memory repository remains available only as the legacy/migration path (not the Wave2 default)', () => {
    const repo = new NetworkSignalMemoryRepository();
    expect(repo.capabilities.supabase).toBe(false);
  });
});

// ── EC-02: Emotion Signal auto-generation mechanism (PR-043) ──────────────────

describe('EC-02 — Emotion Signal generation mechanism is functional', () => {
  it('EmotionSignalMapper converts an Emotion entity into a SIGNAL_TYPES.EMOTION NetworkSignal', () => {
    const mapper = new EmotionSignalMapper();
    const signal = mapper.toNetworkSignal({
      id: 'em-1', emotionType: EMOTION_TYPES.HAPPY, recordId: 'rec-1', intensity: 5, source: 'user',
    });
    expect(signal.signalType).toBe(SIGNAL_TYPES.EMOTION);
    expect(signal.normalizedValue).toBeGreaterThan(0);
    expect(signal.recordId).toBe('rec-1');
  });
});

// ── EC-03: MenstrualPhase auto-resolution — zero UNKNOWN for valid cycleDay ────

describe('EC-03 — MenstrualPhase auto-resolution produces zero UNKNOWN for valid input', () => {
  it('resolves every cycleDay in [1, CYCLE_LENGTH_TYPICAL] to a concrete phase', () => {
    const resolver = new MenstrualPhaseResolverService();
    for (let cycleDay = 1; cycleDay <= CYCLE_LENGTH_TYPICAL; cycleDay++) {
      const phase = resolver.resolve({ cycleDay, cycleLength: CYCLE_LENGTH_TYPICAL });
      expect(phase).not.toBe(MENSTRUAL_PHASES.UNKNOWN);
    }
  });

  it('only returns UNKNOWN when cycleDay is absent/invalid (expected degradation, not a violation)', () => {
    const resolver = new MenstrualPhaseResolverService();
    expect(resolver.resolve({ cycleDay: null })).toBe(MENSTRUAL_PHASES.UNKNOWN);
    expect(resolver.resolveFromRecord({})).toBe(MENSTRUAL_PHASES.UNKNOWN);
  });
});

// ── EC-04: Disease Entity is a full V2 structure (icdCode / category / severity) ──

describe('EC-04 — Disease Entity V2 carries icdCode / category / severity', () => {
  it('buildDiseaseEntry produces category + severity + icdCode (V2 fields, PR-045)', () => {
    const base = buildDiseaseEntry({ name: 'ENDO', category: 'gynecological', severity: 'MODERATE', icdCode: 'N80' });
    expect(base).toHaveProperty('category', 'gynecological');
    expect(base).toHaveProperty('severity', 'MODERATE');
    expect(base).toHaveProperty('icdCode', 'N80');
    expect(base.diseaseKey).toBe('ENDO');
  });

  it('DiseaseEntityUpgradeService.upgrade() re-confirms icdCode/confirmedBy on an existing entry (BD-032 Append-Only)', () => {
    const base    = buildDiseaseEntry({ name: 'PCOS', category: 'endocrine', severity: 'MILD' });
    const upgrader = new DiseaseEntityUpgradeService();
    const upgraded = upgrader.upgrade(base, { icdCode: 'E28.2', confirmedBy: 'PHYSICIAN', relatedSymptoms: ['pain'] });
    expect(upgraded.icdCode).toBe('E28.2');
    expect(upgraded.category).toBe('endocrine');
    expect(upgraded.severity).toBe('MILD');
    expect(upgraded.diseaseKey).toBe('PCOS');
    expect(upgraded).not.toBe(base); // BD-032: new object, original untouched
  });
});

// ── EC-05: ippo_events is Immutable (no UPDATE/DELETE) ─────────────────────────

describe('EC-05 — ippo_events is Append-Only / Immutable', () => {
  it('EventStore exposes no update()/delete() methods', () => {
    const store = new EventStore();
    expect(store.update).toBeUndefined();
    expect(store.delete).toBeUndefined();
  });

  it('SupabaseEventPersistenceRepository exposes no update()/delete() methods', () => {
    const repo = new SupabaseEventPersistenceRepository({ supabaseClient: null });
    expect(repo.update).toBeUndefined();
    expect(repo.delete).toBeUndefined();
  });
});

// ── EC-06: FeatureVector V2 is 12-dimensional (VECTOR_VERSION='2') ─────────────

describe('EC-06 — FeatureVector V2 is 12-dimensional with VECTOR_VERSION=\'2\'', () => {
  it('SSOT constants confirm 12 dimensions and version 2', () => {
    expect(VECTOR_VERSION_V2).toBe('2');
    expect(FV_V2_DIMENSION_COUNT).toBe(12);
  });
});

// ── EC-07: SimilarityEdge carries longitudinalContext ──────────────────────────

describe('EC-07 — SimilarityEdge is enriched with longitudinalContext', () => {
  it('LongitudinalEdgeEnricher.enrich() always attaches a longitudinalContext', () => {
    const enricher = new LongitudinalEdgeEnricher();
    const enriched = enricher.enrich({
      edge: { edgeId: 'EDGEV2-1', sourceCaseId: 'c1', targetCaseId: 'c2', score: 0.6, vectorVersion: '2' },
      sourceSignals: [],
      targetSignals: [],
    });
    expect(enriched.longitudinalContext).toBeDefined();
    expect(enriched.longitudinalContext).toHaveProperty('sourceTrend');
    expect(enriched.longitudinalContext).toHaveProperty('targetTrend');
    expect(enriched.longitudinalContext).toHaveProperty('trendBonus');
    expect(enriched.vectorVersion).toBe('2');
  });
});

// ── EC-08: Knowledge Graph skeleton exists (Disease x Symptom x Outcome) ───────

describe('EC-08 — Knowledge Graph skeleton (nodes/edges) exists and is queryable', () => {
  it('KnowledgeGraphService reports ready status with node/edge counts', () => {
    const repository = new KnowledgeGraphRepository();
    const service     = new KnowledgeGraphService({ repository });
    repository.addNode({ nodeId: 'DISEASE:ENDO', type: 'DISEASE' });
    repository.addNode({ nodeId: 'SYMPTOM:PAIN', type: 'SYMPTOM' });
    const status = service.getStatus();
    expect(status.ready).toBe(true);
    expect(status.appendOnly).toBe(true);
    expect(status.nodeCount).toBe(2);
  });
});

// ── EC-09: AI Signal Insight / Pattern Discovery respect the diagnosis ban ─────

describe('EC-09 — AI output diagnosis ban (BD-038 ForbiddenWordValidator) is enforced', () => {
  it('allows a compliant, non-diagnostic output', () => {
    expect(() => validateOutput('過去30日の平均PAINスコアは0.42でした。', false)).not.toThrow();
  });

  it('blocks diagnostic language', () => {
    expect(() => validateOutput('子宮内膜症と診断されます。', false)).toThrow(ForbiddenWordError);
  });

  it('blocks any output not explicitly flagged isMedicalAdvice:false', () => {
    expect(() => validateOutput('summary text', true)).toThrow(/isMedicalAdvice must be false/);
  });
});

// ── EC-10: Cohort Builder works and can gate Research Dataset V2 generation ────

describe('EC-10 — Cohort Builder operates and enforces k-anonymity before eligibility', () => {
  it('a cohort becomes eligible only after k-anonymity (k>=5) is confirmed', () => {
    const service = new CohortBuilderService({ repository: new CohortRepository() });
    const cohort  = service.defineCohort({ name: 'ENDO cohort', createdBy: 'founder-1' });
    expect(() => service.checkPublicationEligibility(cohort.cohortId)).toThrow();
    service.confirmKAnonymity(cohort.cohortId, K_ANONYMITY_MIN + 5);
    expect(() => service.checkPublicationEligibility(cohort.cohortId)).not.toThrow();
  });
});

// ── EC-11: DatasetVersion carries a versionId ──────────────────────────────────

describe('EC-11 — DatasetVersion is assigned a versionId on publish', () => {
  it('publish() returns a version with a non-empty versionId', () => {
    const service = new DatasetVersionService({ repository: new DatasetVersionRepository() });
    const version  = service.publish({ type: DATASET_TYPES.FULL, createdBy: 'founder-1' });
    expect(typeof version.versionId).toBe('string');
    expect(version.versionId.length).toBeGreaterThan(0);
  });
});

// ── EC-12: DiseaseClusterStatisticsService operates ─────────────────────────────

describe('EC-12 — DiseaseClusterStatisticsService computes cluster profiles', () => {
  it('computeClusterProfile returns caseCount + percentiles + generatedAt (BD-018)', () => {
    const service = new DiseaseClusterStatisticsService();
    const signals = Array.from({ length: 6 }, (_, i) => ({
      recordId: `rec-${i}`, signalType: SIGNAL_TYPES.PAIN, normalizedValue: 0.1 * i,
    }));
    const profile = service.computeClusterProfile('ENDO', signals);
    expect(profile.caseCount).toBe(6);
    expect(profile.signalPercentiles[SIGNAL_TYPES.PAIN]).toBeDefined();
    expect(new Date(profile.generatedAt).toISOString()).toBe(profile.generatedAt);
  });
});

// ── QC-03: k-anonymity verification tests pass ─────────────────────────────────

describe('QC-03 — k-anonymity (k>=5) is structurally enforced', () => {
  it('CohortBuilderService rejects confirmKAnonymity below K_ANONYMITY_MIN', () => {
    const service = new CohortBuilderService({ repository: new CohortRepository() });
    const cohort  = service.defineCohort({ name: 'low-k', createdBy: 'founder-1' });
    expect(() => service.confirmKAnonymity(cohort.cohortId, K_ANONYMITY_MIN - 1)).toThrow();
  });
});

// ── QC-04: AI output contains zero diagnosis/treatment/urgency language ───────

describe('QC-04 — AI output forbidden-word gate blocks diagnosis/treatment/urgency language', () => {
  it('blocks treatment-instruction language', () => {
    expect(() => validateOutput('今すぐ病院に行き、投薬を受けてください。', false)).toThrow(ForbiddenWordError);
  });
});
