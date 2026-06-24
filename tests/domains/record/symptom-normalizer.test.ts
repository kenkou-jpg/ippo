import { normalizeSymptom, normalizeSymptoms, UNKNOWN_SYMPTOM } from "../../../domains/record/symptom-normalizer";

describe("symptom-normalizer — normalizeSymptom", () => {
  it("maps 頭痛 to headache", () => {
    expect(normalizeSymptom("頭痛")).toBe("headache");
  });

  it("maps 頭が痛い to headache (synonym)", () => {
    expect(normalizeSymptom("頭が痛い")).toBe("headache");
  });

  it("maps 偏頭痛 to migraine", () => {
    expect(normalizeSymptom("偏頭痛")).toBe("migraine");
  });

  it("maps 腹痛 to abdominal_pain", () => {
    expect(normalizeSymptom("腹痛")).toBe("abdominal_pain");
  });

  it("maps 疲れ to fatigue", () => {
    expect(normalizeSymptom("疲れ")).toBe("fatigue");
  });

  it("passes through ASCII symptoms", () => {
    expect(normalizeSymptom("headache")).toBe("headache");
  });

  it("converts ASCII with spaces to snake_case", () => {
    expect(normalizeSymptom("back pain")).toBe("back_pain");
  });

  it("returns unknown_symptom for empty string", () => {
    expect(normalizeSymptom("")).toBe(UNKNOWN_SYMPTOM);
  });

  it("returns unknown_symptom for unrecognized input", () => {
    expect(normalizeSymptom("謎の症状xyz")).toBe(UNKNOWN_SYMPTOM);
  });

  it("handles partial match — input containing known key", () => {
    expect(normalizeSymptom("ひどい頭痛がある")).toBe("headache");
  });
});

describe("symptom-normalizer — normalizeSymptoms", () => {
  it("maps an array of symptoms", () => {
    const result = normalizeSymptoms(["頭痛", "疲労", "めまい"]);
    expect(result).toEqual(["headache", "fatigue", "dizziness"]);
  });

  it("returns empty array for empty input", () => {
    expect(normalizeSymptoms([])).toEqual([]);
  });
});
