// release-readiness-repository.js — In-memory Append-Only ConfirmationRecord Repository (PR-077).
// BD-022: Wave1/Wave2 in-memory; Wave3 target: Supabase `release_readiness_confirmations` table.
// BD-032: Append-Only — DELETE forbidden. Confirmation records are a permanent audit trail
// (mirrors wave2-exit-audit-repository.js).
//
// Supabase table design (release_readiness_confirmations — future migration):
//   confirmation_id  TEXT PRIMARY KEY
//   founder_id       TEXT NOT NULL
//   category         TEXT NOT NULL
//   item_id          TEXT NOT NULL
//   confirmed        BOOLEAN NOT NULL
//   note             TEXT NOT NULL DEFAULT ''
//   confirmed_at     TIMESTAMPTZ NOT NULL -- BD-018

export class ReleaseReadinessRepository {
  #records = [];

  /**
   * Append a ConfirmationRecord. A later record for the same itemId supersedes an
   * earlier one for "current status" purposes (findLatestByItem/findAllLatest) — the
   * full history is never deleted (Append-Only, BD-032).
   * @param {Readonly<object>} record
   */
  append(record) {
    if (!record?.confirmationId || !record?.founderId || !record?.itemId || !record?.confirmedAt) {
      throw new Error(
        '[ReleaseReadinessRepository] record must have confirmationId, founderId, itemId, confirmedAt (BD-018)',
      );
    }
    this.#records.push(record);
  }

  /** Return all confirmation records, full history (copy). */
  findAll() {
    return [...this.#records];
  }

  /**
   * @param {string} itemId
   * @returns {Readonly<object>|null} the most recently appended record for itemId, or null.
   *   "Most recent" is append order, not confirmedAt string comparison — two confirmations
   *   made within the same millisecond would otherwise tie and silently keep the wrong one.
   */
  findLatestByItem(itemId) {
    for (let i = this.#records.length - 1; i >= 0; i--) {
      if (this.#records[i].itemId === itemId) return this.#records[i];
    }
    return null;
  }

  /** @returns {Map<string, Readonly<object>>} itemId → most recently appended record, for every item ever confirmed. */
  findAllLatest() {
    const latest = new Map();
    for (const r of this.#records) latest.set(r.itemId, r); // later appends overwrite — append order wins
    return latest;
  }

  get count() { return this.#records.length; }

  // DELETE is permanently forbidden — confirmation records are an immutable audit trail (BD-032)
}
