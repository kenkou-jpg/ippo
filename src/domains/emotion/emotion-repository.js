// emotion-repository.js — Append-Only in-memory Emotion repository.
// BD-021: DELETE is forbidden — append only.
// BD-022: Wave1 in-memory only, no Storage/Supabase.
// PR-038: Emotion Signal Foundation

export class EmotionRepository {
  #store = [];

  /**
   * Append a validated Emotion entity.
   * @param {Readonly<object>} emotion
   */
  append(emotion) {
    if (!emotion?.id)        throw new Error('[EmotionRepository] emotion.id is required');
    if (!emotion?.emotionType) throw new Error('[EmotionRepository] emotion.emotionType is required');
    if (!emotion?.createdAt)   throw new Error('[EmotionRepository] emotion.createdAt is required');
    this.#store.push(emotion);
  }

  /** @returns {Readonly<object>[]} */
  findAll() {
    return [...this.#store];
  }

  /**
   * Find all emotions linked to a specific record.
   * @param {string} recordId
   * @returns {Readonly<object>[]}
   */
  findByRecord(recordId) {
    return this.#store.filter(e => e.recordId === recordId);
  }

  /**
   * Find all emotions of a specific type.
   * @param {string} emotionType
   * @returns {Readonly<object>[]}
   */
  findByType(emotionType) {
    return this.#store.filter(e => e.emotionType === emotionType);
  }

  /** @returns {number} */
  get count() {
    return this.#store.length;
  }

  /** Test helper — resets internal state. */
  clearForTests() {
    this.#store = [];
  }
}
