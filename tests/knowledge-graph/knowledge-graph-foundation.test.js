// tests/knowledge-graph/knowledge-graph-foundation.test.js — PR-051 tests.
// Covers: KG types / node entity / edge entity / repository / service.
// BD-036: Append-Only guarantee tested explicitly.
// BD-028: LOW_CONFIDENCE flag (evidenceCount < 5) verified.
// BD-018: createdAt ISO string required on every entity.

import { describe, it, expect, beforeEach } from 'vitest';

import { KG_NODE_TYPES, KG_RELATION_TYPES, KG_CONFIDENCE_THRESHOLD } from '../../src/domains/knowledge/knowledge-graph-types.js';
import { buildKgNode } from '../../src/domains/knowledge/knowledge-graph-node-entity.js';
import { buildKgEdge } from '../../src/domains/knowledge/knowledge-graph-edge-entity.js';
import { KnowledgeGraphRepository } from '../../src/domains/knowledge/knowledge-graph-repository.js';
import { KnowledgeGraphService }    from '../../src/domains/knowledge/knowledge-graph-service.js';
import { DOMAIN_EVENT_TYPES }       from '../../src/domains/events/domain-event-types.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRepo() { return new KnowledgeGraphRepository(); }

function makeService(eventPublisher = null) {
  return new KnowledgeGraphService({ repository: makeRepo(), eventPublisher });
}

function makeMockPublisher() {
  const events = [];
  return {
    publish: (e) => events.push(e),
    events,
  };
}

// ── KG_NODE_TYPES / KG_RELATION_TYPES ────────────────────────────────────────

describe('KG_NODE_TYPES', () => {
  it('contains required node types', () => {
    expect(KG_NODE_TYPES.DISEASE).toBe('DISEASE');
    expect(KG_NODE_TYPES.SYMPTOM).toBe('SYMPTOM');
    expect(KG_NODE_TYPES.OUTCOME).toBe('OUTCOME');
    expect(KG_NODE_TYPES.PHASE).toBe('PHASE');
    expect(KG_NODE_TYPES.SIGNAL_PATTERN).toBe('SIGNAL_PATTERN');
    expect(Object.isFrozen(KG_NODE_TYPES)).toBe(true);
  });
});

describe('KG_RELATION_TYPES', () => {
  it('contains required relation types', () => {
    expect(KG_RELATION_TYPES.HAS_SYMPTOM).toBe('HAS_SYMPTOM');
    expect(KG_RELATION_TYPES.OBSERVED_IN).toBe('OBSERVED_IN');
    expect(KG_RELATION_TYPES.WORSE_IN_PHASE).toBe('WORSE_IN_PHASE');
    expect(KG_RELATION_TYPES.LEADS_TO_OUTCOME).toBe('LEADS_TO_OUTCOME');
    expect(KG_RELATION_TYPES.COMORBID_WITH).toBe('COMORBID_WITH');
    expect(KG_RELATION_TYPES.SIGNAL_INDICATES).toBe('SIGNAL_INDICATES');
    expect(Object.isFrozen(KG_RELATION_TYPES)).toBe(true);
  });
});

describe('KG_CONFIDENCE_THRESHOLD', () => {
  it('is 5 (BD-028)', () => {
    expect(KG_CONFIDENCE_THRESHOLD).toBe(5);
  });
});

// ── buildKgNode ───────────────────────────────────────────────────────────────

