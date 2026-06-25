// TransitionAudit — append-only log of Experiment state transitions.
// Records: experimentId, from, to, timestamp, reason.
// console.warn only — no throws, no side-effects beyond the in-memory log.

/** @type {Array<{experimentId:string, from:string, to:string, timestamp:string, reason:string|null}>} */
let _log = [];

/**
 * Record a state transition.
 * @param {string} experimentId
 * @param {string} from
 * @param {string} to
 * @param {string|null} [reason]
 */
export function recordTransition(experimentId, from, to, reason = null) {
  const entry = Object.freeze({
    experimentId,
    from,
    to,
    timestamp: new Date().toISOString(),
    reason: reason ?? null,
  });
  _log.push(entry);
  console.warn(
    `[TransitionAudit] ${experimentId}: ${from} → ${to}` +
    (reason ? ` (${reason})` : '')
  );
}

/**
 * Returns all recorded transitions (shallow copy).
 * @returns {Array<object>}
 */
export function getLog() {
  return [..._log];
}

/**
 * Returns transitions for a specific experiment.
 * @param {string} experimentId
 * @returns {Array<object>}
 */
export function getLogFor(experimentId) {
  return _log.filter(e => e.experimentId === experimentId);
}

/** Reset log (used in tests). */
export function resetLog() {
  _log = [];
}
