// similarity-snapshot-v2-repository.js — In-memory Append-Only SimilaritySnapshot V2 Repository.
// BD-022: Wave1 in-memory only. Wave2 target: Supabase `similarity_snapshots_v2` table.
// BD-032: Append-Only — DELETE forbidden.
// BD-042: stores ONLY vectorVersion='2' snapshots — rejects V1, guaranteeing generation
//          separation between V1 and V2 snapshot management (this store never mixes them).
// PR-065: Similarity Snapshot V2
//
// Supabase table design (similarity_snapshots_v2 — future migration):
//   snapshot_id  TEXT PRIMARY KEY
//   vector_version TEXT NOT NULL DEFAULT '2'
//   edge_count   INTEGER NOT NULL
//   case_count   INTEGER NOT NULL
//   threshold    NUMERIC NOT NULL
//   computed_at  TIMESTAMPTZ NOT NULL -- BD-018
//   metadata     JSONB NOT NULL DEFAULT '{}'

import { VECTOR_VERSION_V2 } from './similarity-snapshot-v2-types.js';

export class SimilaritySnapshotV2Repository {
  #snapshots = [];

  /**
   * Append a V2 snapshot. BD-042: rejects any non-'2' vectorVersion — this repository
   * is a physically separate store from any V1 snapshot management, guaranteeing
   * generation separation (completion condition ②).
   * @param {Readonly<object>} snapshot
   */
  append(snapshot) {
    if (!snapshot?.snapshotId || !snapshot?.vectorVersion || !snapshot?.computedAt) {
      throw new Error(
        '[SimilaritySnapshotV2Repository] snapshot must have snapshotId, vectorVersion, computedAt (BD-010/BD-018)',
      );
    }
    if (snapshot.vectorVersion !== VECTOR_VERSION_V2) {
      throw new Error(
        `[SimilaritySnapshotV2Repository] BD-042: only vectorVersion='${VECTOR_VERSION_V2}' allowed, got '${snapshot.vectorVersion}'`,
      );
    }
    this.#snapshots.push(snapshot);
  }

  /** Return all V2 snapshots (copy). */
  findAll() {
    return [...this.#snapshots];
  }

  /** Return the most recently computed V2 snapshot, or null. */
  latest() {
    if (this.#snapshots.length === 0) return null;
    return this.#snapshots.reduce((best, s) => s.computedAt > best.computedAt ? s : best);
  }

  get count() { return this.#snapshots.length; }

  // DELETE is permanently forbidden — snapshots are an immutable audit trail (BD-032)
}
