// tests/menstrual-domain/menstrual-types.test.js
// Menstrual Types SSOT — PR-039
import { describe, it, expect } from 'vitest';
import {
  MENSTRUAL_PHASES, FLOW_LEVEL, PAIN_LEVEL, CYCLE_STATUS,
  MENSTRUAL_PHASE_VALUES, FLOW_LEVEL_VALUES, PAIN_LEVEL_VALUES, CYCLE_STATUS_VALUES,
  CYCLE_LENGTH_MIN, CYCLE_LENGTH_MAX, CYCLE_LENGTH_TYPICAL, PERIOD_LENGTH_TYPICAL,
} from '../../src/domains/menstrual/menstrual-types.js';

describe('MENSTRUAL_PHASES', () => {
  it('is frozen', () => expect(Object.isFrozen(MENSTRUAL_PHASES)).toBe(true));
  it('has 5 phases', () => expect(Object.keys(MENSTRUAL_PHASES)).toHaveLength(5));
  it('contains MENSTRUAL, FOLLICULAR, OVULATION, LUTEAL, UNKNOWN', () => {
    for (const p of ['MENSTRUAL','FOLLICULAR','OVULATION','LUTEAL','UNKNOWN'])
      expect(MENSTRUAL_PHASES).toHaveProperty(p);
  });
  it('values equal keys', () => {
    for (const [k, v] of Object.entries(MENSTRUAL_PHASES)) expect(v).toBe(k);
  });
});

describe('FLOW_LEVEL', () => {
  it('is frozen', () => expect(Object.isFrozen(FLOW_LEVEL)).toBe(true));
  it('has NONE, LIGHT, MEDIUM, HEAVY, UNKNOWN', () => {
    for (const v of ['NONE','LIGHT','MEDIUM','HEAVY','UNKNOWN'])
      expect(FLOW_LEVEL).toHaveProperty(v);
  });
});

describe('PAIN_LEVEL', () => {
  it('is frozen', () => expect(Object.isFrozen(PAIN_LEVEL)).toBe(true));
  it('has NONE, LOW, MEDIUM, HIGH, UNKNOWN', () => {
    for (const v of ['NONE','LOW','MEDIUM','HIGH','UNKNOWN'])
      expect(PAIN_LEVEL).toHaveProperty(v);
  });
});

describe('CYCLE_STATUS', () => {
  it('is frozen', () => expect(Object.isFrozen(CYCLE_STATUS)).toBe(true));
  it('has REGULAR, IRREGULAR, UNKNOWN', () => {
    for (const v of ['REGULAR','IRREGULAR','UNKNOWN']) expect(CYCLE_STATUS).toHaveProperty(v);
  });
});

describe('Set exports', () => {
  it('MENSTRUAL_PHASE_VALUES is a frozen Set of 5', () => {
    expect(Object.isFrozen(MENSTRUAL_PHASE_VALUES)).toBe(true);
    expect(MENSTRUAL_PHASE_VALUES.size).toBe(5);
  });
  it('FLOW_LEVEL_VALUES is a frozen Set of 5', () => expect(FLOW_LEVEL_VALUES.size).toBe(5));
  it('PAIN_LEVEL_VALUES is a frozen Set of 5', () => expect(PAIN_LEVEL_VALUES.size).toBe(5));
  it('CYCLE_STATUS_VALUES is a frozen Set of 3', () => expect(CYCLE_STATUS_VALUES.size).toBe(3));
});

describe('Constants', () => {
  it('CYCLE_LENGTH_MIN is 21', () => expect(CYCLE_LENGTH_MIN).toBe(21));
  it('CYCLE_LENGTH_MAX is 35', () => expect(CYCLE_LENGTH_MAX).toBe(35));
  it('CYCLE_LENGTH_TYPICAL is 28', () => expect(CYCLE_LENGTH_TYPICAL).toBe(28));
  it('PERIOD_LENGTH_TYPICAL is 5', () => expect(PERIOD_LENGTH_TYPICAL).toBe(5));
});
