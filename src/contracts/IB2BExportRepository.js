// IB2BExportRepository — contract for B2B anonymized case export.
// Implementations must use StorageService only (no direct Supabase / localStorage).
// PR-022: B2BExport Migration — legacy → bridged
export class IB2BExportRepository {
  /**
   * Find cases eligible for B2B export (Tier2+, consent≥2, not deleted).
   * @param {{ diseaseKey?: string, tierMin?: string, limit?: number }} filters
   * @returns {Promise<object[]>}  anonymized case records
   */
  findExportableCases(filters) {
    throw new Error('Not Implemented: IB2BExportRepository.findExportableCases');
  }

  /**
   * Append an export audit entry (who exported what, when).
   * @param {{ organizationId: string, exportedAt: string, recordCount: number, filters: object }} entry
   * @returns {Promise<void>}
   */
  recordExportAudit(entry) {
    throw new Error('Not Implemented: IB2BExportRepository.recordExportAudit');
  }

  /**
   * Retrieve export history for an organization.
   * @param {string} organizationId
   * @returns {Promise<object[]>}
   */
  getExportHistory(organizationId) {
    throw new Error('Not Implemented: IB2BExportRepository.getExportHistory');
  }
}
