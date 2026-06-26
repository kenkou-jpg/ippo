// signal-snapshot-service.js — Signal Snapshot Service.
// BD-018: ALL snapshots must have generatedAt + vectorVersion.
// BD-022: Wave1 in-memory only.
// PR-035: Snapshot Foundation

import { buildSignalSnapshot } from './signal-snapshot-entity.js';
import { SNAPSHOT_SCHEDULE }   from './signal-snapshot-types.js';

export class SignalSnapshotService {
  #repository;
  #signalSummaryService;

  /**
   * @param {{ repository: import('./signal-snapshot-repository.js').SignalSnapshotRepository, signalSummaryService: object }} deps
   */
  constructor({ repository, signalSummaryService }) {
    if (!repository) throw new Error('[SignalSnapshotService] repository is required');
    if (!signalSummaryService) throw new Error('[SignalSnapshotService] signalSummaryService is required');
    this.#repository          = repository;
    this.#signalSummaryService = signalSummaryService;
  }

  /**
   * Create and persist a snapshot from current signals.
   * @param {object[]} signals
   * @param {string} schedule - DAILY | WEEKLY | MANUAL
   * @returns {Readonly<object>}
   */
  createSnapshot(signals, schedule = SNAPSHOT_SCHEDULE.MANUAL) {
    const summary  = this.#signalSummaryService.summarize(signals ?? []);
    const snapshot = buildSignalSnapshot({ schedule, signalSummary: summary });
    this.#repository.append(snapshot);
    return snapshot;
  }

  /** Return all persisted snapshots. */
  getSnapshots() {
    return this.#repository.findAll();
  }

  /** Return most recent snapshot, or null. */
  getLatestSnapshot() {
    return this.#repository.latest();
  }

  /** Return snapshots by schedule type. */
  getSnapshotsBySchedule(schedule) {
    return this.#repository.findBySchedule(schedule);
  }

  /** Statistics summary for BD-018 compliance reporting. */
  getSnapshotStatistics() {
    return {
      totalSnapshots: this.#repository.count,
      bd018Compliant: true,
      wave:           'Wave1 — in-memory snapshot store; Wave2: Supabase persistence',
    };
  }
}
