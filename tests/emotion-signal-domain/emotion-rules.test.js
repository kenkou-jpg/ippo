// tests/emotion-signal-domain/emotion-rules.test.js
// PR-043: Emotion Rule Engine — boundary, determinism, and completeness tests.
import { describe, it, expect } from 'vitest';
import {
  applyMoodRule,
  applyFatigueRule,
  applyStressRule,
  applyMotivationRule,
  applyAllEmotionRules,
  EMOTION_SIGNAL_SUBTYPES,
} from '../../src/domains/network/emotion-rules.js';
import { SIGNAL_TYPES, SIGNAL_UNITS } from '../../src/domains/network/network-signal-types.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeRecord = (fields = {}) => ({ ...fields });

// ── MOOD Rule ─────────────────────────────────────────────────────────────────

describe('applyMoodRule — boundary conditions', () => {
  it('returns null when moodScore is absent', () => {
    expect(applyMoodRule(makeRecord(), 'r1', '2026-01-01T00:00:00Z')).toBeNull();
  });

  it('returns null when moodScore is null', () => {
    expect(applyMoodRule(makeRecord({ moodScore: null }), 'r1', '2026-01-01T00:00:00Z')).toBeNull();
  });

  it('returns null when moodScore is non-numeric string', () => {
    expect(applyMoodRule(makeRecord({ moodScore: 'high' }), 'r1', '2026-01-01T00:00:00Z')).toBeNull();
  });

  it('returns null when moodScore < 0', () => {
    expect(applyMoodRule(makeRecord({ moodScore: -1 }), 'r1', '2026-01-01T00:00:00Z')).toBeNull();
  });

  it('returns null when moodScore > 10', () => {
    expect(applyMoodRule(makeRecord({ moodScore: 11 }), 'r1', '2026-01-01T00:00:00Z')).toBeNull();
  });

  it('accepts moodScore = 0 (minimum boundary)', () => {
    const result = applyMoodRule(makeRecord({ moodScore: 0 }), 'r1', '2026-01-01T00:00:00Z');
    expect(result).not.toBeNull();
    expect(result.rawValue).toBe(0);
    expect(result.normalizedValue).toBe(0);
  });

  it('accepts moodScore = 10 (maximum boundary)', () => {
    const result = applyMoodRule(makeRecord({ moodScore: 10 }), 'r1', '2026-01-01T00:00:00Z');
    expect(result).not.toBeNull();
    expect(result.rawValue).toBe(10);
    expect(result.normalizedValue).toBe(1);
  });

  it('normalizes mid-range value correctly (5 → 0.5)', () => {
    const result = applyMoodRule(makeRecord({ moodScore: 5 }), 'r1', '2026-01-01T00:00:00Z');
    expect(result.normalizedValue).toBe(0.5);
  });

  it('classifies POSITIVE when moodScore >= 7', () => {
    const r7  = applyMoodRule(makeRecord({ moodScore: 7 }), 'r1', 't');
    const r10 = applyMoodRule(makeRecord({ moodScore: 10 }), 'r1', 't');
    expect(r7.metadata.category).toBe('POSITIVE');
    expect(r10.metadata.category).toBe('POSITIVE');
  });

  it('classifies NEUTRAL when 4 <= moodScore < 7', () => {
    const r4 = applyMoodRule(makeRecord({ moodScore: 4 }), 'r1', 't');
    const r6 = applyMoodRule(makeRecord({ moodScore: 6 }), 'r1', 't');
    expect(r4.metadata.category).toBe('NEUTRAL');
    expect(r6.metadata.category).toBe('NEUTRAL');
  });

  it('classifies NEGATIVE when moodScore < 4', () => {
    const r0 = applyMoodRule(makeRecord({ moodScore: 0 }), 'r1', 't');
    const r3 = applyMoodRule(makeRecord({ moodScore: 3 }), 'r1', 't');
    expect(r0.metadata.category).toBe('NEGATIVE');
    expect(r3.metadata.category).toBe('NEGATIVE');
  });

  it('sets correct signalType, unit, and subType', () => {
    const result = applyMoodRule(makeRecord({ moodScore: 5 }), 'r1', 't');
    expect(result.signalType).toBe(SIGNAL_TYPES.EMOTION);
    expect(result.unit).toBe(SIGNAL_UNITS.EMOTION);
    expect(result.metadata.subType).toBe(EMOTION_SIGNAL_SUBTYPES.MOOD);
    expect(result.metadata.source).toBe('RULE_ENGINE');
  });

  it('is deterministic — same input always yields same output', () => {
    const r1 = applyMoodRule(makeRecord({ moodScore: 7 }), 'r1', 't');
    const r2 = applyMoodRule(makeRecord({ moodScore: 7 }), 'r1', 't');
    expect(r1).toEqual(r2);
  });
});

