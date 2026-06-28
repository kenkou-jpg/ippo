// network-signal-service.js — NetworkSignal domain entry point for ApiGateway.
// Responsible for createSignal / validateSignal / listSignals / listByRecord / listByType
// and generateFromRecord (Record Input Integration).
// NETWORK ASSET COUNCIL (IPPO-COUNCIL-002) NAC-01 / NAC-02.
// Wave1 constraints:
//   - No DiseaseCluster computation (BD-009 Wave2)
//   - No Longitudinal Signal computation (BD-012 Wave2)
//   - No Similarity, FeatureVector expansion, NetworkGraph, Recommendation, AI, Ranking
//   - No Supabase / Storage / DB writes
//   - All UI access must go through ApiGateway → NetworkSignalService
// PR-030: Network Signal Foundation

import { buildNetworkSignal } from './network-signal-entity.js';
import {
  SIGNAL_TYPES,
  SIGNAL_UNITS,
  MENSTRUAL_PHASES,
  VECTOR_VERSION,
  SIGNAL_TYPE_VALUES,
  MENSTRUAL_PHASE_VALUES,
} from './network-signal-types.js';

/** Clamp value to [min, max]. */
function _clamp(v, min = 0, max = 1) { return Math.min(Math.max(v, min), max); }

/** Normalize rawValue to [0, 1] based on signal type. */
function _normalize(signalType, rawValue) {
  switch (signalType) {
    case SIGNAL_TYPES.SYMPTOM:   return _clamp(rawValue / 10);
    case SIGNAL_TYPES.PAIN:      return _clamp(rawValue / 10);
    case SIGNAL_TYPES.MENSTRUAL: return _clamp(rawValue / 3);
    case SIGNAL_TYPES.EMOTION:   return _clamp(rawValue / 10);
    case SIGNAL_TYPES.SLEEP:     return _clamp(rawValue / 8);
    case SIGNAL_TYPES.EXPOSURE:  return _clamp(rawValue / 5);
    default:                     return _clamp(rawValue);
  }
}

export class NetworkSignalService {
  #validator;
  #repository;

  /**
   * @param {{
   *   validator:  import('./network-signal-validator.js').NetworkSignalValidator,
   *   repository: import('./network-signal-repository.js').NetworkSignalRepository,
   * }} deps
   */
  constructor({ validator, repository }) {
    this.#validator  = validator;
    this.#repository = repository;
  }

  /**
   * Validate signal input against all SSOT registries. Does NOT persist.
   * @param {object} data
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateSignal(data) {
    return this.#validator.validate(data);
  }

  /**
   * Create and store a new NetworkSignal.
   * Throws if validation fails.
   * @param {{
   *   signalType:      string,
   *   normalizedValue: number,
   *   rawValue:        number,
   *   unit:            string,
   *   metadata?:       object,
   *   recordId?:       string|null,
   *   timestamp?:      string,
   *   menstrualPhase?: string,
   * }} data
   * @returns {import('./network-signal-entity.js').NetworkSignal}
   */
  createSignal(data) {
    const validation = this.#validator.validate(data);
    if (!validation.valid) {
      throw new Error(`[NetworkSignalService] Validation failed: ${validation.errors.join('; ')}`);
    }
    const signal = buildNetworkSignal(data);
    return this.#repository.append(signal);
  }

