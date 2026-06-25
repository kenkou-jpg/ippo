// ExperimentMapper — translates between legacy experiment shape and domain experiment shape.
// Legacy shape: lowercase status ('active'/'completed'/'cancelled'), ISO startDate string.
// Domain shape: ExperimentEntity (uppercase status, YYYY-MM-DD dates, camelCase).
// No domain logic here — pure data transformation only.

const VALID_STATUSES = new Set(['DRAFT', 'ACTIVE', 'COMPLETED', 'ABANDONED']);

function _toISODate(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  if (value instanceof Date && !isNaN(value)) return value.toISOString().slice(0, 10);
  return '';
}

function _toUpperStatus(legacyStatus) {
  if (!legacyStatus) return 'DRAFT';
  const s = String(legacyStatus).toUpperCase();
  // legacy uses 'cancelled' → map to ABANDONED
  if (s === 'CANCELLED') return 'ABANDONED';
  return VALID_STATUSES.has(s) ? s : 'DRAFT';
}

function _toLowerStatus(domainStatus) {
  if (!domainStatus) return 'active';
  const map = { DRAFT: 'draft', ACTIVE: 'active', COMPLETED: 'completed', ABANDONED: 'cancelled' };
  return map[domainStatus] ?? 'active';
}

let _idCounter = 0;
function _generateId() {
  return `exp_${Date.now()}_${++_idCounter}`;
}

export class ExperimentMapper {
  /**
   * Legacy experiment object → domain ExperimentEntity shape.
   * @param {object} e  legacy experiment (from state.experiments[])
   * @param {string} [userId]
   * @returns {object}
   */
  fromLegacy(e, userId = null) {
    if (!e) return null;
    const now = new Date().toISOString();
    return {
      id:               e.id              ?? e._id             ?? _generateId(),
      userId:           e.userId          ?? e.user_id         ?? userId,
      title:            e.title           ?? '',
      hypothesis:       e.hypothesis      ?? '',
      originType:       e.originType      ?? 'user_initiated',
      triggerContext:   e.triggerContext   ?? e.condition       ?? null,
      startDate:        _toISODate(e.startDate ?? e.start_date) || _toISODate(now),
      plannedEndDate:   _toISODate(e.plannedEndDate ?? e.planned_end_date)
                          || _computePlannedEnd(e.startDate ?? e.start_date ?? now, e.days ?? 30),
      actualEndDate:    _toISODate(e.actualEndDate  ?? e.actual_end_date)  || null,
      status:           _toUpperStatus(e.status),
      diseaseKey:       e.diseaseKey      ?? e.disease_key     ?? e.factor ?? null,
      interventionType: e.interventionType ?? e.condition      ?? 'custom',
      outcomeId:        e.outcomeId       ?? e.outcome_id      ?? null,
      createdAt:        e.createdAt       ?? e.created_at      ?? now,
      updatedAt:        e.updatedAt       ?? e.updated_at      ?? now,
      isDeleted:        e.isDeleted       ?? e.is_deleted      ?? false,
      _legacy: e,
    };
  }

  /**
   * Domain ExperimentEntity shape → legacy object (for writing back to state JSON).
   * @param {object} e  domain experiment
   * @returns {object}
   */
  toLegacy(e) {
    if (!e) return null;
    const base = e._legacy ?? {};
    const startISO = e.startDate ? `${e.startDate}T00:00:00` : base.startDate ?? '';
    return {
      ...base,
      id:           e.id            ?? base.id,
      title:        e.title         ?? base.title         ?? '',
      factor:       e.diseaseKey    ?? base.factor        ?? '',
      condition:    e.interventionType ?? base.condition  ?? 'custom',
      hypothesis:   e.hypothesis    ?? base.hypothesis    ?? '',
      days:         _daysBetween(e.startDate, e.plannedEndDate) ?? base.days ?? 30,
      startDate:    startISO,
      status:       _toLowerStatus(e.status),
      actualEndDate: e.actualEndDate ?? base.actualEndDate ?? null,
      outcomeId:    e.outcomeId     ?? base.outcomeId     ?? null,
      isDeleted:    e.isDeleted     ?? base.isDeleted     ?? false,
      updatedAt:    new Date().toISOString(),
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _computePlannedEnd(startValue, days) {
  const base = _toISODate(startValue);
  if (!base) return '';
  const d = new Date(base);
  d.setDate(d.getDate() + (Number(days) || 30));
  return d.toISOString().slice(0, 10);
}

function _daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const ms = new Date(endDate) - new Date(startDate);
  return Math.round(ms / 86_400_000);
}
