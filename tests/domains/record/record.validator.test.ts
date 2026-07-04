import {
  validateRecordDate,
  validateDraft,
  normalizeRecordDate,
} from "../../../domains/record/record.validator";

describe("record.validator — validateRecordDate", () => {
  it("accepts a valid YYYY-MM-DD date", () => {
    expect(validateRecordDate("2026-06-24").valid).toBe(true);
  });

  it("rejects an ISO timestamp", () => {
    const result = validateRecordDate("2026-06-24T12:00:00.000Z");
    expect(result.valid).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(validateRecordDate("").valid).toBe(false);
  });

  it("rejects a slash-separated date", () => {
    expect(validateRecordDate("2026/06/24").valid).toBe(false);
  });
});

describe("record.validator — validateDraft", () => {
  it("passes a minimal valid draft", () => {
    const result = validateDraft({ recordDate: "2026-06-24" });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when recordDate is missing", () => {
    const result = validateDraft({});
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("recordDate"))).toBe(true);
  });

  it("fails when painLevel is out of range", () => {
    const result = validateDraft({ recordDate: "2026-06-24", painLevel: 11 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("painLevel"))).toBe(true);
  });

  it("fails when energy is out of range", () => {
    const result = validateDraft({ recordDate: "2026-06-24", energy: -1 });
    expect(result.valid).toBe(false);
  });
});

describe("record.validator — normalizeRecordDate", () => {
  it("extracts YYYY-MM-DD from ISO string", () => {
    expect(normalizeRecordDate("2026-06-24T15:30:00.000Z")).toBe("2026-06-24");
  });

  it("passes through a bare date unchanged", () => {
    expect(normalizeRecordDate("2026-06-24")).toBe("2026-06-24");
  });
});
