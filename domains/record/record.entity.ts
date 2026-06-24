import type { ID, Timestamp } from "../../shared/types/base";
import type { ConsentLevel } from "../../policies";

// SCHEMA_V1 C-1: record_date is DATE type, timezone-free (YYYY-MM-DD)
// SCHEMA_V1 C-9: UNIQUE(user_id, record_date) — one record per day per user

export type RecordDate = string; // 'YYYY-MM-DD'

export interface RecordSymptom {
  name: string;
}

export interface RecordMeals {
  free?: string;
}

export interface RecordEntity {
  id: ID;
  userId: ID;
  recordDate: RecordDate;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Symptoms
  symptoms: string[];
  painLevel: number | null;      // 0-10
  painLocation: string[];
  painType: string[];

  // Menstrual
  menstrualCycle: string | null;
  bloodClot: string[];
  bloodColor: string[];

  // Vitals
  temperature: number | null;
  tempMethod: string | null;

  // Energy / Mood
  energy: number | null;          // 0-5
  mood: number | null;            // 0-5

  // Sleep
  sleepBed: string | null;
  sleepWake: string | null;
  sleepHours: number | null;
  sleepQuality: number | null;   // 0-5

  // Meals
  meals: RecordMeals;
  firstMealTime: string | null;
  lastMealTime: string | null;
  mealCount: number;
  fasting: number;               // hours

  // Bowel
  bowel: string | null;
  bowelCount: number;

  // Discharge
  dischargeAmount: string | null;
  dischargeType: string[];

  // Scores (computed at save time)
  wellnessScore: number | null;
  smiScore: number | null;

  // Body / Disease
  bodyChoices: Record<string, string[]>;
  diseaseCheck: Record<string, string>;
  diseases: string[];

  // Factors
  factors: string[];
  medication: string[];

  // Meta
  note: string | null;
  isDeleted: boolean;
  consentLevel: ConsentLevel;
}

// Draft — partial record before validation and persistence
export type RecordDraft = Omit<RecordEntity, "id" | "userId" | "createdAt" | "updatedAt" | "isDeleted">;
