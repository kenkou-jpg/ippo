// network-signal-entity.js — NetworkSignal domain entity definition.
// Pure value object. No persistence logic here.
// NETWORK ASSET COUNCIL (IPPO-COUNCIL-002) NAC-01: Signal Schema.
// BD-013: SSOT for signal structure is network-signal-types.js.
// Wave1: immutable in-memory only. Persistence is Wave2 scope.
// PR-030: Network Signal Foundation

import { SIGNAL_TYPES, MENSTRUAL_PHASES, VECTOR_VERSION } from './network-signal-types.js';

let _idCounter = 0;

/**
 * @typedef {{
 *   id:             string,
 *   signalType:     string,
 *   normalizedValue: number,
 *   rawValue:       number,
 *   unit:           string,
 *   metadata:       object,
 *   recordId:       string|null,
 *   timestamp:      string,
 *   vectorVersion:  string,
 *   menstrualPhase: string,
 *   createdAt:      string,
 * }} NetworkSignal
 */

/**
 * Build a new NetworkSignal value object.
 * Does not persist. Caller must validate before calling (use NetworkSignalValidator).
 *
 * @param {{
 *   signalType:      string,
 *   normalizedValue: number,
 *   rawValue:        number,
 *   unit:            string,
 *   metadata?:       object,
 *   recordId?:       string|null,
 *   timestamp?:      string,
 *   menstrualPhase?: string,
 * }} params
 * @returns {NetworkSignal}
 */
export function buildNetworkSignal({
  signalType,
  normalizedValue,
  rawValue,
  unit,
  metadata       = {},
  recordId       = null,
  timestamp      = new Date().toISOString(),
  menstrualPhase = MENSTRUAL_PHASES.UNKNOWN,
}) {
  return Object.freeze({
    id:              `ns_${Date.now()}_${++_idCounter}`,
    signalType,
    normalizedValue,
    rawValue,
    unit,
    metadata:        Object.freeze({ ...metadata }),
    recordId:        recordId ?? null,
    timestamp,
    vectorVersion:   VECTOR_VERSION,
    menstrualPhase,
    createdAt:       new Date().toISOString(),
  });
}

/** Re-export registries for external consumers. */
export const SignalTypes      = SIGNAL_TYPES;
export const MenstrualPhases  = MENSTRUAL_PHASES;
