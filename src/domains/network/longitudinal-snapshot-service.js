// longitudinal-snapshot-service.js — Longitudinal Snapshot Service.
// BD-018: generatedAt + vectorVersion REQUIRED.
// BD-022: Wave1 in-memory only.
// PR-035: Snapshot Foundation

import { VECTOR_VERSION } from './signal-snapshot-types.js';

let _idCounter = 0;

export class LongitudinalSnapshotService {
  #snapshots = [];
  #longitudinalSummaryService;

  /**
   * @param {{ longitudinalSummaryService: object }} deps
   */
  constructor({ longitudinalSummaryService }) {
    if (!longitudinalSummaryService) {
      throw new Error('[LongitudinalSnapshotService] longitudinalSummaryService is required');
    }
    this.#longitudinalSummaryService = longitudinalSummaryService;
  }

  /**
   * Create and store a longitudinal snapshot.
   * Fields: baseline, movingAverage, trend, window, generatedAt, vectorVersion.
   * @param {object[]} signals
   * @param {object}   options
   * @returns {Readonly<object>}
   */
  createLongitudinalSnapshot(signals, options = {}) {
    const summary  = this.#longitudinalSummaryService.summarize(signals ?? [], options);
    const snapshot = Object.freeze({
      id:            `lsnap_${Date.now()}_${++_idCounter}`,
      generatedAt:   new Date().toISOString(),  // BD-018
      vectorVersion: VECTOR_VERSION,            // BD-018
      baseline:      summary.baseline      ?? null,
      movingAverage: summary.movingAverage  ?? null,
      trend:         summary.trend          ?? null,
      window:        summary.window         ?? null,
      metadata:      Object.freeze({ options }),
    });
    this.#snapshots.push(snapshot);
    return snapshot;
  }

  /** Return all longitudinal snapshots (copy). */
  getLongitudinalSnapshots() {
    return [...this.#snapshots];
  }

  /** Return most recent longitudinal snapshot, or null. */
  getLatestLongitudinalSnapshot() {
    if (!this.#snapshots.length) return null;
    return this.#snapshots.reduce((best, s) =>
      s.generatedAt > best.generatedAt ? s : best
    );
  }

  get count() { return this.#snapshots.length; }

  getStatistics() {
    return {
      totalLongitudinalSnapshots: this.#snapshots.length,
      bd018Compliant: true,
      wave:           'Wave1 — in-memory; Wave2: Supabase persistence',
    };
  }
}
