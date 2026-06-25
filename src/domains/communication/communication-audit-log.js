// CommunicationAuditLog — append-only log of generated notifications.
// DELETE is forbidden (audit trail integrity).
// PR-023: Communication Layer

let _idCounter = 0;

function _generateId() {
  return `comm_${Date.now()}_${++_idCounter}`;
}

/**
 * @typedef {{
 *   id:               string,
 *   userId:           string,
 *   notificationType: string,
 *   scheduledAt:      string,
 *   generatedAt:      string,
 *   status:           'GENERATED'|'PENDING'|'DELIVERED'|'SKIPPED',
 * }} AuditEntry
 */

export class CommunicationAuditLog {
  #repository;

  /** @param {import('./communication-repository.js').CommunicationRepository} repository */
  constructor(repository) {
    this.#repository = repository;
  }

  /**
   * Append a new audit entry. Cannot update or delete existing entries.
   *
   * @param {{
   *   userId:           string,
   *   notificationType: string,
   *   scheduledAt:      string,
   * }} params
   * @returns {AuditEntry}
   */
  append({ userId, notificationType, scheduledAt }) {
    const entry = {
      id:               _generateId(),
      userId,
      notificationType,
      scheduledAt,
      generatedAt:      new Date().toISOString(),
      status:           'GENERATED',
    };
    this.#repository.saveAuditLog(entry);
    return entry;
  }

  /**
   * Find all audit entries for a user.
   * @param {string} userId
   * @returns {AuditEntry[]}
   */
  findByUser(userId) {
    return this.#repository.findByUser(userId);
  }
}
