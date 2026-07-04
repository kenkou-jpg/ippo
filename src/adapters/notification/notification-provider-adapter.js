// NotificationProviderAdapter — normalizes payload and delegates to an INotificationProvider.
// Swap the underlying provider (Mock → FCM → OneSignal) without touching the Domain.
// PR-025: Delivery Infrastructure Completion

export class NotificationProviderAdapter {
  #provider;

  /**
   * @param {import('../../contracts/INotificationProvider.js').INotificationProvider} provider
   */
  constructor(provider) {
    this.#provider = provider;
  }

  /**
   * Normalize and forward a notification payload to the underlying provider.
   *
   * @param {{
   *   userId:           string,
   *   notificationType: string,
   *   title:            string,
   *   body:             string,
   *   cta:              string,
   * }} payload
   * @returns {Promise<{success:boolean, providerId:string, error?:string}>}
   */
  async send({ userId, notificationType, title, body, cta }) {
    return this.#provider.send({ userId, notificationType, title, body, cta });
  }
}
