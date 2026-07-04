// tests/knowledge-graph/knowledge-graph-builder.test.js — PR-052 tests.
// Covers: KnowledgeGraphBuilder / KnowledgeGraphSnapshot
// BD-036: Append-Only — builder uses KgService (no direct delete).
// BD-028: LOW_CONFIDENCE edges when evidenceCount < 5.
// BD-018: KgSnapshot has generatedAt + version.
// BD-031: No AI/LLM — pure deterministic construction.

import { describe, it, expect, beforeEach } from 'vitest';

import { KnowledgeGraphRepository } from '../../src/domains/knowledge/knowledge-graph-repository.js';
import { KnowledgeGraphService }    from '../../src/domains/knowledge/knowledge-graph-service.js';
import { KnowledgeGraphBuilder }    from '../../src/domains/knowledge/knowledge-graph-builder.js';
import { buildKgSnapshot }          from '../../src/domains/knowledge/knowledge-graph-snapshot-entity.js';
import { KG_NODE_TYPES, KG_RELATION_TYPES } from '../../src/domains/knowledge/knowledge-graph-types.js';
import { DOMAIN_EVENT_TYPES }       from '../../src/domains/events/domain-event-types.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeService(repo) {
  return new KnowledgeGraphService({ repository: repo, eventPublisher: null });
}

function makeBuilder(svc, pub = null) {
  return new KnowledgeGraphBuilder({ kgService: svc, eventPublisher: pub });
}

function makeStack() {
  const repo    = new KnowledgeGraphRepository();
  const service = makeService(repo);
  const builder = makeBuilder(service);
  return { repo, service, builder };
}

function makeMockPublisher() {
  const events = [];
  return { publish: (e) => events.push(e), events };
}

const DISEASES = [
  {
    diseaseKey:      'endometriosis',
    name:            'endometriosis',
    category:        'Gynecology',
    relatedSymptoms: ['pelvic_pain', 'heavy_bleeding'],
  },
  {
    diseaseKey:      'pcos',
    name:            'pcos',
    category:        'Endocrine',
    relatedSymptoms: ['irregular_cycle', 'pelvic_pain'],
  },
];

const CLUSTER_SNAPSHOTS = [
  {
    clusterId:     'endometriosis',
    caseCount:     12,
    signalMeans:   { PAIN: 0.75, MENSTRUAL: 0.6 },
    dominantPhase: 'MENSTRUAL',
  },
  {
    clusterId:     'pcos',
    caseCount:     8,
    signalMeans:   { PAIN: 0.4, SYMPTOM: 0.5 },
    dominantPhase: 'FOLLICULAR',
  },
];

const SIGNALS = [
  { signalType: 'PAIN',     diseaseKey: 'endometriosis', userId: 'u1' },
  { signalType: 'MENSTRUAL', diseaseKey: 'endometriosis', userId: 'u1' },
  { signalType: 'PAIN',     diseaseKey: 'pcos',          userId: 'u2' },
];

const CASES = [
  { diseaseKey: 'endometriosis', outcomeCategory: 'IMPROVED' },
  { diseaseKey: 'pcos',          outcomeCategory: 'STABLE'   },
];

// ── buildKgSnapshot ───────────────────────────────────────────────────────────

