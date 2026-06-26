// signal-snapshot-entity.js — Immutable Snapshot Entity.
// BD-018: generatedAt + vectorVersion REQUIRED on every snapshot.
// Append Only — DELETE forbidden on permanent assets.
// PR-035: Snapshot Foundation

import { SNAPSHOT_SCHEDULE, VECTOR_VERSION } from './signal-snapshot-types.js';

let _idCounter = 0;

/**
 * Build an immutable SignalSnapshot.
 * @param {{ schedule: string, signalSummary: object, metadata?: object }} params
 * @returns {Readonly<object>}
 */
export function buildSignalSnapshot({ schedule, signalSummary, metadata = {} }) {
  if (!schedule) throw new Error('[SignalSnapshot] schedule is required');
  if (!SNAPSHOT_SCHEDULE[schedule]) {
    throw new Error(`[SignalSnapshot] Unknown schedule: "${schedule}". Known: ${Object.keys(SNAPSHOT_SCHEDULE).join(', ')}`);
  }
  if (!signalSummary || typeof signalSummary !== 'object') {
    throw new Error('[SignalSnapshot] signalSummary is required');
  }

  return Object.freeze({
    id:            `snap_${Date.now()}_${++_idCounter}`,
    generatedAt:   new Date().toISOString(),   // BD-018
    vectorVersion: VECTOR_VERSION,             // BD-018
    schedule,
    signalSummary: Object.freeze({ ...signalSummary }),
    metadata:      Object.freeze({ ...metadata }),
  });
}
