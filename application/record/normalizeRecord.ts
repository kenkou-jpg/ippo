import type { RecordDate, RecordDraft } from "../../domains/record/record.entity";
import { normalizeRecordDate } from "../../domains/record/record.validator";

/**
 * Converts a legacy record shape (date as ISO string) to the canonical draft format.
 * This is the boundary where legacy window-state records become domain objects.
 */
export function normalizeLegacyDraft(raw: Record<string, unknown>): Partial<RecordDraft> {
  const recordDate: RecordDate =
    typeof raw["record_date"] === "string"
      ? raw["record_date"]
      : typeof raw["date"] === "string"
        ? normalizeRecordDate(raw["date"] as string)
        : "";

  return {
    recordDate,
    symptoms: Array.isArray(raw["symptoms"]) ? (raw["symptoms"] as string[]) : [],
    painLevel: typeof raw["painLevel"] === "number" ? raw["painLevel"] : null,
    painLocation: Array.isArray(raw["painLocation"]) ? (raw["painLocation"] as string[]) : [],
    painType: Array.isArray(raw["painType"]) ? (raw["painType"] as string[]) : [],
    menstrualCycle: typeof raw["menstrualCycle"] === "string" ? raw["menstrualCycle"] : null,
    temperature: typeof raw["temperature"] === "number" ? raw["temperature"] : null,
    tempMethod: typeof raw["tempMethod"] === "string" ? raw["tempMethod"] : null,
    energy: typeof raw["energy"] === "number" ? raw["energy"] : null,
    mood: typeof raw["mood"] === "number" ? raw["mood"] : null,
    sleepBed: typeof raw["sleepBed"] === "string" ? raw["sleepBed"] : null,
    sleepWake: typeof raw["sleepWake"] === "string" ? raw["sleepWake"] : null,
    sleepHours: typeof raw["sleepHours"] === "number" ? raw["sleepHours"] : null,
    sleepQuality: typeof raw["sleepQuality"] === "number" ? raw["sleepQuality"] : null,
    mealCount: typeof raw["mealCount"] === "number" ? raw["mealCount"] : 0,
    fasting: typeof raw["fasting"] === "number" ? raw["fasting"] : 0,
    bowel: typeof raw["bowel"] === "string" ? raw["bowel"] : null,
    bowelCount: typeof raw["bowelCount"] === "number" ? raw["bowelCount"] : 0,
    note: typeof raw["note"] === "string" ? raw["note"] : null,
    wellnessScore: typeof raw["wellnessScore"] === "number" ? raw["wellnessScore"] : null,
    smiScore: typeof raw["smiScore"] === "number" ? raw["smiScore"] : null,
    bodyChoices: (raw["bodyChoices"] as Record<string, string[]>) ?? {},
    diseaseCheck: (raw["diseaseCheck"] as Record<string, string>) ?? {},
    diseases: Array.isArray(raw["diseases"]) ? (raw["diseases"] as string[]) : [],
    factors: Array.isArray(raw["factors"]) ? (raw["factors"] as string[]) : [],
    medication: Array.isArray(raw["medication"]) ? (raw["medication"] as string[]) : [],
    meals: (raw["meals"] as { free?: string }) ?? {},
  };
}