describe('buildKgSnapshot', () => {
  it('builds a frozen snapshot with required fields (BD-018)', () => {
    const snap = buildKgSnapshot({
      kgVersion:          'KG-v1.0-20261231',
      nodeCount:          10,
      edgeCount:          15,
      diseaseCount:       3,
      symptomCount:       4,
      outcomeCount:       3,
      phaseCount:         2,
      signalPatternCount: 3,
      lowConfidenceEdges: 2,
    });
    expect(snap.id).toBeTruthy();
    expect(snap.kgVersion).toBe('KG-v1.0-20261231');
    expect(snap.nodeCount).toBe(10);
    expect(snap.edgeCount).toBe(15);
    expect(snap.generatedAt).toBeTruthy();
    expect(new Date(snap.generatedAt).toISOString()).toBe(snap.generatedAt);  // BD-018
    expect(snap.schedule).toBe('monthly');
    expect(snap.schemaVersion).toBe('1');
    expect(Object.isFrozen(snap)).toBe(true);
  });

  it('generates unique ids', () => {
    const a = buildKgSnapshot({ kgVersion: 'KG-v1.0-20260101', nodeCount: 0, edgeCount: 0 });
    const b = buildKgSnapshot({ kgVersion: 'KG-v1.0-20260101', nodeCount: 0, edgeCount: 0 });
    expect(a.id).not.toBe(b.id);
  });

  it('throws if kgVersion is missing', () => {
    expect(() => buildKgSnapshot({ nodeCount: 0, edgeCount: 0 })).toThrow('[KgSnapshot] kgVersion is required');
  });

  it('throws if nodeCount is negative', () => {
    expect(() => buildKgSnapshot({ kgVersion: 'v1', nodeCount: -1, edgeCount: 0 }))
      .toThrow('[KgSnapshot] nodeCount must be a non-negative number');
  });
});

// ── KnowledgeGraphBuilder — constructor ───────────────────────────────────────

describe('KnowledgeGraphBuilder — constructor', () => {
  it('throws if kgService is missing', () => {
    expect(() => new KnowledgeGraphBuilder({})).toThrow('[KgBuilder] kgService is required');
  });
});

// ── KnowledgeGraphBuilder.build — Disease Nodes ──────────────────────────────

describe('KnowledgeGraphBuilder.build — Disease Nodes', () => {
  it('creates a DISEASE node per unique diseaseKey', () => {
    const { service, builder } = makeStack();
    builder.build({ diseases: DISEASES });
    const nodes = service.getNodes(KG_NODE_TYPES.DISEASE);
    expect(nodes.length).toBe(2);
    const keys = nodes.map(n => n.attributes.diseaseKey);
    expect(keys).toContain('endometriosis');
    expect(keys).toContain('pcos');
  });

  it('does not duplicate Disease nodes on idempotent build', () => {
    const { service, builder } = makeStack();
    builder.build({ diseases: DISEASES });
    builder.build({ diseases: DISEASES });
    expect(service.getNodes(KG_NODE_TYPES.DISEASE).length).toBe(2);
  });
});

// ── KnowledgeGraphBuilder.build — Symptom Nodes + HAS_SYMPTOM edges ─────────

describe('KnowledgeGraphBuilder.build — Symptom Nodes + HAS_SYMPTOM', () => {
  it('creates SYMPTOM nodes for unique relatedSymptoms across all diseases', () => {
    const { service, builder } = makeStack();
    builder.build({ diseases: DISEASES });
    // pelvic_pain shared; 3 unique: pelvic_pain, heavy_bleeding, irregular_cycle
    const symNodes = service.getNodes(KG_NODE_TYPES.SYMPTOM);
    expect(symNodes.length).toBe(3);
  });

  it('creates HAS_SYMPTOM edges from disease to symptom', () => {
    const { service, builder } = makeStack();
    builder.build({ diseases: DISEASES });
    const edges = service.getEdges(KG_RELATION_TYPES.HAS_SYMPTOM);
    // endometriosis→pelvic_pain, endometriosis→heavy_bleeding, pcos→irregular_cycle, pcos→pelvic_pain
    expect(edges.length).toBe(4);
  });

  it('HAS_SYMPTOM edges start from the correct DISEASE node', () => {
    const { service, builder } = makeStack();
    builder.build({ diseases: DISEASES });
    const hasSymptomEdges = service.getEdges(KG_RELATION_TYPES.HAS_SYMPTOM);
    const diseaseNodeIds = service.getNodes(KG_NODE_TYPES.DISEASE).map(n => n.nodeId);
    for (const edge of hasSymptomEdges) {
      expect(diseaseNodeIds).toContain(edge.fromNodeId);
    }
  });
});

// ── KnowledgeGraphBuilder.build — Phase Nodes + WORSE_IN_PHASE ──────────────

