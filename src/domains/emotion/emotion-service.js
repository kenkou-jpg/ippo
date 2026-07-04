// emotion-service.js — Emotion domain service.
// BD-015: state changes are event-sourced via EventPublisher (EmotionCreated).
// BD-018: generatedAt on statistics output.
// BD-022: Wave1 in-memory only.
// PR-038: Emotion Signal Foundation

import { buildEmotion }        from './emotion-entity.js';
import { validateEmotion }     from './emotion-validator.js';
import { EmotionSignalMapper } from './emotion-signal-mapper.js';
import { EMOTION_TYPES }       from './emotion-types.js';
import { buildDomainEvent }    from '../events/domain-event-entity.js';

export class EmotionService {
  #repository;
  #eventPublisher;
  #mapper;

  /**
   * @param {{ repository: EmotionRepository, eventPublisher?: object }} deps
   */
  constructor({ repository, eventPublisher = null }) {
    if (!repository) throw new Error('[EmotionService] repository is required');
    this.#repository     = repository;
    this.#eventPublisher = eventPublisher;
    this.#mapper         = new EmotionSignalMapper();
  }

  /**
   * Create and persist a new Emotion.
   * Publishes EMOTION_CREATED event if EventPublisher is wired (BD-015).
   *
   * @param {object} params
   * @returns {Readonly<object>} created Emotion entity
   */
  create(params) {
    const validation = validateEmotion(params);
    if (!validation.valid) {
      throw new Error(`[EmotionService] Validation failed: ${validation.errors.join(', ')}`);
    }
    const emotion = buildEmotion(params);
    this.#repository.append(emotion);

    if (this.#eventPublisher) {
      try {
        const event = buildDomainEvent({
          eventType:     'EMOTION_CREATED',
          aggregateType: 'SIGNAL',
          aggregateId:   emotion.id,
          payload:       Object.freeze({
            emotionType: emotion.emotionType,
            intensity:   emotion.intensity,
            source:      emotion.source,
            recordId:    emotion.recordId,
            timestamp:   emotion.timestamp,
          }),
        });
        this.#eventPublisher.publish(event);
      } catch (_) {
        // Event publishing is best-effort in Wave1
      }
    }

    return emotion;
  }

  /**
   * List all emotions.
   * @returns {Readonly<object>[]}
   */
  list() {
    return this.#repository.findAll();
  }

  /**
   * Find emotions by record ID.
   * @param {string} recordId
   * @returns {Readonly<object>[]}
   */
  findByRecord(recordId) {
    if (!recordId) throw new Error('[EmotionService] recordId is required');
    return this.#repository.findByRecord(recordId);
  }

  /**
   * Find emotions by emotion type.
   * @param {string} emotionType
   * @returns {Readonly<object>[]}
   */
  findByType(emotionType) {
    if (!emotionType) throw new Error('[EmotionService] emotionType is required');
    return this.#repository.findByType(emotionType);
  }

  /**
   * Compute aggregate statistics over all stored emotions.
   * BD-018: includes generatedAt.
   *
   * @returns {Readonly<object>}
   */
  getEmotionStatistics() {
    const all = this.#repository.findAll();
    const total = all.length;

    // Count per type
    const byType = {};
    for (const t of Object.values(EMOTION_TYPES)) byType[t] = 0;
    for (const e of all) byType[e.emotionType] = (byType[e.emotionType] ?? 0) + 1;

    // Average normalized value (using mapper)
    const avgNormalizedValue = total === 0
      ? 0
      : all.reduce((sum, e) => sum + this.#mapper.getNormalizedValue(e.emotionType), 0) / total;

    // Dominant type
    const dominantType = total === 0
      ? EMOTION_TYPES.UNKNOWN
      : Object.entries(byType).sort(([, a], [, b]) => b - a)[0][0];

    return Object.freeze({
      total,
      byType:              Object.freeze({ ...byType }),
      avgNormalizedValue:  Math.round(avgNormalizedValue * 1000) / 1000,
      dominantType,
      generatedAt:         new Date().toISOString(),
      bd018Compliant:      true,
    });
  }

  /**
   * Convert all stored emotions to NetworkSignals.
   * Integrates Emotion into the NetworkSignal layer (PR-030).
   *
   * @returns {Readonly<object>[]}
   */
  toNetworkSignals() {
    return this.#mapper.toNetworkSignals(this.#repository.findAll());
  }

  /**
   * Compute the EMOTION_SCORE for FeatureVector Dim-5.
   * Wave1: average normalizedValue across all emotions.
   * @returns {number} [0, 1]
   */
  getEmotionScore() {
    const stats = this.getEmotionStatistics();
    return stats.avgNormalizedValue;
  }

}
