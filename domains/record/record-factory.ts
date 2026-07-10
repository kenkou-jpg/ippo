import type { ID } from "../../shared/types/base";
import type { RecordEntity, RecordDraft } from "./record.entity";
import { validateDraft } from "./record.validator";
import { normalizeSymptoms } from "./symptom-normalizer";
import { buildRecordCreatedEvent } from "./record.events";
import type { RecordEvent } from "./record.events";

export interface FactoryResult {
  record: RecordEntity;
  event: RecordEvent;
}

export class RecordFactoryError extends Error {
  constructor(
    message: string,
    public readonly errors: string[],
  ) {
    super(message);
    this.name = "RecordFactoryError";
  }
}

let _idCounter = 0;
function generateId(): ID {
  return `rec_${Date.now()}_${++_idCounter}`;
}

export function createRecord(
  userId: ID,
  draft: Partial<RecordDraft>,
): FactoryResult {
  if (!userId) {
    throw new RecordFactoryError("userId is required", ["userId is required"]);
  }

  const validation = validateDraft(draft);
  if (!validation.valid) {
    throw new RecordFactoryError("Invalid record draft", validation.errors);
  }

  const now = new Date().toISOString();
  const normalizedSymptoms = normalizeSymptoms(draft.symptoms ?? []);

  const record: RecordEntity = {
    id: generateId(),
    userId,
    recordDate: draft.recordDate!,
    createdAt: now,
    updatedAt: now,

    symptoms: normalizedSymptoms,
    painLevel: draft.painLevel ?? null,
    painLocation: draft.painLocation ?? [],
    painType: draft.painType ?? [],

    menstrualCycle: draft.menstrualCycle ?? null,
    bloodClot: draft.bloodClot ?? [],
    bloodColor: draft.bloodColor ?? [],

    temperature: draft.temperature ?? null,
    tempMethod: draft.tempMethod ?? null,

    energy: draft.energy ?? null,
    mood: draft.mood ?? null,

    sleepBed: draft.sleepBed ?? null,
    sleepWake: draft.sleepWake ?? null,
    sleepHours: draft.sleepHours ?? null,
    sleepQuality: draft.sleepQuality ?? null,

    meals: draft.meals ?? {},
    firstMealTime: draft.firstMealTime ?? null,
    lastMealTime: draft.lastMealTime ?? null,
    mealCount: draft.mealCount ?? 0,
    fasting: draft.fasting ?? 0,

    bowel: draft.bowel ?? null,
    bowelCount: draft.bowelCount ?? 0,

    dischargeAmount: draft.dischargeAmount ?? null,
    dischargeType: draft.dischargeType ?? [],

    wellnessScore: draft.wellnessScore ?? null,
    smiScore: draft.smiScore ?? null,

    bodyChoices: draft.bodyChoices ?? {},
    diseaseCheck: draft.diseaseCheck ?? {},
    diseases: draft.diseases ?? [],

    factors: draft.factors ?? [],
    medication: draft.medication ?? [],

    experimentId: draft.experimentId ?? null,

    note: draft.note ?? null,
    isDeleted: false,
    consentLevel: draft.consentLevel ?? 0,
  };

  const event = buildRecordCreatedEvent({
    recordId: record.id,
    userId,
    recordDate: record.recordDate,
    symptomCount: record.symptoms.length,
    timestamp: now,
  });

  return { record, event };
}
