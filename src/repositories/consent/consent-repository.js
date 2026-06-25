// ConsentRepositoryImpl — IConsentRepository backed by IStorageService.
// ippo_consent  : current consent level per user (upsert by userId).
// ippo_consent_events : append-only event log (DELETE forbidden — legal audit trail).
import { IConsentRepository }         from '../../contracts/index.js';
import { assertImplementsContract }    from '../../application/architecture-guard.js';
import { ConsentMapper }               from './consent-mapper.js';

const CONSENT_KEY        = 'ippo_consent';
const CONSENT_EVENTS_KEY = 'ippo_consent_events';

export class ConsentRepositoryImpl extends IConsentRepository {
  #storage;
  #mapper;

  /** @param {import('../../contracts/IStorageService.js').IStorageService} storage */
  constructor(storage) {
    super();
    this.#storage = storage;
    this.#mapper  = new ConsentMapper();
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  #loadAll() {
    const raw = this.#storage.get(CONSENT_KEY);
    return Array.isArray(raw) ? raw.filter(Boolean) : [];
  }

  #writeAll(consents) {
    this.#storage.set(CONSENT_KEY, consents);
  }

  #loadEvents() {
    const raw = this.#storage.get(CONSENT_EVENTS_KEY);
    return Array.isArray(raw) ? raw : [];
  }

  // ── IConsentRepository implementation ────────────────────────────────────

  /** @returns {Promise<object|null>} */
  async findByUserId(userId) {
    const found = this.#loadAll().find(c => c.userId === userId);
    return found ? this.#mapper.fromStorage(found) : null;
  }

  /**
   * Upsert consent by userId.
   * @param {object} consent  domain ConsentEntity
   * @returns {Promise<object>}
   */
  async save(consent) {
    const stored  = this.#mapper.toStorage(consent);
    const all     = this.#loadAll();
    const idx     = all.findIndex(c => c.userId === stored.userId);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...stored };
    } else {
      all.push(stored);
    }
    this.#writeAll(all);
    return this.#mapper.fromStorage(stored);
  }

  /**
   * @param {string} consentId
   * @param {Partial<object>} patch
   * @returns {Promise<object>}
   */
  async update(consentId, patch) {
    const all = this.#loadAll();
    const idx = all.findIndex(c => c.id === consentId);
    if (idx < 0) throw new Error(`[ConsentRepository] Consent not found: ${consentId}`);
    all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
    this.#writeAll(all);
    return this.#mapper.fromStorage(all[idx]);
  }

  /**
   * Append-only event log. DELETE is permanently forbidden.
   * @param {object} event  built via ConsentMapper.buildEvent()
   * @returns {Promise<void>}
   */
  async appendEvent(event) {
    const events = this.#loadEvents();
    events.push(Object.freeze({ ...event }));
    this.#storage.set(CONSENT_EVENTS_KEY, events);
  }
}

assertImplementsContract(ConsentRepositoryImpl, IConsentRepository, 'ConsentRepository');
