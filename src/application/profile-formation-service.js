// ProfileFormationService — UX-facing "プロファイル形成中" status provider.
// Translates TierProgressService output into user-facing stage language.
// IMPORTANT: never returns the word "Case" — UI translation layer precondition.
// PR-021: UX Foundation — R-01 (中間報酬 / Day15プロファイル形成中), R-07

/**
 * @typedef {'STARTED'|'FORMING'|'NEAR_READY'|'READY'} FormationStage
 */

export class ProfileFormationService {
  /** @param {import('./tier-progress-service.js').TierProgressService} tierProgressService */
  constructor(tierProgressService) {
    this._tierProgress = tierProgressService;
  }

  /**
   * Returns the current profile formation status for the given candidate.
   *
   * @param {object} candidate  CaseCandidate or equivalent shape
   * @returns {{
   *   stage:             FormationStage,
   *   completionPercent: number,
   *   daysRemaining:     number,
   * }}
   */
  getFormationStatus(candidate) {
    const progress = this._tierProgress.getProgress(candidate);
    const pct      = progress.progressPercent;

    /** @type {FormationStage} */
    const stage =
      pct >= 100 ? 'READY'      :
      pct >= 75  ? 'NEAR_READY' :
      pct >= 20  ? 'FORMING'    :
      'STARTED';

    return {
      stage,
      completionPercent: Math.min(100, Math.round(pct)),
      daysRemaining:     Math.max(0, progress.daysRemaining),
    };
  }
}
