// NotificationScheduleService — determines which notifications are due for a user.
// Returns candidates only; never sends. Push delivery is out of scope (PR-024+).
// PR-023: Communication Layer
//
// Notification goal: maximize Case Generation Rate, Experiment Completion Rate,
// and Consent Upgrade Rate — not generic engagement.

/**
 * @typedef {{
 *   type:     string,
 *   dueAt:    string,
 *   priority: 'HIGH'|'MEDIUM'|'LOW',
 * }} NotificationCandidate
 */

/**
 * @typedef {{
 *   consecutiveDays:         number,
 *   day1Recorded:            boolean,
 *   hasActiveExperiment:     boolean,
 *   completedExperimentCount:number,
 *   profileFormationStage:   'STARTED'|'FORMING'|'NEAR_READY'|'READY',
 *   consentLevel:            number,
 *   caseGeneratedEvents:     Array<{generatedAt: string}>,
 *   experiments:             Array<{status:string, actualEndDate?:string, outcomeId?:string|null}>,
 * }} UserContext
 */

export const NOTIFICATION_TYPES = Object.freeze({
  DAY1_RECORD:              'DAY1_RECORD',
  DAY3_EXPERIMENT_NUDGE:    'DAY3_EXPERIMENT_NUDGE',
  DAY7_SUMMARY:             'DAY7_SUMMARY',
  DAY15_PROFILE_FORMING:    'DAY15_PROFILE_FORMING',
  PROFILE_READY:            'PROFILE_READY',
  OUTCOME_REMINDER:         'OUTCOME_REMINDER',
  CONSENT_MOTIVATION:       'CONSENT_MOTIVATION',
});

export class NotificationScheduleService {
  /**
   * Compute all due notification candidates for a user.
   * Evaluation is pure (no I/O). Caller supplies all needed context.
   *
   * @param {UserContext} userContext
   * @param {Date}        [now]  injectable for testing
   * @returns {NotificationCandidate[]}
   */
  getDueNotifications(userContext, now = new Date()) {
    const candidates = [];
    const nowIso = now.toISOString();

    const {
      consecutiveDays = 0,
      day1Recorded = false,
      hasActiveExperiment = false,
      profileFormationStage = 'STARTED',
      consentLevel = 0,
      caseGeneratedEvents = [],
      experiments = [],
    } = userContext;

    // DAY1_RECORD — first record done but no day-1 follow-up yet
    if (!day1Recorded && consecutiveDays === 0) {
      candidates.push({ type: NOTIFICATION_TYPES.DAY1_RECORD, dueAt: nowIso, priority: 'HIGH' });
    }

    // DAY3_EXPERIMENT_NUDGE — 3+ days recorded, no active experiment
    if (consecutiveDays >= 3 && !hasActiveExperiment) {
      candidates.push({ type: NOTIFICATION_TYPES.DAY3_EXPERIMENT_NUDGE, dueAt: nowIso, priority: 'HIGH' });
    }

    // DAY7_SUMMARY — reached 7 consecutive days
    if (consecutiveDays >= 7) {
      candidates.push({ type: NOTIFICATION_TYPES.DAY7_SUMMARY, dueAt: nowIso, priority: 'MEDIUM' });
    }

    // DAY15_PROFILE_FORMING — profile is actively forming
    if (profileFormationStage === 'FORMING') {
      candidates.push({ type: NOTIFICATION_TYPES.DAY15_PROFILE_FORMING, dueAt: nowIso, priority: 'MEDIUM' });
    }

    // PROFILE_READY — a Case generation event exists (never say "Case" to user)
    if (caseGeneratedEvents.length > 0) {
      const latestEvent = caseGeneratedEvents[caseGeneratedEvents.length - 1];
      candidates.push({
        type:     NOTIFICATION_TYPES.PROFILE_READY,
        dueAt:    latestEvent.generatedAt ?? nowIso,
        priority: 'HIGH',
      });
    }

    // OUTCOME_REMINDER — any terminal experiment missing outcome
    const overdueExperiments = experiments.filter(e =>
      (e.status === 'COMPLETED' || e.status === 'ABANDONED') && !e.outcomeId
    );
    for (const exp of overdueExperiments) {
      const endTs     = exp.actualEndDate ? new Date(exp.actualEndDate).getTime() : now.getTime();
      const overdueDays = Math.max(0, Math.floor((now.getTime() - endTs) / 86_400_000));
      if (overdueDays >= 1) {
        candidates.push({ type: NOTIFICATION_TYPES.OUTCOME_REMINDER, dueAt: nowIso, priority: 'HIGH' });
        break; // one reminder per session is enough
      }
    }

    // CONSENT_MOTIVATION — low consent level hinders Similarity and Tier2/3 access
    if (consentLevel < 2) {
      candidates.push({ type: NOTIFICATION_TYPES.CONSENT_MOTIVATION, dueAt: nowIso, priority: 'LOW' });
    }

    return candidates;
  }
}