  /**
   * Return all stored NetworkSignals.
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  listSignals() {
    return this.#repository.findAll();
  }

  /**
   * Return all NetworkSignals associated with a specific record.
   * @param {string} recordId
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  listByRecord(recordId) {
    if (!recordId || typeof recordId !== 'string') {
      throw new TypeError('[NetworkSignalService] recordId must be a non-empty string');
    }
    return this.#repository.findByRecord(recordId);
  }

  /**
   * Return all NetworkSignals of a specific type.
   * @param {string} signalType
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  listByType(signalType) {
    if (!SIGNAL_TYPE_VALUES.has(signalType)) {
      throw new Error(`[NetworkSignalService] Unknown signalType: "${signalType}". Allowed: ${[...SIGNAL_TYPE_VALUES].join(', ')}`);
    }
    return this.#repository.findByType(signalType);
  }

  /**
   * Record Input Integration — extract and store NetworkSignals from a saved record.
   * Called by ApiGateway.saveRecord() after the record is persisted.
   * Wave1: generates signals for Symptom / Pain / Sleep / Exposure.
   * Menstrual and Emotion are extracted if present; silently skipped if absent.
   * Does NOT trigger Similarity, DiseaseCluster, Longitudinal, or FeatureVector.
   *
   * @param {object} record  the saved record object (domain shape)
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}  created signals
   */
  generateFromRecord(record, { menstrualPhase } = {}) {
    if (!record || typeof record !== 'object') return [];

    const recordId  = record.id ?? record.recordId ?? null;
    const timestamp = record.date ?? record.createdAt ?? new Date().toISOString();
    const created   = [];

    // SYMPTOM signals — one signal per symptom entry
    const symptoms = Array.isArray(record.symptoms) ? record.symptoms : [];
    for (const symptom of symptoms) {
      const severity = typeof symptom === 'object'
        ? (symptom.severity ?? symptom.painLevel ?? 5)
        : 5;
      const category = typeof symptom === 'object'
        ? (symptom.category ?? symptom.type ?? 'Other')
        : String(symptom);
      const rawValue = typeof severity === 'number' ? severity : 5;
      created.push(this.#repository.append(buildNetworkSignal({
        signalType:      SIGNAL_TYPES.SYMPTOM,
        rawValue,
        normalizedValue: _normalize(SIGNAL_TYPES.SYMPTOM, rawValue),
        unit:            SIGNAL_UNITS.SYMPTOM,
        metadata:        { category, severity: rawValue },
        recordId,
        timestamp,
      })));
    }

    // PAIN signal — from record.painLevel
    if (record.painLevel != null && typeof record.painLevel === 'number') {
      const rawValue = record.painLevel;
      const painType = record.painType ?? null;
      created.push(this.#repository.append(buildNetworkSignal({
        signalType:      SIGNAL_TYPES.PAIN,
        rawValue,
        normalizedValue: _normalize(SIGNAL_TYPES.PAIN, rawValue),
        unit:            SIGNAL_UNITS.PAIN,
        metadata:        { painType, painLevel: rawValue, location: null },
        recordId,
        timestamp,
      })));
    }

    // SLEEP signal — from record.sleepBed and record.sleepWake
    if (record.sleepBed && record.sleepWake) {
      const bed  = new Date(record.sleepBed);
      const wake = new Date(record.sleepWake);
      if (!isNaN(bed) && !isNaN(wake) && wake > bed) {
        const durationHours = (wake - bed) / 3_600_000;
        created.push(this.#repository.append(buildNetworkSignal({
          signalType:      SIGNAL_TYPES.SLEEP,
          rawValue:        durationHours,
          normalizedValue: _normalize(SIGNAL_TYPES.SLEEP, durationHours),
          unit:            SIGNAL_UNITS.SLEEP,
          metadata:        { durationHours, bedTime: record.sleepBed, wakeTime: record.sleepWake },
          recordId,
          timestamp,
        })));
      }
    }

    // EXPOSURE signal — from record.foods array (BD-005: Exposure Signal, not Food Log)
    const foods = Array.isArray(record.foods) ? record.foods : [];
    if (foods.length > 0) {
      const rawValue = foods.length;
      created.push(this.#repository.append(buildNetworkSignal({
        signalType:      SIGNAL_TYPES.EXPOSURE,
        rawValue,
        normalizedValue: _normalize(SIGNAL_TYPES.EXPOSURE, rawValue),
        unit:            SIGNAL_UNITS.EXPOSURE,
        metadata:        { exposureType: 'FOOD', description: foods.join(', ') },
        recordId,
        timestamp,
      })));
    }

    // MENSTRUAL signal — from record.menstrualFlow if present
    if (record.menstrualFlow != null && typeof record.menstrualFlow === 'number') {
      const rawValue = record.menstrualFlow;
      created.push(this.#repository.append(buildNetworkSignal({
        signalType:      SIGNAL_TYPES.MENSTRUAL,
        rawValue,
        normalizedValue: _normalize(SIGNAL_TYPES.MENSTRUAL, rawValue),
        unit:            SIGNAL_UNITS.MENSTRUAL,
        metadata:        { flowLevel: rawValue, cycleDay: record.cycleDay ?? null, hasClots: record.hasClots ?? false },
        recordId,
        timestamp,
        menstrualPhase:  menstrualPhase ?? MENSTRUAL_PHASES.UNKNOWN,
      })));
    }

    // EMOTION signal — Wave2 activation target, skipped in Wave1
    // (infrastructure is present; service.listByType(SIGNAL_TYPES.EMOTION) will return [])

    return created;
  }

  /**
   * Return the SignalType registry.
   * @returns {{ values: string[], registry: object }}
   */
  getSignalTypes() {
    return {
      values:   [...SIGNAL_TYPE_VALUES],
      registry: { ...SIGNAL_TYPES },
    };
  }

  /**
   * Return the MenstrualPhase registry.
   * @returns {{ values: string[], registry: object }}
   */
  getMenstrualPhases() {
    return {
      values:   [...MENSTRUAL_PHASE_VALUES],
      registry: { ...MENSTRUAL_PHASES },
    };
  }

  /**
   * Return the current VECTOR_VERSION constant.
   * BD-010: callers should use this to tag any FeatureVector computation.
   * @returns {string}
   */
  getVectorVersion() {
    return VECTOR_VERSION;
  }
}
