export const EVENTS = {
  RECORD_CREATED: "record.created",
  EXPERIMENT_STARTED: "experiment.started",
  OUTCOME_RECORDED: "outcome.recorded",
  CASE_GENERATED: "case.generated",
  INSIGHT_VIEWED: "insight.viewed",
  PRO_PAYWALL_HIT: "pro.paywall.hit",
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];
