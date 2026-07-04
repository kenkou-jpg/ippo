import type { ConsentLevel } from "../../policies";

// Frozen — B2B data release requirements (RD-009)
export const B2B_POLICY = {
  MIN_COHORT_USERS: 100,
  MIN_CONSENT_LEVEL: 2 as ConsentLevel,
  K_ANONYMITY_MIN: 5,
} as const;

export class B2BAccessDeniedError extends Error {
  constructor(
    public readonly reason: string,
    public readonly requesterId: string,
  ) {
    super(`B2B access denied for ${requesterId}: ${reason}`);
    this.name = "B2BAccessDeniedError";
  }
}

export class CohortTooSmallError extends Error {
  constructor(public readonly actual: number) {
    super(`Cohort size ${actual} is below minimum ${B2B_POLICY.MIN_COHORT_USERS}`);
    this.name = "CohortTooSmallError";
  }
}

export class KAnonymityViolationError extends Error {
  constructor(public readonly actual: number) {
    super(`k-anonymity ${actual} is below minimum ${B2B_POLICY.K_ANONYMITY_MIN}`);
    this.name = "KAnonymityViolationError";
  }
}

export interface B2BRequester {
  requesterId: string;
  organizationId: string;
  /** Granted access scopes */
  scopes: B2BScope[];
}

export type B2BScope = "cohort_read" | "dataset_export" | "report_read";

export function assertScope(requester: B2BRequester, required: B2BScope): void {
  if (!requester.scopes.includes(required)) {
    throw new B2BAccessDeniedError(`missing scope: ${required}`, requester.requesterId);
  }
}

export function assertCohortSize(size: number): void {
  if (size < B2B_POLICY.MIN_COHORT_USERS) throw new CohortTooSmallError(size);
}

export function assertKAnonymity(k: number): void {
  if (k < B2B_POLICY.K_ANONYMITY_MIN) throw new KAnonymityViolationError(k);
}
