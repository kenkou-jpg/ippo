// wave2-exit-audit-repository.js — In-memory Append-Only Wave2 Exit ApprovalRecord Repository.
// BD-022: Wave1/Wave2 in-memory; Wave3 target: Supabase `wave2_exit_audit_approvals` table.
// BD-032: Append-Only — DELETE forbidden. Approval records are a permanent audit trail.
// PR-075: Wave2 Exit Audit
//
// Supabase table design (wave2_exit_audit_approvals — future migration):
//   approval_id     TEXT PRIMARY KEY
//   founder_id      TEXT NOT NULL
//   note            TEXT NOT NULL DEFAULT ''
//   ec_pass_count   INTEGER NOT NULL
//   qc_pass_count   INTEGER NOT NULL
//   confirmed_at    TIMESTAMPTZ NOT NULL -- BD-018

export class Wave2ExitAuditRepository {
  #approvals = [];

  /**
   * Append a Founder ApprovalRecord confirming Wave2 → Wave3 migration.
   * @param {Readonly<object>} record
   */
  append(record) {
    if (!record?.approvalId || !record?.founderId || !record?.confirmedAt) {
      throw new Error(
        '[Wave2ExitAuditRepository] record must have approvalId, founderId, confirmedAt (BD-018)',
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
    return this.#approvals.reduce((best, a) => a.confirmedAt > best.confirmedAt ? a : best);
  }

  get count() { return this.#approvals.length; }

  // DELETE is permanently forbidden — approval records are an immutable audit trail (BD-032)
}
