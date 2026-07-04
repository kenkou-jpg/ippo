// evidence-layer-service.js — Evidence Layer Service.
// Integrates Dataset + ClusterStats + PatternEvidence + EventLogs → EvidenceSummary.
// BD-018: EvidenceSummary carries generatedAt ISO string (via buildEvidenceSummary).
// BD-031: Pure deterministic aggregation — no AI / LLM.
// BD-032: All returned objects are frozen.
// PR-056: Evidence Layer (Phase C capstone — Phase D entry condition)

import { buildEvidenceSummary }              from './evidence-summary-entity.js';
import { buildDomainEvent }                  from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';
import {
  EVIDENCE_SOURCE_TYPES, EVIDENCE_SCHEMA_VERSION, PLATFORM_VERSION,
} from './evidence-types.js';

export { EVIDENCE_SOURCE_TYPES, EVIDENCE_SCHEMA_VERSION, PLATFORM_VERSION };

export class EvidenceLayerService {
  #eventPublisher;

  /**
   * @param {{ eventPublisher?: object|null }} deps
   */
  constructor({ eventPublisher = null } = {}) {
    this.#eventPublisher = eventPublisher ?? null;
  }

  // ── Compile ────────────────────────────────────────────────────────────────

  /**
   * Compile an EvidenceSummary from all available evidence sources.
   * This is the Phase C capstone — aggregating KG / ClusterStats / Dataset / Events.
   *
   * @param {{
   *   datasets?:        object[],   // DatasetVersion records (PR-055)
   *   clusterStats?:    object[],   // DiseaseCluster snapshots (PR-046)
   *   patternEvidence?: object[],   // Pattern evidence items (PR-058 forward compat)
   *   eventLogs?:       object[],   // DomainEvent log entries (PR-042)
   *   kgSnapshot?:      object|null, // KnowledgeGraph snapshot (PR-052)
   *   metadata?:        object,
   *   summaryId?:       string,
   * }} input
   * @returns {Readonly<object>} EvidenceSummary
   */
  compile({
    datasets        = [],
    clusterStats    = [],
    patternEvidence = [],
    eventLogs       = [],
    kgSnapshot      = null,
    metadata        = {},
    summaryId,
  } = {}) {
    if (!Array.isArray(datasets))        throw new Error('[EvidenceLayerService] datasets must be an array');
    if (!Array.isArray(clusterStats))    throw new Error('[EvidenceLayerService] clusterStats must be an array');
    if (!Array.isArray(patternEvidence)) throw new Error('[EvidenceLayerService] patternEvidence must be an array');
    if (!Array.isArray(eventLogs))       throw new Error('[EvidenceLayerService] eventLogs must be an array');

    const summary = buildEvidenceSummary({
      datasets, clusterStats, patternEvidence, eventLogs, kgSnapshot, metadata, summaryId,
    });

    this.#publish(DOMAIN_EVENT_TYPES.EVIDENCE_SUMMARY_CREATED, summary.summaryId, {
      summaryId:     summary.summaryId,
      evidenceScore: summary.evidenceScore,
      datasetCount:  summary.datasetCount,
    });

    return summary;
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:          true,
      schemaVersion:  EVIDENCE_SCHEMA_VERSION,
      platformVersion: PLATFORM_VERSION,
      phaseCComplete: true,
      sources:        Object.freeze(Object.values(EVIDENCE_SOURCE_TYPES)),
    });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  #publish(eventType, aggregateId, payload) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType, aggregateId, aggregateType: AGGREGATE_TYPES.EVIDENCE, payload,
      });
      this.#eventPublisher.publish(event);
    } catch { /* best-effort */ }
  }
}
