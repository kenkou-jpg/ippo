// ConsentMapper — translates between storage shape and domain ConsentEntity shape.
// No domain logic. No level validation. Pure data transformation.
// Consent Level: 0-3 only (Level4 does not exist — RD-006).

const VALID_LEVELS = new Set([0, 1, 2, 3]);

function _clampLevel(level) {
  const n = Number(level);
  if (!VALID_LEVELS.has(n)) return 0;
  return n;
}

export class ConsentMapper {
  /**
   * Storage shape → domain ConsentEntity.
   * @param {object} c  raw stored consent
   * @returns {object}
   */
  fromStorage(c) {
    if (!c) return null;
    return {
      id:        c.id         ?? `consent_${c.userId ?? 'unknown'}`,
      userId:    c.userId     ?? c.user_id ?? null,
      level:     _clampLevel(c.level ?? c.consent_level ?? 0),
      grantedAt: c.grantedAt  ?? c.granted_at ?? new Date().toISOString(),
      updatedAt: c.updatedAt  ?? c.updated_at ?? new Date().toISOString(),
    };
  }

  /**
   * Domain ConsentEntity → storage shape.
   * @param {object} c  domain ConsentEntity
   * @returns {object}
   */
  toStorage(c) {
    if (!c) return null;
    return {
      id:        c.id,
      userId:    c.userId,
      level:     _clampLevel(c.level),
      grantedAt: c.grantedAt,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Build a ConsentEvent storage record.
   * @param {{userId:string, eventType:'GRANTED'|'REVOKED', fromLevel:number, toLevel:number, payload?:object}} params
   * @returns {object}
   */
  buildEvent({ userId, eventType, fromLevel, toLevel, payload = {} }) {
    return Object.freeze({
      id:          `cevt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      eventType,
      fromLevel:   _clampLevel(fromLevel),
      toLevel:     _clampLevel(toLevel),
      occurredAt:  new Date().toISOString(),
      payload,
    });
  }
}