describe('buildKgNode', () => {
  it('builds a frozen node with required fields (BD-018)', () => {
    const node = buildKgNode({ type: KG_NODE_TYPES.DISEASE, attributes: { diseaseKey: 'endometriosis' } });
    expect(node.nodeId).toBeTruthy();
    expect(node.type).toBe(KG_NODE_TYPES.DISEASE);
    expect(node.attributes.diseaseKey).toBe('endometriosis');
    expect(node.createdAt).toBeTruthy();
    expect(new Date(node.createdAt).toISOString()).toBe(node.createdAt);  // BD-018
    expect(node.version).toBe('1');
    expect(Object.isFrozen(node)).toBe(true);
    expect(Object.isFrozen(node.attributes)).toBe(true);
  });

  it('generates unique ids for distinct nodes', () => {
    const a = buildKgNode({ type: KG_NODE_TYPES.SYMPTOM, attributes: {} });
    const b = buildKgNode({ type: KG_NODE_TYPES.SYMPTOM, attributes: {} });
    expect(a.nodeId).not.toBe(b.nodeId);
  });

  it('accepts explicit nodeId override', () => {
    const node = buildKgNode({ type: KG_NODE_TYPES.DISEASE, attributes: {}, nodeId: 'kgn_custom' });
    expect(node.nodeId).toBe('kgn_custom');
  });

  it('throws if type is missing', () => {
    expect(() => buildKgNode({ attributes: {} })).toThrow('[KgNode] type is required');
  });

  it('throws on unknown type', () => {
    expect(() => buildKgNode({ type: 'UNKNOWN_TYPE', attributes: {} })).toThrow('[KgNode] Unknown node type');
  });

  it('throws if attributes is missing', () => {
    expect(() => buildKgNode({ type: KG_NODE_TYPES.DISEASE })).toThrow('[KgNode] attributes must be an object');
  });
});

// ── buildKgEdge ───────────────────────────────────────────────────────────────

describe('buildKgEdge', () => {
  it('builds a frozen edge with required fields (BD-018)', () => {
    const edge = buildKgEdge({
      fromNodeId:    'kgn_a',
      toNodeId:      'kgn_b',
      relationType:  KG_RELATION_TYPES.HAS_SYMPTOM,
      evidenceCount: 10,
      confidence:    0.8,
    });
    expect(edge.edgeId).toBeTruthy();
    expect(edge.fromNodeId).toBe('kgn_a');
    expect(edge.toNodeId).toBe('kgn_b');
    expect(edge.relationType).toBe(KG_RELATION_TYPES.HAS_SYMPTOM);
    expect(edge.evidenceCount).toBe(10);
    expect(edge.confidence).toBe(0.8);
    expect(edge.createdAt).toBeTruthy();
    expect(new Date(edge.createdAt).toISOString()).toBe(edge.createdAt);  // BD-018
    expect(Object.isFrozen(edge)).toBe(true);
  });

  it('sets lowConfidence = true when evidenceCount < 5 (BD-028)', () => {
    const low  = buildKgEdge({ fromNodeId: 'a', toNodeId: 'b', relationType: KG_RELATION_TYPES.OBSERVED_IN, evidenceCount: 3, confidence: 0.5 });
    const high = buildKgEdge({ fromNodeId: 'a', toNodeId: 'b', relationType: KG_RELATION_TYPES.OBSERVED_IN, evidenceCount: 5, confidence: 0.5 });
    expect(low.lowConfidence).toBe(true);
    expect(high.lowConfidence).toBe(false);
  });

  it('throws if fromNodeId is missing', () => {
    expect(() => buildKgEdge({ toNodeId: 'b', relationType: KG_RELATION_TYPES.HAS_SYMPTOM, evidenceCount: 5, confidence: 0.5 }))
      .toThrow('[KgEdge] fromNodeId is required');
  });

  it('throws on unknown relationType', () => {
    expect(() => buildKgEdge({ fromNodeId: 'a', toNodeId: 'b', relationType: 'UNKNOWN', evidenceCount: 5, confidence: 0.5 }))
      .toThrow('[KgEdge] Unknown relationType');
  });

  it('throws if confidence is out of [0,1]', () => {
    expect(() => buildKgEdge({ fromNodeId: 'a', toNodeId: 'b', relationType: KG_RELATION_TYPES.HAS_SYMPTOM, evidenceCount: 5, confidence: 1.5 }))
      .toThrow('[KgEdge] confidence must be a number in [0, 1]');
  });
});

// ── KnowledgeGraphRepository ──────────────────────────────────────────────────

