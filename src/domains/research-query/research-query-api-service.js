// research-query-api-service.js — Research Query API Service.
// Integrates Cohort Builder (PR-054) / Research Assistance (PR-061, itself wrapping
// Evidence Layer PR-056) / Knowledge Graph (PR-051/052) into a single admin:research
// query surface with 4 QueryTypes (Roadmap PR-071 責務①②).
// BD-030 ZERO TOLERANCE: every case-bearing QueryType result is k-anonymity gated (k>=5).
//         KG_PATH_QUERY is exempt — the Knowledge Graph holds only structural
//         Disease×Symptom×Outcome×Phase×SignalPattern nodes/edges, never case-level records.
// BD-031: pure deterministic aggregation / graph traversal — zero LLM/ML.
// BD-032: all returned objects are frozen.
// PR-071: Research Query API (Phase F継続)

import { buildDomainEvent }                    from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';
import { KAnonymityError }                     from '../case-recommendation/case-recommendation-service.js';
import { K_ANONYMITY_MIN }                     from '../case-recommendation/case-recommendation-types.js';
import {
  QUERY_TYPES, RESEARCH_QUERY_SCHEMA_VERSION, KG_PATH_QUERY_MAX_DEPTH,
} from './research-query-types.js';

export { KAnonymityError, K_ANONYMITY_MIN, QUERY_TYPES, RESEARCH_QUERY_SCHEMA_VERSION };

export class ResearchQueryApiService {
  #evidenceLayerService;
  #researchAssistanceService;
  #cohortBuilderService;
  #knowledgeGraphService;
  #eventPublisher;

