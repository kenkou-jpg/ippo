// tests/emotion-domain/emotion-signal-mapper.test.js
// EmotionSignalMapper — fixed mapping → NetworkSignal, PR-038
import { describe, it, expect } from 'vitest';
import { EmotionSignalMapper } from '../../src/domains/emotion/emotion-signal-mapper.js';
import { buildEmotion }        from '../../src/domains/emotion/emotion-entity.js';
import { EMOTION_TYPES }       from '../../src/domains/emotion/emotion-types.js';
import { SIGNAL_TYPES }        from '../../src/domains/network/network-signal-types.js';

const mapper = () => new EmotionSignalMapper();

function makeEmo(emotionType, recordId = null) {
  return buildEmotion({ emotionType, recordId });
}

describe('EmotionSignalMapper.toNetworkSignal()', () => {
  it('returns a frozen NetworkSignal', () => {
    expect(Object.isFrozen(mapper().toNetworkSignal(makeEmo('HAPPY')))).toBe(true);
  });
  it('signalType is EMOTION', () => {
    expect(mapper().toNetworkSignal(makeEmo('HAPPY')).signalType).toBe(SIGNAL_TYPES.EMOTION);
  });
  it('HAPPY has normalizedValue 0.9', () => {
    expect(mapper().toNetworkSignal(makeEmo('HAPPY')).normalizedValue).toBe(0.9);
  });
  it('ANXIOUS has normalizedValue 0.2', () => {
    expect(mapper().toNetworkSignal(makeEmo('ANXIOUS')).normalizedValue).toBe(0.2);
  });
  it('NEUTRAL has normalizedValue 0.5', () => {
    expect(mapper().toNetworkSignal(makeEmo('NEUTRAL')).normalizedValue).toBe(0.5);
  });
  it('SAD has normalizedValue 0.15', () => {
    expect(mapper().toNetworkSignal(makeEmo('SAD')).normalizedValue).toBe(0.15);
  });
  it('CALM has normalizedValue 0.8', () => {
    expect(mapper().toNetworkSignal(makeEmo('CALM')).normalizedValue).toBe(0.8);
  });
  it('passes recordId through', () => {
    const sig = mapper().toNetworkSignal(makeEmo('HAPPY', 'r1'));
    expect(sig.recordId).toBe('r1');
  });
  it('metadata contains emotionType', () => {
    const sig = mapper().toNetworkSignal(makeEmo('TIRED'));
    expect(sig.metadata.emotionType).toBe('TIRED');
  });
  it('metadata contains emotionId', () => {
    const emo = makeEmo('CALM');
    expect(mapper().toNetworkSignal(emo).metadata.emotionId).toBe(emo.id);
  });
  it('normalizedValue is in [0,1]', () => {
    for (const t of Object.values(EMOTION_TYPES)) {
      const v = mapper().toNetworkSignal(makeEmo(t)).normalizedValue;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
  it('throws when emotionType is missing', () => {
    expect(() => mapper().toNetworkSignal({ id: 'x' })).toThrow(/emotionType is required/);
  });
});

describe('EmotionSignalMapper.toNetworkSignals()', () => {
  it('maps array of emotions', () => {
    const sigs = mapper().toNetworkSignals([makeEmo('HAPPY'), makeEmo('SAD')]);
    expect(sigs).toHaveLength(2);
    expect(sigs.every(s => s.signalType === SIGNAL_TYPES.EMOTION)).toBe(true);
  });
  it('returns [] for empty array', () => {
    expect(mapper().toNetworkSignals([])).toEqual([]);
  });
  it('throws for non-array input', () => {
    expect(() => mapper().toNetworkSignals('bad')).toThrow(/array/);
  });
});

describe('EmotionSignalMapper.getNormalizedValue()', () => {
  it('returns correct value for ENERGETIC', () => {
    expect(mapper().getNormalizedValue('ENERGETIC')).toBe(0.85);
  });
  it('returns 0.5 for unknown type', () => {
    expect(mapper().getNormalizedValue('UNKNOWN_TYPE')).toBe(0.5);
  });
});

describe('EmotionSignalMapper.mappingTable', () => {
  it('is frozen', () => expect(Object.isFrozen(mapper().mappingTable)).toBe(true));
  it('has entry for all 10 emotion types', () => {
    const table = mapper().mappingTable;
    for (const t of Object.values(EMOTION_TYPES)) expect(table).toHaveProperty(t);
  });
});
