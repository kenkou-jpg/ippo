// CaseGeneratedEvent — append-only event store for Case generation events.
// Purpose: UI notification hook. Events are never deleted.
// PR-021: UX Foundation — R-02 (Case生成通知基盤)

const EVENT_KEY = 'ippo_case_events';

/**
 * @typedef {{ caseId: string, userId: string, generatedAt: string }} CaseEvent
 */

export class CaseGeneratedEvent {
  /** @param {import('../../contracts/IStorageService.js').IStorageService} storage */
  constructor(storage) {
    this._storage = storage;
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  _readAll() {
    const raw = this._storage.get(EVENT_KEY);
    return (raw && Array.isArray(raw.events)) ? raw.events : [];
  }

  _writeAll(events) {
    this._storage.set(EVENT_KEY, { events, _updatedAt: new Date().toISOString() });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Append a new Case generation event. Idempotent by caseId.
   * @param {{ caseId: string, userId: string, generatedAt?: string }} params
   */
  record({ caseId, userId, generatedAt }) {
    const events = this._readAll();
    if (events.some(e => e.caseId === caseId)) return; // idempotent
    events.push({
      caseId,
      userId,
      generatedAt: generatedAt ?? new Date().toISOString(),
    });
    this._writeAll(events);
  }

  /**
   * Returns all events for a given user.
   * @param {string} userId
   * @returns {CaseEvent[]}
   */
  getForUser(userId) {
    return this._readAll().filter(e => e.userId === userId);
  }

  /**
   * Returns all events across all users.
   * @returns {CaseEvent[]}
   */
  getAll() {
    return this._readAll();
  }

  /**
   * Count of events for a user.
   * @param {string} userId
   * @returns {number}
   */
  countForUser(userId) {
    return this.getForUser(userId).length;
  }
}
