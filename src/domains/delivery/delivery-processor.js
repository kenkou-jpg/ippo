// DeliveryProcessor — drives PENDING → SCHEDULED → DELIVERED|FAILED lifecycle.
// Calls NotificationProviderAdapter; never calls a Push Provider directly.
// Domain stays provider-agnostic: swap Mock → FCM without touching this file.
// PR-025: Delivery Infrastructure Completion

export class DeliveryProcessor {
  #deliveryQueue;
  #deliveryAuditLog;
  #notificationProviderAdapter;
  #notificationTemplateService;
  #deliveryMetrics;

  constructor({
    deliveryQueue,
    deliveryAuditLog,
    notificationProviderAdapter,
    notificationTemplateService,
    deliveryMetrics,
  }) {
    this.#deliveryQueue               = deliveryQueue;
    this.#deliveryAuditLog            = deliveryAuditLog;
    this.#notificationProviderAdapter = notificationProviderAdapter;
    this.#notificationTemplateService = notificationTemplateService;
    this.#deliveryMetrics             = deliveryMetrics;
  }

  /**
   * Process all PENDING queue entries: transition each through SCHEDULED → DELIVERED|FAILED.
   * Returns a summary of what happened.
   *
   * @returns {Promise<{
   *   processed: number,
   *   delivered: number,
   *   failed:    number,
   *   results:   object[],
   * }>}
   */
  async processPending() {
    const pending = this.#deliveryQueue.findByStatus('PENDING');
    const results = [];
    let delivered = 0;
    let failed    = 0;

    for (const entry of pending) {
      const { id: queueId, userId, notificationType } = entry;

      // Resolve template for this notification type
      const template = this.#notificationTemplateService?.getTemplate(notificationType);
      if (!template) {
        // No template — mark FAILED immediately without touching the provider
        this.#deliveryQueue.markFailed(queueId);
        this.#deliveryAuditLog.recordFailed({
          queueId, userId, notificationType,
          fromStatus: 'PENDING',
          reason:     'no_template',
        });
        this.#deliveryMetrics.recordFailed();
        results.push({ queueId, userId, notificationType, status: 'FAILED', reason: 'no_template' });
        failed++;
        continue;
      }

      // PENDING → SCHEDULED
      this.#deliveryQueue.markScheduled(queueId);
      this.#deliveryAuditLog.recordScheduled({ queueId, userId, notificationType });

      // Call provider through adapter
      try {
        const providerResult = await this.#notificationProviderAdapter.send({
          userId,
          notificationType,
          title: template.title,
          body:  template.body,
          cta:   template.cta,
        });

        if (providerResult.success) {
          // SCHEDULED → DELIVERED
          this.#deliveryQueue.markDelivered(queueId);
          this.#deliveryAuditLog.recordDelivered({
            queueId, userId, notificationType,
            providerId: providerResult.providerId,
          });
          this.#deliveryMetrics.recordDelivered();
          results.push({ queueId, userId, notificationType, status: 'DELIVERED', providerId: providerResult.providerId });
          delivered++;
        } else {
          // Provider returned success:false
          this.#deliveryQueue.markFailed(queueId);
          this.#deliveryAuditLog.recordFailed({
            queueId, userId, notificationType,
            fromStatus: 'SCHEDULED',
            reason:     providerResult.error ?? 'provider_error',
          });
          this.#deliveryMetrics.recordFailed();
          results.push({ queueId, userId, notificationType, status: 'FAILED', reason: providerResult.error ?? 'provider_error' });
          failed++;
        }
      } catch (err) {
        // SCHEDULED → FAILED (exception path)
        this.#deliveryQueue.markFailed(queueId);
        this.#deliveryAuditLog.recordFailed({
          queueId, userId, notificationType,
          fromStatus: 'SCHEDULED',
          reason:     err?.message ?? 'exception',
        });
        this.#deliveryMetrics.recordFailed();
        results.push({ queueId, userId, notificationType, status: 'FAILED', reason: err?.message });
        failed++;
      }
    }

    return { processed: pending.length, delivered, failed, results };
  }
}
