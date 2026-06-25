// tests/operations/analytics-service-stub.test.js
// AnalyticsService — stub only, getSummary returns null
import { describe, it, expect } from 'vitest';
import { AnalyticsService } from '../../src/domains/analytics/analytics-service.js';

describe('AnalyticsService stub', () => {
  it('can be instantiated with no arguments', () => {
    expect(() => new AnalyticsService()).not.toThrow();
  });

  it('getSummary returns null (stub/legacy state)', () => {
    expect(new AnalyticsService().getSummary()).toBeNull();
  });
});
