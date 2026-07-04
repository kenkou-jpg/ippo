// ExperimentStateMachine — SSOT for Experiment state transitions.
// Frozen transitions (FD-003 / RD-003): PAUSED is permanently excluded.
//
// Allowed:
//   DRAFT     → ACTIVE
//   ACTIVE    → COMPLETED
//   ACTIVE    → ABANDONED
//
// Terminal states (no outgoing transitions):
//   COMPLETED → (none)
//   ABANDONED → (none)

/** @type {Record<string, string[]>} */
const TRANSITIONS = Object.freeze({
  DRAFT:     Object.freeze(['ACTIVE']),
  ACTIVE:    Object.freeze(['COMPLETED', 'ABANDONED']),
  COMPLETED: Object.freeze([]),
  ABANDONED: Object.freeze([]),
});

export class InvalidTransitionError extends Error {
  /** @param {string} from @param {string} to */
  constructor(from, to) {
    super(`[ExperimentStateMachine] Invalid transition: ${from} → ${to}`);
    this.name  = 'InvalidTransitionError';
    this.from  = from;
    this.to    = to;
  }
}

export class ExperimentStateMachine {
  /**
   * Returns allowed next statuses for a given current status.
   * @param {string} status
   * @returns {readonly string[]}
   */
  static allowedTransitions(status) {
    return TRANSITIONS[status] ?? [];
  }

  /**
   * Returns true if the transition is valid without throwing.
   * @param {string} from
   * @param {string} to
   * @returns {boolean}
   */
  static canTransition(from, to) {
    return (TRANSITIONS[from] ?? []).includes(to);
  }

  /**
   * Asserts the transition is valid; throws InvalidTransitionError if not.
   * @param {string} from
   * @param {string} to
   */
  static assertTransition(from, to) {
    if (!ExperimentStateMachine.canTransition(from, to)) {
      throw new InvalidTransitionError(from, to);
    }
  }

  /**
   * Returns true when the status is a terminal state (no further transitions allowed).
   * @param {string} status
   * @returns {boolean}
   */
  static isTerminal(status) {
    return (TRANSITIONS[status] ?? []).length === 0;
  }
}
