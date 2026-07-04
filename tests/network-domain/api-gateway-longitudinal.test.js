// tests/network-domain/api-gateway-longitudinal.test.js
import { describe, it, expect, vi } from 'vitest';
import { ApiGateway } from '../../src/application/api-gateway.js';
import { SIGNAL_TYPES } from '../../src/domains/network/network-signal-types.js';

function makePermission() {
  return { require: vi.fn().mockResolvedValue({ userId: 'u1' }) };
}
function makeNetworkSignalService(signals = []) {
  return { listSignals: vi.fn().mockReturnValue(signals) };
}
function makeSummaryService(ret = {}) {
  return { summarize: vi.fn().mockReturnValue(ret) };
}
function makeBaselineService(ret = {}) {
  return { compute: vi.fn().mockReturnValue(ret) };
}
function makeMovingAverageService(ret = {}) {
  return { compute: vi.fn().mockReturnValue(ret) };
}
function makeWindowBuilder(ret = {}) {
  return { build: vi.fn().mockReturnValue(ret) };
}

function makeGateway(overrides = {}) {
  return new ApiGateway({
    permissionService:         overrides.permissionService        ?? makePermission(),
    networkSignalService:      overrides.networkSignalService     ?? makeNetworkSignalService(),
    longitudinalSummaryService: overrides.longitudinalSummaryService ?? makeSummaryService(),
    baselineService:            overrides.baselineService          ?? makeBaselineService(),
    movingAverageService:       overrides.movingAverageService     ?? makeMovingAverageService(),
    trendWindowBuilder:         overrides.trendWindowBuilder       ?? makeWindowBuilder(),
  });
}

