// CaseMapper — translates between storage shape and domain CaseEntity shape.
// No score calculation. No Tier judgment. Pure data transformation.

export class CaseMapper {
  /**
   * Storage shape → domain CaseEntity.
   * @param {object} c  raw stored object
   * @returns {object}
   */
  fromStorage(c) {
    if (!c) return null;
    return {
      id:               c.id              ?? '',
      userId:           c.userId          ?? c.user_id   ?? null,
      diseaseKey:       c.diseaseKey      ?? c.disease_key ?? '',
      diseaseKeys:      Array.isArray(c.diseaseKeys) ? c.diseaseKeys : [],
      tier:             c.tier            ?? 'CANDIDATE',
      tierReason:       c.tierReason      ?? null,
      qualityScore:     c.qualityScore    ?? 0,
      qualityBreakdown: c.qualityBreakdown ?? null,
      recordCount:      c.recordCount     ?? 0,
      experimentIds:    Array.isArray(c.experimentIds) ? c.experimentIds : [],
      consentLevel:     c.consentLevel    ?? 0,
      startDate:        c.startDate       ?? '',
      endDate:          c.endDate         ?? null,
      hasOutcome:       c.hasOutcome      ?? false,
      outcomeId:        c.outcomeId       ?? null,
      isDeleted:        c.isDeleted       ?? false,
      createdAt:        c.createdAt       ?? new Date().toISOString(),
      updatedAt:        c.updatedAt       ?? new Date().toISOString(),
    };
  }

  /**
   * Domain CaseEntity → storage shape (identity — we store domain shape directly).
   * @param {object} c  domain CaseEntity
   * @returns {object}
   */
  toStorage(c) {
    if (!c) return null;
    // Storage shape mirrors domain shape; strip any internal _legacy fields if present.
    const { _legacy: _, ...rest } = c; // eslint-disable-line no-unused-vars
    return { ...rest, updatedAt: new Date().toISOString() };
  }
}