describe('KnowledgeGraphBuilder.build — Phase Nodes + WORSE_IN_PHASE', () => {
  it('creates PHASE nodes from clusterSnapshot.dominantPhase', () => {
    const { service, builder } = makeStack();
    builder.build({ diseases: DISEASES, clusterSnapshots: CLUSTER_SNAPSHOTS });
    const phaseNodes = service.getNodes(KG_NODE_TYPES.PHASE);
    expect(phaseNodes.length).toBe(2);
    const phases = phaseNodes.map(n => n.attributes.phase);
    expect(phases).toContain('MENSTRUAL');
    expect(phases).toContain('FOLLICULAR');
  });

  it('creates WORSE_IN_PHASE edges from disease to its dominant phase', () => {
    const { service, builder } = makeStack();
    builder.build({ diseases: DISEASES, clusterSnapshots: CLUSTER_SNAPSHOTS });
    const edges = service.getEdges(KG_RELATION_TYPES.WORSE_IN_PHASE);
    expect(edges.length).toBe(2);
    // confidence is CLUSTER_CONFIDENCE (0.7)
    for (const e of edges) {
      expect(e.confidence).toBe(0.7);
    }
  });
});

// ── KnowledgeGraphBuilder.build — Signal Pattern Nodes + SIGNAL_INDICATES ───

describe('KnowledgeGraphBuilder.build — SignalPattern + SIGNAL_INDICATES', () => {
  it('creates SIGNAL_PATTERN nodes for each unique signalType', () => {
    const { service, builder } = makeStack();
    builder.build({ diseases: DISEASES, clusterSnapshots: CLUSTER_SNAPSHOTS, signals: SIGNALS });
    const spNodes = service.getNodes(KG_NODE_TYPES.SIGNAL_PATTERN);
    // From signals: PAIN, MENSTRUAL; from clusterSnapshots.signalMeans: SYMPTOM also
    const types = spNodes.map(n => n.attributes.signalType);
    expect(types).toContain('PAIN');
    expect(types).toContain('MENSTRUAL');
    expect(types).toContain('SYMPTOM');
  });

  it('creates SIGNAL_INDICATES edges from signal pattern to disease', () => {
    const { service, builder } = makeStack();
    builder.build({ diseases: DISEASES, clusterSnapshots: CLUSTER_SNAPSHOTS });
    const edges = service.getEdges(KG_RELATION_TYPES.SIGNAL_INDICATES);
    expect(edges.length).toBeGreaterThan(0);
  });
});

// ── KnowledgeGraphBuilder.build — Outcome Nodes + LEADS_TO_OUTCOME ──────────

describe('KnowledgeGraphBuilder.build — Outcome Nodes + LEADS_TO_OUTCOME', () => {
  it('creates OUTCOME nodes for IMPROVED / STABLE / WORSENED', () => {
    const { service, builder } = makeStack();
    builder.build({});
    const outcomeNodes = service.getNodes(KG_NODE_TYPES.OUTCOME);
    expect(outcomeNodes.length).toBe(3);
    const keys = outcomeNodes.map(n => n.attributes.outcomeKey);
    expect(keys).toContain('IMPROVED');
    expect(keys).toContain('STABLE');
    expect(keys).toContain('WORSENED');
  });

  it('creates LEADS_TO_OUTCOME edges from disease to outcome', () => {
    const { service, builder } = makeStack();
    builder.build({ diseases: DISEASES, cases: CASES });
    const edges = service.getEdges(KG_RELATION_TYPES.LEADS_TO_OUTCOME);
    expect(edges.length).toBe(2);
  });

  it('ignores cases with unknown outcomeCategory', () => {
    const { service, builder } = makeStack();
    builder.build({
      diseases: DISEASES,
      cases: [{ diseaseKey: 'endometriosis', outcomeCategory: 'UNKNOWN_OUTCOME' }],
    });
    expect(service.getEdges(KG_RELATION_TYPES.LEADS_TO_OUTCOME).length).toBe(0);
  });
});

// ── KnowledgeGraphBuilder.build — COMORBID_WITH ──────────────────────────────

