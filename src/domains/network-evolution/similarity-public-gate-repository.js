// similarity-public-gate-repository.js — In-memory Append-Only ApprovalRecord Repository.
// BD-022: Wave1 in-memory only. Wave2 target: Supabase `similarity_public_gate_approvals` table.
// BD-032: Append-Only — DELETE forbidden. Approval records are a permanent audit trail.
// PR-067: Similarity UI Public Gate
//
// Supabase table design (similarity_public_gate_approvals — future migration):
//   approval_id              TEXT PRIMARY KEY
//   founder_id               TEXT NOT NULL
//   note                     TEXT NOT NULL DEFAULT ''
//   qualified_disease_count  INTEGER NOT NULL
//   required_disease_count   INTEGER NOT NULL
//   decided_at               TIMESTAMPTZ NOT NULL -- BD-018

export class SimilarityPublicGateRepository {
  #approvals = [];

  /**
   * Append a Founder ApprovalRecord. This is the persisted audit trail satisfying
   * "Founder approval record persisted" (PR-067 completion condition ③).
   * @param {Readonly<object>} record
   */
  append(record) {
    if (!record?.approvalId || !record?.founderId || !record?.decidedAt) {
      throw new Error(
        '[SimilarityPublicGateRepository] record must have approvalId, founderId, decidedAt (BD-018)',
      );
    }
    this.#approvals.push(record);
  }

  /** Return all approval records (copy). */
  findAll() {
    return [...this.#approvals];
  }

  /** Return the most recent approval record, or null when none exist. */
  latest() {
    if (this.#approvals.length === 0) return null;
    return this.#approvals.reduce((best, a) => a.decidedAt > best.decidedAt ? a : best);
  }

  get count() { return this.#approvals.length; }

  // DELETE is permanently forbidden — approval records are an immutable audit trail (BD-032)
}
