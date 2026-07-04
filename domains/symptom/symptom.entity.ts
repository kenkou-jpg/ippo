// Symptom key is the SSOT — stored in symptoms table (master data)
// Key format: snake_case English (e.g. "lower_abdominal_pain")
// Key change = data migration of all record_symptoms. NEVER rename keys.

export interface SymptomEntity {
  key: string;              // immutable SSOT key
  displayNameJa: string;
  displayNameEn: string;
  category: SymptomCategory;
  icd10Code: string | null;
}

export type SymptomCategory =
  | "pain"
  | "bleeding"
  | "digestive"
  | "psychological"
  | "energy"
  | "skin"
  | "other";

export interface FactorDefinition {
  key: string;              // immutable SSOT key
  displayNameJa: string;
  displayNameEn: string;
  category: FactorCategory;
}

export type FactorCategory =
  | "diet"
  | "sleep"
  | "exercise"
  | "supplement"
  | "medication"
  | "stress"
  | "environment";

export interface ValidationResult {
  valid: boolean;
  unknownKeys: string[];
}
