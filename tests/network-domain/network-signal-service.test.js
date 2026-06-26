// tests/network-domain/network-signal-service.test.js
// NetworkSignalService (PR-030)
import { describe, it, expect, beforeEach } from 'vitest';
import { NetworkSignalService }    from '../../src/domains/network/network-signal-service.js';
import { NetworkSignalValidator }  from '../../src/domains/network/network-signal-validator.js';
import { NetworkSignalRepository } from '../../src/domains/network/network-signal-repository.js';
import { SIGNAL_TYPES, VECTOR_VERSION } from '../../src/domains/network/network-signal-types.js';

function makeSvc() {
  return new NetworkSignalService({
    validator:  new NetworkSignalValidator(),
    repository: new NetworkSignalRepository(),
  });
}

const VALID_SIGNAL = {
  signalType:      'SYMPTOM',
  normalizedValue: 0.6,
  rawValue:        6,
  unit:            'severity_0_10',
};

describe('NetworkSignalService.validateSignal', () => {
  it('returns { valid: true } for valid input', () => {
    expect(makeSvc().validateSignal(VALID_SIGNAL).valid).toBe(true);
  });

  it('returns { valid: false } for missing signalType', () => {
    expect(makeSvc().validateSignal({ ...VALID_SIGNAL, signalType: undefined }).valid).toBe(false);
  });

  it('returns { valid: false } for out-of-range normalizedValue', () => {
    expect(makeSvc().validateSignal({ ...VALID_SIGNAL, normalizedValue: 2 }).valid).toBe(false);
  });
});

describe('NetworkSignalService.createSignal', () => {
  it('returns a frozen NetworkSignal', () => {
    const s = makeSvc().createSignal(VALID_SIGNAL);
    expect(Object.isFrozen(s)).toBe(true);
  });

  it('signal has correct fields', () => {
    const s = makeSvc().createSignal(VALID_SIGNAL);
    expect(s.signalType).toBe('SYMPTOM');
    expect(s.normalizedValue).toBe(0.6);
    expect(s.rawValue).toBe(6);
    expect(s.vectorVersion).toBe(VECTOR_VERSION);
  });

  it('throws on invalid input', () => {
    expect(() => makeSvc().createSignal({ signalType: 'UNKNOWN' })).toThrow('[NetworkSignalService]');
  });
});

describe('NetworkSignalService.listSignals', () => {
  it('returns [] when empty', () => {
    expect(makeSvc().listSignals()).toHaveLength(0);
  });

  it('returns all created signals', () => {
    const svc = makeSvc();
    svc.createSignal(VALID_SIGNAL);
    svc.createSignal({ ...VALID_SIGNAL, signalType: 'PAIN', unit: 'pain_level_0_10' });
    expect(svc.listSignals()).toHaveLength(2);
  });
});

describe('NetworkSignalService.listByRecord', () => {
  it('returns signals for a specific record', () => {
    const svc = makeSvc();
    svc.createSignal({ ...VALID_SIGNAL, recordId: 'rec_A' });
    svc.createSignal({ ...VALID_SIGNAL, recordId: 'rec_B' });
    expect(svc.listByRecord('rec_A')).toHaveLength(1);
    expect(svc.listByRecord('rec_B')).toHaveLength(1);
  });

  it('throws if recordId is not a string', () => {
    expect(() => makeSvc().listByRecord(null)).toThrow('[NetworkSignalService]');
  });
});

describe('NetworkSignalService.listByType', () => {
  it('returns signals of a specific type', () => {
    const svc = makeSvc();
    svc.createSignal({ ...VALID_SIGNAL, signalType: 'SYMPTOM' });
    svc.createSignal({ ...VALID_SIGNAL, signalType: 'PAIN', unit: 'pain_level_0_10' });
    expect(svc.listByType('SYMPTOM')).toHaveLength(1);
    expect(svc.listByType('PAIN')).toHaveLength(1);
    expect(svc.listByType('SLEEP')).toHaveLength(0);
  });

  it('throws for unknown signal type', () => {
    expect(() => makeSvc().listByType('INVALID')).toThrow('[NetworkSignalService]');
  });
});

