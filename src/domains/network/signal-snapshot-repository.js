// signal-snapshot-repository.js — In-memory, Append-Only Snapshot Repository.
// BD-022: Wave1 in-memory only (no Supabase).
// Append Only — no delete, no update.
// PR-035: Snapshot Foundation

import { SNAPSHOT_SCHEDULE } from './signal-snapshot-types.js';

export class SignalSnapshotRepository {
  #snapshots = [];

  /**
   * Append a snapshot. Rejects non-frozen or invalid entries.
   * @param {Readonly<object>} snapshot
   */
  append(snapshot) {
    if (!snapshot?.id || !snapshot?.generatedAt || !snapshot?.vectorVersion) {
      throw new Error('[SignalSnapshotRepository] snapshot must have id, generatedAt, vectorVersion (BD-018)');
    }
    this.#snapshots.push(snapshot);
  }

  /** Return all snapshots (copy). */
  findAll() {
    return [...this.#snapshots];
  }

  /** Return snapshots filtered by schedule. */
  findBySchedule(schedule) {
    return this.#snapshots.filter(s => s.schedule === schedule);
  }

  /** Return the most recent snapshot, or null. */
  latest() {
    if (!this.#snapshots.length) return null;
    return this.#snapshots.reduce((best, s) =>
      s.generatedAt > best.generatedAt ? s : best
    );
  }

  get count() { return this.#snapshots.length; }
}
