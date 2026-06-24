import type { ID, Timestamp } from "../../shared/types/base";

// Frozen: RD-003 — PAUSED is permanently excluded
export type ExperimentStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ABANDONED";

// Frozen: RD-003 — PAUSED/RESUMED permanently excluded
export type ExperimentEventType =
  | "CREATED"
  | "STARTED"
  | "COMPLETED"
  | "ABANDONED"
  | "CONFIG_CHANGED";

export interface ExperimentEntity {
  id: ID;
  userId: ID;
  title: string;
  hypothesis: string;
  startDate: string;       // YYYY-MM-DD
  plannedEndDate: string;  // YYYY-MM-DD
  actualEndDate: string | null;
  status: ExperimentStatus;
  diseaseKey: string | null;
  interventionType: string;
  outcomeId: ID | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isDeleted: boolean;
}

export interface ExperimentEvent {
  id: ID;
  experimentId: ID;
  eventType: ExperimentEventType;
  occurredAt: Timestamp;
  payload: Record<string, unknown>;
}

// Abandoned payload shape (RD-004)
export interface AbandonedPayload {
  reason: string;
  daysCompleted: number;
  outcomeId: ID | null;
}

// Valid state transitions — enforced by experiment.service.ts
export const VALID_TRANSITIONS: Record<ExperimentStatus, ExperimentStatus[]> = {
  DRAFT: ["ACTIVE"],
  ACTIVE: ["COMPLETED", "ABANDONED"],
  COMPLETED: [],
  ABANDONED: [],
} as const;
