// emotion-signal-mapper.js — Maps Emotion entities to NetworkSignal (SIGNAL_TYPES.EMOTION).
// NAC-01: Emotion → NetworkSignal conversion uses fixed normalizedValue mapping.
// BD-009: mapping is pure (no side effects, no storage).
// PR-038: Emotion Signal Foundation

import { EMOTION_TYPES } from './emotion-types.js';
import { buildNetworkSignal } from '../network/network-signal-entity.js';
import { SIGNAL_TYPES, SIGNAL_UNITS } from '../network/network-signal-types.js';

/**
 * Fixed mapping: EMOTION_TYPE → normalizedValue [0, 1].
 * Positive emotions = higher scores; negative/stressful = lower.
 */
const EMOTION_NORMALIZED_MAP = Object.freeze({
  [EMOTION_TYPES.HAPPY]:     0.9,
  [EMOTION_TYPES.CALM]:      0.8,
  [EMOTION_TYPES.ENERGETIC]: 0.85,
  [EMOTION_TYPES.NEUTRAL]:   0.5,
  [EMOTION_TYPES.TIRED]:     0.35,
  [EMOTION_TYPES.ANXIOUS]:   0.2,
  [EMOTION_TYPES.SAD]:       0.15,
  [EMOTION_TYPES.ANGRY]:     0.1,
  [EMOTION_TYPES.STRESSED]:  0.15,
  [EMOTION_TYPES.UNKNOWN]:   0.5,
});

export class EmotionSignalMapper {
  /**
   * Convert a single Emotion entity to a NetworkSignal.
   * @param {Readonly<object>} emotion
   * @returns {Readonly<object>} NetworkSignal
   */
  toNetworkSignal(emotion) {
    if (!emotion?.emotionType) throw new Error('[EmotionSignalMapper] emotion.emotionType is required');
    const normalizedValue = EMOTION_NORMALIZED_MAP[emotion.emotionType] ?? 0.5;
    const rawValue        = Math.round(normalizedValue * 10);

    return buildNetworkSignal({
      signalType:      SIGNAL_TYPES.EMOTION,
      normalizedValue,
      rawValue,
      unit:            SIGNAL_UNITS.EMOTION,
      recordId:        emotion.recordId ?? null,
      timestamp:       emotion.timestamp,
      metadata:        Object.freeze({
        emotionType: emotion.emotionType,
        intensity:   emotion.intensity,
        source:      emotion.source,
        emotionId:   emotion.id,
      }),
    });
  }

  /**
   * Convert an array of Emotion entities to NetworkSignals.
   * @param {Readonly<object>[]} emotions
   * @returns {Readonly<object>[]}
   */
  toNetworkSignals(emotions) {
    if (!Array.isArray(emotions)) throw new Error('[EmotionSignalMapper] emotions must be an array');
    return emotions.map(e => this.toNetworkSignal(e));
  }

  /**
   * Return the fixed normalized value for a given emotion type.
   * @param {string} emotionType
   * @returns {number}
   */
  getNormalizedValue(emotionType) {
    return EMOTION_NORMALIZED_MAP[emotionType] ?? 0.5;
  }

  /** Expose the full mapping for introspection / tests. */
  get mappingTable() {
    return EMOTION_NORMALIZED_MAP;
  }
}
