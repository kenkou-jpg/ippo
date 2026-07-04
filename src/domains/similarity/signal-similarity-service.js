// signal-similarity-service.js — Signal-based Similarity Service.
// Orchestrates FeatureVectorService + FvSimilarityEngine.
// BD-009: DiseaseCluster integration (Wave1 partial; Wave2 full).
// BD-022: Wave1 in-memory only.
// PR-036: Similarity Intelligence Foundation

import { FvSimilarityEngine } from './fv-similarity-engine.js';

export class SignalSimilarityService {
  #featureVectorService;
  #engine;
  #diseaseClusterService;  // optional — BD-009 integration

  /**
   * @param {{
   *   featureVectorService:  import('./feature-vector-service.js').FeatureVectorService,
   *   diseaseClusterService?: object,  optional — PR-034 DiseaseClusterService
   * }} deps
   */
  constructor({ featureVectorService, diseaseClusterService = null }) {
    if (!featureVectorService) throw new Error('[SignalSimilarityService] featureVectorService is required');
    this.#featureVectorService  = featureVectorService;
    this.#engine                = new FvSimilarityEngine();
    this.#diseaseClusterService = diseaseClusterService;
  }

  /**
   * Build and persist a FeatureVector for a user.
   * @param {{ userId: string, signals?: object[], diseases?: object[], longitudinalSummary?: object, snapshot?: object }} params
   * @returns {Readonly<object>}
   */
  buildVector(params) {
    return this.#featureVectorService.buildAndSave(params);
  }

  /**
   * Return all persisted FeatureVectors for a user.
   * @param {string} userId
   * @returns {Readonly<object>[]}
   */
  getVectorsForUser(userId) {
    return this.#featureVectorService.getForUser(userId);
  }

  /**
   * Calculate cosine similarity between two FeatureVectors.
   * @param {Readonly<object>} vecA
   * @param {Readonly<object>} vecB
   * @returns {Readonly<object>} { score, method, vectorVersion, ... }
   */
  calculate(vecA, vecB) {
    return this.#engine.calculateSimilarity(vecA, vecB);
  }

  /**
   * Compare two users' latest FeatureVectors.
   * Wave1: Both users must have a pre-built vector; returns null if either is missing.
   * @param {string} userId1
   * @param {string} userId2
   * @returns {Readonly<object>|null}
   */
  compareUsers(userId1, userId2) {
    const vecA = this.#featureVectorService.getLatestForUser(userId1);
    const vecB = this.#featureVectorService.getLatestForUser(userId2);
    if (!vecA || !vecB) return null;
    return this.#engine.compare(vecA, vecB);
  }

  /**
   * Find top-N most similar FeatureVectors for a userId.
   * @param {string}  userId
   * @param {number}  [topN=5]
   * @returns {Readonly<object>[]}
   */
  findTopMatches(userId, topN = 5) {
    const reference = this.#featureVectorService.getLatestForUser(userId);
    if (!reference) return [];
    const candidates = this.#featureVectorService.getAll()
      .filter(v => v.userId !== userId);
    return this.#engine.rank(reference, candidates).slice(0, topN);
  }

  /**
   * Return similarity summary JSON.
   * BD-010: vectorVersion required. BD-018: generatedAt required.
   * @param {string} userId
   * @returns {Readonly<object>}
   */
  getSimilaritySummary(userId) {
    const allVectors = this.#featureVectorService.getAll();
    const topMatches = this.findTopMatches(userId, 5);
    const scores     = topMatches.map(m => m.score);
    const avgSimilarity = scores.length
      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length * 10000) / 10000
      : 0;

    const latest = this.#featureVectorService.getLatestForUser(userId);

    return Object.freeze({
      vectorVersion:    latest?.vectorVersion ?? '1',     // BD-010
      similarityCount:  allVectors.length,
      topMatches:       topMatches.length,
      averageSimilarity: avgSimilarity,
      generatedAt:      new Date().toISOString(),         // BD-018
      bd018Compliant:   true,
    });
  }

  // ── DiseaseCluster Integration (BD-009) ────────────────────────────────────
  // Wave2 roadmap: cluster features → FeatureVector augmentation → higher accuracy

  /**
   * Build cluster feature hints for a DiseaseCluster.
   * Wave2 Stub — returns minimal object pending cluster-aware vector expansion.
   * @param {object} cluster
   * @returns {object}
   */
  buildClusterHints(cluster) {
    if (!this.#diseaseClusterService) {
      return { hints: [], wave: 'Wave2 Stub — DiseaseClusterService not connected', clusterKey: cluster?.clusterKey ?? null };
    }
    // Wave1: return minimal cluster metadata for future FeatureVector augmentation
    return Object.freeze({
      clusterKey:    cluster?.clusterKey ?? null,
      signalTypes:   cluster?.signalTypes ?? [],
      hints:         [],
      wave:          'Wave2 Stub — cluster→vector augmentation pending Wave2',
      bd009Compliant: true,
    });
  }

  /**
   * Annotate a similarity result with cluster context.
   * Wave2 Stub.
   * @param {object} similarityResult
   * @returns {object}
   */
  annotateSimilarity(similarityResult) {
    return Object.freeze({
      ...similarityResult,
      clusterAnnotation: null,
      wave: 'Wave2 Stub — cluster annotation pending Wave2',
    });
  }

  /**
   * Return cluster weights for similarity scoring.
   * Wave2 Stub.
   * @returns {object}
   */
  getClusterWeights() {
    return Object.freeze({
      weights: {},
      wave:    'Wave2 Stub — cluster weight tuning pending Wave2',
      bd009Compliant: true,
    });
  }
}
