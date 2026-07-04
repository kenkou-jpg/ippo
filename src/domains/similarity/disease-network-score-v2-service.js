// disease-network-score-v2-service.js — PR-064: Disease Network Score V2.
// Integrates DiseaseClusterStatisticsService profile (PR-046) × SimilarityEngineV2 edges
// (PR-063) × LongitudinalEdgeEnricher context (PR-048) into a single NetworkScore.
//
// BD-042: only vectorVersion='2' edges are counted — V1 edges (which permanently coexist
//          in the same similarity_edges store per BD-001) are filtered out, never mixed in.
// BD-018: every NetworkScore carries generatedAt and vectorVersion='2'.
// BD-031 / BD-038: pure statistical aggregation — no AI, no LLM, no randomness.

import { VECTOR_VERSION_V2 }        from './feature-vector-v2-types.js';
import { LONGITUDINAL_TREND }       from './longitudinal-edge-enricher.js';
import { buildDomainEvent }         from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';

/** Schema version for the NetworkScore V2 result shape. */
export const NETWORK_SCORE_V2_SCHEMA_VERSION = '1';

function _mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Count trend occurrences (source + target) across enriched edges, ignoring UNKNOWN.
 * Returns the most frequent trend, or UNKNOWN when no enriched data is present.
 * @param {object[]} edges
 * @returns {'IMPROVING'|'STABLE'|'WORSENING'|'UNKNOWN'}
 */
function _dominantLongitudinalTrend(edges) {
  const counts = { [LONGITUDINAL_TREND.IMPROVING]: 0, [LONGITUDINAL_TREND.STABLE]: 0, [LONGITUDINAL_TREND.WORSENING]: 0 };
  for (const edge of edges) {
    const ctx = edge.longitudinalContext;
    if (!ctx) continue;
    for (const trend of [ctx.sourceTrend, ctx.targetTrend]) {
      if (trend && trend !== LONGITUDINAL_TREND.UNKNOWN && trend in counts) {
        counts[trend]++;
      }
    }
  }
  const total = counts[LONGITUDINAL_TREND.IMPROVING] + counts[LONGITUDINAL_TREND.STABLE] + counts[LONGITUDINAL_TREND.WORSENING];
  if (total === 0) return LONGITUDINAL_TREND.UNKNOWN;

  return Object.entries(counts).reduce(
    (best, [trend, count]) => count > best[1] ? [trend, count] : best,
    [LONGITUDINAL_TREND.UNKNOWN, -1],
  )[0];
}

export class DiseaseNetworkScoreV2Service {
  #eventPublisher;

  /** @param {{ eventPublisher?: object|null }} deps */
  constructor({ eventPublisher = null } = {}) {
    this.#eventPublisher = eventPublisher ?? null;
  }

  /**
   * Compute a NetworkScore V2 for a single disease cluster.
   * BD-042: `edges` may contain a mix of V1/V2 rows (same similarity_edges store,
   *          BD-001 never deletes V1) — this method filters to vectorVersion='2'
   *          AND matching diseaseKey before computing any statistic.
   *
   * @param {{
   *   diseaseKey:      string,
   *   clusterProfile?: object|null,  DiseaseClusterProfile from PR-046 (optional)
   *   edges?:          object[],     SimilarityEdge[] (V1+V2 mixed store; filtered internally)
   *   caseIds?:        string[]|null, all case ids known to belong to this cluster
   *                                   (optional — when omitted, nodeCount is derived from edge endpoints only)
   * }} input
   * @returns {Readonly<object>} NetworkScore V2
   */
  computeNetworkScore({ diseaseKey, clusterProfile = null, edges = [], caseIds = null }) {
    if (!diseaseKey || typeof diseaseKey !== 'string') {
      throw new Error('[DiseaseNetworkScoreV2Service] diseaseKey is required');
    }
    if (!Array.isArray(edges)) {
      throw new TypeError('[DiseaseNetworkScoreV2Service] edges must be an array');
    }

    // BD-042: only V2 edges matching this diseaseKey are counted.
    const v2Edges = edges.filter(
      e => e?.vectorVersion === VECTOR_VERSION_V2 && e?.diseaseKey === diseaseKey,
    );

    const nodeIdSet = new Set(caseIds ?? []);
    for (const edge of v2Edges) {
      nodeIdSet.add(edge.sourceCaseId);
      nodeIdSet.add(edge.targetCaseId);
    }
    const nodeCount = nodeIdSet.size;
    const edgeCount = v2Edges.length;

    const scores   = v2Edges.map(e => e.displayScore ?? e.score ?? 0);
    const avgScore = Math.round(_mean(scores) * 10000) / 10000;

    const maxPossiblePairs = nodeCount > 1 ? (nodeCount * (nodeCount - 1)) / 2 : 0;
    const clusterCohesion  = maxPossiblePairs > 0
      ? Math.min(1, Math.round((edgeCount / maxPossiblePairs) * 10000) / 10000)
      : 0;

    const longitudinalTrend = _dominantLongitudinalTrend(v2Edges);

    const score = Object.freeze({
      diseaseKey,
      nodeCount,
      edgeCount,
      avgScore,
      clusterCohesion,
      longitudinalTrend,
      caseCountFromCluster: clusterProfile?.caseCount ?? null,
      vectorVersion:  VECTOR_VERSION_V2, // BD-010/BD-018
      generatedAt:    new Date().toISOString(), // BD-018
      schemaVersion:  NETWORK_SCORE_V2_SCHEMA_VERSION,
    });

    this.#publish(score);
    return score;
  }

  /**
   * Compute NetworkScore V2 for every diseaseKey given.
   * Completion condition ①: NetworkScore V2 is computed across ALL disease clusters.
   *
   * @param {{
   *   diseaseKeys:      string[],
   *   clusterProfiles?: Record<string, object>,  keyed by diseaseKey
   *   edges?:           object[],                 shared edge pool (V1+V2 mixed; filtered per key)
   *   caseIdsByDisease?: Record<string, string[]>,
   * }} input
   * @returns {Readonly<object>[]}
   */
  computeForAllClusters({ diseaseKeys, clusterProfiles = {}, edges = [], caseIdsByDisease = {} }) {
    if (!Array.isArray(diseaseKeys)) {
      throw new TypeError('[DiseaseNetworkScoreV2Service] diseaseKeys must be an array');
    }
    return diseaseKeys.map(diseaseKey => this.computeNetworkScore({
      diseaseKey,
      clusterProfile: clusterProfiles[diseaseKey] ?? null,
      edges,
      caseIds: caseIdsByDisease[diseaseKey] ?? null,
    }));
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:          true,
      schemaVersion:  NETWORK_SCORE_V2_SCHEMA_VERSION,
      vectorVersion:  VECTOR_VERSION_V2,
      bd018Compliant: true,
      bd042Compliant: true,
      bd031:          'pure statistical aggregation — zero LLM/AI',
    });
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #publish(score) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.DISEASE_NETWORK_SCORE_V2_COMPUTED,
        aggregateType: AGGREGATE_TYPES.SIMILARITY,
        aggregateId:   score.diseaseKey,
        payload:       Object.freeze({ ...score }),
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort.
    }
  }
}