// ── FATIGUE Rule ──────────────────────────────────────────────────────────────

describe('applyFatigueRule — boundary conditions', () => {
  it('returns null when fatigueLevel is absent', () => {
    expect(applyFatigueRule(makeRecord(), 'r1', 't')).toBeNull();
  });

  it('returns null for non-numeric fatigueLevel', () => {
    expect(applyFatigueRule(makeRecord({ fatigueLevel: 'high' }), 'r1', 't')).toBeNull();
  });

  it('returns null when fatigueLevel out of range', () => {
    expect(applyFatigueRule(makeRecord({ fatigueLevel: -0.1 }), 'r1', 't')).toBeNull();
    expect(applyFatigueRule(makeRecord({ fatigueLevel: 10.1 }), 'r1', 't')).toBeNull();
  });

  it('classifies HIGH when fatigueLevel >= 7', () => {
    expect(applyFatigueRule(makeRecord({ fatigueLevel: 7 }), 'r1', 't').metadata.category).toBe('HIGH');
    expect(applyFatigueRule(makeRecord({ fatigueLevel: 10 }), 'r1', 't').metadata.category).toBe('HIGH');
  });

  it('classifies MEDIUM when 4 <= fatigueLevel < 7', () => {
    expect(applyFatigueRule(makeRecord({ fatigueLevel: 4 }), 'r1', 't').metadata.category).toBe('MEDIUM');
    expect(applyFatigueRule(makeRecord({ fatigueLevel: 6 }), 'r1', 't').metadata.category).toBe('MEDIUM');
  });

  it('classifies LOW when fatigueLevel < 4', () => {
    expect(applyFatigueRule(makeRecord({ fatigueLevel: 0 }), 'r1', 't').metadata.category).toBe('LOW');
    expect(applyFatigueRule(makeRecord({ fatigueLevel: 3 }), 'r1', 't').metadata.category).toBe('LOW');
  });

  it('sets FATIGUE subType', () => {
    const r = applyFatigueRule(makeRecord({ fatigueLevel: 5 }), 'r1', 't');
    expect(r.metadata.subType).toBe(EMOTION_SIGNAL_SUBTYPES.FATIGUE);
  });

  it('normalizes boundary values correctly', () => {
    expect(applyFatigueRule(makeRecord({ fatigueLevel: 0 }), 'r1', 't').normalizedValue).toBe(0);
    expect(applyFatigueRule(makeRecord({ fatigueLevel: 10 }), 'r1', 't').normalizedValue).toBe(1);
  });
});

// ── STRESS Rule ───────────────────────────────────────────────────────────────

describe('applyStressRule — boundary conditions', () => {
  it('returns null when stressLevel is absent', () => {
    expect(applyStressRule(makeRecord(), 'r1', 't')).toBeNull();
  });

  it('classifies HIGH when stressLevel >= 7', () => {
    expect(applyStressRule(makeRecord({ stressLevel: 7 }), 'r1', 't').metadata.category).toBe('HIGH');
    expect(applyStressRule(makeRecord({ stressLevel: 10 }), 'r1', 't').metadata.category).toBe('HIGH');
  });

  it('classifies MODERATE when 4 <= stressLevel < 7', () => {
    expect(applyStressRule(makeRecord({ stressLevel: 4 }), 'r1', 't').metadata.category).toBe('MODERATE');
    expect(applyStressRule(makeRecord({ stressLevel: 6 }), 'r1', 't').metadata.category).toBe('MODERATE');
  });

  it('classifies LOW when stressLevel < 4', () => {
    expect(applyStressRule(makeRecord({ stressLevel: 0 }), 'r1', 't').metadata.category).toBe('LOW');
    expect(applyStressRule(makeRecord({ stressLevel: 3 }), 'r1', 't').metadata.category).toBe('LOW');
  });

  it('sets STRESS subType and RULE_ENGINE source', () => {
    const r = applyStressRule(makeRecord({ stressLevel: 5 }), 'r1', 't');
    expect(r.metadata.subType).toBe(EMOTION_SIGNAL_SUBTYPES.STRESS);
    expect(r.metadata.source).toBe('RULE_ENGINE');
  });

  it('is deterministic', () => {
    const a = applyStressRule(makeRecord({ stressLevel: 8 }), 'r1', 't');
    const b = applyStressRule(makeRecord({ stressLevel: 8 }), 'r1', 't');
    expect(a).toEqual(b);
  });
});

// ── MOTIVATION Rule ───────────────────────────────────────────────────────────

