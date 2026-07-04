// knowledge-graph-builder.js — Builds Knowledge Graph skeleton from Research Dataset.
// BD-028: Knowledge Graph is the bridge between Disease Cluster and Research Platform.
// BD-036: All inserts via KnowledgeGraphService (Append-Only); no DELETE.
// BD-031: No AI / LLM — pure deterministic construction from existing data.
// BD-038: Rule-based only; statistical thresholds are fixed constants.
// PR-052: Knowledge Graph Builder

import { buildKgSnapshot }           from './knowledge-graph-snapshot-entity.js';
import { buildDomainEvent }           from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';
import { KG_NODE_TYPES, KG_RELATION_TYPES }    from './knowledge-graph-types.js';

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Minimum evidenceCount to qualify as a confirmed edge.
 * Edges below this are stored with lowConfidence = true (BD-028).
 */
const MIN_EVIDENCE = 1;

/**
 * Default confidence for structurally-derived edges (no statistical backing yet).
 * Qualitative relationships (HAS_SYMPTOM from Disease.relatedSymptoms) use this.
 */
const DEFAULT_CONFIDENCE = 0.5;

/**
 * Confidence for edges backed by cluster statistics (signalMeans, dominantPhase).
 */
const CLUSTER_CONFIDENCE = 0.7;

/** Outcome node keys that represent disease progression outcomes. */
const OUTCOME_KEYS = Object.freeze(['IMPROVED', 'STABLE', 'WORSENED']);

// ── KnowledgeGraphBuilder ─────────────────────────────────────────────────────

export class KnowledgeGraphBuilder {
  #kgService;
  #eventPublisher;

  /**
   * @param {{
   *   kgService:       KnowledgeGraphService,
   *   eventPublisher?: EventPublisher | null,
   * }} deps
   */
  constructor({ kgService, eventPublisher = null }) {
    if (!kgService) throw new Error('[KgBuilder] kgService is required');
    this.#kgService      = kgService;
    this.#eventPublisher = eventPublisher;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Build (or update) the KG skeleton from a ResearchDataset + cluster snapshots.
   * Idempotent — nodes with the same nodeId are not duplicated (repo is idempotent by nodeId).
   *
   * @param {{
   *   diseases?:        object[],   — Disease entities (relatedSymptoms[], diseaseKey)
   *   clusterSnapshots?: object[], — DiseaseClusterSnapshot[] (dominantPhase, signalMeans)
   *   signals?:         object[],   — NetworkSignal[] (signalType)
   *   cases?:           object[],   — Case entities (outcomeCategory)
   * }} input
   * @param {{ kgVersion?: string }} [options]
   * @returns {{
   *   snapshot: Readonly<object>,
   *   addedNodes: number,
   *   addedEdges: number,
   * }}
   */
  build(input = {}, options = {}) {
    const {
      diseases        = [],
      clusterSnapshots = [],
      signals         = [],
      cases           = [],
    } = input;

    const kgVersion = options.kgVersion ?? _buildVersionString();

    // ── 1. Disease Nodes ────────────────────────────────────────────────────
    const diseaseNodeMap = new Map();   // diseaseKey → nodeId
    for (const disease of diseases) {
      const key = disease.diseaseKey ?? disease.name;
      if (!key) continue;
      if (diseaseNodeMap.has(key)) continue;
      const node = this.#kgService.addNode({
        type:       KG_NODE_TYPES.DISEASE,
        attributes: Object.freeze({ diseaseKey: key, category: disease.category ?? null }),
        nodeId:     `kgn_disease_${_slugify(key)}`,
      });
      diseaseNodeMap.set(key, node.nodeId);
    }

