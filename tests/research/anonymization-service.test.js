// tests/research/anonymization-service.test.js
// Anonymization Service — PR-040
import { describe, it, expect } from 'vitest';
import { AnonymizationService } from '../../src/domains/research/anonymization-service.js';
import { ANONYMIZATION_LEVEL, K_ANONYMITY_MIN_K } from '../../src/domains/research/research-dataset-types.js';

const svc = new AnonymizationService();

describe('removePersonalIdentifiers', () => {
  it('removes userId, recordId, email, name, deviceId', () => {
    const records = [{ userId: 'u1', recordId: 'r1', email: 'x@x.com', name: 'Alice', deviceId: 'd1', signalType: 'MOOD' }];
    const cleaned = svc.removePersonalIdentifiers(records);
    expect(cleaned[0].userId).toBeUndefined();
    expect(cleaned[0].recordId).toBeUndefined();
    expect(cleaned[0].email).toBeUndefined();
    expect(cleaned[0].name).toBeUndefined();
    expect(cleaned[0].deviceId).toBeUndefined();
    expect(cleaned[0].signalType).toBe('MOOD');
  });

  it('does not mutate originals', () => {
    const original = { userId: 'u1', signalType: 'PAIN' };
    svc.removePersonalIdentifiers([original]);
    expect(original.userId).toBe('u1'); // unchanged
  });

  it('throws on non-array', () => {
    expect(() => svc.removePersonalIdentifiers('oops')).toThrow();
  });
});

describe('applyKAnonymity', () => {
  function makeSignals(signalType, count) {
    return Array.from({ length: count }, (_, i) => ({ id: `s${i}`, signalType }));
  }

  it('passes groups with count >= k', () => {
    const records = makeSignals('MOOD', K_ANONYMITY_MIN_K);
    const { anonymized, suppressed } = svc.applyKAnonymity(records, K_ANONYMITY_MIN_K);
    expect(anonymized).toHaveLength(K_ANONYMITY_MIN_K);
    expect(suppressed).toBe(0);
  });

  it('suppresses groups with count < k', () => {
    const records = makeSignals('PAIN', 2); // 2 < 5
    const { anonymized, suppressed } = svc.applyKAnonymity(records, 5);
    expect(anonymized).toHaveLength(0);
    expect(suppressed).toBe(2);
  });

  it('mixed groups', () => {
    const mood  = makeSignals('MOOD', 6);
    const pain  = makeSignals('PAIN', 3); // < k
    const { anonymized, suppressed } = svc.applyKAnonymity([...mood, ...pain], 5);
    expect(anonymized).toHaveLength(6);
    expect(suppressed).toBe(3);
  });

  it('throws when k < 5', () => {
    expect(() => svc.applyKAnonymity([], 4)).toThrow();
  });

  it('throws on non-array', () => {
    expect(() => svc.applyKAnonymity('bad', 5)).toThrow();
  });
});

describe('verifyAnonymous', () => {
  it('passes clean records', () => {
    const { verified, violations } = svc.verifyAnonymous([{ signalType: 'MOOD', value: 0.8 }]);
    expect(verified).toBe(true);
    expect(violations).toHaveLength(0);
  });

  it('detects remaining personal fields', () => {
    const { verified, violations } = svc.verifyAnonymous([{ userId: 'u1', signalType: 'MOOD' }]);
    expect(verified).toBe(false);
    expect(violations.length).toBeGreaterThan(0);
  });
});

describe('getAnonymizationReport', () => {
  it('includes generatedAt', () => {
    const r = svc.getAnonymizationReport({ original: [], anonymized: [], suppressed: 0, level: ANONYMIZATION_LEVEL.NONE });
    expect(r.generatedAt).toBeTruthy();
  });

  it('computes retentionRate', () => {
    const original   = [1, 2, 3, 4, 5].map(i => ({ id: `s${i}`, signalType: 'MOOD' }));
    const anonymized = original.slice(0, 4);
    const r = svc.getAnonymizationReport({ original, anonymized, suppressed: 1, level: ANONYMIZATION_LEVEL.K_ANONYMITY });
    expect(r.retentionRate).toBeCloseTo(0.8);
    expect(r.originalCount).toBe(5);
    expect(r.anonymizedCount).toBe(4);
  });

  it('is frozen', () => {
    const r = svc.getAnonymizationReport({ original: [], anonymized: [], suppressed: 0, level: ANONYMIZATION_LEVEL.NONE });
    expect(Object.isFrozen(r)).toBe(true);
  });
});
