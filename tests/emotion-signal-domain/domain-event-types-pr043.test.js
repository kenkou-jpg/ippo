// tests/emotion-signal-domain/domain-event-types-pr043.test.js
// PR-043: EMOTION_SIGNAL_GENERATED event and EMOTION aggregate type.
import { describe, it, expect } from 'vitest';
import {
  DOMAIN_EVENT_TYPES,
  DOMAIN_EVENT_TYPE_SET,
  AGGREGATE_TYPES,
} from '../../src/domains/events/domain-event-types.js';

describe('DOMAIN_EVENT_TYPES — PR-043 addition', () => {
  it('contains EMOTION_SIGNAL_GENERATED', () => {
    expect(DOMAIN_EVENT_TYPES.EMOTION_SIGNAL_GENERATED).toBe('EMOTION_SIGNAL_GENERATED');
  });

  it('EMOTION_SIGNAL_GENERATED is in the type set', () => {
    expect(DOMAIN_EVENT_TYPE_SET.has('EMOTION_SIGNAL_GENERATED')).toBe(true);
  });

  it('preserves all pre-existing event types', () => {
    const preExisting = [
      'RECORD_CREATED', 'RECORD_UPDATED', 'SIGNAL_CREATED', 'SIGNAL_SNAPSHOT_CREATED',
      'LONGITUDINAL_SNAPSHOT_CREATED', 'DISEASE_CREATED', 'DISEASE_UPDATED',
      'DISEASE_SNAPSHOT_CREATED', 'FEATURE_VECTOR_CREATED', 'SIMILARITY_CALCULATED',
      'CONSENT_UPDATED', 'EXPERIMENT_CREATED', 'EMOTION_CREATED', 'MENSTRUAL_RECORDED',
      'RESEARCH_DATASET_CREATED',
    ];
    for (const t of preExisting) {
      expect(DOMAIN_EVENT_TYPES).toHaveProperty(t);
    }
  });

  it('is frozen', () => {
    expect(Object.isFrozen(DOMAIN_EVENT_TYPES)).toBe(true);
  });
});

describe('AGGREGATE_TYPES — PR-043 EMOTION addition', () => {
  it('contains EMOTION aggregate type', () => {
    expect(AGGREGATE_TYPES.EMOTION).toBe('EMOTION');
  });

  it('preserves all pre-existing aggregate types', () => {
    const preExisting = ['RECORD', 'SIGNAL', 'DISEASE', 'SIMILARITY', 'CONSENT', 'EXPERIMENT', 'RESEARCH'];
    for (const t of preExisting) {
      expect(AGGREGATE_TYPES).toHaveProperty(t);
    }
  });

  it('is frozen', () => {
    expect(Object.isFrozen(AGGREGATE_TYPES)).toBe(true);
  });
});
