import type { ID, Timestamp } from "../../shared/types/base";
import type { ConsentLevel } from "../../policies";

// Frozen — CONSENT_LEVELS in policies/index.ts is the SSOT
// Level 0: self only (default)
// Level 1: anonymous statistics
// Level 2: similar case search (PRO)
// Level 3: research / external use
// Level 4: does not exist (RD-006)

export interface ConsentEntity {
  id: ID;
  userId: ID;
  level: ConsentLevel;
  grantedAt: Timestamp;
}

export type ConsentEventType = "GRANTED" | "REVOKED";

export interface ConsentEvent {
  id: ID;
  userId: ID;
  eventType: ConsentEventType;
  fromLevel: ConsentLevel;
  toLevel: ConsentLevel;
  occurredAt: Timestamp;
  payload: Record<string, unknown>;
}

export class ConsentRequiredError extends Error {
  constructor(
    public readonly required: ConsentLevel,
    public readonly current: ConsentLevel,
  ) {
    super(`Consent Level ${required} required, current is ${current}`);
    this.name = "ConsentRequiredError";
  }
}