    // ── 2. Symptom Nodes + HAS_SYMPTOM edges ──────────────────────────────
    const symptomNodeMap = new Map();  // symptomLabel → nodeId
    for (const disease of diseases) {
      const diseaseNodeId = diseaseNodeMap.get(disease.diseaseKey ?? disease.name);
      if (!diseaseNodeId) continue;
      for (const symptom of (disease.relatedSymptoms ?? [])) {
        const label = typeof symptom === 'string' ? symptom : symptom?.name;
        if (!label) continue;
        if (!symptomNodeMap.has(label)) {
          const node = this.#kgService.addNode({
            type:       KG_NODE_TYPES.SYMPTOM,
            attributes: Object.freeze({ label }),
            nodeId:     `kgn_symptom_${_slugify(label)}`,
          });
          symptomNodeMap.set(label, node.nodeId);
        }
        this.#kgService.addEdge({
          fromNodeId:    diseaseNodeId,
          toNodeId:      symptomNodeMap.get(label),
          relationType:  KG_RELATION_TYPES.HAS_SYMPTOM,
          evidenceCount: MIN_EVIDENCE,
          confidence:    DEFAULT_CONFIDENCE,
          edgeId: `kge_has_symptom_${_slugify(disease.diseaseKey ?? disease.name)}_${_slugify(label)}`,
        });
      }
    }

    // ── 3. Phase Nodes + WORSE_IN_PHASE edges (from cluster snapshots) ─────
    const phaseNodeMap = new Map();    // phase → nodeId
    for (const snap of clusterSnapshots) {
      if (!snap.dominantPhase) continue;
      const phase = snap.dominantPhase;
      if (!phaseNodeMap.has(phase)) {
        const node = this.#kgService.addNode({
          type:       KG_NODE_TYPES.PHASE,
          attributes: Object.freeze({ phase }),
          nodeId:     `kgn_phase_${_slugify(phase)}`,
        });
        phaseNodeMap.set(phase, node.nodeId);
      }
      const diseaseNodeId = diseaseNodeMap.get(snap.clusterId);
      if (!diseaseNodeId) continue;
      this.#kgService.addEdge({
        fromNodeId:    diseaseNodeId,
        toNodeId:      phaseNodeMap.get(phase),
        relationType:  KG_RELATION_TYPES.WORSE_IN_PHASE,
        evidenceCount: snap.caseCount ?? MIN_EVIDENCE,
        confidence:    CLUSTER_CONFIDENCE,
        edgeId: `kge_worse_in_phase_${_slugify(snap.clusterId)}_${_slugify(phase)}`,
      });
    }

    // ── 4. Signal Pattern Nodes + SIGNAL_INDICATES edges ──────────────────
    const signalTypeMap = new Map();   // signalType → Set<diseaseKey>
    for (const sig of signals) {
      const st = sig.signalType;
      if (!st) continue;
      if (!signalTypeMap.has(st)) signalTypeMap.set(st, new Set());
      const dkey = sig.diseaseKey ?? null;
      if (dkey) signalTypeMap.get(st).add(dkey);
    }

    // Also derive from cluster snapshots' signalMeans
    for (const snap of clusterSnapshots) {
      for (const st of Object.keys(snap.signalMeans ?? {})) {
        if (!signalTypeMap.has(st)) signalTypeMap.set(st, new Set());
        signalTypeMap.get(st).add(snap.clusterId);
      }
    }

    const signalPatternNodeMap = new Map();  // signalType → nodeId
    for (const [signalType, diseaseKeys] of signalTypeMap) {
      if (!signalPatternNodeMap.has(signalType)) {
        const node = this.#kgService.addNode({
          type:       KG_NODE_TYPES.SIGNAL_PATTERN,
          attributes: Object.freeze({ signalType }),
          nodeId:     `kgn_signal_${_slugify(signalType)}`,
        });
        signalPatternNodeMap.set(signalType, node.nodeId);
      }
      for (const dkey of diseaseKeys) {
        const diseaseNodeId = diseaseNodeMap.get(dkey);
        if (!diseaseNodeId) continue;
        this.#kgService.addEdge({
          fromNodeId:    signalPatternNodeMap.get(signalType),
          toNodeId:      diseaseNodeId,
          relationType:  KG_RELATION_TYPES.SIGNAL_INDICATES,
          evidenceCount: MIN_EVIDENCE,
          confidence:    DEFAULT_CONFIDENCE,
          edgeId: `kge_signal_indicates_${_slugify(signalType)}_${_slugify(dkey)}`,
        });
      }
    }

    // ── 5. Outcome Nodes + LEADS_TO_OUTCOME edges ─────────────────────────
    const outcomeNodeMap = new Map();  // outcomeKey → nodeId
    // Ensure all outcome types exist in the graph
    for (const outcomeKey of OUTCOME_KEYS) {
      if (!outcomeNodeMap.has(outcomeKey)) {
        const node = this.#kgService.addNode({
          type:       KG_NODE_TYPES.OUTCOME,
          attributes: Object.freeze({ outcomeKey }),
          nodeId:     `kgn_outcome_${_slugify(outcomeKey)}`,
        });
        outcomeNodeMap.set(outcomeKey, node.nodeId);
      }
    }

    // Wire disease → outcome from Case.outcomeCategory
    const diseaseOutcomeMap = new Map();  // diseaseKey → Set<outcomeKey>
    for (const c of cases) {
      const dkey   = c.diseaseKey ?? null;
      const outcome = c.outcomeCategory ?? null;
      if (!dkey || !outcome) continue;
      if (!OUTCOME_KEYS.includes(outcome)) continue;
      if (!diseaseOutcomeMap.has(dkey)) diseaseOutcomeMap.set(dkey, new Set());
      diseaseOutcomeMap.get(dkey).add(outcome);
    }
    for (const [dkey, outcomeKeys] of diseaseOutcomeMap) {
      const diseaseNodeId = diseaseNodeMap.get(dkey);
      if (!diseaseNodeId) continue;
      for (const outcomeKey of outcomeKeys) {
        this.#kgService.addEdge({
          fromNodeId:    diseaseNodeId,
          toNodeId:      outcomeNodeMap.get(outcomeKey),
          relationType:  KG_RELATION_TYPES.LEADS_TO_OUTCOME,
          evidenceCount: MIN_EVIDENCE,
          confidence:    DEFAULT_CONFIDENCE,
          edgeId: `kge_leads_to_${_slugify(dkey)}_${_slugify(outcomeKey)}`,
        });
      }
    }

    // ── 6. COMORBID_WITH edges (diseases sharing patient signals) ─────────
    //  Group signals by user, then find diseases co-occurring in same user
    const userDiseaseMap = new Map();  // userId → Set<diseaseKey>
    for (const sig of signals) {
      const userId = sig.userId ?? sig.metadata?.userId ?? null;
      const dkey   = sig.diseaseKey ?? null;
      if (!userId || !dkey) continue;
      if (!userDiseaseMap.has(userId)) userDiseaseMap.set(userId, new Set());
      userDiseaseMap.get(userId).add(dkey);
    }
    const comorbidPairs = new Set();
    for (const diseaseKeys of userDiseaseMap.values()) {
      const arr = [...diseaseKeys];
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const [a, b] = [arr[i], arr[j]].sort();
          comorbidPairs.add(`${a}||${b}`);
        }
      }
    }
    for (const pair of comorbidPairs) {
      const [keyA, keyB] = pair.split('||');
      const nodeA = diseaseNodeMap.get(keyA);
      const nodeB = diseaseNodeMap.get(keyB);
      if (!nodeA || !nodeB) continue;
      this.#kgService.addEdge({
        fromNodeId:    nodeA,
        toNodeId:      nodeB,
        relationType:  KG_RELATION_TYPES.COMORBID_WITH,
        evidenceCount: MIN_EVIDENCE,
        confidence:    DEFAULT_CONFIDENCE,
        edgeId: `kge_comorbid_${_slugify(keyA)}_${_slugify(keyB)}`,
      });
    }

    // ── 7. OBSERVED_IN edges (symptom / signalPattern → phase) ────────────
    for (const snap of clusterSnapshots) {
      if (!snap.dominantPhase) continue;
      const phaseNodeId = phaseNodeMap.get(snap.dominantPhase);
      if (!phaseNodeId) continue;
      // Each signal type in this cluster's signalMeans was OBSERVED_IN the dominant phase
      for (const st of Object.keys(snap.signalMeans ?? {})) {
        const spNodeId = signalPatternNodeMap.get(st);
        if (!spNodeId) continue;
        this.#kgService.addEdge({
          fromNodeId:    spNodeId,
          toNodeId:      phaseNodeId,
          relationType:  KG_RELATION_TYPES.OBSERVED_IN,
          evidenceCount: snap.caseCount ?? MIN_EVIDENCE,
          confidence:    CLUSTER_CONFIDENCE,
          edgeId: `kge_observed_in_${_slugify(st)}_${_slugify(snap.clusterId)}_${_slugify(snap.dominantPhase)}`,
        });
      }
    }

    // ── 8. Snapshot ────────────────────────────────────────────────────────
    const stats = this.#kgService.getStats();
    const snapshot = buildKgSnapshot({
      kgVersion,
      nodeCount:          stats.nodeCount,
      edgeCount:          stats.edgeCount,
      diseaseCount:       diseaseNodeMap.size,
      symptomCount:       symptomNodeMap.size,
      outcomeCount:       outcomeNodeMap.size,
      phaseCount:         phaseNodeMap.size,
      signalPatternCount: signalPatternNodeMap.size,
      lowConfidenceEdges: stats.lowConfidenceEdges,
      metadata: Object.freeze({
        diseaseCount:    diseaseNodeMap.size,
        clusterCount:    clusterSnapshots.length,
        signalCount:     signals.length,
        caseCount:       cases.length,
      }),
    });

    this.#publish(DOMAIN_EVENT_TYPES.KNOWLEDGE_GRAPH_SNAPSHOT_CREATED, 'KNOWLEDGE', snapshot.id, {
      kgVersion:  snapshot.kgVersion,
      nodeCount:  snapshot.nodeCount,
      edgeCount:  snapshot.edgeCount,
      generatedAt: snapshot.generatedAt,
    });

    return Object.freeze({
      snapshot,
      addedNodes: stats.nodeCount,
      addedEdges: stats.edgeCount,
    });
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  #publish(eventType, aggregateType, aggregateId, payload) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({ eventType, aggregateType, aggregateId, payload });
      this.#eventPublisher.publish(event);
    } catch {
      // best-effort
    }
  }
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function _slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function _buildVersionString() {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, '0');
  const d   = String(now.getDate()).padStart(2, '0');
  return `KG-v1.0-${y}${m}${d}`;
}