  /**
   * @param {{
   *   evidenceLayerService:      import('../evidence/evidence-layer-service.js').EvidenceLayerService,
   *   researchAssistanceService: import('../research-assistance/research-assistance-service.js').ResearchAssistanceService,
   *   cohortBuilderService:      import('../cohort/cohort-builder-service.js').CohortBuilderService,
   *   knowledgeGraphService:     import('../knowledge/knowledge-graph-service.js').KnowledgeGraphService,
   *   eventPublisher?:           object|null,
   * }} deps
   */
  constructor({
    evidenceLayerService,
    researchAssistanceService,
    cohortBuilderService,
    knowledgeGraphService,
    eventPublisher = null,
  } = {}) {
    if (!evidenceLayerService)      throw new Error('[ResearchQueryApiService] evidenceLayerService is required');
    if (!researchAssistanceService) throw new Error('[ResearchQueryApiService] researchAssistanceService is required');
    if (!cohortBuilderService)      throw new Error('[ResearchQueryApiService] cohortBuilderService is required');
    if (!knowledgeGraphService)     throw new Error('[ResearchQueryApiService] knowledgeGraphService is required');

    this.#evidenceLayerService      = evidenceLayerService;
    this.#researchAssistanceService = researchAssistanceService;
    this.#cohortBuilderService      = cohortBuilderService;
    this.#knowledgeGraphService     = knowledgeGraphService;
    this.#eventPublisher            = eventPublisher ?? null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Execute a research query. Dispatches to one of 4 QueryTypes.
   * BD-030: every case-bearing result is k-anonymity gated (k >= K_ANONYMITY_MIN).
   *
   * @param {{ queryType: string, params?: object }} input
   * @returns {Readonly<object>} QueryResult
   * @throws {KAnonymityError} if a matched group has k < K_ANONYMITY_MIN
   */
  executeQuery({ queryType, params = {} } = {}) {
    if (!queryType) throw new Error('[ResearchQueryApiService] queryType is required');
    if (!Object.values(QUERY_TYPES).includes(queryType)) {
      throw new Error(`[ResearchQueryApiService] unknown queryType: "${queryType}"`);
    }

    let result;
    switch (queryType) {
      case QUERY_TYPES.COHORT_STATS:
        result = this.#queryCohortStats(params);
        break;
      case QUERY_TYPES.SIGNAL_CORRELATION:
        result = this.#querySignalCorrelation(params);
        break;
      case QUERY_TYPES.DISEASE_CLUSTER_COMPARE:
        result = this.#queryDiseaseClusterCompare(params);
        break;
      case QUERY_TYPES.KG_PATH_QUERY:
        result = this.#queryKgPath(params);
        break;
    }

    const queryResult = Object.freeze({
      queryType,
      result,
      isMedicalAdvice: false,
      schemaVersion:   RESEARCH_QUERY_SCHEMA_VERSION,
      generatedAt:     new Date().toISOString(),
    });

    this.#publish(DOMAIN_EVENT_TYPES.RESEARCH_QUERY_EXECUTED, queryType, { queryType });

    return queryResult;
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:          true,
      schemaVersion:  RESEARCH_QUERY_SCHEMA_VERSION,
      queryTypes:     Object.freeze(Object.values(QUERY_TYPES)),
      bd030:          `COHORT_STATS / SIGNAL_CORRELATION / DISEASE_CLUSTER_COMPARE are k-anonymity gated ` +
                       `(k>=${K_ANONYMITY_MIN}); KG_PATH_QUERY is structural-only (no case-level data, exempt).`,
      bd031:          'deterministic aggregation / graph traversal only — zero LLM/ML',
      access:         'admin:research only',
      kgPathMaxDepth: KG_PATH_QUERY_MAX_DEPTH,
    });
  }

  // ── QueryType: COHORT_STATS ───────────────────────────────────────────────

  /**
   * BD-030/BD-039: re-verifies cohort publication eligibility via CohortBuilderService —
   * throws if the cohort has not been k-anonymity verified or verifiedCount < K_ANONYMITY_MIN.
   */
  #queryCohortStats({ cohortId } = {}) {
    if (!cohortId) throw new Error('[ResearchQueryApiService] params.cohortId is required for COHORT_STATS');

    const cohort = this.#cohortBuilderService.getCohort(cohortId);
    if (!cohort) throw new Error(`[ResearchQueryApiService] cohort not found: "${cohortId}"`);

    // BD-030: re-verified on every query — throws if not eligible for research use.
    this.#cohortBuilderService.checkPublicationEligibility(cohortId);

    const evidenceSummary = this.#evidenceLayerService.compile({ metadata: { cohortId } });

    return Object.freeze({
      cohortId:           cohort.cohortId,
      name:               cohort.name,
      verifiedCount:      cohort.verifiedCount,
      kAnonymityVerified: cohort.kAnonymityVerified,
      evidenceSummary,
    });
  }

  // ── QueryType: SIGNAL_CORRELATION ─────────────────────────────────────────

  /**
   * Delegates to ResearchAssistanceService.analyze() for descriptive stats + Pearson r.
   * BD-030: caller must supply the actual case count backing the datasets (structural
   * gate — the service has no way to derive it from raw signalType/value arrays).
   */
  #querySignalCorrelation({ datasets, caseCount } = {}) {
    if (!Array.isArray(datasets) || datasets.length === 0) {
      throw new Error('[ResearchQueryApiService] params.datasets is required for SIGNAL_CORRELATION');
    }
    if (typeof caseCount !== 'number') {
      throw new Error('[ResearchQueryApiService] params.caseCount is required for SIGNAL_CORRELATION (BD-030 k-anonymity gate)');
    }
    if (caseCount > 0 && caseCount < K_ANONYMITY_MIN) {
      throw new KAnonymityError('SIGNAL_CORRELATION', caseCount);
    }

    const { descriptiveStats, signalCorrelations } = this.#researchAssistanceService.analyze({ datasets });

    return Object.freeze({ caseCount, descriptiveStats, signalCorrelations });
  }

  // ── QueryType: DISEASE_CLUSTER_COMPARE ────────────────────────────────────

  /**
   * Delegates to ResearchAssistanceService.analyze() for clusterComparison.
   * BD-030: every diseaseKey group in the comparison is individually gated.
   */
  #queryDiseaseClusterCompare({ clusterStats = [], cohorts = [] } = {}) {
    const { clusterComparison } = this.#researchAssistanceService.analyze({ datasets: [], clusterStats, cohorts });

    for (const entry of clusterComparison) {
      if (entry.totalCaseCount > 0 && entry.totalCaseCount < K_ANONYMITY_MIN) {
        throw new KAnonymityError(entry.diseaseKey, entry.totalCaseCount);
      }
    }

    return Object.freeze({ clusterComparison: Object.freeze(clusterComparison) });
  }

  // ── QueryType: KG_PATH_QUERY ───────────────────────────────────────────────

  /**
   * BFS traversal over Knowledge Graph edges (undirected) bounded by maxDepth.
   * BD-036: read-only — no KG mutation. Exempt from k-anonymity: KG nodes/edges are
   * structural (Disease/Symptom/Outcome/Phase/SignalPattern), never case-level records.
   */
  #queryKgPath({ fromNodeId, toNodeId, maxDepth = KG_PATH_QUERY_MAX_DEPTH } = {}) {
    if (!fromNodeId) throw new Error('[ResearchQueryApiService] params.fromNodeId is required for KG_PATH_QUERY');
    if (!toNodeId)   throw new Error('[ResearchQueryApiService] params.toNodeId is required for KG_PATH_QUERY');
    if (maxDepth > KG_PATH_QUERY_MAX_DEPTH) {
      throw new Error(`[ResearchQueryApiService] maxDepth exceeds limit (${KG_PATH_QUERY_MAX_DEPTH})`);
    }

    if (!this.#knowledgeGraphService.getNode(fromNodeId)) {
      throw new Error(`[ResearchQueryApiService] KG node not found: "${fromNodeId}"`);
    }
    if (!this.#knowledgeGraphService.getNode(toNodeId)) {
      throw new Error(`[ResearchQueryApiService] KG node not found: "${toNodeId}"`);
    }

    const path = this.#bfsPath(fromNodeId, toNodeId, maxDepth);

    return Object.freeze({
      fromNodeId,
      toNodeId,
      found: path !== null,
      path:  path ? Object.freeze(path) : null,
    });
  }

  /** BFS over KG edges (both directions), bounded by maxDepth. Returns node-id path or null. */
  #bfsPath(fromNodeId, toNodeId, maxDepth) {
    if (fromNodeId === toNodeId) return [fromNodeId];

    const visited = new Set([fromNodeId]);
    let frontier  = [[fromNodeId]];

    for (let depth = 0; depth < maxDepth; depth++) {
      const nextFrontier = [];
      for (const path of frontier) {
        const nodeId = path[path.length - 1];
        const edges  = this.#knowledgeGraphService.getEdgesByNode(nodeId);
        for (const edge of edges) {
          const neighborId = edge.fromNodeId === nodeId ? edge.toNodeId : edge.fromNodeId;
          if (visited.has(neighborId)) continue;
          const nextPath = [...path, neighborId];
          if (neighborId === toNodeId) return nextPath;
          visited.add(neighborId);
          nextFrontier.push(nextPath);
        }
      }
      frontier = nextFrontier;
      if (frontier.length === 0) break;
    }
    return null;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  #publish(eventType, aggregateId, payload) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType, aggregateId, aggregateType: AGGREGATE_TYPES.RESEARCH_QUERY, payload,
      });
      this.#eventPublisher.publish(event);
    } catch { /* best-effort */ }
  }
}
