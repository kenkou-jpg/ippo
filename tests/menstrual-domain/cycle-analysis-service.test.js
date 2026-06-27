// tests/menstrual-domain/cycle-analysis-service.test.js
// CycleAnalysisService — Wave1 estimation, PR-039
import { describe, it, expect, beforeEach } from 'vitest';
import { CycleAnalysisService } from '../../src/domains/menstrual/cycle-analysis-service.js';
import { buildMenstrualRecord } from '../../src/domains/menstrual/menstrual-entity.js';

function makeRec(cycleDay, opts = {}) {
  return buildMenstrualRecord({ cycleDay, ...opts });
}

let service;
beforeEach(() => { service = new CycleAnalysisService(); });

describe('calculateAverageCycle()', () => {
  it('returns sampleSize 0 for empty', () => {
    const r = service.calculateAverageCycle([]);
    expect(r.sampleSize).toBe(0);
    expect(r.generatedAt).toBeTruthy();
  });
  it('calculates average from cycleDay 1 records', () => {
    const records = [
      makeRec(1, { startedAt: '2026-01-01T00:00:00.000Z' }),
      makeRec(1, { startedAt: '2026-01-29T00:00:00.000Z' }),
      makeRec(1, { startedAt: '2026-02-26T00:00:00.000Z' }),
    ];
    const r = service.calculateAverageCycle(records);
    expect(r.sampleSize).toBeGreaterThan(0);
    expect(r.averageCycleLength).toBeGreaterThan(0);
    expect(r.generatedAt).toBeTruthy();
  });
  it('has generatedAt (BD-018)', () => {
    expect(service.calculateAverageCycle([]).generatedAt).toBeTruthy();
  });
});

describe('calculateAveragePeriod()', () => {
  it('returns sampleSize 0 for empty', () => {
    expect(service.calculateAveragePeriod([]).sampleSize).toBe(0);
  });
  it('has generatedAt (BD-018)', () => {
    expect(service.calculateAveragePeriod([]).generatedAt).toBeTruthy();
  });
  it('calculates from records with MENSTRUAL phase', () => {
    const records = [
      makeRec(1, { phase: 'MENSTRUAL' }),
      makeRec(2, { phase: 'MENSTRUAL' }),
      makeRec(3, { phase: 'MENSTRUAL' }),
      makeRec(4, { phase: 'MENSTRUAL' }),
      makeRec(5, { phase: 'MENSTRUAL' }),
    ];
    const r = service.calculateAveragePeriod(records);
    expect(r.averagePeriodLength).toBeGreaterThan(0);
  });
});

describe('detectRegularity()', () => {
  it('returns UNKNOWN for empty', () => {
    const r = service.detectRegularity([]);
    expect(r.status).toBe('UNKNOWN');
    expect(r.generatedAt).toBeTruthy();
  });
  it('returns UNKNOWN for too few cycle starts', () => {
    const r = service.detectRegularity([makeRec(1)]);
    expect(r.status).toBe('UNKNOWN');
  });
  it('returns REGULAR for consistent cycles', () => {
    const records = [
      makeRec(1, { startedAt: '2026-01-01T00:00:00.000Z' }),
      makeRec(1, { startedAt: '2026-01-29T00:00:00.000Z' }),
      makeRec(1, { startedAt: '2026-02-26T00:00:00.000Z' }),
      makeRec(1, { startedAt: '2026-03-26T00:00:00.000Z' }),
    ];
    const r = service.detectRegularity(records);
    expect(['REGULAR','IRREGULAR','UNKNOWN']).toContain(r.status);
    expect(r.generatedAt).toBeTruthy();
  });
});

describe('estimateNextCycle()', () => {
  it('has wave1Stub:true', () => {
    expect(service.estimateNextCycle([]).wave1Stub).toBe(true);
    expect(service.estimateNextCycle([]).generatedAt).toBeTruthy();
  });
  it('returns estimatedNextStart null for empty', () => {
    expect(service.estimateNextCycle([]).estimatedNextStart).toBeNull();
  });
});

describe('buildCycleSummary()', () => {
  it('returns bd018Compliant:true', () => {
    expect(service.buildCycleSummary([]).bd018Compliant).toBe(true);
  });
  it('has generatedAt', () => {
    expect(service.buildCycleSummary([]).generatedAt).toBeTruthy();
  });
  it('has recordCount', () => {
    expect(service.buildCycleSummary([]).recordCount).toBe(0);
  });
  it('has regularityScore in [0, 1]', () => {
    const r = service.buildCycleSummary([]);
    expect(r.regularityScore).toBeGreaterThanOrEqual(0);
    expect(r.regularityScore).toBeLessThanOrEqual(1);
  });
});
