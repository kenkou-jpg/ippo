// environmental-signal-snapshot-service.js — PR-049: Environmental Signal Snapshot.
// BD-018: All snapshots MUST include generatedAt.
// BD-003 / BD-043: lunarPhase data is NEVER exposed in UI — research-only asset.
// PR-049: Daily snapshot of Environmental Signal distribution across records.

import { LUNAR_PHASES } from './environmental-signal-types.js';

let _idCounter = 0;

export class EnvironmentalSignalSnapshotService {
  #snapshots = [];

  /**
   * Create a daily Environmental Signal snapshot from enriched records.
   *
   * The snapshot captures the lunarPhase distribution for the given record set.
   * BD-018: generatedAt is always present.
   * BD-003 / BD-043: Snapshot is internal-only — NEVER rendered in UI.
   *
   * @param {object[]} records  Records with environmentalSignals.lunarPhase
   * @param {{ date?: string }} [options]
   * @returns {Readonly<object>}
   */
  createSnapshot(records = [], options = {}) {
    const date        = options.date ?? new Date().toISOString().slice(0, 10);
    const generatedAt = new Date().toISOString();           // BD-018

    const distribution = this.#buildDistribution(records);

    const snapshot = Object.freeze({
      id:           `env_snap_${Date.now()}_${++_idCounter}`,
      date,
      generatedAt,                                         // BD-018
      totalRecords: records.length,
      distribution,
      metadata: Object.freeze({ options }),
    });

    this.#snapshots.push(snapshot);
    return snapshot;
  }

  /** Return all snapshots (copy). */
  getSnapshots() {
    return [...this.#snapshots];
  }

  /** Return the most recent snapshot, or null. */
  getLatestSnapshot() {
    if (!this.#snapshots.length) return null;
    return this.#snapshots.reduce((best, s) =>
      s.generatedAt > best.generatedAt ? s : best,
    );
  }

  get count() { return this.#snapshots.length; }

  // ── Internal ──────────────────────────────────────────────────────────────

  #buildDistribution(records) {
    const counts = {};
    for (const phase of Object.values(LUNAR_PHASES)) {
      counts[phase] = 0;
    }

    for (const record of records) {
      const phase = record?.environmentalSignals?.lunarPhase ?? LUNAR_PHASES.UNKNOWN;
      if (phase in counts) {
        counts[phase]++;
      } else {
        counts[LUNAR_PHASES.UNKNOWN]++;
      }
    }

    return Object.freeze(counts);
  }
}
