// DeliveryScheduler — connects Communication Decision Layer to Delivery Queue.
// Handles deduplication: same (userId, notificationType, date) is scheduled only once.
// Push Provider (FCM/OneSignal) is NOT called here — PR-025+.
// PR-024: Delivery & Admin Analytics Layer

import { DELIVERY_STATUS } from './delivery-queue.js';

export class DeliveryScheduler {
  #notificationScheduleService;
  #deliveryQueue;
  #deliveryAuditLog;
  #communicationAuditLog;
  #communicationMetrics;

  constructor({
    notificationScheduleService,
    deliveryQueue,
    deliveryAuditLog,
    communicationAuditLog,
    communicationMetrics,
  }) {
    this.#notificationScheduleService = notificationScheduleService;
    this.#deliveryQueue               = deliveryQueue;
    this.#deliveryAuditLog            = deliveryAuditLog;
    this.#communicationAuditLog       = communicationAuditLog;
    this.#communicationMetrics        = communicationMetrics;
  }

  /**
   * Evaluate due notifications for a user and enqueue new ones.
   * Idempotent: same (userId, notificationType) on the same calendar day is enqueued once only.
   *
   * @param {string} userId
   * @param {import('../communication/notification-schedule-service.js').UserContext} userContext
   * @param {Date} [now]  injectable for testing
   * @returns {{ scheduled: object[], skipped: string[] }}
   */
  scheduleDueNotifications(userId, userContext, now = new Date()) {
    const candidates = this.#notificationScheduleService.getDueNotifications(userContext, now);
    const today      = now.toISOString().split('T')[0];
    const nowIso     = now.toISOString();

    // Deduplication: find notification types already logged for this user today
    const existingToday = new Set(
      this.#communicationAuditLog
        .findByUser(userId)
        .filter(e => (e.scheduledAt ?? '').startsWith(today))
        .map(e => e.notificationType)
    );

    const scheduled = [];
    const skipped   = [];

    for (const candidate of candidates) {
      if (existingToday.has(candidate.type)) {
        skipped.push(candidate.type);
        continue;
      }

      // Enqueue
      const queueEntry = this.#deliveryQueue.enqueue({
        userId,
        notificationType: candidate.type,
        scheduledAt:      nowIso,
        candidateDueAt:   candidate.dueAt,
      });

      // Delivery audit: record the enqueue transition (null → PENDING)
      this.#deliveryAuditLog.append({
        queueId:          queueEntry.id,
        userId,
        notificationType: candidate.type,
        fromStatus:       null,
        toStatus:         DELIVERY_STATUS.PENDING,
        reason:           'scheduled_by_DeliveryScheduler',
      });

      // Communication audit: mark as generated for deduplication on next call
      this.#communicationAuditLog.append({
        userId,
        notificationType: candidate.type,
        scheduledAt:      nowIso,
      });

      // Metrics: record only for newly scheduled notifications (TD-4 fix)
      this.#communicationMetrics?.record(candidate.type);

      scheduled.push(queueEntry);
    }

    return { scheduled, skipped };
  }
}
