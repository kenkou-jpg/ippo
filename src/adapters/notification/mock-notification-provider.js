// MockNotificationProvider — in-process stub for the INotificationProvider contract.
// Used in development, tests, and Wave1 (before real Push Provider is wired).
// Never connects to FCM, OneSignal, APNs, or any external service.
// PR-025: Delivery Infrastructure Completion

import { INotificationProvider } from '../../contracts/INotificationProvider.js';

export class MockNotificationProvider extends INotificationProvider {
  /**
   * Simulate a successful send. Always returns success in Wave1.
   * @param {import('../../contracts/INotificationProvider.js').NotificationPayload} notification
   * @returns {Promise<import('../../contracts/INotificationProvider.js').ProviderResult>}
   */
  async send(notification) {
    return {
      success:    true,
      providerId: `mock_${Date.now()}`,
    };
  }
}