describe('NetworkSignalService.generateFromRecord', () => {
  it('returns [] for null record', () => {
    expect(makeSvc().generateFromRecord(null)).toHaveLength(0);
  });

  it('returns [] for record with no signal fields', () => {
    expect(makeSvc().generateFromRecord({ id: 'rec_1' })).toHaveLength(0);
  });

  it('generates SYMPTOM signals from symptoms array', () => {
    const svc = makeSvc();
    const signals = svc.generateFromRecord({
      id:       'rec_1',
      symptoms: [{ category: 'Pain', severity: 7 }, { category: 'Nausea', severity: 3 }],
    });
    expect(signals.filter(s => s.signalType === 'SYMPTOM')).toHaveLength(2);
  });

  it('generates PAIN signal from painLevel', () => {
    const svc = makeSvc();
    const signals = svc.generateFromRecord({ id: 'rec_1', painLevel: 8 });
    const pain = signals.filter(s => s.signalType === 'PAIN');
    expect(pain).toHaveLength(1);
    expect(pain[0].rawValue).toBe(8);
    expect(pain[0].normalizedValue).toBeCloseTo(0.8);
  });

  it('generates SLEEP signal from sleepBed/sleepWake', () => {
    const svc = makeSvc();
    const signals = svc.generateFromRecord({
      id:        'rec_1',
      sleepBed:  '2026-01-01T22:00:00.000Z',
      sleepWake: '2026-01-02T06:00:00.000Z',
    });
    const sleep = signals.filter(s => s.signalType === 'SLEEP');
    expect(sleep).toHaveLength(1);
    expect(sleep[0].rawValue).toBeCloseTo(8);
    expect(sleep[0].normalizedValue).toBeCloseTo(1.0);
  });

  it('does NOT generate SLEEP signal if sleepWake <= sleepBed', () => {
    const svc = makeSvc();
    const signals = svc.generateFromRecord({
      id:        'rec_1',
      sleepBed:  '2026-01-01T06:00:00.000Z',
      sleepWake: '2026-01-01T05:00:00.000Z',
    });
    expect(signals.filter(s => s.signalType === 'SLEEP')).toHaveLength(0);
  });

  it('generates EXPOSURE signal from foods array', () => {
    const svc = makeSvc();
    const signals = svc.generateFromRecord({ id: 'rec_1', foods: ['salad', 'tofu', 'miso'] });
    const exposure = signals.filter(s => s.signalType === 'EXPOSURE');
    expect(exposure).toHaveLength(1);
    expect(exposure[0].rawValue).toBe(3);
    expect(exposure[0].metadata.exposureType).toBe('FOOD');
  });

  it('generates MENSTRUAL signal from menstrualFlow', () => {
    const svc = makeSvc();
    const signals = svc.generateFromRecord({ id: 'rec_1', menstrualFlow: 2 });
    const menstrual = signals.filter(s => s.signalType === 'MENSTRUAL');
    expect(menstrual).toHaveLength(1);
    expect(menstrual[0].rawValue).toBe(2);
  });

  it('stores generated signals in repository', () => {
    const svc = makeSvc();
    svc.generateFromRecord({ id: 'rec_1', painLevel: 5, symptoms: [{ category: 'Pain', severity: 5 }] });
    expect(svc.listSignals().length).toBeGreaterThanOrEqual(2);
  });

  it('associates signals with recordId', () => {
    const svc = makeSvc();
    svc.generateFromRecord({ id: 'rec_999', painLevel: 4 });
    const byRecord = svc.listByRecord('rec_999');
    expect(byRecord).toHaveLength(1);
    expect(byRecord[0].signalType).toBe('PAIN');
  });

  it('does NOT generate EMOTION signals (Wave2)', () => {
    const svc = makeSvc();
    svc.generateFromRecord({ id: 'rec_1', mood: 8 });
    expect(svc.listByType('EMOTION')).toHaveLength(0);
  });
});

describe('NetworkSignalService — registry methods', () => {
  it('getSignalTypes returns 6 values', () => {
    const { values } = makeSvc().getSignalTypes();
    expect(values).toHaveLength(6);
    expect(values).toContain('SYMPTOM');
    expect(values).toContain('EXPOSURE');
  });

  it('getMenstrualPhases returns 5 values', () => {
    const { values } = makeSvc().getMenstrualPhases();
    expect(values).toHaveLength(5);
    expect(values).toContain('UNKNOWN');
  });

  it('getVectorVersion returns "1"', () => {
    expect(makeSvc().getVectorVersion()).toBe('1');
  });
});