describe('applyMotivationRule — boundary conditions', () => {
  it('returns null when motivationScore is absent', () => {
    expect(applyMotivationRule(makeRecord(), 'r1', 't')).toBeNull();
  });

  it('classifies HIGH when motivationScore >= 7', () => {
    expect(applyMotivationRule(makeRecord({ motivationScore: 7 }), 'r1', 't').metadata.category).toBe('HIGH');
  });

  it('classifies MODERATE when 4 <= motivationScore < 7', () => {
    expect(applyMotivationRule(makeRecord({ motivationScore: 4 }), 'r1', 't').metadata.category).toBe('MODERATE');
    expect(applyMotivationRule(makeRecord({ motivationScore: 6 }), 'r1', 't').metadata.category).toBe('MODERATE');
  });

  it('classifies LOW when motivationScore < 4', () => {
    expect(applyMotivationRule(makeRecord({ motivationScore: 2 }), 'r1', 't').metadata.category).toBe('LOW');
  });

  it('sets MOTIVATION subType', () => {
    const r = applyMotivationRule(makeRecord({ motivationScore: 5 }), 'r1', 't');
    expect(r.metadata.subType).toBe(EMOTION_SIGNAL_SUBTYPES.MOTIVATION);
  });

  it('normalizes 5 → 0.5', () => {
    const r = applyMotivationRule(makeRecord({ motivationScore: 5 }), 'r1', 't');
    expect(r.normalizedValue).toBe(0.5);
  });
});

// ── applyAllEmotionRules ──────────────────────────────────────────────────────

describe('applyAllEmotionRules — composite', () => {
  it('returns empty array for record with no emotion fields', () => {
    expect(applyAllEmotionRules({})).toEqual([]);
  });

  it('returns one signal when only moodScore is present', () => {
    const results = applyAllEmotionRules({ moodScore: 5 });
    expect(results).toHaveLength(1);
    expect(results[0].metadata.subType).toBe(EMOTION_SIGNAL_SUBTYPES.MOOD);
  });

  it('returns four signals when all fields are present', () => {
    const record = { moodScore: 7, fatigueLevel: 3, stressLevel: 8, motivationScore: 6 };
    const results = applyAllEmotionRules(record);
    expect(results).toHaveLength(4);
    const subTypes = results.map(r => r.metadata.subType);
    expect(subTypes).toContain(EMOTION_SIGNAL_SUBTYPES.MOOD);
    expect(subTypes).toContain(EMOTION_SIGNAL_SUBTYPES.FATIGUE);
    expect(subTypes).toContain(EMOTION_SIGNAL_SUBTYPES.STRESS);
    expect(subTypes).toContain(EMOTION_SIGNAL_SUBTYPES.MOTIVATION);
  });

  it('applies context.recordId and context.timestamp to each signal', () => {
    const record = { moodScore: 5, fatigueLevel: 5 };
    const results = applyAllEmotionRules(record, { recordId: 'rec_99', timestamp: '2026-06-27T12:00:00Z' });
    for (const r of results) {
      expect(r.recordId).toBe('rec_99');
      expect(r.timestamp).toBe('2026-06-27T12:00:00Z');
    }
  });

  it('propagates menstrualPhase context', () => {
    const record = { moodScore: 5 };
    const results = applyAllEmotionRules(record, { menstrualPhase: 'LUTEAL' });
    expect(results[0].menstrualPhase).toBe('LUTEAL');
  });

  it('is deterministic across multiple invocations', () => {
    const record = { moodScore: 6, stressLevel: 4 };
    const r1 = applyAllEmotionRules(record, { recordId: 'r', timestamp: 't' });
    const r2 = applyAllEmotionRules(record, { recordId: 'r', timestamp: 't' });
    expect(r1).toEqual(r2);
  });

  it('handles null record gracefully (returns empty)', () => {
    expect(applyAllEmotionRules(null)).toEqual([]);
  });

  it('filters out out-of-range fields silently', () => {
    const record = { moodScore: -5, fatigueLevel: 5 };
    const results = applyAllEmotionRules(record);
    expect(results).toHaveLength(1);
    expect(results[0].metadata.subType).toBe(EMOTION_SIGNAL_SUBTYPES.FATIGUE);
  });
});

// ── EMOTION_SIGNAL_SUBTYPES registry ─────────────────────────────────────────

describe('EMOTION_SIGNAL_SUBTYPES', () => {
  it('exports all four sub-types', () => {
    expect(EMOTION_SIGNAL_SUBTYPES.MOOD).toBe('MOOD');
    expect(EMOTION_SIGNAL_SUBTYPES.FATIGUE).toBe('FATIGUE');
    expect(EMOTION_SIGNAL_SUBTYPES.STRESS).toBe('STRESS');
    expect(EMOTION_SIGNAL_SUBTYPES.MOTIVATION).toBe('MOTIVATION');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(EMOTION_SIGNAL_SUBTYPES)).toBe(true);
  });
});
