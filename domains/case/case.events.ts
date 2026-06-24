import { EVENTS } from "../../shared/events";
import type { ID, Timestamp } from "../../shared/types/base";
import type { CaseTier } from "./case.entity";

export interface CaseGeneratedPayload {
  caseId: ID;
  userId: ID;
  diseaseKey: string;
  tier: CaseTier;
  qualityScore: number;
  timestamp: Timestamp;
}

export interface CaseUpdatedPayload {
  caseId: ID;
  userId: ID;
  qualityScore: number;
  timestamp: Timestamp;
}

export interface CaseReclassifiedPayload {
  caseId: ID;
  userId: ID;
  previousTier: CaseTier;
  newTier: CaseTier;
  timestamp: Timestamp;
}

export interface CaseDomainEvent<P = unknown> {
  type: string;
  payload: P;
}

export function buildCaseGeneratedEvent(
  payload: CaseGeneratedPayload,
): CaseDomainEvent<CaseGeneratedPayload> {
  return { type: EVENTS.CASE_GENERATED, payload };
}

export function buildCaseUpdatedEvent(
  payload: CaseUpdatedPayload,
): CaseDomainEvent<CaseUpdatedPayload> {
  return { type: EVENTS.CASE_UPDATED, payload };
}

export function buildCaseReclassifiedEvent(
  payload: CaseReclassifiedPayload,
): CaseDomainEvent<CaseReclassifiedPayload> {
  return { type: EVENTS.CASE_RECLASSIFIED, payload };
}
