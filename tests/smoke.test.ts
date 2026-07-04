import { EVENTS } from "../shared/events";
import { QUALITY_SCORE } from "../policies";

describe("ippo smoke test", () => {
  it("events are defined", () => {
    expect(EVENTS.RECORD_CREATED).toBe("record.created");
  });

  it("all core events exist", () => {
    expect(EVENTS.EXPERIMENT_STARTED).toBe("experiment.started");
    expect(EVENTS.OUTCOME_RECORDED).toBe("outcome.recorded");
    expect(EVENTS.CASE_GENERATED).toBe("case.generated");
    expect(EVENTS.INSIGHT_VIEWED).toBe("insight.viewed");
    expect(EVENTS.PRO_PAYWALL_HIT).toBe("pro.paywall.hit");
  });

  it("policies exist", () => {
    expect(QUALITY_SCORE.coverage).toBe(30);
  });

  it("quality score weights sum to 100", () => {
    const total = Object.values(QUALITY_SCORE).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});
