// tests/emotion-domain/emotion-validator.test.js
// EmotionValidator — full error-collecting, PR-038
import { describe, it, expect } from 'vitest';
import { validateEmotion } from '../../src/domains/emotion/emotion-validator.js';

describe('validateEmotion — valid input', () => {
  it('returns valid:true for minimal valid input', () => {
    expect(validateEmotion({ emotionType: 'HAPPY' }).valid).toBe(true);
  });
  it('returns empty errors array', () => {
    expect(validateEmotion({ emotionType: 'CALM' }).errors).toHaveLength(0);
  });
  it('accepts all optional fields', () => {
    const r = validateEmotion({
      emotionType: 'NEUTRAL', intensity: 'LOW', source: 'INFERRED',
      note: 'ok', recordId: 'r1', timestamp: new Date().toISOString(),
    });
    expect(r.valid).toBe(true);
  });
});

describe('validateEmotion — error collection', () => {
  it('returns valid:false when emotionType missing', () => {
    expect(validateEmotion({}).valid).toBe(false);
    expect(validateEmotion({}).errors).toContain('emotionType is required');
  });
  it('returns valid:false for unknown emotionType', () => {
    const r = validateEmotion({ emotionType: 'BORED' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('emotionType'))).toBe(true);
  });
  it('collects multiple errors', () => {
    const r = validateEmotion({ emotionType: 'BAD', intensity: 'EXTREME' });
    expect(r.errors.length).toBeGreaterThan(1);
  });
  it('flags unknown intensity', () => {
    const r = validateEmotion({ emotionType: 'HAPPY', intensity: 'EXTREME' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('intensity'))).toBe(true);
  });
  it('flags unknown source', () => {
    const r = validateEmotion({ emotionType: 'HAPPY', source: 'MAGIC' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('source'))).toBe(true);
  });
  it('flags non-string note', () => {
    const r = validateEmotion({ emotionType: 'HAPPY', note: 123 });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('note'))).toBe(true);
  });
  it('flags invalid timestamp', () => {
    const r = validateEmotion({ emotionType: 'HAPPY', timestamp: 'not-a-date' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('timestamp'))).toBe(true);
  });
  it('returns error for non-object input', () => {
    expect(validateEmotion(null).valid).toBe(false);
    expect(validateEmotion('string').valid).toBe(false);
  });
  it('accepts recordId null', () => {
    expect(validateEmotion({ emotionType: 'HAPPY', recordId: null }).valid).toBe(true);
  });
  it('flags non-string recordId', () => {
    const r = validateEmotion({ emotionType: 'HAPPY', recordId: 123 });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('recordId'))).toBe(true);
  });
});
