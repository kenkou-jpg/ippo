// tests/network-domain/network-signal-entity.test.js
// NetworkSignal entity — buildNetworkSignal (PR-030)
import { describe, it, expect } from 'vitest';
import { buildNetworkSignal, SignalTypes, MenstrualPhases } from '../../src/domains/network/network-signal-entity.js';
import { VECTOR_VERSION } from '../../src/domains/network/network-signal-types.js';

const VALID_PARAMS = {
  signalType:      'SYMPTOM',
  normalizedValue: 0.7,
  rawValue:        7,
  unit:            'severity_0_10',
};

describe('buildNetworkSignal — structure', () => {
  it('returns a frozen NetworkSignal', () => {
    const s = buildNetworkSignal(VALID_PARAMS);
    expect(Object.isFrozen(s)).toBe(true);
  });

  it('has all required fields', () => {
    const s = buildNetworkSignal(VALID_PARAMS);
    expect(s.id).toBeTruthy();
    expect(s.signalType).toBe('SYMPTOM');
    expect(s.normalizedValue).toBe(0.7);
    expect(s.rawValue).toBe(7);
    expect(s.unit).toBe('severity_0_10');
    expect(typeof s.timestamp).toBe('string');
    expect(s.vectorVersion).toBe(VECTOR_VERSION);
    expect(s.menstrualPhase).toBe('UNKNOWN');
    expect(typeof s.createdAt).toBe('string');
    expect(s.recordId).toBeNull();
  });

  it('metadata is frozen', () => {
    const s = buildNetworkSignal({ ...VALID_PARAMS, metadata: { category: 'Pain' } });
    expect(Object.isFrozen(s.metadata)).toBe(true);
    expect(s.metadata.category).toBe('Pain');
  });

  it('metadata defaults to frozen {}', () => {
    const s = buildNetworkSignal(VALID_PARAMS);
    expect(Object.isFrozen(s.metadata)).toBe(true);
    expect(Object.keys(s.metadata)).toHaveLength(0);
  });
});

describe('buildNetworkSignal — id uniqueness', () => {
  it('generates unique ids for successive calls', () => {
    const s1 = buildNetworkSignal(VALID_PARAMS);
    const s2 = buildNetworkSignal(VALID_PARAMS);
    expect(s1.id).not.toBe(s2.id);
  });

  it('id starts with ns_', () => {
    expect(buildNetworkSignal(VALID_PARAMS).id).toMatch(/^ns_/);
  });
});

describe('buildNetworkSignal — optional fields', () => {
  it('accepts recordId', () => {
    const s = buildNetworkSignal({ ...VALID_PARAMS, recordId: 'rec_001' });
    expect(s.recordId).toBe('rec_001');
  });

  it('accepts menstrualPhase', () => {
    const s = buildNetworkSignal({ ...VALID_PARAMS, menstrualPhase: 'LUTEAL' });
    expect(s.menstrualPhase).toBe('LUTEAL');
  });

  it('accepts custom timestamp', () => {
    const ts = '2026-01-01T00:00:00.000Z';
    const s  = buildNetworkSignal({ ...VALID_PARAMS, timestamp: ts });
    expect(s.timestamp).toBe(ts);
  });

  it('accepts vectorVersion from VECTOR_VERSION constant', () => {
    const s = buildNetworkSignal(VALID_PARAMS);
    expect(s.vectorVersion).toBe('1');
  });
});

describe('buildNetworkSignal — all 6 signal types accepted', () => {
  for (const type of ['SYMPTOM', 'PAIN', 'MENSTRUAL', 'EMOTION', 'SLEEP', 'EXPOSURE']) {
    it(`accepts signalType ${type}`, () => {
      const s = buildNetworkSignal({ ...VALID_PARAMS, signalType: type });
      expect(s.signalType).toBe(type);
    });
  }
});

describe('SignalTypes / MenstrualPhases re-exports', () => {
  it('SignalTypes is exported from entity', () => {
    expect(SignalTypes.SYMPTOM).toBe('SYMPTOM');
  });

  it('MenstrualPhases is exported from entity', () => {
    expect(MenstrualPhases.UNKNOWN).toBe('UNKNOWN');
  });
});
