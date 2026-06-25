// OutcomeReminderService — detects completed/abandoned experiments with missing Outcome.
// Outcome入力ナッジ: Experiment終了翌日からshouldNotify=true。
// PR-022: Engagement Layer
//
// Note: Outcome入力はTier2の前提条件 (FD-002)。
//       未入力のままではCase Generation Rate が低下する。

/**
 * @typedef {{
 *   experimentId: string,
 *   overdueDays:  number,
 *   shouldNotify: boolean,
 * }} ReminderResult
 */

// Remind after this many days post-completion without outcome
const NOTIFY_AFTER_DAYS = 1;

export class OutcomeReminderService {
  /**
   * Check whether an Outcome reminder should be shown for a single experiment.
   *
   * @param {{
   *   id:             string,
   *   status:         string,
   *   actualEndDate?: string,  YYYY-MM-DD
   *   outcomeId?:     string|null,
   * }} experiment
   * @returns {ReminderResult}
   */
  getReminder(experiment) {
    const { id, status, actualEndDate, outcomeId } = experiment;

    // Only applies to terminal states
    if (status !== 'COMPLETED' && status !== 'ABANDONED') {
      return { experimentId: id, overdueDays: 0, shouldNotify: false };
    }

    // Outcome already recorded
    if (outcomeId) {
      return { experimentId: id, overdueDays: 0, shouldNotify: false };
    }

    const endTs     = actualEndDate ? new Date(actualEndDate).getTime() : Date.now();
    const overdueDays = Math.max(0, Math.floor((Date.now() - endTs) / 86_400_000));

    return {
      experimentId: id,
      overdueDays,
      shouldNotify: overdueDays >= NOTIFY_AFTER_DAYS,
    };
  }

  /**
   * Filter a list of experiments for those needing an Outcome reminder.
   * @param {object[]} experiments
   * @returns {ReminderResult[]}
   */
  getOverdueReminders(experiments) {
    return experiments
      .map(e => this.getReminder(e))
      .filter(r => r.shouldNotify);
  }
}
