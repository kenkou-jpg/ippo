// research-dataset-v2-service.js — PR-068: Research Dataset V2.
// Composes Wave2 Layer 2〜9 assets (Record × Signal(6種) × DiseaseEntity × Case ×
// V2 Edge(PR-063) × ClusterStats(PR-046) × KG骨格(PR-052)) into the Wave2 completed
// Dataset format, then publishes it through DatasetVersionService (PR-055) under
// explicit Founder approval.
// BD-021: publication is Append-Only and requires an explicit Founder approval (founderId).
// BD-030: ZERO TOLERANCE — any included disease cluster with caseCount < 5 blocks
//         generation entirely (no partial/suppressed dataset — unlike Wave1's group
//         suppression, Wave2 Dataset V2 refuses to build at all).
// BD-031 / BD-038: pure deterministic aggregation — no AI, no LLM, no randomness.

import { buildResearchDatasetV2 }         from './research-dataset-v2-entity.js';
import {
  RESEARCH_DATASET_V2_SCHEMA_VERSION, DATASET_V2_MAJOR, DATASET_V2_MINOR, K_ANONYMITY_MIN_K,
} from './research-dataset-v2-types.js';
import { DATASET_TYPES }                  from '../dataset-version/dataset-version-types.js';
import { buildDomainEvent }               from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';

/** Thrown when any included disease cluster has caseCount < K_ANONYMITY_MIN_K (BD-030 ZERO TOLERANCE). */
export class DatasetKAnonymityError extends Error {
  /** @param {string} diseaseKey @param {number} count */
  constructor(diseaseKey, count) {
    super(
      `[ResearchDatasetV2Service] BD-030 ZERO TOLERANCE: k-anonymity violation. ` +
      `diseaseKey="${diseaseKey}" cluster has only ${count} case(s) (minimum k=${K_ANONYMITY_MIN_K}). ` +
      `Dataset V2 generation blocked.`
    );
    this.name       = 'DatasetKAnonymityError';
    this.diseaseKey = diseaseKey;
    this.count      = count;
  }
}

/** Thrown when publishDatasetV2() is called without an explicit Founder approval (BD-021). */
export class DatasetV2PublicationNotApprovedError extends Error {
  constructor() {
    super(
      '[ResearchDatasetV2Service] BD-021: publication requires an explicit Founder ' +
      'approval (founderId) — anonymous/unattributed publication is rejected.'
    );
    this.name = 'DatasetV2PublicationNotApprovedError';
  }
}

export class ResearchDatasetV2Service {
  #datasetVersionService;
  #eventPublisher;

  /**
   * @param {{
   *   datasetVersionService: import('../dataset-version/dataset-version-service.js').DatasetVersionService,
   *   eventPublisher?:       object|null,
   * }} deps
   */
  constructor({ datasetVersionService, eventPublisher = null }) {
    if (!datasetVersionService) {
      throw new Error('[ResearchDatasetV2Service] datasetVersionService is required');
    }
    this.#datasetVersionService = datasetVersionService;
    this.#eventPublisher        = eventPublisher ?? null;
  }

  /**
   * Build a Dataset V2 from pre-collected Wave2 assets.
   * BD-030 ZERO TOLERANCE: throws DatasetKAnonymityError if any clusterProfile has
   * caseCount < 5 — the dataset is not built at all (completion condition ②).
   *
   * @param {{
   *   signals?:         object[],
   *   diseases?:        object[],
   *   cases?:           object[],
   *   v2Edges?:         object[],
   *   clusterProfiles?: Record<string, object>,  keyed by diseaseKey → DiseaseClusterProfile (PR-046)
   *   kgSnapshot?:      object|null,              KnowledgeGraphSnapshot (PR-052)
   *   metadata?:        object,
   * }} input
   * @returns {Readonly<object>} ResearchDatasetV2
   * @throws {DatasetKAnonymityError}
   */
  buildDatasetV2({
    signals = [], diseases = [], cases = [], v2Edges = [],
    clusterProfiles = {}, kgSnapshot = null, metadata = {},
  } = {}) {
    for (const [diseaseKey, profile] of Object.entries(clusterProfiles)) {
      const count = profile?.caseCount ?? 0;
      if (count < K_ANONYMITY_MIN_K) {
        throw new DatasetKAnonymityError(diseaseKey, count);
      }
    }

    const dataset = buildResearchDatasetV2({
      signals, diseases, cases, v2Edges, clusterProfiles, kgSnapshot, metadata,
    });
    this.#publishBuilt(dataset);
    return dataset;
  }

