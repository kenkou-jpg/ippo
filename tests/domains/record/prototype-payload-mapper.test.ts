import { mapPrototypePayloadToRecordDraft } from "../../../domains/record/prototype-payload-mapper";
import { createRecord } from "../../../domains/record/record-factory";

const BASE_PAYLOAD = {
  recordDate: "2026-07-09",
  mood: 3,
  sleep: "normal" as const,
  skin: "normal" as const,
  tags: ["caffeine", "exercise"],
  memo: "string or null",
  diseaseContext: { concerns: ["endometriosis"] },
  optionalDetails: {},
};

describe("prototype-payload-mapper — mapPrototypePayloadToRecordDraft", () => {
  it("maps recordDate, mood, and memo straight through", () => {
    const draft = mapPrototypePayloadToRecordDraft(BASE_PAYLOAD);
    expect(draft.recordDate).toBe("2026-07-09");
    expect(draft.mood).toBe(3);
    expect(draft.note).toBe("string or null");
  });

  it("maps sleep preset short/normal/long to sleepHours/sleepQuality", () => {
    expect(mapPrototypePayloadToRecordDraft({ ...BASE_PAYLOAD, sleep: "short" })).toMatchObject({
      sleepHours: 5,
      sleepQuality: 2,
    });
    expect(mapPrototypePayloadToRecordDraft({ ...BASE_PAYLOAD, sleep: "normal" })).toMatchObject({
      sleepHours: 7,
      sleepQuality: 3,
    });
    expect(mapPrototypePayloadToRecordDraft({ ...BASE_PAYLOAD, sleep: "long" })).toMatchObject({
      sleepHours: 9,
      sleepQuality: 4,
    });
  });

  it("leaves sleepHours/sleepQuality null when sleep is not provided", () => {
    const { sleep, ...rest } = BASE_PAYLOAD;
    const draft = mapPrototypePayloadToRecordDraft(rest);
    expect(draft.sleepHours).toBeNull();
    expect(draft.sleepQuality).toBeNull();
  });

  it("registers skin_roughness symptom only when skin is rough", () => {
    expect(mapPrototypePayloadToRecordDraft({ ...BASE_PAYLOAD, skin: "rough" }).symptoms).toContain(
      "skin_roughness",
    );
    expect(mapPrototypePayloadToRecordDraft({ ...BASE_PAYLOAD, skin: "normal" }).symptoms).not.toContain(
      "skin_roughness",
    );
    expect(mapPrototypePayloadToRecordDraft({ ...BASE_PAYLOAD, skin: "good" }).symptoms).not.toContain(
      "skin_roughness",
    );
  });

  it("passes caffeine/alcohol/exercise/dairy tags through unchanged", () => {
    const draft = mapPrototypePayloadToRecordDraft({
      ...BASE_PAYLOAD,
      tags: ["caffeine", "alcohol", "exercise", "dairy"],
    });
    expect(draft.factors).toEqual(["caffeine", "alcohol", "exercise", "dairy"]);
  });

  it("remaps sugar to high_carb and earlysleep to early_sleep", () => {
    const draft = mapPrototypePayloadToRecordDraft({ ...BASE_PAYLOAD, tags: ["sugar", "earlysleep"] });
    expect(draft.factors).toEqual(["high_carb", "early_sleep"]);
  });

  it("collapses pms and pmdd concerns into a single pms_pmdd disease key", () => {
    const draft = mapPrototypePayloadToRecordDraft({
      ...BASE_PAYLOAD,
      diseaseContext: { concerns: ["pms", "pmdd"] },
    });
    expect(draft.diseases).toEqual(["pms_pmdd"]);
  });

  it("keeps a single pms concern as pms_pmdd and preserves unrelated concerns", () => {
    const draft = mapPrototypePayloadToRecordDraft({
      ...BASE_PAYLOAD,
      diseaseContext: { concerns: ["endometriosis", "pms"] },
    });
    expect(draft.diseases).toEqual(["endometriosis", "pms_pmdd"]);
  });

  it("maps optionalDetails through with null defaults when absent", () => {
    const draft = mapPrototypePayloadToRecordDraft({ ...BASE_PAYLOAD, optionalDetails: undefined });
    expect(draft.painLevel).toBeNull();
    expect(draft.menstrualCycle).toBeNull();
    expect(draft.bloodClot).toEqual([]);
    expect(draft.bloodColor).toEqual([]);
    expect(draft.temperature).toBeNull();
    expect(draft.bowel).toBeNull();
    expect(draft.medication).toEqual([]);
  });

  it("maps optionalDetails values through when present", () => {
    const draft = mapPrototypePayloadToRecordDraft({
      ...BASE_PAYLOAD,
      optionalDetails: {
        painLevel: 4,
        menstrualCycle: "day3",
        bloodClot: ["small"],
        bloodColor: ["bright_red"],
        temperature: 36.8,
        bowel: "normal",
        medication: ["ibuprofen"],
      },
    });
    expect(draft.painLevel).toBe(4);
    expect(draft.menstrualCycle).toBe("day3");
    expect(draft.bloodClot).toEqual(["small"]);
    expect(draft.bloodColor).toEqual(["bright_red"]);
    expect(draft.temperature).toBe(36.8);
    expect(draft.bowel).toBe("normal");
    expect(draft.medication).toEqual(["ibuprofen"]);
  });

  it("maps experimentContext.experimentId through, defaulting to null", () => {
    expect(mapPrototypePayloadToRecordDraft(BASE_PAYLOAD).experimentId).toBeNull();
    expect(
      mapPrototypePayloadToRecordDraft({
        ...BASE_PAYLOAD,
        experimentContext: { experimentId: "exp_123" },
      }).experimentId,
    ).toBe("exp_123");
  });

  it("output is accepted as-is by createRecord", () => {
    const draft = mapPrototypePayloadToRecordDraft(BASE_PAYLOAD);
    const { record } = createRecord("user_1", draft);
    expect(record.recordDate).toBe("2026-07-09");
    expect(record.mood).toBe(3);
    expect(record.factors).toEqual(["caffeine", "exercise"]);
    expect(record.diseases).toEqual(["endometriosis"]);
  });
});
