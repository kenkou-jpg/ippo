import type { ExperimentStatus } from "./experiment.entity";
import { VALID_TRANSITIONS } from "./experiment.entity";

export class InvalidTransitionError extends Error {
  constructor(from: ExperimentStatus, to: ExperimentStatus) {
    super(`Invalid transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertValidTransition(
  from: ExperimentStatus,
  to: ExperimentStatus,
): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}

export function canTransition(from: ExperimentStatus, to: ExperimentStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

// Auto-abandon rule: 30-day limit from startDate
export const AUTO_ABANDON_DAYS = 30;

export function isAutoAbandonDue(startDate: string, referenceDate: string = new Date().toISOString().slice(0, 10)): boolean {
  const start = new Date(startDate);
  const ref = new Date(referenceDate);
  const diffDays = Math.floor((ref.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= AUTO_ABANDON_DAYS;
}