describe('KnowledgeGraphRepository — addNode / findNode / findNodes', () => {
  let repo;
  beforeEach(() => { repo = makeRepo(); });

  it('inserts and retrieves a node by nodeId', () => {
    const node = buildKgNode({ type: KG_NODE_TYPES.DISEASE, attributes: { diseaseKey: 'pcos' } });
    repo.addNode(node);
    expect(repo.findNode(node.nodeId)).toBe(node);
  });

  it('returns all nodes when no type filter given', () => {
    repo.addNode(buildKgNode({ type: KG_NODE_TYPES.DISEASE, attributes: {} }));
    repo.addNode(buildKgNode({ type: KG_NODE_TYPES.SYMPTOM, attributes: {} }));
    expect(repo.findNodes().length).toBe(2);
  });

  it('filters by type', () => {
    repo.addNode(buildKgNode({ type: KG_NODE_TYPES.DISEASE, attributes: {} }));
    repo.addNode(buildKgNode({ type: KG_NODE_TYPES.SYMPTOM, attributes: {} }));
    expect(repo.findNodes(KG_NODE_TYPES.DISEASE).length).toBe(1);
    expect(repo.findNodes(KG_NODE_TYPES.SYMPTOM).length).toBe(1);
  });

  it('is idempotent by nodeId — duplicate add returns existing node', () => {
    const node = buildKgNode({ type: KG_NODE_TYPES.DISEASE, attributes: {}, nodeId: 'kgn_dup' });
    repo.addNode(node);
    repo.addNode(node);
    expect(repo.findNodes().length).toBe(1);
  });
});

describe('KnowledgeGraphRepository — addEdge / findEdge / findEdges / findEdgesByNode', () => {
  let repo;
  beforeEach(() => { repo = makeRepo(); });

  it('inserts and retrieves an edge by edgeId', () => {
    const edge = buildKgEdge({ fromNodeId: 'n1', toNodeId: 'n2', relationType: KG_RELATION_TYPES.HAS_SYMPTOM, evidenceCount: 8, confidence: 0.9 });
    repo.addEdge(edge);
    expect(repo.findEdge(edge.edgeId)).toBe(edge);
  });

  it('filters edges by relationType', () => {
    repo.addEdge(buildKgEdge({ fromNodeId: 'a', toNodeId: 'b', relationType: KG_RELATION_TYPES.HAS_SYMPTOM, evidenceCount: 6, confidence: 0.7 }));
    repo.addEdge(buildKgEdge({ fromNodeId: 'a', toNodeId: 'c', relationType: KG_RELATION_TYPES.COMORBID_WITH, evidenceCount: 4, confidence: 0.5 }));
    expect(repo.findEdges(KG_RELATION_TYPES.HAS_SYMPTOM).length).toBe(1);
    expect(repo.findEdges(KG_RELATION_TYPES.COMORBID_WITH).length).toBe(1);
  });

  it('findEdgesByNode returns edges containing the nodeId', () => {
    const e1 = buildKgEdge({ fromNodeId: 'nA', toNodeId: 'nB', relationType: KG_RELATION_TYPES.WORSE_IN_PHASE, evidenceCount: 6, confidence: 0.6 });
    const e2 = buildKgEdge({ fromNodeId: 'nC', toNodeId: 'nA', relationType: KG_RELATION_TYPES.LEADS_TO_OUTCOME, evidenceCount: 7, confidence: 0.7 });
    const e3 = buildKgEdge({ fromNodeId: 'nD', toNodeId: 'nE', relationType: KG_RELATION_TYPES.SIGNAL_INDICATES, evidenceCount: 5, confidence: 0.5 });
    repo.addEdge(e1); repo.addEdge(e2); repo.addEdge(e3);
    const result = repo.findEdgesByNode('nA');
    expect(result.length).toBe(2);
    expect(result.map(e => e.edgeId)).toContain(e1.edgeId);
    expect(result.map(e => e.edgeId)).toContain(e2.edgeId);
  });
});

