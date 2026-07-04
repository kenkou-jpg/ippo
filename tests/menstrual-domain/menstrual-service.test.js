// tests/menstrual-domain/menstrual-service.test.js
// MenstrualService — create / list / signals / BD-015 events, PR-039
import { describe, it, expect, beforeEach } from 'vitest';
import { MenstrualService } from '../../src/domains/menstrual/menstrual-service.js';
import { MenstrualRepository } from '../../src/domains/menstrual/menstrual-repository.js';

function makeService(opts = {}) {
  const repository = opts.repository ?? new MenstrualRepository();
  const eventPublisher = opts.eventPublisher ?? null;
  return new MenstrualService({ repository, eventPublisher });
}

describe('MenstrualService.create()', () => {
  it('creates and returns a frozen record', () => {
    const svc = makeService();
    const rec = svc.create({ cycleDay: 1, phase: 'MENSTRUAL' });
    expect(rec.id).toMatch(/^men_/);
    expect(Object.isFrozen(rec)).toBe(true);
  });
  it('throws on invalid input', () => {
    expect(() => makeService().create({ cycleDay: 0 })).toThrow();
  });
  it('throws on unknown phase', () => {
    expect(() => makeService().create({ cycleDay: 1, phase: 'SUPER' })).toThrow();
  });
  it('publishes MENSTRUAL_RECORDED event when eventPublisher provided (BD-015)', () => {
    const events = [];
    const eventPublisher = { publish: (e) => events.push(e) };
    const svc = makeService({ eventPublisher });
    svc.create({ cycleDay: 1 });
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('MENSTRUAL_RECORDED');
  });
  it('does not throw when eventPublisher is null', () => {
    expect(() => makeService().create({ cycleDay: 2 })).not.toThrow();
  });
  it('stores record in repository', () => {
    const repo = new MenstrualRepository();
    const svc = makeService({ repository: repo });
    svc.create({ cycleDay: 3, phase: 'FOLLICULAR' });
    expect(repo.count).toBe(1);
  });
});

describe('MenstrualService.list()', () => {
  it('returns [] when empty', () => {
    expect(makeService().list()).toEqual([]);
  });
  it('returns all records', () => {
    const svc = makeService();
    svc.create({ cycleDay: 1 });
    svc.create({ cycleDay: 2 });
    expect(svc.list()).toHaveLength(2);
  });
});

describe('MenstrualService.findCurrentCycle()', () => {
  it('returns an array', () => {
    expect(Array.isArray(makeService().findCurrentCycle())).toBe(true);
  });
});

describe('MenstrualService.findByPhase()', () => {
  it('returns records matching phase', () => {
    const svc = makeService();
    svc.create({ cycleDay: 1, phase: 'MENSTRUAL' });
    svc.create({ cycleDay: 6, phase: 'FOLLICULAR' });
    const r = svc.findByPhase('MENSTRUAL');
    expect(r).toHaveLength(1);
    expect(r[0].phase).toBe('MENSTRUAL');
  });
});

describe('MenstrualService.getCycleStatistics()', () => {
  it('returns bd018Compliant:true', () => {
    const r = makeService().getCycleStatistics();
    expect(r.bd018Compliant).toBe(true);
    expect(r.generatedAt).toBeTruthy();
  });
});

describe('MenstrualService.estimateNextCycle()', () => {
  it('returns wave1Stub:true', () => {
    expect(makeService().estimateNextCycle().wave1Stub).toBe(true);
  });
});

describe('MenstrualService.toNetworkSignals()', () => {
  it('returns an array', () => {
    expect(Array.isArray(makeService().toNetworkSignals())).toBe(true);
  });
  it('each signal has signalType MENSTRUAL', () => {
    const svc = makeService();
    svc.create({ cycleDay: 1, phase: 'MENSTRUAL' });
    const signals = svc.toNetworkSignals();
    for (const s of signals) expect(s.signalType).toBe('MENSTRUAL');
  });
});

describe('MenstrualService.getMenstrualRegScore()', () => {
  it('returns a number in [0, 1]', () => {
    const score = makeService().getMenstrualRegScore();
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
