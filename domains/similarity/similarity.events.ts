import { EVENTS } from "../../shared/events";
import type { Timestamp } from "../../shared/types/base";
import type { CaseID } from "../case/case.entity";

export interface SimilarityCreatedPayload {
  caseIdA: CaseID;
  caseIdB: CaseID;
  score: number;
  reasons: string[];
  timestamp: Timestamp;
}

export interface SimilarityUpdatedPayload {
  caseIdA: CaseID;
  caseIdB: CaseID;
  previousScore: number;
  newScore: number;
  reasons: string[];
  timestamp: Timestamp;
}

export interface SimilarityDomainEvent<P = unknown> {
  type: string;
  payload: P;
}

export function buildSimilarityCreatedEvent(
  payload: SimilarityCreatedPayload,
): SimilarityDomainEvent<SimilarityCreatedPayload> {
  return { type: EVENTS.SIMILARITY_CREATED, payload };
}

export function buildSimilarityUpdatedEvent(
  payload: SimilarityUpdatedPayload,
): SimilarityDomainEvent<SimilarityUpdatedPayload> {
  return { type: EVENTS.SIMILARITY_UPDATED, payload };
}
