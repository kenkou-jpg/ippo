// EdgeGenerator — generates similarity_edges from pairwise scores.
// An edge is created only when score >= threshold AND both cases share the same diseaseKey.
// BD-011 (IPPO-GOV-001 v1.2 / NETWORK ASSET COUNCIL): all edges carry vectorVersion field.
// BD-010: vectorVersion must be bumped when FeatureVector dimensions expand (Wave2).

/** Default similarity threshold — edges below this are discarded. */
export const DEFAULT_THRESHOLD = 0.5;

/** FeatureVector version stamped on every generated edge. BD-011. */
import { VECTOR_VERSION } from './vector-builder.js';

let _edgeCounter = 0; // monotonic counter for deterministic edge IDs within a session

function _edgeId(sourceCaseId, targetCaseId) {
  _edgeCounter++;
  const ts   = Date.now().toString(36).toUpperCase();
  const salt = _edgeCounter.toString(36).toUpperCase().padStart(4, '0');
  return `EDGE-${sourceCaseId.slice(-6)}-${targetCaseId.slice(-6)}-${ts}-${salt}`;
}

/**
 * @typedef {{
 *   edgeId:         string,
 *   sourceCaseId:   string,
 *   targetCaseId:   string,
 *   score:          number,
 *   diseaseKey:     string,
 *   threshold:      number,
 *   vectorVersion:  string,
 *   createdAt:      string,
 * }} SimilarityEdge
 */

export class EdgeGenerator {
  #threshold;

  /** @param {number} threshold  default DEFAULT_THRESHOLD */
  constructor(threshold = DEFAULT_THRESHOLD) {
    if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
      throw new RangeError('[EdgeGenerator] threshold must be a number in [0, 1]');
    }
    this.#threshold = threshold;
  }

  get threshold() { return this.#threshold; }

  /**
   * Generate an edge from a pair of vectors and a similarity result.
   * Returns null when score < threshold or diseaseKeys differ.
   *
   * @param {{
   *   vecA:   import('./vector-builder.js').ComputedFeatureVector,
   *   vecB:   import('./vector-builder.js').ComputedFeatureVector,
   *   result: import('./similarity-calculator.js').SimilarityResult,
   * }} pair
   * @returns {SimilarityEdge|null}
   */
  generateFromPair({ vecA, vecB, result }) {
    if (result.score < this.#threshold) return null;
    if (!result.sameDiseaseKey)         return null;

    const now = new Date().toISOString();
    return Object.freeze({
      edgeId:        _edgeId(vecA.caseId, vecB.caseId),
      sourceCaseId:  vecA.caseId,
      targetCaseId:  vecB.caseId,
      score:         result.score,
      diseaseKey:    vecA.diseaseKey,
      threshold:     this.#threshold,
      vectorVersion: VECTOR_VERSION,
      createdAt:     now,
    });
  }

  /**
   * Generate edges from all scored pairs, discarding those below threshold.
   *
   * @param {{ vecA: object, vecB: object, result: object }[]} pairs
   * @returns {SimilarityEdge[]}
   */
  generateFromPairs(pairs) {
    const edges = [];
    for (const pair of pairs) {
      const edge = this.generateFromPair(pair);
      if (edge) edges.push(edge);
    }
    return edges;
  }
}

/** Reset the session-level counter (for testing only). */
export function _resetEdgeCounter() { _edgeCounter = 0; }
