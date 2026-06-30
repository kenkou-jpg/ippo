// evidence-summary-entity.js — EvidenceSummary frozen value object.
// BD-018: generatedAt ISO string is required (auto-generated).
// BD-032: Append-Only — frozen; never mutated in place.
// PR-056: Evidence Layer (Phase C capstone)

import { EVIDENCE_SCHEMA_VERSION, PLATFORM_VERSION } from './evidence-types.js';

let _idCounter = 0;

/**
 * Build a frozen EvidenceSummary from aggregated evidence inputs.
 *
 * @param {{
 *   datasets?:        object[],   // DatasetVersion records (PR-055)
 *   clusterStats?:    object[],   // DiseaseCluster snapshots (PR-046)
 *   patternEvidence?: object[],   // Pattern evidence items (PR-058 future)
 *   eventLogs?:       object[],   // DomainEvent log entries (PR-042)
 *   kgSnapshot?:      object|null, // KnowledgeGraph snapshot (PR-052)
 *   metadata?:        object,
 *   summaryId?:       string,
 * }} params
 * @returns {Readonly<object>}
 */
export function buildEvidenceSummary({
  datasets        = [],
  clusterStats    = [],
  patternEvidence = [],
  eventLogs       = [],
  kgSnapshot      = null,
  metadata        = {},
  summaryId,
} = {}) {
  // ── Dataset refs ──────────────────────────────────────────────────────────
  const datasetVersionRefs = Object.freeze(
    datasets.map(d => Object.freeze({
      versionId:    d.versionId    ?? null,
      versionName:  d.versionName  ?? null,
      type:         d.type         ?? null,
      doiCandidate: d.doiCandidate ?? null,
    }))
  );
  const doiCandidates = Object.freeze(
    datasets.map(d => d.doiCandidate).filter(Boolean)
  );

  // ── Cluster refs ──────────────────────────────────────────────────────────
  const clusterRefs = Object.freeze(
    clusterStats.map(c => Object.freeze({
      clusterId:  c.clusterId  ?? c.diseaseKey ?? null,
      diseaseKey: c.diseaseKey ?? c.clusterId  ?? null,
      caseCount:  c.caseCount  ?? c.stats?.caseCount ?? null,
    }))
  );

  // ── Pattern summary ───────────────────────────────────────────────────────
  const patternTypes = [...new Set(patternEvidence.map(p => p.patternType).filter(Boolean))];
  const patternSummary = Object.freeze({
    patternCount: patternEvidence.length,
    types:        Object.freeze(patternTypes),
  });

  // ── Event log summary ─────────────────────────────────────────────────────
  const eventLogSummary = Object.freeze({
    eventCount: eventLogs.length,
    eventTypes: Object.freeze(
      [...new Set(eventLogs.map(e => e.eventType).filter(Boolean))]
    ),
  });

  // ── KG summary ───────────────────────────────────────────────────────────
  const kgSummary = kgSnapshot
    ? Object.freeze({
        nodeCount:          kgSnapshot.nodeCount          ?? null,
        edgeCount:          kgSnapshot.edgeCount          ?? null,
        lowConfidenceEdges: kgSnapshot.lowConfidenceEdges ?? null,
        kgVersion:          kgSnapshot.kgVersion          ?? null,
      })
    : null;

  // ── Evidence score (0–5 sources contributing) ────────────────────────────
  const evidenceScore =
    (datasets.length        > 0 ? 1 : 0) +
    (clusterStats.length    > 0 ? 1 : 0) +
    (patternEvidence.length > 0 ? 1 : 0) +
    (eventLogs.length       > 0 ? 1 : 0) +
    (kgSnapshot             !== null ? 1 : 0);

  // ── Citation metadata (Wave3 academic citation foundation) ────────────────
  const now = new Date().toISOString();
  const citationMetadata = Object.freeze({
    platformVersion:    PLATFORM_VERSION,
    schemaVersion:      EVIDENCE_SCHEMA_VERSION,
    generatedAt:        now,
    doiCandidates,
    datasetVersionRefs,
    clusterRefs,
    kgVersion:          kgSnapshot?.kgVersion ?? null,
    evidenceScore,
  });

  return Object.freeze({
    summaryId:       summaryId ?? `evs_${Date.now()}_${++_idCounter}`,
    generatedAt:     now,
    schemaVersion:   EVIDENCE_SCHEMA_VERSION,
    datasetCount:    datasets.length,
    clusterStatCount: clusterStats.length,
    patternCount:    patternEvidence.length,
    eventLogCount:   eventLogs.length,
    evidenceScore,
    datasetVersionRefs,
    doiCandidates,
    clusterRefs,
    patternSummary,
    eventLogSummary,
    kgSummary,
    citationMetadata,
    metadata:        Object.freeze({ ...metadata }),
  });
}
