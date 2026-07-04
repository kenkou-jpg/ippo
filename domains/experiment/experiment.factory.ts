import type { ID } from "../../shared/types/base";
import type { ExperimentEntity, ExperimentOriginType } from "./experiment.entity";
import {
  buildExperimentStartedEvent,
  type ExperimentDomainEvent,
} from "./experiment.events";

export class ExperimentFactoryError extends Error {
  constructor(
    message: string,
    public readonly errors: string[],
  ) {
    super(message);
    this.name = "ExperimentFactoryError";
  }
}

export interface CreateExperimentInput {
  title: string;
  hypothesis: string;
  originType: ExperimentOriginType;
  triggerContext?: string;
  startDate: string;        // YYYY-MM-DD
  plannedEndDate: string;   // YYYY-MM-DD
  diseaseKey?: string;
  interventionType: string;
}

export interface CreateExperimentResult {
  experiment: ExperimentEntity;
  event: ExperimentDomainEvent;
}

let _counter = 0;
function generateId(): ID {
  return `exp_${Date.now()}_${++_counter}`;
}

function validateInput(userId: ID, input: CreateExperimentInput): string[] {
  const errors: string[] = [];

  if (!userId || userId.trim() === "") {
    errors.push("userId is required");
  }
  if (!input.title || input.title.trim() === "") {
    errors.push("title is required");
  }
  if (!input.hypothesis || input.hypothesis.trim() === "") {
    errors.push("hypothesis is required");
  }
  if (!input.interventionType || input.interventionType.trim() === "") {
    errors.push("interventionType is required");
  }
  if (!input.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) {
    errors.push("startDate must be YYYY-MM-DD");
  }
  if (!input.plannedEndDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.plannedEndDate)) {
    errors.push("plannedEndDate must be YYYY-MM-DD");
  }
  if (input.startDate && input.plannedEndDate && input.startDate >= input.plannedEndDate) {
    errors.push("plannedEndDate must be after startDate");
  }

  const validOrigins: ExperimentOriginType[] = [
    "user_initiated",
    "suggestion_accepted",
    "suggestion_modified",
  ];
  if (!validOrigins.includes(input.originType)) {
    errors.push(`originType must be one of: ${validOrigins.join(", ")}`);
  }

  return errors;
}

export function createExperiment(
  userId: ID,
  input: CreateExperimentInput,
): CreateExperimentResult {
  const errors = validateInput(userId, input);
  if (errors.length > 0) {
    throw new ExperimentFactoryError("Invalid experiment input", errors);
  }

  const now = new Date().toISOString();
  const id = generateId();

  const experiment: ExperimentEntity = {
    id,
    userId,
    title: input.title.trim(),
    hypothesis: input.hypothesis.trim(),
    originType: input.originType,
    triggerContext: input.triggerContext ?? null,
    startDate: input.startDate,
    plannedEndDate: input.plannedEndDate,
    actualEndDate: null,
    status: "ACTIVE",
    diseaseKey: input.diseaseKey ?? null,
    interventionType: input.interventionType.trim(),
    outcomeId: null,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  const event = buildExperimentStartedEvent({
    experimentId: id,
    userId,
    originType: input.originType,
    timestamp: now,
  });

  return { experiment, event };
}
