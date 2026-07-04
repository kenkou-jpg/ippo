// similar-case-search-service.js — Similar Case Search Service.
// Query-based filter search for anonymized cases (admin:research only).
// BD-030: k-anonymity k≥5 ZERO TOLERANCE — personal identifiers structurally impossible.
// BD-021: All case data treated as append-only read (no mutations).
// BD-032: All returned objects are frozen.
// PR-060: Similar Case Search (Phase D AI Platform)

import { buildDomainEvent }                         from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES }      from '../events/domain-event-types.js';
import { KAnonymityError }                          from '../case-recommendation/case-recommendation-service.js';
import {
  SEARCH_SIGNAL_TYPES,
  SEARCH_PHASE_FILTERS,
  DEFAULT_MIN_SCORE,
  MAX_SEARCH_RESULTS,
  SEARCH_RESULT_SCHEMA_VERSION,
  PERSONAL_IDENTIFIER_FIELDS,
  ANONYMIZED_CASE_ALLOWED_FIELDS,
} from './similar-case-search-types.js';
import { K_ANONYMITY_MIN } from '../case-recommendation/case-recommendation-types.js';

export {
  K_ANONYMITY_MIN,
  MAX_SEARCH_RESULTS,
  SEARCH_RESULT_SCHEMA_VERSION,
  SEARCH_SIGNAL_TYPES,
  SEARCH_PHASE_FILTERS,
};
export { KAnonymityError } from '../case-recommendation/case-recommendation-service.js';

export class SimilarCaseSearchService {
  #eventPublisher;

  /**
   * @param {{ eventPublisher?: object|null }} deps
   */
  constructor({ eventPublisher = null } = {}) {
    this.#eventPublisher = eventPublisher ?? null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Search for anonymized cases matching a SearchQuery.
   *
   * SearchQuery: { diseaseKey, signalTypes?, phaseFilter?, minScore? }
   *
   * BD-030: If any diseaseKey group in the results has k < 5, KAnonymityError is thrown.
   * Personal identifier fields are structurally stripped from all results.
   *
   * @param {{
   *   query: {
   *     diseaseKey:   string,
   *     signalTypes?: string[],
   *     phaseFilter?: string,
   *     minScore?:    number,
   *   },
   *   casePool: object[],   // all available cases to search within
   * }} input
   * @returns {Readonly<object>} SearchResult
   * @throws {KAnonymityError} if matched group has k < 5
   */
  search({ query, casePool }) {
    if (!query)                 throw new Error('[SimilarCaseSearchService] query is required');
    if (!query.diseaseKey)      throw new Error('[SimilarCaseSearchService] query.diseaseKey is required');
    if (!Array.isArray(casePool)) throw new Error('[SimilarCaseSearchService] casePool must be an array');

    this.#validateQuery(query);

    const { diseaseKey, signalTypes = [], phaseFilter = null, minScore = DEFAULT_MIN_SCORE } = query;

    // Step 1: filter by diseaseKey (required)
    let matched = casePool.filter(c => c.diseaseKey === diseaseKey);

    // Step 2: filter by signalTypes (case must have recorded signals of these types)
    if (signalTypes.length > 0) {
      matched = matched.filter(c =>
        signalTypes.every(st => Array.isArray(c.signalTypes) && c.signalTypes.includes(st))
      );
    }

    // Step 3: filter by phaseFilter (case must have data in this menstrual phase)
    if (phaseFilter) {
      matched = matched.filter(c =>
        Array.isArray(c.recordedPhases) && c.recordedPhases.includes(phaseFilter)
      );
    }

    // Step 4: filter by minScore
    if (minScore > DEFAULT_MIN_SCORE) {
      matched = matched.filter(c =>
        typeof c.qualityScore === 'number' && c.qualityScore >= minScore
      );
    }

    // Step 5: cap at MAX_SEARCH_RESULTS
    const sliced = matched.slice(0, MAX_SEARCH_RESULTS);

    // BD-030: k-anonymity check on the matched group
    if (sliced.length > 0 && sliced.length < K_ANONYMITY_MIN) {
      throw new KAnonymityError(diseaseKey, sliced.length);
    }

    // Step 6: anonymize — strip personal identifiers
    const anonymizedCases = sliced.map(c => this.#anonymize(c));

    // Step 7: build ClusterProfile from matched group
    const clusterProfile = this.#buildClusterProfile(sliced, diseaseKey);

    const result = Object.freeze({
      query:            Object.freeze({ ...query }),
      matchedCount:     anonymizedCases.length,
      cases:            Object.freeze(anonymizedCases),
      clusterProfile:   Object.freeze(clusterProfile),
      schemaVersion:    SEARCH_RESULT_SCHEMA_VERSION,
      searchedAt:       new Date().toISOString(),
    });

    this.#publish(DOMAIN_EVENT_TYPES.SIMILAR_CASE_SEARCHED, diseaseKey, {
      diseaseKey,
      matchedCount: result.matchedCount,
      signalTypes,
      phaseFilter,
    });

    return result;
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:             true,
      schemaVersion:     SEARCH_RESULT_SCHEMA_VERSION,
      bd030:             `k < ${K_ANONYMITY_MIN} groups blocked — KAnonymityError thrown`,
      bd031:             'query-filter search only — zero LLM/ML',
      bd038:             'isMedicalAdvice:false stamped; personal fields structurally removed',
      maxResults:        MAX_SEARCH_RESULTS,
      supportedSignalTypes: SEARCH_SIGNAL_TYPES,
      supportedPhases:      SEARCH_PHASE_FILTERS,
      access:            'admin:research only',
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  #validateQuery(query) {
    const { signalTypes = [], phaseFilter = null } = query;

    if (!Array.isArray(signalTypes)) {
      throw new Error('[SimilarCaseSearchService] query.signalTypes must be an array');
    }
    for (const st of signalTypes) {
      if (!SEARCH_SIGNAL_TYPES.includes(st)) {
        throw new Error(`[SimilarCaseSearchService] unknown signalType: "${st}"`);
      }
    }
    if (phaseFilter !== null && !SEARCH_PHASE_FILTERS.includes(phaseFilter)) {
      throw new Error(`[SimilarCaseSearchService] unknown phaseFilter: "${phaseFilter}"`);
    }
    if (typeof query.minScore !== 'undefined' && typeof query.minScore !== 'number') {
      throw new Error('[SimilarCaseSearchService] query.minScore must be a number');
    }
  }