describe('KnowledgeGraphRepository — Append-Only (BD-036)', () => {
  let repo;
  beforeEach(() => { repo = makeRepo(); });

  it('deleteNode() always throws (BD-036)', () => {
    expect(() => repo.deleteNode('any')).toThrow('DELETE is forbidden');
  });

  it('deleteEdge() always throws (BD-036)', () => {
    expect(() => repo.deleteEdge('any')).toThrow('DELETE is forbidden');
  });

  it('updateEdgeConfidence creates a NEW edge, original preserved (BD-036)', () => {
    const original = buildKgEdge({ fromNodeId: 'x', toNodeId: 'y', relationType: KG_RELATION_TYPES.HAS_SYMPTOM, evidenceCount: 2, confidence: 0.3 });
    repo.addEdge(original);

    const updated = repo.updateEdgeConfidence(original.edgeId, 10, 0.9);
    expect(updated.edgeId).not.toBe(original.edgeId);
    expect(updated.evidenceCount).toBe(10);
    expect(updated.confidence).toBe(0.9);
    expect(updated.lowConfidence).toBe(false);

    // original is still present
    expect(repo.findEdge(original.edgeId)).toBeDefined();
  });

  it('updateEdgeConfidence throws if edgeId not found', () => {
    expect(() => repo.updateEdgeConfidence('nonexistent', 5, 0.5)).toThrow('"nonexistent" not found');
  });
});

describe('KnowledgeGraphRepository — getStats', () => {
  it('returns correct counts', () => {
    const repo = makeRepo();
    repo.addNode(buildKgNode({ type: KG_NODE_TYPES.DISEASE, attributes: {} }));
    repo.addNode(buildKgNode({ type: KG_NODE_TYPES.SYMPTOM, attributes: {} }));
    repo.addEdge(buildKgEdge({ fromNodeId: 'a', toNodeId: 'b', relationType: KG_RELATION_TYPES.HAS_SYMPTOM, evidenceCount: 2, confidence: 0.3 }));
    repo.addEdge(buildKgEdge({ fromNodeId: 'a', toNodeId: 'c', relationType: KG_RELATION_TYPES.HAS_SYMPTOM, evidenceCount: 8, confidence: 0.8 }));
    const stats = repo.getStats();
    expect(stats.nodeCount).toBe(2);
    expect(stats.edgeCount).toBe(2);
    expect(stats.lowConfidenceEdges).toBe(1);
    expect(Object.isFrozen(stats)).toBe(true);
  });
});

// ── KnowledgeGraphService ─────────────────────────────────────────────────────

describe('KnowledgeGraphService — addNode / getNode / getNodes', () => {
  it('adds and retrieves nodes', () => {
    const svc = makeService();
    const node = svc.addNode({ type: KG_NODE_TYPES.DISEASE, attributes: { diseaseKey: 'endo' } });
    expect(node.type).toBe(KG_NODE_TYPES.DISEASE);
    expect(svc.getNode(node.nodeId)).toBe(node);
    expect(svc.getNodes(KG_NODE_TYPES.DISEASE).length).toBe(1);
  });
});

describe('KnowledgeGraphService — addEdge / getEdge / getEdges', () => {
  it('adds and retrieves edges', () => {
    const svc = makeService();
    const edge = svc.addEdge({
      fromNodeId: 'n1', toNodeId: 'n2',
      relationType: KG_RELATION_TYPES.HAS_SYMPTOM,
      evidenceCount: 6, confidence: 0.75,
    });
    expect(edge.relationType).toBe(KG_RELATION_TYPES.HAS_SYMPTOM);
    expect(svc.getEdge(edge.edgeId)).toBe(edge);
    expect(svc.getEdges(KG_RELATION_TYPES.HAS_SYMPTOM).length).toBe(1);
  });
});

