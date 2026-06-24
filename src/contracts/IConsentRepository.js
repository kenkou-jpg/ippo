// IConsentRepository — contract aligned with domains/consent/consent.service.ts::ConsentRepository.
// consent_events is append-only (legal evidence log) — no update/delete on events.
// Implementations replace the null stub for TOKENS.ConsentRepository in PR-015.
export class IConsentRepository {
  /**
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  findByUserId(userId) {
    throw new Error('Not Implemented: IConsentRepository.findByUserId');
  }

  /**
   * @param {object} consent
   * @returns {Promise<object>}
   */
  save(consent) { throw new Error('Not Implemented: IConsentRepository.save'); }

  /**
   * @param {string} consentId
   * @param {Partial<object>} patch
   * @returns {Promise<object>}
   */
  update(consentId, patch) {
    throw new Error('Not Implemented: IConsentRepository.update');
  }

  /**
   * Append-only. DELETE is forbidden on consent_events (legal audit trail).
   * @param {object} event
   * @returns {Promise<void>}
   */
  appendEvent(event) {
    throw new Error('Not Implemented: IConsentRepository.appendEvent');
  }
}
