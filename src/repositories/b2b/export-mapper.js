// ExportMapper — anonymizes CaseEntity for B2B export.
// Removes all PII; retains only epidemiologically relevant fields.
// PR-022: B2BExport Migration

export class ExportMapper {
  /**
   * Map a CaseEntity to an anonymized export record.
   * All user-identifying fields are stripped.
   *
   * @param {object} caseEntity
   * @returns {object}  anonymized record
   */
  toAnonymized(caseEntity) {
    return Object.freeze({
      // Epidemiological fields retained
      tier:             caseEntity.tier,
      diseaseKey:       caseEntity.diseaseKey,
      diseaseKeys:      caseEntity.diseaseKeys   ?? [],
      qualityScore:     caseEntity.qualityScore,
      recordCount:      caseEntity.recordCount   ?? 0,
      durationDays:     caseEntity.durationDays  ?? 0,
      consentLevel:     caseEntity.consentLevel  ?? 0,
      hasOutcome:       caseEntity.hasOutcome     ?? false,
      // Date range retained (no individual date)
      startYearMonth:   caseEntity.startDate?.slice(0, 7) ?? null,
      endYearMonth:     caseEntity.endDate?.slice(0, 7)   ?? null,
      // Explicitly omitted: id, userId, experimentIds, outcomeId, createdAt, updatedAt
    });
  }

  /**
   * @param {object[]} cases
   * @returns {object[]}
   */
  toAnonymizedBatch(cases) {
    return cases.map(c => this.toAnonymized(c));
  }
}