describe('KnowledgeGraphService — updateEdgeConfidence (BD-036)', () => {
  it('returns a new edge with updated confidence without deleting original', () => {
    const svc = makeService();
    const original = svc.addEdge({ fromNodeId: 'a', toNodeId: 'b', relationType: KG_RELATION_TYPES.OBSERVED_IN, evidenceCount: 3, confidence: 0.4 });
    const updated  = svc.updateEdgeConfidence(original.edgeId, 12, 0.95);
    expect(updated.edgeId).not.toBe(original.edgeId);
    expect(updated.lowConfidence).toBe(false);
    expect(svc.getEdge(original.edgeId)).toBeDefined();  // original preserved
  });
});

describe('KnowledgeGraphService — DomainEvent publication', () => {
  it('publishes KNOWLEDGE_GRAPH_NODE_ADDED on addNode', () => {
    const pub = makeMockPublisher();
    const svc = new KnowledgeGraphService({ repository: makeRepo(), eventPublisher: pub });
    svc.addNode({ type: KG_NODE_TYPES.SYMPTOM, attributes: { label: 'pain' } });
    expect(pub.events.some(e => e.eventType === DOMAIN_EVENT_TYPES.KNOWLEDGE_GRAPH_NODE_ADDED)).toBe(true);
  });

  it('publishes KNOWLEDGE_GRAPH_EDGE_ADDED on addEdge', () => {
    const pub = makeMockPublisher();
    const svc = new KnowledgeGraphService({ repository: makeRepo(), eventPublisher: pub });
    svc.addEdge({ fromNodeId: 'x', toNodeId: 'y', relationType: KG_RELATION_TYPES.COMORBID_WITH, evidenceCount: 7, confidence: 0.6 });
    expect(pub.events.some(e => e.eventType === DOMAIN_EVENT_TYPES.KNOWLEDGE_GRAPH_EDGE_ADDED)).toBe(true);
  });

  it('publishes KNOWLEDGE_GRAPH_EDGE_ADDED on updateEdgeConfidence', () => {
    const pub = makeMockPublisher();
    const svc = new KnowledgeGraphService({ repository: makeRepo(), eventPublisher: pub });
    const e = svc.addEdge({ fromNodeId: 'p', toNodeId: 'q', relationType: KG_RELATION_TYPES.SIGNAL_INDICATES, evidenceCount: 2, confidence: 0.2 });
    pub.events.length = 0;
    svc.updateEdgeConfidence(e.edgeId, 10, 0.9);
    const evt = pub.events.find(ev => ev.eventType === DOMAIN_EVENT_TYPES.KNOWLEDGE_GRAPH_EDGE_ADDED);
    expect(evt).toBeDefined();
    expect(evt.payload.replacesEdge).toBe(e.edgeId);
  });

  it('does not throw when no eventPublisher is wired', () => {
    const svc = new KnowledgeGraphService({ repository: makeRepo(), eventPublisher: null });
    expect(() => svc.addNode({ type: KG_NODE_TYPES.DISEASE, attributes: {} })).not.toThrow();
  });
});

describe('KnowledgeGraphService — getStatus', () => {
  it('returns frozen status with appendOnly = true', () => {
    const svc = makeService();
    const status = svc.getStatus();
    expect(status.ready).toBe(true);
    expect(status.appendOnly).toBe(true);
    expect(status.schemaVersion).toBe('1');
    expect(Object.isFrozen(status)).toBe(true);
  });
});

// ── DOMAIN_EVENT_TYPES registration ──────────────────────────────────────────

describe('DOMAIN_EVENT_TYPES — PR-051 events registered', () => {
  it('contains KNOWLEDGE_GRAPH_NODE_ADDED', () => {
    expect(DOMAIN_EVENT_TYPES.KNOWLEDGE_GRAPH_NODE_ADDED).toBe('KNOWLEDGE_GRAPH_NODE_ADDED');
  });

  it('contains KNOWLEDGE_GRAPH_EDGE_ADDED', () => {
    expect(DOMAIN_EVENT_TYPES.KNOWLEDGE_GRAPH_EDGE_ADDED).toBe('KNOWLEDGE_GRAPH_EDGE_ADDED');
  });
});
