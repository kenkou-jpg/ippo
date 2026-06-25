// INotificationProvider — abstract contract for all Push notification providers.
// Concrete implementations (FCM, OneSignal, Mock) must implement send().
// Domain layer NEVER imports this directly — only adapters implement it.
// PR-025: Delivery Infrastructure Completion

/**
 * @typedef {{
 *   userId:           string,
 *   notificationType: string,
 *   title:            string,
 *   body:             string,
 *   cta:              string,
 * }} NotificationPayload
 *
 * @typedef {{
 *   success:    boolean,
 *   providerId: string,
 *   error?:     string,
 * }} ProviderResult
 */

export class INotificationProvider {
  /**
   * Send a notification payload to the provider.
   * Implementations must return a ProviderResult.
   *
   * @param {NotificationPayload} notification
   * @returns {Promise<ProviderResult>}
   */
  async send(notification) {
    throw new Error('[INotificationProvider] send() not implemented');
  }
}
