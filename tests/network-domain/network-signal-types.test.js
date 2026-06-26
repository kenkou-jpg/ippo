// tests/network-domain/network-signal-types.test.js
// SSOT registries for Network Signal domain (PR-030)
import { describe, it, expect } from 'vitest';
import {
  SIGNAL_TYPES,
  MENSTRUAL_PHASES,
  SIGNAL_UNITS,
  VECTOR_VERSION,
  SIGNAL_TYPE_VALUES,
  MENSTRUAL_PHASE_VALUES,
} from '../../src/domains/network/network-signal-types.js';

describe('SIGNAL_TYPES', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(SIGNAL_TYPES)).toBe(true);
  });

  it('has exactly 6 signal types', () => {
    expect(Object.keys(SIGNAL_TYPES)).toHaveLength(6);
  });

  it('contains all 6 NAC-01 signal types', () => {
    expect(SIGNAL_TYPES.SYMPTOM).toBe('SYMPTOM');
    expect(SIGNAL_TYPES.PAIN).toBe('PAIN');
    expect(SIGNAL_TYPES.MENSTRUAL).toBe('MENSTRUAL');
    expect(SIGNAL_TYPES.EMOTION).toBe('EMOTION');
    expect(SIGNAL_TYPES.SLEEP).toBe('SLEEP');
    expect(SIGNAL_TYPES.EXPOSURE).toBe('EXPOSURE');
  });
});

describe('MENSTRUAL_PHASES', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(MENSTRUAL_PHASES)).toBe(true);
  });

  it('has exactly 5 phases', () => {
    expect(Object.keys(MENSTRUAL_PHASES)).toHaveLength(5);
  });

  it('contains MENSTRUAL / FOLLICULAR / OVULATION / LUTEAL / UNKNOWN', () => {
    expect(MENSTRUAL_PHASES.MENSTRUAL).toBe('MENSTRUAL');
    expect(MENSTRUAL_PHASES.FOLLICULAR).toBe('FOLLICULAR');
    expect(MENSTRUAL_PHASES.OVULATION).toBe('OVULATION');
    expect(MENSTRUAL_PHASES.LUTEAL).toBe('LUTEAL');
    expect(MENSTRUAL_PHASES.UNKNOWN).toBe('UNKNOWN');
  });
});

describe('SIGNAL_UNITS', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(SIGNAL_UNITS)).toBe(true);
  });

  it('has a unit for each signal type', () => {
    for (const type of Object.values(SIGNAL_TYPES)) {
      expect(SIGNAL_UNITS[type]).toBeTruthy();
    }
  });
});

describe('VECTOR_VERSION', () => {
  it('is "1" for Wave1 (8-dimensional FeatureVector)', () => {
    expect(VECTOR_VERSION).toBe('1');
  });

  it('is a string', () => {
    expect(typeof VECTOR_VERSION).toBe('string');
  });
});

describe('Convenience Sets', () => {
  it('SIGNAL_TYPE_VALUES is frozen Set with 6 entries', () => {
    expect(Object.isFrozen(SIGNAL_TYPE_VALUES)).toBe(true);
    expect(SIGNAL_TYPE_VALUES.size).toBe(6);
  });

  it('SIGNAL_TYPE_VALUES contains all signal type strings', () => {
    for (const v of Object.values(SIGNAL_TYPES)) {
      expect(SIGNAL_TYPE_VALUES.has(v)).toBe(true);
    }
  });

  it('MENSTRUAL_PHASE_VALUES is frozen Set with 5 entries', () => {
    expect(Object.isFrozen(MENSTRUAL_PHASE_VALUES)).toBe(true);
    expect(MENSTRUAL_PHASE_VALUES.size).toBe(5);
  });

  it('MENSTRUAL_PHASE_VALUES contains all phase strings', () => {
    for (const v of Object.values(MENSTRUAL_PHASES)) {
      expect(MENSTRUAL_PHASE_VALUES.has(v)).toBe(true);
    }
  });
});