describe('ApiGateway — Longitudinal (PR-032)', () => {
  describe('getLongitudinalSummary()', () => {
    it('requires record:read', async () => {
      const perm = makePermission();
      const gw = makeGateway({ permissionService: perm });
      await gw.getLongitudinalSummary();
      expect(perm.require).toHaveBeenCalledWith('record:read');
    });

    it('returns summary from longitudinalSummaryService', async () => {
      const expected = { baseline: {}, movingAverage: {}, trend: {}, window: { days: 30 }, generatedAt: '' };
      const gw = makeGateway({ longitudinalSummaryService: makeSummaryService(expected) });
      const result = await gw.getLongitudinalSummary();
      expect(result).toBe(expected);
    });

    it('passes options to summarize()', async () => {
      const summarySvc = makeSummaryService({});
      const gw = makeGateway({ longitudinalSummaryService: summarySvc });
      await gw.getLongitudinalSummary({ windowDays: 7, referenceDate: '2026-06-30' });
      expect(summarySvc.summarize).toHaveBeenCalledWith(
        expect.any(Array),
        { windowDays: 7, referenceDate: '2026-06-30' }
      );
    });

    it('throws when not wired', async () => {
      const gw = new ApiGateway({ permissionService: makePermission() });
      await expect(gw.getLongitudinalSummary()).rejects.toThrow('[ApiGateway] LongitudinalSummaryService not wired');
    });

    it('propagates signals from networkSignalService', async () => {
      const signals = [{ id: 'ns_1' }];
      const netSvc = makeNetworkSignalService(signals);
      const summarySvc = makeSummaryService({});
      const gw = makeGateway({ networkSignalService: netSvc, longitudinalSummaryService: summarySvc });
      await gw.getLongitudinalSummary();
      expect(summarySvc.summarize).toHaveBeenCalledWith(signals, expect.any(Object));
    });
  });

  describe('getBaseline()', () => {
    it('requires record:read', async () => {
      const perm = makePermission();
      const gw = makeGateway({ permissionService: perm });
      await gw.getBaseline(SIGNAL_TYPES.PAIN);
      expect(perm.require).toHaveBeenCalledWith('record:read');
    });

    it('returns baseline from baselineService', async () => {
      const expected = { signalType: SIGNAL_TYPES.PAIN, mean: 0.4, stddev: 0.1, min: 0.2, max: 0.7, sampleCount: 5, computedAt: '' };
      const gw = makeGateway({ baselineService: makeBaselineService(expected) });
      const result = await gw.getBaseline(SIGNAL_TYPES.PAIN);
      expect(result).toBe(expected);
    });

    it('passes signalType to baselineService.compute()', async () => {
      const baselineSvc = makeBaselineService({});
      const gw = makeGateway({ baselineService: baselineSvc });
      await gw.getBaseline(SIGNAL_TYPES.SLEEP);
      expect(baselineSvc.compute).toHaveBeenCalledWith(expect.any(Array), SIGNAL_TYPES.SLEEP);
    });

    it('throws when not wired', async () => {
      const gw = new ApiGateway({ permissionService: makePermission() });
      await expect(gw.getBaseline(SIGNAL_TYPES.PAIN)).rejects.toThrow('[ApiGateway] BaselineService not wired');
    });
  });

  describe('getMovingAverage()', () => {
    it('requires record:read', async () => {
      const perm = makePermission();
      const gw = makeGateway({ permissionService: perm });
      await gw.getMovingAverage(SIGNAL_TYPES.PAIN, 30);
      expect(perm.require).toHaveBeenCalledWith('record:read');
    });

    it('returns moving average result', async () => {
      const expected = { signalType: SIGNAL_TYPES.PAIN, windowDays: 30, average: 0.4, count: 10, from: '', to: '' };
      const gw = makeGateway({ movingAverageService: makeMovingAverageService(expected) });
      const result = await gw.getMovingAverage(SIGNAL_TYPES.PAIN, 30, '2026-06-30');
      expect(result).toBe(expected);
    });

    it('passes signalType, days, referenceDate to compute()', async () => {
      const movSvc = makeMovingAverageService({});
      const gw = makeGateway({ movingAverageService: movSvc });
      await gw.getMovingAverage(SIGNAL_TYPES.SLEEP, 7, '2026-06-30');
      expect(movSvc.compute).toHaveBeenCalledWith(expect.any(Array), SIGNAL_TYPES.SLEEP, 7, '2026-06-30');
    });

    it('throws when not wired', async () => {
      const gw = new ApiGateway({ permissionService: makePermission() });
      await expect(gw.getMovingAverage(SIGNAL_TYPES.PAIN, 30)).rejects.toThrow('[ApiGateway] MovingAverageService not wired');
    });
  });

  describe('getTrendWindow()', () => {
    it('requires record:read', async () => {
      const perm = makePermission();
      const gw = makeGateway({ permissionService: perm });
      await gw.getTrendWindow(30, '2026-06-30');
      expect(perm.require).toHaveBeenCalledWith('record:read');
    });

    it('returns trend window result', async () => {
      const expected = { windowDays: 30, from: '2026-06-01', to: '2026-06-30', signals: [], dayCount: 0, signalCount: 0 };
      const gw = makeGateway({ trendWindowBuilder: makeWindowBuilder(expected) });
      const result = await gw.getTrendWindow(30, '2026-06-30');
      expect(result).toBe(expected);
    });

    it('passes days and referenceDate to build()', async () => {
      const builder = makeWindowBuilder({});
      const gw = makeGateway({ trendWindowBuilder: builder });
      await gw.getTrendWindow(7, '2026-06-30');
      expect(builder.build).toHaveBeenCalledWith(expect.any(Array), 7, '2026-06-30');
    });

    it('throws when not wired', async () => {
      const gw = new ApiGateway({ permissionService: makePermission() });
      await expect(gw.getTrendWindow(30)).rejects.toThrow('[ApiGateway] TrendWindowBuilder not wired');
    });
  });

  describe('permission failures', () => {
    it('propagates error for getLongitudinalSummary', async () => {
      const perm = { require: vi.fn().mockRejectedValue(new Error('Unauthorized')) };
      const gw = makeGateway({ permissionService: perm });
      await expect(gw.getLongitudinalSummary()).rejects.toThrow('Unauthorized');
    });

    it('propagates error for getBaseline', async () => {
      const perm = { require: vi.fn().mockRejectedValue(new Error('Unauthorized')) };
      const gw = makeGateway({ permissionService: perm });
      await expect(gw.getBaseline(SIGNAL_TYPES.PAIN)).rejects.toThrow('Unauthorized');
    });
  });
});