  /**
   * Publish a built Dataset V2 as a versioned, named artifact via DatasetVersionService (PR-055).
   * Naming: IPPO-DATASET-FULL-v2.0-{YYYYMMDD} (completion condition — "IPPO-DATASET-*-v2.0-*").
   * BD-021: hard-blocked (DatasetV2PublicationNotApprovedError) without an explicit founderId
   * (completion condition ③).
   *
   * @param {Readonly<object>} datasetV2  from buildDatasetV2()
   * @param {{ founderId: string }} approval
   * @returns {Readonly<object>} DatasetVersion (PR-055)
   * @throws {DatasetV2PublicationNotApprovedError}
   */
  publishDatasetV2(datasetV2, { founderId } = {}) {
    if (!datasetV2?.id) throw new Error('[ResearchDatasetV2Service] datasetV2 is required');
    if (!founderId || typeof founderId !== 'string') {
      throw new DatasetV2PublicationNotApprovedError();
    }

    return this.#datasetVersionService.publish({
      type:      DATASET_TYPES.FULL,
      major:     DATASET_V2_MAJOR,
      minor:     DATASET_V2_MINOR,
      datasetId: datasetV2.id,
      createdBy: founderId,
      content:   {
        recordCount:  datasetV2.recordCount,
        signalCount:  datasetV2.signalCount,
        diseaseCount: datasetV2.diseaseCount,
        caseCount:    datasetV2.caseCount,
        v2EdgeCount:  datasetV2.v2EdgeCount,
        clusterCount: datasetV2.clusterCount,
        kgNodeCount:  datasetV2.kgNodeCount,
        kgEdgeCount:  datasetV2.kgEdgeCount,
      },
      metadata: {
        schemaVersion: datasetV2.schemaVersion,
        generatedAt:   datasetV2.generatedAt,
      },
    });
  }

  /**
   * JSON export of a Dataset V2 — includes KG / V2 Edge / Cluster Stats fields (V2 format).
   * @param {Readonly<object>} datasetV2
   * @returns {Readonly<{ format: string, data: string, metadata: Readonly<object> }>}
   */
  exportJSON(datasetV2) {
    if (!datasetV2?.id) throw new Error('[ResearchDatasetV2Service] datasetV2 is required');
    return Object.freeze({
      format:   'JSON',
      data:     JSON.stringify(datasetV2, null, 2),
      metadata: this.#exportMetadata(datasetV2, 'JSON'),
    });
  }

  /**
   * CSV export of a Dataset V2's V2 Edge pool — V2-specific field addition over the
   * Wave1 signal-row CSV format (DatasetExportService, PR-040).
   * @param {Readonly<object>} datasetV2
   * @returns {Readonly<{ format: string, data: string, metadata: Readonly<object> }>}
   */
  exportCSV(datasetV2) {
    if (!datasetV2?.id) throw new Error('[ResearchDatasetV2Service] datasetV2 is required');
    const header = ['edgeId', 'sourceCaseId', 'targetCaseId', 'diseaseKey', 'score', 'displayScore', 'vectorVersion'];
    const rows   = (datasetV2.v2Edges ?? []).map(e => header.map(col => {
      const val = e[col] ?? '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(','));

    const data = [header.join(','), ...rows].join('\n');
    return Object.freeze({ format: 'CSV', data, metadata: this.#exportMetadata(datasetV2, 'CSV') });
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:          true,
      schemaVersion:  RESEARCH_DATASET_V2_SCHEMA_VERSION,
      majorVersion:   DATASET_V2_MAJOR,
      minorVersion:   DATASET_V2_MINOR,
      kAnonymityMin:  K_ANONYMITY_MIN_K,
      namingPattern:  'IPPO-DATASET-FULL-v2.0-{YYYYMMDD} (via DatasetVersionService)',
      composition:    'Record × Signal(6種) × DiseaseEntity × Case × V2 Edge × ClusterStats × KG骨格',
      bd021:          'publication requires an explicit Founder approval (founderId)',
      bd030:          `k < ${K_ANONYMITY_MIN_K} disease clusters block Dataset V2 generation entirely`,
      bd031:          'pure deterministic aggregation — zero LLM/AI',
    });
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #exportMetadata(datasetV2, format) {
    return Object.freeze({
      generatedAt:  new Date().toISOString(), // BD-018
      datasetId:    datasetV2.id,
      format,
      recordCount:  datasetV2.recordCount,
      signalCount:  datasetV2.signalCount,
      diseaseCount: datasetV2.diseaseCount,
      caseCount:    datasetV2.caseCount,
      v2EdgeCount:  datasetV2.v2EdgeCount,
      clusterCount: datasetV2.clusterCount,
      kgNodeCount:  datasetV2.kgNodeCount,
      kgEdgeCount:  datasetV2.kgEdgeCount,
    });
  }

  #publishBuilt(dataset) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.RESEARCH_DATASET_V2_BUILT,
        aggregateType: AGGREGATE_TYPES.RESEARCH,
        aggregateId:   dataset.id,
        payload:       Object.freeze({
          datasetId:    dataset.id,
          recordCount:  dataset.recordCount,
          signalCount:  dataset.signalCount,
          diseaseCount: dataset.diseaseCount,
          caseCount:    dataset.caseCount,
          v2EdgeCount:  dataset.v2EdgeCount,
          clusterCount: dataset.clusterCount,
          generatedAt:  dataset.generatedAt,
        }),
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort.
    }
  }
}
