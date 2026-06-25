// EngagementMetrics — in-memory counters for Wave1 engagement KPIs.
// Pattern: same as record-migration-audit.js (module-level counters, reset in tests).
// PR-022: Wave1 KPI Extension

let _nudgesShown              = 0;
let _startedAfterNudge        = 0;
let _outcomeRemindersTriggered = 0;
let _consentUpgradePromptsShown = 0;
let _commitmentsCreated        = 0;

export function trackNudgeShown()                { _nudgesShown++; }
export function trackStartedAfterNudge()         { _startedAfterNudge++; }
export function trackOutcomeReminderTriggered()  { _outcomeRemindersTriggered++; }
export function trackConsentUpgradePromptShown() { _consentUpgradePromptsShown++; }
export function trackCommitmentCreated()         { _commitmentsCreated++; }

/**
 * @returns {{
 *   experimentNudgesShown:        number,
 *   experimentStartedAfterNudge:  number,
 *   outcomeRemindersTriggered:    number,
 *   consentUpgradePromptsShown:   number,
 *   commitmentsCreated:           number,
 * }}
 */
export function getEngagementMetrics() {
  return {
    experimentNudgesShown:       _nudgesShown,
    experimentStartedAfterNudge: _startedAfterNudge,
    outcomeRemindersTriggered:   _outcomeRemindersTriggered,
    consentUpgradePromptsShown:  _consentUpgradePromptsShown,
    commitmentsCreated:          _commitmentsCreated,
  };
}

/** Reset all counters (test helper). */
export function resetEngagementMetrics() {
  _nudgesShown               = 0;
  _startedAfterNudge         = 0;
  _outcomeRemindersTriggered = 0;
  _consentUpgradePromptsShown = 0;
  _commitmentsCreated        = 0;
}
