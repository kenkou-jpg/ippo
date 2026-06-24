export const EVENTS = {
  RECORD_CREATED: "record.created",
  EXPERIMENT_STARTED: "experiment.started",
  EXPERIMENT_COMPLETED: "experiment.completed",
  EXPERIMENT_ABANDONED: "experiment.abandoned",
  OUTCOME_RECORDED: "outcome.recorded",
  CASE_GENERATED: "case.generated",
  CASE_UPDATED: "case.updated",
  CASE_RECLASSIFIED: "case.reclassified",
  CONSENT_GRANTED: "consent.granted",
  CONSENT_UPDATED: "consent.updated",
  CONSENT_REVOKED: "consent.revoked",
  CONSENT_VIOLATION_BLOCKED: "consent.violation_blocked",
  INSIGHT_VIEWED: "insight.viewed",
  PRO_PAYWALL_HIT: "pro.paywall.hit",
  SIMILARITY_CREATED: "similarity.created",
  SIMILARITY_UPDATED: "similarity.updated",
  B2B_QUERY_EXECUTED: "b2b.query_executed",
  B2B_EXPORT_GENERATED: "b2b.export_generated",
  B2B_ACCESS_DENIED: "b2b.access_denied",
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];
