// B2BExportRepositoryImpl — IB2BExportRepository backed by IStorageService.
// Source of truth: ippo_case_events + CaseRepository (via StorageService).
// Export audit: ippo_b2b_audit (append-only).
// PR-022: B2BExport Migration — legacy → bridged
import { IB2BExportRepository }      from '../../contracts/IB2BExportRepository.js';
import { assertImplementsContract }  from '../../application/architecture-guard.js';
import { ExportMapper }              from './export-mapper.js';

const CASE_KEY  = 'ippo_cases';
const AUDIT_KEY = 'ippo_b2b_audit';

const TIER_ORDER = { TIER1: 3, TIER2: 2, TIER3: 1, CANDIDATE: 0 };

export class B2BExportRepositoryImpl extends IB2BExportRepository {
  /** @param {import('../../contracts/IStorageService.js').IStorageService} storage */
  constructor(storage) {
    super();
    this._storage = storage;
    this._mapper  = new ExportMapper();
  }

  // ── IB2BExportRepository implementation ──────────────────────────────────

  async findExportableCases({ diseaseKey, tierMin = 'TIER3', limit = 1000 } = {}) {
    const raw   = this._storage.get(CASE_KEY);
    const cases = Array.isArray(raw) ? raw.filter(Boolean) : [];

    const minTierOrder = TIER_ORDER[tierMin] ?? TIER_ORDER.TIER3;

    const eligible = cases.filter(c => {
      if (c.isDeleted) return false;
      if ((c.consentLevel ?? 0) < 2) return false;
      if ((TIER_ORDER[c.tier] ?? -1) < minTierOrder) return false;
      if (diseaseKey && c.diseaseKey !== diseaseKey) return false;
      return true;
    });

    return this._mapper.toAnonymizedBatch(eligible.slice(0, limit));
  }

  async recordExportAudit(entry) {
    const raw    = this._storage.get(AUDIT_KEY);
    const audits = Array.isArray(raw?.entries) ? raw.entries : [];
    audits.push({ ...entry, _recordedAt: new Date().toISOString() });
    this._storage.set(AUDIT_KEY, { entries: audits });
  }

  async getExportHistory(organizationId) {
    const raw    = this._storage.get(AUDIT_KEY);
    const audits = Array.isArray(raw?.entries) ? raw.entries : [];
    return audits.filter(e => e.organizationId === organizationId);
  }
}

assertImplementsContract(B2BExportRepositoryImpl, IB2BExportRepository, 'B2BExportRepository');
