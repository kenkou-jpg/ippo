// emotion-entity.js — Emotion domain entity (immutable value object).
// BD-018: createdAt is the entity timestamp (BD-018 compliance).
// BD-022: Wave1 in-memory only.
// PR-038: Emotion Signal Foundation

import { EMOTION_TYPES, EMOTION_INTENSITY, EMOTION_SOURCE } from './emotion-types.js';

let _idCounter = 0;

/**
 * Build an immutable Emotion entity.
 *
 * @param {{
 *   emotionType:  string,
 *   intensity?:   string,
 *   source?:      string,
 *   note?:        string,
 *   recordId?:    string|null,
 *   timestamp?:   string,
 * }} params
 * @returns {Readonly<object>}
 */
export function buildEmotion({
  emotionType,
  intensity  = EMOTION_INTENSITY.UNKNOWN,
  source     = EMOTION_SOURCE.USER_INPUT,
  note       = '',
  recordId   = null,
  timestamp  = new Date().toISOString(),
}) {
  if (!emotionType) throw new Error('[Emotion] emotionType is required');
  if (!Object.values(EMOTION_TYPES).includes(emotionType))
    throw new Error(`[Emotion] Unknown emotionType: "${emotionType}"`);
  if (!Object.values(EMOTION_INTENSITY).includes(intensity))
    throw new Error(`[Emotion] Unknown intensity: "${intensity}"`);
  if (!Object.values(EMOTION_SOURCE).includes(source))
    throw new Error(`[Emotion] Unknown source: "${source}"`);

  return Object.freeze({
    id:          `emo_${Date.now()}_${++_idCounter}`,
    emotionType,
    intensity,
    source,
    note:        String(note ?? ''),
    recordId:    recordId ?? null,
    timestamp,
    createdAt:   new Date().toISOString(),
  });
}
