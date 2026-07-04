// tests/emotion-domain/emotion-service.test.js
// EmotionService — create / list / statistics / toNetworkSignals, PR-038
import { describe, it, expect, vi } from 'vitest';
import { EmotionService }    from '../../src/domains/emotion/emotion-service.js';
import { EmotionRepository } from '../../src/domains/emotion/emotion-repository.js';
import { EMOTION_TYPES }     from '../../src/domains/emotion/emotion-types.js';
import { SIGNAL_TYPES }      from '../../src/domains/network/network-signal-types.js';

function makeService(eventPublisher = null) {
  return new EmotionService({ repository: new EmotionRepository(), eventPublisher });
}

describe('EmotionService — constructor', () => {
  it('throws when repository is missing', () => {
    expect(() => new EmotionService({})).toThrow(/repository is required/);
  });
});

describe('EmotionService.create()', () => {
  it('returns a frozen emotion entity', () => {
    const e = makeService().create({ emotionType: 'HAPPY' });
    expect(Object.isFrozen(e)).toBe(true);
    expect(e.emotionType).toBe('HAPPY');
  });
  it('persists to repository', () => {
    const svc = makeService();
    svc.create({ emotionType: 'CALM' });
    expect(svc.list()).toHaveLength(1);
  });
  it('throws for invalid emotionType', () => {
    expect(() => makeService().create({ emotionType: 'BORED' })).toThrow(/Validation failed/);
  });
  it('throws when emotionType missing', () => {
    expect(() => makeService().create({})).toThrow(/Validation failed/);
  });
  it('publishes EMOTION_CREATED event when eventPublisher wired', () => {
    const pub = { publish: vi.fn() };
    makeService(pub).create({ emotionType: 'HAPPY' });
    expect(pub.publish).toHaveBeenCalledOnce();
    expect(pub.publish.mock.calls[0][0].eventType).toBe('EMOTION_CREATED');
  });
  it('does not throw when eventPublisher is null', () => {
    expect(() => makeService(null).create({ emotionType: 'CALM' })).not.toThrow();
  });
});

describe('EmotionService.list()', () => {
  it('returns [] initially', () => expect(makeService().list()).toEqual([]));
  it('returns all created emotions', () => {
    const svc = makeService();
    svc.create({ emotionType: 'HAPPY' });
    svc.create({ emotionType: 'SAD' });
    expect(svc.list()).toHaveLength(2);
  });
});

describe('EmotionService.findByRecord()', () => {
  it('throws when recordId is missing', () => {
    expect(() => makeService().findByRecord(undefined)).toThrow(/recordId is required/);
  });
  it('returns emotions for the given recordId', () => {
    const svc = makeService();
    svc.create({ emotionType: 'HAPPY', recordId: 'r1' });
    svc.create({ emotionType: 'SAD',   recordId: 'r2' });
    expect(svc.findByRecord('r1')).toHaveLength(1);
  });
});

describe('EmotionService.findByType()', () => {
  it('throws when emotionType is missing', () => {
    expect(() => makeService().findByType(undefined)).toThrow(/emotionType is required/);
  });
  it('returns emotions of the given type', () => {
    const svc = makeService();
    svc.create({ emotionType: 'HAPPY' });
    svc.create({ emotionType: 'HAPPY' });
    svc.create({ emotionType: 'SAD' });
    expect(svc.findByType('HAPPY')).toHaveLength(2);
  });
});

describe('EmotionService.getEmotionStatistics()', () => {
  it('returns total 0 when no emotions', () => {
    expect(makeService().getEmotionStatistics().total).toBe(0);
  });
  it('returns correct total', () => {
    const svc = makeService();
    svc.create({ emotionType: 'HAPPY' });
    svc.create({ emotionType: 'SAD' });
    expect(svc.getEmotionStatistics().total).toBe(2);
  });
  it('has generatedAt (BD-018)', () => {
    expect(makeService().getEmotionStatistics().generatedAt).toMatch(/^\d{4}/);
  });
  it('has bd018Compliant: true', () => {
    expect(makeService().getEmotionStatistics().bd018Compliant).toBe(true);
  });
  it('byType counts per type', () => {
    const svc = makeService();
    svc.create({ emotionType: 'HAPPY' });
    svc.create({ emotionType: 'HAPPY' });
    svc.create({ emotionType: 'SAD' });
    const s = svc.getEmotionStatistics();
    expect(s.byType.HAPPY).toBe(2);
    expect(s.byType.SAD).toBe(1);
  });
  it('returns dominantType', () => {
    const svc = makeService();
    svc.create({ emotionType: 'ANXIOUS' });
    svc.create({ emotionType: 'ANXIOUS' });
    svc.create({ emotionType: 'HAPPY' });
    expect(svc.getEmotionStatistics().dominantType).toBe('ANXIOUS');
  });
  it('avgNormalizedValue > 0 when emotions exist', () => {
    const svc = makeService();
    svc.create({ emotionType: 'HAPPY' });
    expect(svc.getEmotionStatistics().avgNormalizedValue).toBeGreaterThan(0);
  });
});

describe('EmotionService.toNetworkSignals()', () => {
  it('returns [] when no emotions', () => expect(makeService().toNetworkSignals()).toEqual([]));
  it('converts all emotions to NetworkSignals', () => {
    const svc = makeService();
    svc.create({ emotionType: 'HAPPY' });
    svc.create({ emotionType: 'SAD' });
    const sigs = svc.toNetworkSignals();
    expect(sigs).toHaveLength(2);
    expect(sigs.every(s => s.signalType === SIGNAL_TYPES.EMOTION)).toBe(true);
  });
});

describe('EmotionService.getEmotionScore()', () => {
  it('returns 0 when no emotions', () => expect(makeService().getEmotionScore()).toBe(0));
  it('returns avg normalizedValue', () => {
    const svc = makeService();
    svc.create({ emotionType: 'HAPPY' });  // 0.9
    svc.create({ emotionType: 'NEUTRAL' }); // 0.5
    const score = svc.getEmotionScore();
    expect(score).toBeCloseTo(0.7, 2);
  });
  it('is in [0,1]', () => {
    const svc = makeService();
    for (const t of Object.values(EMOTION_TYPES)) svc.create({ emotionType: t });
    const score = svc.getEmotionScore();
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
