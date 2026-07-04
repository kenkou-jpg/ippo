import type { ID, Timestamp } from "../../shared/types/base";

// Disease key is the SSOT — stored in disease_definitions table
// Key format: snake_case English (e.g. "endometriosis")
// Key change = data migration of all disease_profiles. NEVER rename keys.

export interface DiseaseDefinition {
  key: string;              // immutable SSOT key
  displayNameJa: string;
  displayNameEn: string;
  icd10Code: string | null;
  snomedctCode: string | null;
  prefix: string;           // used in CASE-{PREFIX}-... ID format
}

export type DiseaseSeverity = "mild" | "moderate" | "severe" | "unknown";

export interface DiseaseProfile {
  id: ID;
  userId: ID;
  diseaseKey: string;
  onsetDate: string | null;  // YYYY-MM-DD
  severity: DiseaseSeverity;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
