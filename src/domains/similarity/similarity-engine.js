// SimilarityEngine — the ONLY entry point for similarity edge generation.
// Flow: Cases → SimilarityCandidates → ConsentFilter → VectorBuilder
//       → SimilarityCalculator → EdgeGenerator → SimilarityRepository → AuditLog
//
// ConsentFilter runs BEFORE any vector computation (no data leakage on rejected cases).

import { SimilarityCandidateBuilder } from './similarity-candidate-builder.js';
import { ConsentFilter }              from './consent-filter.js';
import { VectorBuilder }              from './vector-builder.js';
import { SimilarityCalculator }       from './similarity-calculator.js';
import { EdgeGenerator, DEFAULT_THRESHOLD } from './edge-generator.js';
import { logComparison, getSummary }  from './similarity-audit-log.js';

/**
 * @typedef {{
 *   edges:            object[],
 *   casesCompared:    number,
 *   pairsEvaluated:   number,
 *   edgesGenerated:   number,
 *   consentRejected:  number,
 *   avgScore:         number,
 *   networkDensity:   number,
 * }} SimilarityRunResult
 */

export class SimilarityEngine {
  #candidateBuilder;
  #consentFilter;
  #vectorBuilder;
  #calculator;
  #edgeGenerator;
  #repository;

  /**
   * @param {{
   *   repository:        import('../../repositories/similarity/similarity-repository.js').SimilarityRepositoryImpl,
   *   threshold?:        number,
   *   featureExtractor?: import('./feature-extractor.js').FeatureExtractor,
   * }} options
   */
  constructor({ repository, threshold = DEFAULT_THRESHOLD, featureExtractor = null } = {}) {
    if (!repository) throw new TypeError('[SimilarityEngine] repository is required');

    this.#candidateBuilder = new SimilarityCandidateBuilder(featureExtractor ?? undefined);
    this.#consentFilter    = new ConsentFilter();
    this.#vectorBuilder    = new VectorBuilder();
    this.#calculator       = new SimilarityCalculator();
    this.#edgeGenerator    = new EdgeGenerator(threshold);
    this.#repository       = repository;
  }

  /**
   * Run the full similarity pipeline over an array of CaseEntities.
   * Persists generated edges to SimilarityRepository.
   *
   * @param {object[]} caseEntities   domain CaseEntity[]
   * @returns {Promise<SimilarityRunResult>}
   */
  async run(caseEntities) {
    if (!Array.isArray(caseEntities)) {
      throw new TypeError('[SimilarityEngine] caseEntities must be an array');
    }
    if (caseEntities.length < 2) {
      return _emptyResult(0, 0);
    }

    // ── 1. Build SimilarityCandidates ──────────────────────────────────────
    const allCandidates = caseEntities.map(c => this.#candidateBuilder.build(c));

    // ── 2. Consent Filter (BEFORE any vector computation) ─────────────────
    const { accepted, rejectedCount } = this.#consentFilter.filter(allCandidates);
    if (accepted.length < 2) {
      return _emptyResult(caseEntities.length, rejectedCount);
    }

    // ── 3. Build feature vectors ───────────────────────────────────────────
    const vectors = this.#vectorBuilder.buildAll(accepted);
    if (vectors.length < 2) return _emptyResult(caseEntities.length, rejectedCount);

    // ── 4. Compute all pairwise similarities ───────────────────────────────
    const pairs = this.#calculator.computeAllPairs(vectors);

    // ── 5. Generate edges + audit every pair ──────────────────────────────
    const acceptedEdges = [];
    for (const pair of pairs) {
      const edge = this.#edgeGenerator.generateFromPair(pair);
      const accepted_ = edge !== null;
      const reason = accepted_
        ? `score ${pair.result.score} >= threshold ${this.#edgeGenerator.threshold}`
        : pair.result.score < this.#edgeGenerator.threshold
          ? `score ${pair.result.score} < threshold ${this.#edgeGenerator.threshold}`
          : 'different diseaseKey — cross-disease edges not generated in V1';

      logComparison({
        caseIdA:  pair.vecA.caseId,
        caseIdB:  pair.vecB.caseId,
        score:    pair.result.score,
        accepted: accepted_,
        reason,
      });

      if (edge) acceptedEdges.push(edge);
    }

    // ── 6. Persist edges ───────────────────────────────────────────────────
    const saved = await this.#repository.saveMany(acceptedEdges);

    // ── 7. Compute result metrics ──────────────────────────────────────────
    const summary = getSummary();
    const n       = accepted.length;
    const maxPossiblePairs = n > 1 ? (n * (n - 1)) / 2 : 0;
    const networkDensity   = maxPossiblePairs > 0
      ? Math.round((saved.length / maxPossiblePairs) * 10000) / 10000
      : 0;

    return Object.freeze({
      edges:           saved,
      casesCompared:   accepted.length,
      pairsEvaluated:  pairs.length,
      edgesGenerated:  saved.length,
      consentRejected: rejectedCount,
      avgScore:        summary.avgAcceptedScore,
      networkDensity,
    });
  }
}

function _emptyResult(total, consentRejected) {
  return Object.freeze({
    edges:           [],
    casesCompared:   total,
    pairsEvaluated:  0,
    edgesGenerated:  0,
    consentRejected,
    avgScore:        0,
    networkDensity:  0,
  });
}
