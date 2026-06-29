// feature-vector-v2-repository.js — In-memory Append-Only FeatureVector V2 Repository.
// BD-022: Wave1 in-memory only. Wave2 target: Supabase `feature_vectors_v2` table.
// BD-032: Append-Only — DELETE forbidden.
// BD-042: Stores ONLY vectorVersion='2' vectors — rejects V1.
// PR-047: FeatureVector V2 Foundation
//
// Supabase table design (feature_vectors_v2 — future migration):
//   id             TEXT PRIMARY KEY
//   user_id        TEXT NOT NULL
//   case_id        TEXT
//   disease_key    TEXT NOT NULL DEFAULT 'UNKNOWN'
//   vector_version TEXT NOT NULL DEFAULT '2'
//   dimensions     JSONB NOT NULL       -- 12-element array
//   magnitude      NUMERIC NOT NULL
//   generated_at   TIMESTAMPTZ NOT NULL -- BD-018
//   metadata       JSONB NOT NULL DEFAULT '{}'

import { VECTOR_VERSION_V2 } from './feature-vector-v2-types.js';

export class FeatureVectorV2Repository {
  #vectors = [];

  /**
   * Append a V2 FeatureVector. BD-042: rejects V1 vectors.
   * @param {Readonly<object>} vector
   */
  append(vector) {
    if (!vector?.id || !vector?.userId || !vector?.vectorVersion || !vector?.generatedAt) {
      throw new Error(
        '[FeatureVectorV2Repository] vector must have id, userId, vectorVersion, generatedAt (BD-010/BD-018)',
      );
    }
    if (vector.vectorVersion !== VECTOR_VERSION_V2) {
      throw new Error(
        `[FeatureVectorV2Repository] BD-042: only vectorVersion='${VECTOR_VERSION_V2}' allowed, got '${vector.vectorVersion}'`,
      );
    }
    this.#vectors.push(vector);
  }

  /** Return all V2 vectors (copy). */
  findAll() {
    return [...this.#vectors];
  }

  /** Return all V2 vectors for a given userId. */
  findByUser(userId) {
    return this.#vectors.filter(v => v.userId === userId);
  }

  /** Return all V2 vectors for a given diseaseKey (BD-009: clusterId === diseaseKey). */
  findByDiseaseKey(diseaseKey) {
    return this.#vectors.filter(v => v.diseaseKey === diseaseKey);
  }

  /** Return the most recent V2 vector for a userId, or null. */
  latestForUser(userId) {
    const userVectors = this.findByUser(userId);
    if (!userVectors.length) return null;
    return userVectors.reduce((best, v) =>
      v.generatedAt > best.generatedAt ? v : best,
    );
  }

  get count() { return this.#vectors.length; }
}
