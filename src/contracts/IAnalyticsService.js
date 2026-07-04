// IAnalyticsService — contract aligned with domains/analytics/index.ts::AnalyticsService.
// Implementations replace the null stub for TOKENS.AnalyticsService in PR-017.
export class IAnalyticsService {
  /**
   * Ingest a domain event into the analytics pipeline.
   * @param {string} eventType
   * @param {string} userId
   * @param {Record<string, unknown>} [payload]
   * @param {string} [occurredAt]  ISO-8601
   * @returns {Promise<void>}
   */
  track(eventType, userId, payload, occurredAt) {
    throw new Error('Not Implemented: IAnalyticsService.track');
  }

  /**
   * Compute aggregate metrics for a user.
   * @param {string} userId
   * @returns {Promise<object>}
   */
  calculate(userId) {
    throw new Error('Not Implemented: IAnalyticsService.calculate');
  }

  /**
   * Generate insight payloads from computed metrics.
   * @param {string} userId
   * @returns {Promise<object[]>}
   */
  generateInsights(userId) {
    throw new Error('Not Implemented: IAnalyticsService.generateInsights');
  }
}
