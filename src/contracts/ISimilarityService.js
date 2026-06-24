// ISimilarityService — contract aligned with domains/similarity/similarity.repository.ts.
// Implementations replace the null stub for TOKENS.SimilarityService in PR-018.
export class ISimilarityService {
  /**
   * Compute similarity score between two cases.
   * Caller must ensure caseIdA < caseIdB to preserve edge uniqueness.
   * @param {string} caseIdA
   * @param {string} caseIdB
   * @returns {Promise<number>}  0.0–1.0
   */
  calculateSimilarity(caseIdA, caseIdB) {
    throw new Error('Not Implemented: ISimilarityService.calculateSimilarity');
  }

  /**
   * Find top-k cases most similar to the given case.
   * @param {string} caseId
   * @param {number} limit
   * @returns {Promise<object[]>}
   */
  findSimilarCases(caseId, limit) {
    throw new Error('Not Implemented: ISimilarityService.findSimilarCases');
  }

  /**
   * Build or refresh all similarity edges for a set of cases.
   * Used by the similarity-batch Edge Function.
   * @param {string[]} caseIds
   * @returns {Promise<void>}
   */
  buildEdges(caseIds) {
    throw new Error('Not Implemented: ISimilarityService.buildEdges');
  }

  /**
   * Upsert a single pre-computed edge.
   * @param {object} edge  { caseIdA, caseIdB, score, computedAt }
   * @returns {Promise<void>}
   */
  upsertEdge(edge) {
    throw new Error('Not Implemented: ISimilarityService.upsertEdge');
  }
}
