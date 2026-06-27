// tests/menstrual-domain/menstrual-validator.test.js
// MenstrualValidator — full error-collecting, PR-039
import { describe, it, expect } from 'vitest';
import { validateMenstrual } from '../../src/domains/menstrual/menstrual-validator.js';

describe('validateMenstrual — valid input', () => {
  it('returns valid:true for minimal input', () => {
    expect(validateMenstrual({ cycleDay: 1 }).valid).toBe(true);
  });
  it('returns empty errors for valid input', () => {
    expect(validateMenstrual({ cycleDay: 5 }).errors).toHaveLength(0);
  });
  it('accepts all optional fields', () => {
    const r = validateMenstrual({
      cycleDay: 3, phase: 'MENSTRUAL', flow: 'MEDIUM', painLevel: 'LOW',
      symptoms: ['cramps'], recordId: 'r1', startedAt: new Date().toISOString(),
    });
    expect(r.valid).toBe(true);
  });
  it('accepts endedAt null', () => {
    expect(validateMenstrual({ cycleDay: 1, endedAt: null }).valid).toBe(true);
  });
});

describe('validateMenstrual — errors', () => {
  it('returns valid:false when cycleDay missing', () => {
    expect(validateMenstrual({}).valid).toBe(false);
    expect(validateMenstrual({}).errors).toContain('cycleDay is required');
  });
  it('flags cycleDay 0', () => {
    expect(validateMenstrual({ cycleDay: 0 }).valid).toBe(false);
  });
  it('flags float cycleDay', () => {
    expect(validateMenstrual({ cycleDay: 1.5 }).valid).toBe(false);
  });
  it('flags unknown phase', () => {
    const r = validateMenstrual({ cycleDay: 1, phase: 'SUPER' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('phase'))).toBe(true);
  });
  it('flags unknown flow', () => {
    const r = validateMenstrual({ cycleDay: 1, flow: 'FLOOD' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('flow'))).toBe(true);
  });
  it('flags unknown painLevel', () => {
    const r = validateMenstrual({ cycleDay: 1, painLevel: 'EXTREME' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('painLevel'))).toBe(true);
  });
  it('flags non-array symptoms', () => {
    const r = validateMenstrual({ cycleDay: 1, symptoms: 'cramps' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('symptoms'))).toBe(true);
  });
  it('flags non-string recordId', () => {
    const r = validateMenstrual({ cycleDay: 1, recordId: 42 });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('recordId'))).toBe(true);
  });
  it('flags invalid startedAt', () => {
    const r = validateMenstrual({ cycleDay: 1, startedAt: 'not-a-date' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('startedAt'))).toBe(true);
  });
  it('flags invalid endedAt', () => {
    const r = validateMenstrual({ cycleDay: 1, endedAt: 'not-a-date' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('endedAt'))).toBe(true);
  });
  it('collects multiple errors', () => {
    const r = validateMenstrual({ phase: 'BAD', flow: 'BAD' });
    expect(r.errors.length).toBeGreaterThan(1);
  });
  it('returns error for non-object', () => {
    expect(validateMenstrual(null).valid).toBe(false);
    expect(validateMenstrual('string').valid).toBe(false);
  });
});
