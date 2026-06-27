// menstrual-entity.js — Menstrual domain entity (immutable value object).
// BD-018: createdAt is required on every entity.
// BD-022: Wave1 in-memory only.
// PR-039: Menstrual Intelligence Foundation

import { MENSTRUAL_PHASES, FLOW_LEVEL, PAIN_LEVEL } from './menstrual-types.js';

let _idCounter = 0;

/**
 * Build an immutable MenstrualRecord entity.
 *
 * @param {{
 *   cycleDay:   number,
 *   phase?:     string,
 *   flow?:      string,
 *   painLevel?: string,
 *   symptoms?:  string[],
 *   recordId?:  string|null,
 *   startedAt?: string,
 *   endedAt?:   string|null,
 * }} params
 * @returns {Readonly<object>}
 */
export function buildMenstrualRecord({
  cycleDay,
  phase     = MENSTRUAL_PHASES.UNKNOWN,
  flow      = FLOW_LEVEL.UNKNOWN,
  painLevel = PAIN_LEVEL.UNKNOWN,
  symptoms  = [],
  recordId  = null,
  startedAt = new Date().toISOString(),
  endedAt   = null,
}) {
  if (cycleDay === undefined || cycleDay === null)
    throw new Error('[MenstrualRecord] cycleDay is required');
  if (typeof cycleDay !== 'number' || !Number.isInteger(cycleDay) || cycleDay < 1)
    throw new Error('[MenstrualRecord] cycleDay must be a positive integer');
  if (!Object.values(MENSTRUAL_PHASES).includes(phase))
    throw new Error(`[MenstrualRecord] Unknown phase: "${phase}"`);
  if (!Object.values(FLOW_LEVEL).includes(flow))
    throw new Error(`[MenstrualRecord] Unknown flow: "${flow}"`);
  if (!Object.values(PAIN_LEVEL).includes(painLevel))
    throw new Error(`[MenstrualRecord] Unknown painLevel: "${painLevel}"`);
  if (!Array.isArray(symptoms))
    throw new Error('[MenstrualRecord] symptoms must be an array');

  return Object.freeze({
    id:        `men_${Date.now()}_${++_idCounter}`,
    cycleDay,
    phase,
    flow,
    painLevel,
    symptoms:  Object.freeze([...symptoms]),
    recordId:  recordId ?? null,
    startedAt,
    endedAt:   endedAt ?? null,
    createdAt: new Date().toISOString(),
  });
}
