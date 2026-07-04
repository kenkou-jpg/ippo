import { EVENTS } from "../../shared/events";
import type { ID, Timestamp } from "../../shared/types/base";
import type { ExperimentOriginType } from "./experiment.entity";

export interface ExperimentEventPayload {
  experimentId: ID;
  userId: ID;
  originType: ExperimentOriginType;
  timestamp: Timestamp;
}

export interface ExperimentAbandonedPayload extends ExperimentEventPayload {
  reason: string;
  daysActive: number;
}

export interface ExperimentDomainEvent<P = ExperimentEventPayload> {
  type: string;
  payload: P;
}

export function buildExperimentStartedEvent(
  payload: ExperimentEventPayload,
): ExperimentDomainEvent {
  return { type: EVENTS.EXPERIMENT_STARTED, payload };
}

export function buildExperimentCompletedEvent(
  payload: ExperimentEventPayload,
): ExperimentDomainEvent {
  return { type: EVENTS.EXPERIMENT_COMPLETED, payload };
}

export function buildExperimentAbandonedEvent(
  payload: ExperimentAbandonedPayload,
): ExperimentDomainEvent<ExperimentAbandonedPayload> {
  return { type: EVENTS.EXPERIMENT_ABANDONED, payload };
}
