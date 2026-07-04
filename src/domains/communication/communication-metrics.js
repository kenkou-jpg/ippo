// CommunicationMetrics — Wave1 notification generation KPIs.
// Counters only. No display UI. Used by Wave1MetricsService aggregation.
// PR-023: Communication Layer

import { NOTIFICATION_TYPES } from './notification-schedule-service.js';

const ZERO_METRICS = Object.freeze({
  day1NotificationsGenerated:      0,
  day3NotificationsGenerated:      0,
  day7NotificationsGenerated:      0,
  day15NotificationsGenerated:     0,
  outcomeRemindersGenerated:       0,
  consentMotivationsGenerated:     0,
  profileReadyNotificationsGenerated: 0,
  totalGenerated:                  0,
});

export class CommunicationMetrics {
  #repository;

  /** @param {import('./communication-repository.js').CommunicationRepository} repository */
  constructor(repository) {
    this.#repository = repository;
  }

  /**
   * Increment the appropriate counter for a generated notification type.
   * @param {string} notificationType
   */
  record(notificationType) {
    const current = this.#repository.loadMetrics() ?? { ...ZERO_METRICS };

    switch (notificationType) {
      case NOTIFICATION_TYPES.DAY1_RECORD:
        current.day1NotificationsGenerated++;
        break;
      case NOTIFICATION_TYPES.DAY3_EXPERIMENT_NUDGE:
        current.day3NotificationsGenerated++;
        break;
      case NOTIFICATION_TYPES.DAY7_SUMMARY:
        current.day7NotificationsGenerated++;
        break;
      case NOTIFICATION_TYPES.DAY15_PROFILE_FORMING:
        current.day15NotificationsGenerated++;
        break;
      case NOTIFICATION_TYPES.OUTCOME_REMINDER:
        current.outcomeRemindersGenerated++;
        break;
      case NOTIFICATION_TYPES.CONSENT_MOTIVATION:
        current.consentMotivationsGenerated++;
        break;
      case NOTIFICATION_TYPES.PROFILE_READY:
        current.profileReadyNotificationsGenerated++;
        break;
    }
    current.totalGenerated = (current.totalGenerated ?? 0) + 1;

    this.#repository.saveMetrics(current);
  }

  /**
   * Returns the current snapshot of all communication KPIs.
   * @returns {typeof ZERO_METRICS}
   */
  getSnapshot() {
    return { ...ZERO_METRICS, ...(this.#repository.loadMetrics() ?? {}) };
  }
}
