import type { ID } from "../../shared/types/base";

// analytics domain owns NO tables — it reads from record / experiment / case

export interface Insight {
  id: string;
  userId: ID;
  type: InsightType;
  title: string;
  body: string;
  generatedAt: string;
  sourceRecordDates: string[];
}

export type InsightType =
  | "symptom_pattern"
  | "sleep_correlation"
  | "experiment_result"
  | "streak_milestone"
  | "similar_case_found";

export interface StreakStats {
  currentStreak: number;
  totalDays: number;
  longestStreak: number;
}

export interface TrendData {
  dates: string[];
  values: (number | null)[];
  trend: "improving" | "worsening" | "stable" | "insufficient_data";
}
