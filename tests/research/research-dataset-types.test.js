// tests/research/research-dataset-types.test.js
// Research Dataset Types SSOT — PR-040
import { describe, it, expect } from 'vitest';
import {
  DATASET_STATUS,
  ANONYMIZATION_LEVEL,
  EXPORT_FORMAT,
  DATASET_STATUS_VALUES,
  ANONYMIZATION_LEVEL_VALUES,
  EXPORT_FORMAT_VALUES,
  K_ANONYMITY_MIN_K,
  DATASET_SCHEMA_VERSION,
} from '../../src/domains/research/research-dataset-types.js';

describe('DATASET_STATUS', () => {
  it('is frozen', () => expect(Object.isFrozen(DATASET_STATUS)).toBe(true));
  it('has DRAFT, READY, EXPORTED, ARCHIVED', () => {
    for (const s of ['DRAFT', 'READY', 'EXPORTED', 'ARCHIVED'])
      expect(DATASET_STATUS).toHaveProperty(s);
  });
  it('values equal keys', () => {
    for (const [k, v] of Object.entries(DATASET_STATUS)) expect(v).toBe(k);
  });
  it('has exactly 4 statuses', () => expect(Object.keys(DATASET_STATUS)).toHaveLength(4));
});

describe('ANONYMIZATION_LEVEL', () => {
  it('is frozen', () => expect(Object.isFrozen(ANONYMIZATION_LEVEL)).toBe(true));
  it('has NONE, K_ANONYMITY, FULL', () => {
    for (const l of ['NONE', 'K_ANONYMITY', 'FULL'])
      expect(ANONYMIZATION_LEVEL).toHaveProperty(l);
  });
  it('has exactly 3 levels', () => expect(Object.keys(ANONYMIZATION_LEVEL)).toHaveLength(3));
});

describe('EXPORT_FORMAT', () => {
  it('is frozen', () => expect(Object.isFrozen(EXPORT_FORMAT)).toBe(true));
  it('has JSON, CSV, PARQUET', () => {
    for (const f of ['JSON', 'CSV', 'PARQUET'])
      expect(EXPORT_FORMAT).toHaveProperty(f);
  });
  it('has exactly 3 formats', () => expect(Object.keys(EXPORT_FORMAT)).toHaveLength(3));
});

describe('Set exports', () => {
  it('DATASET_STATUS_VALUES is a frozen Set of 4', () => {
    expect(Object.isFrozen(DATASET_STATUS_VALUES)).toBe(true);
    expect(DATASET_STATUS_VALUES.size).toBe(4);
  });
  it('ANONYMIZATION_LEVEL_VALUES is a frozen Set of 3', () => {
    expect(ANONYMIZATION_LEVEL_VALUES.size).toBe(3);
  });
  it('EXPORT_FORMAT_VALUES is a frozen Set of 3', () => {
    expect(EXPORT_FORMAT_VALUES.size).toBe(3);
  });
});

describe('Constants', () => {
  it('K_ANONYMITY_MIN_K is 5', () => expect(K_ANONYMITY_MIN_K).toBe(5));
  it('DATASET_SCHEMA_VERSION is a string', () => expect(typeof DATASET_SCHEMA_VERSION).toBe('string'));
});
