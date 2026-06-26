// tests/network-domain/api-gateway-signal-intelligence.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiGateway } from '../../src/application/api-gateway.js';
import { SIGNAL_TYPES } from '../../src/domains/network/network-signal-types.js';

function makePermission() {
  return { require: vi.fn().mockResolvedValue({ userId: 'u1' }) };
}

function makeNetworkSignalService(signals = []) {
  return { listSignals: vi.fn().mockReturnValue(signals) };
}

function makeAggregationService() {
  return { aggregate: vi.fn().mockReturnValue({ byType: {}, byDay: {}, total: 0 }) };
}

function makeTrendService() {
  return { trend: vi.fn().mockReturnValue({ signalType: SIGNAL_TYPES.PAIN, direction: 'Unknown', delta: 0, dataPoints: 0, recentAvg: 0, olderAvg: 0 }) };
}

function makeTimelineService() {
  return { buildTimeline: vi.fn().mockReturnValue({ days: [], totalDays: 0, totalSignals: 0, from: null, to: null }) };
}

function makeSummaryService() {
  return { summarize: vi.fn().mockReturnValue({ symptomCount: 0, painAverage: 0, sleepAverage: 0, exposureCount: 0, menstrualRecords: 0, emotionCount: 0, latestSignals: {}, totalSignals: 0, generatedAt: '' }) };
}

function makeGateway(overrides = {}) {
  return new ApiGateway({
    permissionService:       overrides.permissionService  ?? makePermission(),
    networkSignalService:    overrides.networkSignalService ?? makeNetworkSignalService(),
    signalAggregationService: overrides.signalAggregationService ?? makeAggregationService(),
    signalTrendService:       overrides.signalTrendService ?? makeTrendService(),
    signalTimelineService:    overrides.signalTimelineService ?? makeTimelineService(),
    signalSummaryService:     overrides.signalSummaryService ?? makeSummaryService(),
  });
}

describe('ApiGateway — Signal Intelligence (PR-031)', () => {
  describe('getSignalAggregation()', () => {
    it('requires record:read permission', async () => {
      const permissionService = makePermission();
      const gw = makeGateway({ permissionService });
      await gw.getSignalAggregation();
      expect(permissionService.require).toHaveBeenCalledWith('record:read');
    });

    it('returns aggregation result', async () => {
      const expected = { byType: { PAIN: {} }, byDay: {}, total: 5 };
      const aggregationService = { aggregate: vi.fn().mockReturnValue(expected) };
      const gw = makeGateway({ signalAggregationService: aggregationService });
      const result = await gw.getSignalAggregation();
      expect(result).toBe(expected);
    });

    it('throws when not wired', async () => {
      const gw = new ApiGateway({ permissionService: makePermission() });
      await expect(gw.getSignalAggregation()).rejects.toThrow('[ApiGateway] SignalAggregationService not wired');
    });

    it('passes signals from networkSignalService to aggregationService', async () => {
      const signals = [{ id: 'ns_1' }];
      const networkSvc = makeNetworkSignalService(signals);
      const aggSvc = makeAggregationService();
      const gw = makeGateway({ networkSignalService: networkSvc, signalAggregationService: aggSvc });
      await gw.getSignalAggregation();
      expect(aggSvc.aggregate).toHaveBeenCalledWith(signals);
    });
  });

  describe('getSignalTrend()', () => {
    it('requires record:read permission', async () => {
      const permissionService = makePermission();
      const gw = makeGateway({ permissionService });
      await gw.getSignalTrend(SIGNAL_TYPES.PAIN);
      expect(permissionService.require).toHaveBeenCalledWith('record:read');
    });

    it('returns trend result', async () => {
      const expected = { signalType: SIGNAL_TYPES.PAIN, direction: 'Improving', delta: -0.3, dataPoints: 4, recentAvg: 0.2, olderAvg: 0.5 };
      const trendSvc = { trend: vi.fn().mockReturnValue(expected) };
      const gw = makeGateway({ signalTrendService: trendSvc });
      const result = await gw.getSignalTrend(SIGNAL_TYPES.PAIN);
      expect(result).toBe(expected);
    });

    it('passes signalType to trendService.trend()', async () => {
      const trendSvc = makeTrendService();
      const gw = makeGateway({ signalTrendService: trendSvc });
      await gw.getSignalTrend(SIGNAL_TYPES.SLEEP);
      expect(trendSvc.trend).toHaveBeenCalledWith(expect.any(Array), SIGNAL_TYPES.SLEEP);
    });

    it('throws when not wired', async () => {
      const gw = new ApiGateway({ permissionService: makePermission() });
      await expect(gw.getSignalTrend(SIGNAL_TYPES.PAIN)).rejects.toThrow('[ApiGateway] SignalTrendService not wired');
    });
  });

  describe('getSignalTimeline()', () => {
    it('requires record:read permission', async () => {
      const permissionService = makePermission();
      const gw = makeGateway({ permissionService });
      await gw.getSignalTimeline();
      expect(permissionService.require).toHaveBeenCalledWith('record:read');
    });

    it('returns timeline result', async () => {
      const expected = { days: [{ date: '2026-06-01', signals: [], count: 0 }], totalDays: 1, totalSignals: 1, from: '2026-06-01', to: '2026-06-01' };
      const timelineSvc = { buildTimeline: vi.fn().mockReturnValue(expected) };
      const gw = makeGateway({ signalTimelineService: timelineSvc });
      const result = await gw.getSignalTimeline();
      expect(result).toBe(expected);
    });

    it('throws when not wired', async () => {
      const gw = new ApiGateway({ permissionService: makePermission() });
      await expect(gw.getSignalTimeline()).rejects.toThrow('[ApiGateway] SignalTimelineService not wired');
    });
  });

  describe('getSignalSummary()', () => {
    it('requires record:read permission', async () => {
      const permissionService = makePermission();
      const gw = makeGateway({ permissionService });
      await gw.getSignalSummary();
      expect(permissionService.require).toHaveBeenCalledWith('record:read');
    });

    it('returns summary result', async () => {
      const expected = { symptomCount: 3, painAverage: 0.4, sleepAverage: 0.8, exposureCount: 5, menstrualRecords: 2, emotionCount: 0, latestSignals: {}, totalSignals: 10, generatedAt: '2026-06-01T00:00:00.000Z' };
      const summarySvc = { summarize: vi.fn().mockReturnValue(expected) };
      const gw = makeGateway({ signalSummaryService: summarySvc });
      const result = await gw.getSignalSummary();
      expect(result).toBe(expected);
    });

    it('throws when not wired', async () => {
      const gw = new ApiGateway({ permissionService: makePermission() });
      await expect(gw.getSignalSummary()).rejects.toThrow('[ApiGateway] SignalSummaryService not wired');
    });
  });

  describe('permission failure', () => {
    it('propagates permission error for getSignalAggregation', async () => {
      const permissionService = { require: vi.fn().mockRejectedValue(new Error('Unauthorized')) };
      const gw = makeGateway({ permissionService });
      await expect(gw.getSignalAggregation()).rejects.toThrow('Unauthorized');
    });

    it('propagates permission error for getSignalSummary', async () => {
      const permissionService = { require: vi.fn().mockRejectedValue(new Error('Unauthorized')) };
      const gw = makeGateway({ permissionService });
      await expect(gw.getSignalSummary()).rejects.toThrow('Unauthorized');
    });
  });
});
