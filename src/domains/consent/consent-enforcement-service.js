// ConsentEnforcementService — ONLY entry point for consent-level checks before Case generation.
// FD-002 (frozen):
//   TIER2 requires Consent >= 1
//   TIER3 requires Consent >= 0 (always allowed — Consent not required)
// Level4 does not exist (RD-006).
import { logEnforcement } from './consent-audit-log.js';

export class ConsentRequiredError extends Error {
  constructor(required, current) {
    super(`[ConsentEnforcement] Consent Level ${required} required, current is ${current}`);
    this.name          = 'ConsentRequiredError';
    this.required      = required;
    this.current       = current;
  }
}

// ── Tier-specific minimum consent levels (FD-002 — frozen) ───────────────────
const TIER2_MIN_CONSENT = 1;
const TIER3_MIN_CONSENT = 0;

export class ConsentEnforcementService {
  /**
   * Check whether the given consentLevel allows TIER2 Case generation.
   * @param {number} consentLevel  0-3
   * @param {{ caseId?:string, userId?:string }} [ctx]
   * @returns {{ allowed: boolean, requiredLevel: number }}
   */
  canGenerateTier2(consentLevel, ctx = {}) {
    const allowed = Number(consentLevel) >= TIER2_MIN_CONSENT;
    logEnforcement({
      caseId:        ctx.caseId        ?? null,
      userId:        ctx.userId        ?? null,
      consentLevel:  Number(consentLevel),
      requiredLevel: TIER2_MIN_CONSENT,
      allowed,
      reason: 'TIER2 gate',
    });
    return { allowed, requiredLevel: TIER2_MIN_CONSENT };
  }

  /**
   * Check whether the given consentLevel allows TIER3 Case generation.
   * TIER3 does not require consent — always allowed per FD-002.
   * @param {number} consentLevel
   * @param {{ caseId?:string, userId?:string }} [ctx]
   * @returns {{ allowed: boolean, requiredLevel: number }}
   */
  canGenerateTier3(consentLevel, ctx = {}) {
    const allowed = Number(consentLevel) >= TIER3_MIN_CONSENT; // always true
    logEnforcement({
      caseId:        ctx.caseId        ?? null,
      userId:        ctx.userId        ?? null,
      consentLevel:  Number(consentLevel),
      requiredLevel: TIER3_MIN_CONSENT,
      allowed,
      reason: 'TIER3 gate',
    });
    return { allowed, requiredLevel: TIER3_MIN_CONSENT };
  }

  /**
   * Validate consent for a target tier. Throws ConsentRequiredError when blocked.
   * @param {{ tier: string, consentLevel: number, caseId?: string, userId?: string }} params
   * @throws {ConsentRequiredError}
   */
  validate({ tier, consentLevel, caseId = null, userId = null }) {
    const level = Number(consentLevel);

    if (tier === 'TIER2') {
      const { allowed, requiredLevel } = this.canGenerateTier2(level, { caseId, userId });
      if (!allowed) throw new ConsentRequiredError(requiredLevel, level);
      return;
    }

    if (tier === 'TIER3' || tier === 'CANDIDATE') {
      this.canGenerateTier3(level, { caseId, userId });
      return; // always allowed
    }

    // Unknown tier — default to no-op (future tiers handled in later PRs)
  }
}
