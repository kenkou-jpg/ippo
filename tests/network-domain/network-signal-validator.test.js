// tests/network-domain/network-signal-validator.test.js
// NetworkSignalValidator (PR-030)
import { describe, it, expect } from 'vitest';
import { NetworkSignalValidator } from '../../src/domains/network/network-signal-validator.js';
import { VECTOR_VERSION } from '../../src/domains/network/network-signal-types.js';

const VALID = {
  signalType:      'SYMPTOM',
  normalizedValue: 0.7,
  rawValue:        7,
  unit:            'severity_0_10',
};

function validator() { return new NetworkSignalValidator(); }

describe('NetworkSignalValidator — valid input', () => {
  it('returns { valid: true } for minimal valid input', () => {
    expect(validator().validate(VALID).valid).toBe(true);
  });

  it('returns { valid: true } with all optional fields', () => {
    const r = validator().validate({
      ...VALID,
      timestamp:      '2026-01-01T00:00:00.000Z',
      vectorVersion:  VECTOR_VERSION,
      metadata:       { category: 'Pain' },
      menstrualPhase: 'LUTEAL',
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('accepts all 6 signal types', () => {
    for (const type of ['SYMPTOM', 'PAIN', 'MENSTRUAL', 'EMOTION', 'SLEEP', 'EXPOSURE']) {
      expect(validator().validate({ ...VALID, signalType: type }).valid).toBe(true);
    }
  });

  it('accepts all menstrual phases', () => {
    for (const phase of ['MENSTRUAL', 'FOLLICULAR', 'OVULATION', 'LUTEAL', 'UNKNOWN']) {
      expect(validator().validate({ ...VALID, menstrualPhase: phase }).valid).toBe(true);
    }
  });

  it('accepts normalizedValue = 0', () => {
    expect(validator().validate({ ...VALID, normalizedValue: 0 }).valid).toBe(true);
  });

  it('accepts normalizedValue = 1', () => {
    expect(validator().validate({ ...VALID, normalizedValue: 1 }).valid).toBe(true);
  });
});

describe('NetworkSignalValidator — signalType errors', () => {
  it('rejects missing signalType', () => {
    const { valid, errors } = validator().validate({ ...VALID, signalType: undefined });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('signalType is required'))).toBe(true);
  });

  it('rejects unknown signalType', () => {
    const { valid, errors } = validator().validate({ ...VALID, signalType: 'UNKNOWN_TYPE' });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('not in registry'))).toBe(true);
  });
});

describe('NetworkSignalValidator — normalizedValue errors', () => {
  it('rejects missing normalizedValue', () => {
    const { valid } = validator().validate({ ...VALID, normalizedValue: undefined });
    expect(valid).toBe(false);
  });

  it('rejects NaN', () => {
    const { valid } = validator().validate({ ...VALID, normalizedValue: NaN });
    expect(valid).toBe(false);
  });

  it('rejects value < 0', () => {
    const { valid, errors } = validator().validate({ ...VALID, normalizedValue: -0.1 });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('[0, 1]'))).toBe(true);
  });

  it('rejects value > 1', () => {
    const { valid, errors } = validator().validate({ ...VALID, normalizedValue: 1.1 });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('[0, 1]'))).toBe(true);
  });
});

describe('NetworkSignalValidator — rawValue errors', () => {
  it('rejects missing rawValue', () => {
    const { valid } = validator().validate({ ...VALID, rawValue: undefined });
    expect(valid).toBe(false);
  });

  it('rejects non-finite rawValue', () => {
    const { valid } = validator().validate({ ...VALID, rawValue: Infinity });
    expect(valid).toBe(false);
  });
});

describe('NetworkSignalValidator — unit errors', () => {
  it('rejects missing unit', () => {
    const { valid } = validator().validate({ ...VALID, unit: undefined });
    expect(valid).toBe(false);
  });

  it('rejects empty string unit', () => {
    const { valid } = validator().validate({ ...VALID, unit: '' });
    expect(valid).toBe(false);
  });
});

describe('NetworkSignalValidator — optional field errors', () => {
  it('rejects invalid timestamp', () => {
    const { valid, errors } = validator().validate({ ...VALID, timestamp: 'not-a-date' });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('not a valid date'))).toBe(true);
  });

  it('rejects wrong vectorVersion', () => {
    const { valid, errors } = validator().validate({ ...VALID, vectorVersion: '2' });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('not the current version'))).toBe(true);
  });

  it('rejects array as metadata', () => {
    const { valid, errors } = validator().validate({ ...VALID, metadata: [] });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('plain object'))).toBe(true);
  });

  it('rejects unknown menstrualPhase', () => {
    const { valid, errors } = validator().validate({ ...VALID, menstrualPhase: 'WAXING' });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('not in registry'))).toBe(true);
  });

  it('collects multiple errors at once', () => {
    const { errors } = validator().validate({});
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });
});
