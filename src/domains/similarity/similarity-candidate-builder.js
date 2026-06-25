// SimilarityCandidateBuilder — orchestrates FeatureExtractor → SimilarityCandidate.
// Does NOT save. Does NOT generate edges. Edge generation is PR-019.
import { FeatureExtractor }          from './feature-extractor.js';
import { buildSimilarityCandidate }  from './similarity-candidate.js';

export class SimilarityCandidateBuilder {
  #extractor;

  /** @param {FeatureExtractor} [extractor]  optional — defaults to a new FeatureExtractor() */
  constructor(extractor = null) {
    this.#extractor = extractor instanceof FeatureExtractor ? extractor : new FeatureExtractor();
  }

  /**
   * Build a SimilarityCandidate from a CaseEntity.
   * @param {object} caseEntity  domain CaseEntity
   * @returns {object}  frozen SimilarityCandidate
   */
  build(caseEntity) {
    const featureVector = this.#extractor.extract(caseEntity);
    return buildSimilarityCandidate({ caseEntity, featureVector });
  }

  /**
   * Build candidates from an array of cases, returning only those eligible.
   * @param {object[]} caseEntities
   * @returns {object[]}  eligible SimilarityCandidates only
   */
  buildEligible(caseEntities) {
    if (!Array.isArray(caseEntities)) return [];
    return caseEntities
      .map(c => this.build(c))
      .filter(sc => sc.eligibleForSimilarity);
  }
}
