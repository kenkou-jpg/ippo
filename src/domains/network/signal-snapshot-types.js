// signal-snapshot-types.js — SSOT for Snapshot Schedule Registry.
// BD-018: ALL snapshots must have generatedAt + vectorVersion.
// PR-035: Snapshot Foundation

import { VECTOR_VERSION } from './network-signal-types.js';

export { VECTOR_VERSION };

/**
 * Snapshot schedule registry — 3 schedule types.
 * @readonly
 */
export const SNAPSHOT_SCHEDULE = Object.freeze({
  DAILY:  'DAILY',
  WEEKLY: 'WEEKLY',
  MANUAL: 'MANUAL',
});

export const SNAPSHOT_SCHEDULE_KEYS = Object.freeze(Object.keys(SNAPSHOT_SCHEDULE));