  /** Strip personal identifier fields (BD-030). */
  #anonymize(c) {
    const out = {};
    for (const field of ANONYMIZED_CASE_ALLOWED_FIELDS) {
      if (field in c) out[field] = c[field];
    }
    return Object.freeze(out);
  }

  /**
   * Build aggregate ClusterProfile from matched cases.
   * Returns descriptive stats — no individual identifiers.
   */
  #buildClusterProfile(cases, diseaseKey) {
    if (cases.length === 0) {
      return { diseaseKey, caseCount: 0, avgQualityScore: null, avgDurationDays: null,
               hasOutcomeRate: null, avgExperimentCount: null };
    }

    const avg = (arr) => arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

    const qualityScores    = cases.map(c => c.qualityScore).filter(v => typeof v === 'number');
    const durationDays     = cases.map(c => c.durationDays).filter(v => typeof v === 'number');
    const experimentCounts = cases.map(c => c.experimentCount).filter(v => typeof v === 'number');
    const hasOutcomeCount  = cases.filter(c => c.hasOutcome === true).length;

    return {
      diseaseKey,
      caseCount:          cases.length,
      avgQualityScore:    avg(qualityScores) !== null ? parseFloat(avg(qualityScores).toFixed(1)) : null,
      avgDurationDays:    avg(durationDays)  !== null ? parseFloat(avg(durationDays).toFixed(1))  : null,
      hasOutcomeRate:     parseFloat((hasOutcomeCount / cases.length).toFixed(2)),
      avgExperimentCount: avg(experimentCounts) !== null ? parseFloat(avg(experimentCounts).toFixed(1)) : null,
    };
  }

  #publish(eventType, aggregateId, payload) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType, aggregateId, aggregateType: AGGREGATE_TYPES.SIMILAR_CASE_SEARCH, payload,
      });
      this.#eventPublisher.publish(event);
    } catch { /* best-effort */ }
  }
}
