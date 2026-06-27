// tests/events-domain/domain-event-types.test.js
// Domain Event Types SSOT — PR-037
import { describe, it, expect } from 'vitest';
import {
  DOMAIN_EVENT_TYPES, DOMAIN_EVENT_TYPE_SET,
  AGGREGATE_TYPES, EVENT_SCHEMA_VERSION,
} from '../../src/domains/events/domain-event-types.js';

describe('DOMAIN_EVENT_TYPES', () => {
  it('is frozen', () => expect(Object.isFrozen(DOMAIN_EVENT_TYPES)).toBe(true));

  it('has exactly 13 event types', () => {
    expect(Object.keys(DOMAIN_EVENT_TYPES)).toHaveLength(13);
  });

  it('contains all required event types', () => {
    const required = [
      'RECORD_CREATED', 'RECORD_UPDATED',
      'SIGNAL_CREATED', 'SIGNAL_SNAPSHOT_CREATED', 'LONGITUDINAL_SNAPSHOT_CREATED',
      'DISEASE_CREATED', 'DISEASE_UPDATED', 'DISEASE_SNAPSHOT_CREATED',
      'FEATURE_VECTOR_CREATED', 'SIMILARITY_CALCULATED',
      'CONSENT_UPDATED', 'EXPERIMENT_CREATED',
      'EMOTION_CREATED',
    ];
    for (const t of required) {
      expect(DOMAIN_EVENT_TYPES).toHaveProperty(t);
    }
  });

  it('values equal their keys', () => {
    for (const [k, v] of Object.entries(DOMAIN_EVENT_TYPES)) {
      expect(v).toBe(k);
    }
  });
});

describe('DOMAIN_EVENT_TYPE_SET', () => {
  it('is a frozen Set', () => expect(Object.isFrozen(DOMAIN_EVENT_TYPE_SET)).toBe(true));
  it('has 13 entries', () => expect(DOMAIN_EVENT_TYPE_SET.size).toBe(13));
  it('contains SIGNAL_CREATED', () => expect(DOMAIN_EVENT_TYPE_SET.has('SIGNAL_CREATED')).toBe(true));
  it('does not contain unknown type', () => expect(DOMAIN_EVENT_TYPE_SET.has('UNKNOWN_EVENT')).toBe(false));
});

describe('AGGREGATE_TYPES', () => {
  it('is frozen', () => expect(Object.isFrozen(AGGREGATE_TYPES)).toBe(true));
  it('contains RECORD, SIGNAL, DISEASE, SIMILARITY, CONSENT, EXPERIMENT', () => {
    for (const t of ['RECORD', 'SIGNAL', 'DISEASE', 'SIMILARITY', 'CONSENT', 'EXPERIMENT']) {
      expect(AGGREGATE_TYPES).toHaveProperty(t);
    }
  });
});

describe('EVENT_SCHEMA_VERSION', () => {
  it('is a string', () => expect(typeof EVENT_SCHEMA_VERSION).toBe('string'));
  it('equals "1" for Wave1', () => expect(EVENT_SCHEMA_VERSION).toBe('1'));
});
