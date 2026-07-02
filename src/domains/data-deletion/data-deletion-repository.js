// data-deletion-repository.js — In-memory Append-Only DeletionStageRecord Repository (PR-078).
// BD-022: Wave1/Wave2 in-memory; Wave3 target: Supabase `data_deletion_requests` table.
// BD-032: Append-Only — DELETE forbidden. A deletion request's own audit trail must
// itself never be deleted (mirrors release-readiness-repository.js).
//
// Supabase table design (data_deletion_requests — future migration):
//   record_id    TEXT PRIMARY KEY
//   request_id   TEXT NOT NULL
//   user_id      TEXT NOT NULL
//   stage        TEXT NOT NULL
//   actor_id     TEXT NOT NULL
//   note         TEXT NOT NULL DEFAULT ''
//   occurred_at  TIMESTAMPTZ NOT NULL -- BD-018

export class DataDeletionRepository {
  #records = [];

  /**
   * Append a DeletionStageRecord.
   * @param {Readonly<object>} record
   */
  append(record) {
    if (!record?.recordId || !record?.requestId || !record?.userId || !record?.stage || !record?.occurredAt) {
      throw new Error(
        '[DataDeletionRepository] record must have recordId, requestId, userId, stage, occurredAt (BD-018)',
      );
    }
    this.#records.push(record);
  }

  /** Return all records, full history (copy), across every request. */
  findAll() {
    return [...this.#records];
  }

  /** @param {string} requestId @returns {ReadonlyArray<Readonly<object>>} full stage history, append order. */
  findAllByRequest(requestId) {
    return this.#records.filter(r => r.requestId === requestId);
  }

  /**
   * @param {string} requestId
   * @returns {Readonly<object>|null} the most recently appended record for requestId, or null.
   */
  findLatestByRequest(requestId) {
    for (let i = this.#records.length - 1; i >= 0; i--) {
      if (this.#records[i].requestId === requestId) return this.#records[i];
    }
    return null;
  }

  /** @returns {Map<string, Readonly<object>>} requestId → most recently appended record. */
  findAllLatest() {
    const latest = new Map();
    for (const r of this.#records) latest.set(r.requestId, r); // later appends overwrite — append order wins
    return latest;
  }

  get count() { return this.#records.length; }

  // DELETE is permanently forbidden — deletion-request audit records are themselves
  // an immutable audit trail (BD-032).
}
