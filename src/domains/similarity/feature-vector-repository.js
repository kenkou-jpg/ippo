// feature-vector-repository.js — In-memory Append-Only FeatureVector Repository.
// BD-022: Wave1 in-memory only — no Supabase.
// Append Only — DELETE forbidden.
// PR-036: Similarity Intelligence Foundation

export class FeatureVectorRepository {
  #vectors = [];

  /**
   * Append a FeatureVector. Must have id, userId, vectorVersion, generatedAt.
   * @param {Readonly<object>} vector
   */
  append(vector) {
    if (!vector?.id || !vector?.userId || !vector?.vectorVersion || !vector?.generatedAt) {
      throw new Error('[FeatureVectorRepository] vector must have id, userId, vectorVersion, generatedAt (BD-010/BD-018)');
    }
    this.#vectors.push(vector);
  }

  /** Return all vectors (copy). */
  findAll() {
    return [...this.#vectors];
  }

  /** Return all vectors for a given userId (copy). */
  findByUser(userId) {
    return this.#vectors.filter(v => v.userId === userId);
  }

  /** Return the most recent vector for a userId, or null. */
  latestForUser(userId) {
    const userVectors = this.findByUser(userId);
    if (!userVectors.length) return null;
    return userVectors.reduce((best, v) =>
      v.generatedAt > best.generatedAt ? v : best
    );
  }

  get count() { return this.#vectors.length; }
}