describe('KnowledgeGraphBuilder.build — COMORBID_WITH', () => {
  it('creates COMORBID_WITH edge when two diseases appear in same user signals', () => {
    const { service, builder } = makeStack();
    const signals = [
      { signalType: 'PAIN', diseaseKey: 'endometriosis', userId: 'u1' },
      { signalType: 'PAIN', diseaseKey: 'pcos',          userId: 'u1' },  // same user
    ];
    builder.build({ diseases: DISEASES, signals });
    const edges = service.getEdges(KG_RELATION_TYPES.COMORBID_WITH);
    expect(edges.length).toBe(1);
  });

  it('does NOT create COMORBID_WITH for diseases in different users', () => {
    const { service, builder } = makeStack();
    const signals = [
      { signalType: 'PAIN', diseaseKey: 'endometriosis', userId: 'u1' },
      { signalType: 'PAIN', diseaseKey: 'pcos',          userId: 'u2' },  // diff user
    ];
    builder.build({ diseases: DISEASES, signals });
    expect(service.getEdges(KG_RELATION_TYPES.COMORBID_WITH).length).toBe(0);
  });

  it('does not create duplicate COMORBID_WITH pairs', () => {
    const { service, builder } = makeStack();
    const signals = [
      { signalType: 'PAIN', diseaseKey: 'endometriosis', userId: 'u1' },
      { signalType: 'PAIN', diseaseKey: 'pcos',          userId: 'u1' },
      { signalType: 'SLEEP', diseaseKey: 'endometriosis', userId: 'u1' },
    ];
    builder.build({ diseases: DISEASES, signals });
    expect(service.getEdges(KG_RELATION_TYPES.COMORBID_WITH).length).toBe(1);
  });
});

// ── KnowledgeGraphBuilder.build — OBSERVED_IN ────────────────────────────────

describe('KnowledgeGraphBuilder.build — OBSERVED_IN', () => {
  it('creates OBSERVED_IN edges from signal pattern to phase', () => {
    const { service, builder } = makeStack();
    builder.build({ diseases: DISEASES, clusterSnapshots: CLUSTER_SNAPSHOTS });
    const edges = service.getEdges(KG_RELATION_TYPES.OBSERVED_IN);
    expect(edges.length).toBeGreaterThan(0);
  });
});

// ── KnowledgeGraphBuilder.build — 6 edge types present ───────────────────────

describe('KnowledgeGraphBuilder.build — all 6 edge types', () => {
  it('produces all 6 relation types in a full build', () => {
    const { service, builder } = makeStack();
    const signals = [
      { signalType: 'PAIN', diseaseKey: 'endometriosis', userId: 'u1' },
      { signalType: 'PAIN', diseaseKey: 'pcos',          userId: 'u1' },
    ];
    builder.build({ diseases: DISEASES, clusterSnapshots: CLUSTER_SNAPSHOTS, signals, cases: CASES });
    const types = new Set(service.getEdges().map(e => e.relationType));
    expect(types.has(KG_RELATION_TYPES.HAS_SYMPTOM)).toBe(true);
    expect(types.has(KG_RELATION_TYPES.WORSE_IN_PHASE)).toBe(true);
    expect(types.has(KG_RELATION_TYPES.SIGNAL_INDICATES)).toBe(true);
    expect(types.has(KG_RELATION_TYPES.LEADS_TO_OUTCOME)).toBe(true);
    expect(types.has(KG_RELATION_TYPES.COMORBID_WITH)).toBe(true);
    expect(types.has(KG_RELATION_TYPES.OBSERVED_IN)).toBe(true);
  });
});

// ── KnowledgeGraphBuilder.build — Snapshot (BD-018) ─────────────────────────

