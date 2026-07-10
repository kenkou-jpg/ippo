// Adapter: Prototype Record UI payload → RecordDraft (domains/record/record.entity.ts).
// Spec source: docs/rebuild/IPPO_RECORD_MIGRATION_DESIGN_COUNCIL.md
//   "Record Payload Design" / "RecordEntity Mapping" / "Confirmed Founder Decisions".
// Mapping only, no direct DB access. observationTags/consentContext/metadata are intentionally
// not mapped: the Council doc marks them as non-persisted or out of scope for this adapter.
// experimentContext.experimentId maps to RecordDraft.experimentId (PR-REC-05).

import type { RecordDraft } from "./record.entity";

export type PrototypeSleepValue = "short" | "normal" | "long";
export type PrototypeSkinValue = "rough" | "normal" | "good";

export interface PrototypeOptionalDetails {
  painLevel?: number | null;
  menstrualCycle?: string | null;
  bloodClot?: string[];
  bloodColor?: string[];
  temperature?: number | null;
  bowel?: string | null;
  medication?: string[];
  symptoms?: string[];
}

export interface PrototypeRecordPayload {
  recordDate: string;
  mood?: number | null;
  sleep?: PrototypeSleepValue | null;
  skin?: PrototypeSkinValue | null;
  tags?: string[];
  memo?: string | null;
  diseaseContext?: { concerns?: string[] };
  experimentContext?: { experimentId?: string | null };
  optionalDetails?: PrototypeOptionalDetails;
}

// Confirmed Founder Decision (2026-07-09): sleep 3択 → representative sleepHours/sleepQuality.
// Bed/wake times are not collected by the Prototype UI.
const SLEEP_PRESET: Record<PrototypeSleepValue, { sleepHours: number; sleepQuality: number }> = {
  short: { sleepHours: 5, sleepQuality: 2 },
  normal: { sleepHours: 7, sleepQuality: 3 },
  long: { sleepHours: 9, sleepQuality: 4 },
};

// tags[] → factors[] key readthrough. caffeine/alcohol/exercise/dairy map 1:1 to existing or
// PR-REC-04-seeded factor_definitions keys; sugar reuses the existing high_carb key.
const FACTOR_TAG_MAP: Record<string, string> = {
  sugar: "high_carb",
  earlysleep: "early_sleep",
};

// Confirmed Founder Decision 3: PMS/PMDD stay as two onboarding chips in the UI, but collapse
// to the single disease_definitions.key = 'pms_pmdd' when written to the domain layer.
const PMS_PMDD_CONCERNS = new Set(["pms", "pmdd"]);

function mapConcernsToDiseases(concerns: string[]): string[] {
  const rest = concerns.filter((c) => !PMS_PMDD_CONCERNS.has(c.toLowerCase()));
  const hasPmsOrPmdd = rest.length !== concerns.length;
  return hasPmsOrPmdd ? [...rest, "pms_pmdd"] : rest;
}

function mapSkinToSymptoms(skin: PrototypeSkinValue | null | undefined, base: string[]): string[] {
  // Confirmed Founder Decision 3: "normal" and "good" are both left unregistered (UI-only
  // distinction, not persisted). Only "rough" writes a skin_roughness symptom.
  if (skin === "rough") return [...base, "skin_roughness"];
  return base;
}

export function mapPrototypePayloadToRecordDraft(
  payload: PrototypeRecordPayload,
): Partial<RecordDraft> {
  const details = payload.optionalDetails ?? {};
  const tags = payload.tags ?? [];
  const concerns = payload.diseaseContext?.concerns ?? [];
  const sleepPreset = payload.sleep ? SLEEP_PRESET[payload.sleep] : null;

  return {
    recordDate: payload.recordDate,
    mood: payload.mood ?? null,
    note: payload.memo ?? null,

    symptoms: mapSkinToSymptoms(payload.skin, details.symptoms ?? []),
    factors: tags.map((tag) => FACTOR_TAG_MAP[tag] ?? tag),
    diseases: mapConcernsToDiseases(concerns),
    diseaseCheck: {},
    experimentId: payload.experimentContext?.experimentId ?? null,

    sleepHours: sleepPreset?.sleepHours ?? null,
    sleepQuality: sleepPreset?.sleepQuality ?? null,
    sleepBed: null,
    sleepWake: null,

    painLevel: details.painLevel ?? null,
    menstrualCycle: details.menstrualCycle ?? null,
    bloodClot: details.bloodClot ?? [],
    bloodColor: details.bloodColor ?? [],
    temperature: details.temperature ?? null,
    tempMethod: null,
    bowel: details.bowel ?? null,
    medication: details.medication ?? [],
  };
}
