import {
  isNewRecord,
  calculateStreak,
  applyRecordToStreakState,
} from "../../../domains/record/record.service";

describe("record.service — isNewRecord", () => {
  it("returns true when records list is empty", () => {
    expect(isNewRecord([], "2026-06-24")).toBe(true);
  });

  it("returns false when the date already exists (recordDate field)", () => {
    const records = [{ recordDate: "2026-06-24" }];
    expect(isNewRecord(records, "2026-06-24")).toBe(false);
  });

  it("returns false when the date already exists (legacy date field)", () => {
    const records = [{ date: "2026-06-24T12:00:00.000Z" }];
    expect(isNewRecord(records, "2026-06-24")).toBe(false);
  });

  it("returns true when the date does not match any existing record", () => {
    const records = [{ recordDate: "2026-06-23" }];
    expect(isNewRecord(records, "2026-06-24")).toBe(true);
  });
});

describe("record.service — calculateStreak", () => {
  it("returns 1 for first ever record (streak=0)", () => {
    expect(calculateStreak([], 0, "2026-06-24", true)).toBe(1);
  });

  it("increments streak when yesterday was recorded", () => {
    const records = [{ recordDate: "2026-06-23" }];
    expect(calculateStreak(records, 5, "2026-06-24", true)).toBe(6);
  });

  it("resets streak to 1 when yesterday was NOT recorded", () => {
    const records = [{ recordDate: "2026-06-20" }];
    expect(calculateStreak(records, 5, "2026-06-24", true)).toBe(1);
  });

  it("does not change streak when isNew=false (edit of existing record)", () => {
    const records = [{ recordDate: "2026-06-24" }];
    expect(calculateStreak(records, 10, "2026-06-24", false)).toBe(10);
  });
});

describe("record.service — applyRecordToStreakState", () => {
  it("increments totalDays and streak for a new record", () => {
    const result = applyRecordToStreakState(
      [],
      { streak: 0, totalDays: 0 },
      "2026-06-24",
    );
    expect(result.totalDays).toBe(1);
    expect(result.streak).toBe(1);
  });

  it("does not change state when saving an existing record date", () => {
    const existing = [{ recordDate: "2026-06-24" }];
    const state = { streak: 3, totalDays: 10 };
    const result = applyRecordToStreakState(existing, state, "2026-06-24");
    expect(result).toEqual(state);
  });

  it("maintains streak for consecutive days", () => {
    const existing = [{ recordDate: "2026-06-23" }];
    const result = applyRecordToStreakState(
      existing,
      { streak: 7, totalDays: 15 },
      "2026-06-24",
    );
    expect(result.streak).toBe(8);
    expect(result.totalDays).toBe(16);
  });
});
