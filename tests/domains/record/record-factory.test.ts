import { createRecord, RecordFactoryError } from "../../../domains/record/record-factory";
import { EVENTS } from "../../../shared/events";

const VALID_DRAFT = {
  recordDate: "2026-06-24",
  symptoms: ["頭痛", "疲れ"],
};

describe("record-factory — createRecord", () => {
  it("creates a record with normalized symptoms", () => {
    const { record } = createRecord("user_1", VALID_DRAFT);
    expect(record.symptoms).toContain("headache");
    expect(record.symptoms).toContain("fatigue");
  });

  it("assigns the provided userId", () => {
    const { record } = createRecord("user_42", VALID_DRAFT);
    expect(record.userId).toBe("user_42");
  });

  it("generates a non-empty id", () => {
    const { record } = createRecord("user_1", VALID_DRAFT);
    expect(record.id).toBeTruthy();
  });

  it("sets isDeleted to false", () => {
    const { record } = createRecord("user_1", VALID_DRAFT);
    expect(record.isDeleted).toBe(false);
  });

  it("emits a record_created event with correct payload", () => {
    const { event } = createRecord("user_1", VALID_DRAFT);
    expect(event.type).toBe(EVENTS.RECORD_CREATED);
    expect(event.payload.userId).toBe("user_1");
    expect(event.payload.recordDate).toBe("2026-06-24");
    expect(event.payload.symptomCount).toBe(2);
    expect(event.payload.recordId).toBeTruthy();
    expect(event.payload.timestamp).toBeTruthy();
  });

  it("handles empty symptoms array", () => {
    const { record, event } = createRecord("user_1", { recordDate: "2026-06-24", symptoms: [] });
    expect(record.symptoms).toEqual([]);
    expect(event.payload.symptomCount).toBe(0);
  });

  it("throws RecordFactoryError when userId is empty", () => {
    expect(() => createRecord("", VALID_DRAFT)).toThrow(RecordFactoryError);
  });

  it("throws RecordFactoryError when recordDate is missing", () => {
    expect(() => createRecord("user_1", { symptoms: ["頭痛"] })).toThrow(RecordFactoryError);
  });

  it("throws RecordFactoryError when painLevel is out of range", () => {
    expect(() =>
      createRecord("user_1", { recordDate: "2026-06-24", painLevel: 11 })
    ).toThrow(RecordFactoryError);
  });

  it("includes validation errors in thrown error", () => {
    try {
      createRecord("user_1", { painLevel: 11 });
    } catch (e) {
      expect(e).toBeInstanceOf(RecordFactoryError);
      expect((e as RecordFactoryError).errors.length).toBeGreaterThan(0);
    }
  });
});

describe("record-factory — event isolation", () => {
  it("two records get distinct ids", () => {
    const { record: r1 } = createRecord("user_1", VALID_DRAFT);
    const { record: r2 } = createRecord("user_1", VALID_DRAFT);
    expect(r1.id).not.toBe(r2.id);
  });
});
