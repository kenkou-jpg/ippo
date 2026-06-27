// emotion-validator.js — Full error-collecting validator for Emotion input.
// BD-009: validation is a leaf node (no repository/UI imports).
// PR-038: Emotion Signal Foundation

import { EMOTION_TYPE_VALUES, EMOTION_INTENSITY_VALUES, EMOTION_SOURCE_VALUES } from './emotion-types.js';

/**
 * Validate raw Emotion input.
 * Collects ALL errors rather than failing on the first.
 *
 * @param {object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEmotion(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Emotion data must be an object'] };
  }

  if (!data.emotionType) {
    errors.push('emotionType is required');
  } else if (!EMOTION_TYPE_VALUES.has(data.emotionType)) {
    errors.push(`Unknown emotionType: "${data.emotionType}"`);
  }

  if (data.intensity !== undefined && !EMOTION_INTENSITY_VALUES.has(data.intensity)) {
    errors.push(`Unknown intensity: "${data.intensity}"`);
  }

  if (data.source !== undefined && !EMOTION_SOURCE_VALUES.has(data.source)) {
    errors.push(`Unknown source: "${data.source}"`);
  }

  if (data.note !== undefined && typeof data.note !== 'string') {
    errors.push('note must be a string');
  }

  if (data.recordId !== undefined && data.recordId !== null && typeof data.recordId !== 'string') {
    errors.push('recordId must be a string or null');
  }

  if (data.timestamp !== undefined) {
    const d = new Date(data.timestamp);
    if (isNaN(d.getTime())) errors.push('timestamp must be a valid ISO date string');
  }

  return { valid: errors.length === 0, errors };
}