describe('KnowledgeGraphBuilder.build — KnowledgeGraphSnapshot (BD-018)', () => {
  it('returns a snapshot with generatedAt ISO string (BD-018)', () => {
    const { builder } = makeStack();
    const { snapshot } = builder.build({ diseases: DISEASES });
    expect(snapshot.generatedAt).toBeTruthy();
    expect(new Date(snapshot.generatedAt).toISOString()).toBe(snapshot.generatedAt);
  });

  it('snapshot contains kgVersion', () => {
    const { builder } = makeStack();
    const { snapshot } = builder.build({}, { kgVersion: 'KG-v1.0-20261231' });
    expect(snapshot.kgVersion).toBe('KG-v1.0-20261231');
  });

  it('auto-generates kgVersion if not provided', () => {
    const { builder } = makeStack();
    const { snapshot } = builder.build({});
    expect(snapshot.kgVersion).toMatch(/^KG-v1\.0-\d{8}$/);
  });

  it('snapshot nodeCount / edgeCount match actual KG state', () => {
    const { service, builder } = makeStack();
    const { snapshot } = builder.build({ diseases: DISEASES });
    expect(snapshot.nodeCount).toBe(service.getStats().nodeCount);
    expect(snapshot.edgeCount).toBe(service.getStats().edgeCount);
  });

  it('snapshot is frozen (BD-032)', () => {
    const { builder } = makeStack();
    const { snapshot } = builder.build({});
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it('addedNodes / addedEdges are returned', () => {
    const { builder } = makeStack();
    const result = builder.build({ diseases: DISEASES });
    expect(typeof result.addedNodes).toBe('number');
    expect(typeof result.addedEdges).toBe('number');
  });
});

// ── KnowledgeGraphBuilder.build — LOW_CONFIDENCE (BD-028) ───────────────────

describe('KnowledgeGraphBuilder.build — LOW_CONFIDENCE (BD-028)', () => {
  it('edges built from single disease entry have lowConfidence = true (evidenceCount < 5)', () => {
    const { service, builder } = makeStack();
    builder.build({ diseases: DISEASES });
    const hasSymptomEdges = service.getEdges(KG_RELATION_TYPES.HAS_SYMPTOM);
    // relatedSymptoms edges have evidenceCount = 1 → lowConfidence
    for (const e of hasSymptomEdges) {
      expect(e.lowConfidence).toBe(true);
    }
  });

  it('WORSE_IN_PHASE edges with caseCount >= 5 have lowConfidence = false', () => {
    const { service, builder } = makeStack();
    builder.build({ diseases: DISEASES, clusterSnapshots: CLUSTER_SNAPSHOTS });
    const edges = service.getEdges(KG_RELATION_TYPES.WORSE_IN_PHASE);
    // CLUSTER_SNAPSHOTS have caseCount 12 and 8 — both >= 5
    for (const e of edges) {
      expect(e.lowConfidence).toBe(false);
    }
  });
});

// ── DomainEvent — KNOWLEDGE_GRAPH_SNAPSHOT_CREATED ───────────────────────────

describe('KnowledgeGraphBuilder.build — DomainEvent publication', () => {
  it('publishes KNOWLEDGE_GRAPH_SNAPSHOT_CREATED after build', () => {
    const repo    = new KnowledgeGraphRepository();
    const service = makeService(repo);
    const pub     = makeMockPublisher();
    const builder = new KnowledgeGraphBuilder({ kgService: service, eventPublisher: pub });
    builder.build({ diseases: DISEASES });
    expect(pub.events.some(e => e.eventType === DOMAIN_EVENT_TYPES.KNOWLEDGE_GRAPH_SNAPSHOT_CREATED)).toBe(true);
  });

  it('does not throw when no eventPublisher is wired', () => {
    const { builder } = makeStack();
    expect(() => builder.build({ diseases: DISEASES })).not.toThrow();
  });
});

// ── DOMAIN_EVENT_TYPES — PR-052 ───────────────────────────────────────────────

describe('DOMAIN_EVENT_TYPES — PR-052 events registered', () => {
  it('contains KNOWLEDGE_GRAPH_SNAPSHOT_CREATED', () => {
    expect(DOMAIN_EVENT_TYPES.KNOWLEDGE_GRAPH_SNAPSHOT_CREATED).toBe('KNOWLEDGE_GRAPH_SNAPSHOT_CREATED');
  });
});
