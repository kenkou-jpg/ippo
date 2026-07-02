// consent-gate-service.js — Research Consent Gate (Release Readiness Recovery PR-076).
// WAVE2_ARCHITECTURE.md 8-B / BD-021 / BD-049: Research Dataset に含めてよいのは
// Research Consent（ConsentRepository.js: consent_type='RESEARCH' → Level 2 到達）を
// 得たユーザー由来のデータのみ。k-anonymity（BD-030、count集計のみを見る）とは独立した
// 別のコントロールであり、どちらか一方だけでは BD-049 を満たさない。
//
// Case エンティティは生成時点の consentLevel を保持している（case-generation-service.js
// candidate.consentLevel、ConsentEnforcementService が Tier 生成時に強制した値）ため、
// ここで機械的にフィルタできる。
//
// NetworkSignal エンティティは userId / consentLevel を持たない設計（BD-029 系のネットワーク
// 層匿名化方針、network-signal-entity.js 参照）のため、Signal 単位の自動フィルタは
// Entity 拡張（Architecture変更）なしには実装できない。本サービスは Signal を含む
// Dataset 生成について「呼び出し側が確認済みである」ことの明示的な表明
// （signalsConsentVerified: true）を必須化し、表明がなければ fail-closed でブロックする
// （BD-030 の all-or-nothing 思想を踏襲— サイレントな成功を許さない）。
// 未解消のSignal単位フィルタは docs/RELEASE_READINESS_COUNCIL.md の残課題として引き継ぐ。

/** ConsentRepository.js: Level2 = Level1 + RESEARCH GRANTED. */
export const RESEARCH_CONSENT_MIN_LEVEL = 2;

export class ResearchConsentNotVerifiedError extends Error {
  /** @param {string} detail */
  constructor(detail) {
    super(
      `[ConsentGateService] BD-049: Research Consent not verified — ${detail}. ` +
      'Omitting consent verification does not mean "no restriction"; it means the data ' +
      'must be excluded (fail-closed, mirrors BD-030 k-anonymity all-or-nothing).'
    );
    this.name = 'ResearchConsentNotVerifiedError';
  }
}

export class ConsentGateService {
  /**
   * Filter Case entities to only those carrying Research Consent (consentLevel >= 2).
   * Cases missing consentLevel are treated as unconsented — excluded (fail-closed).
   *
   * @param {object[]} cases
   * @returns {Readonly<{ included: ReadonlyArray<object>, excludedCaseIds: ReadonlyArray<string> }>}
   */
  filterCasesByResearchConsent(cases = []) {
    const included = [];
    const excludedCaseIds = [];
    for (const c of cases) {
      const level = c?.consentLevel ?? 0;
      if (level >= RESEARCH_CONSENT_MIN_LEVEL) {
        included.push(c);
      } else {
        excludedCaseIds.push(c?.id ?? c?.caseId ?? null);
      }
    }
    return Object.freeze({ included: Object.freeze(included), excludedCaseIds: Object.freeze(excludedCaseIds) });
  }

  /**
   * Guard for Signal-bearing dataset builds where per-signal consent cannot yet be
   * mechanically re-derived from the Signal entity itself (see module header).
   * Throws unless the caller explicitly attests that consent filtering was already
   * performed upstream (e.g. at Record→Signal collection time).
   *
   * @param {object[]} signals
   * @param {boolean} signalsConsentVerified
   * @throws {ResearchConsentNotVerifiedError}
   */
  assertSignalsConsentVerified(signals = [], signalsConsentVerified = false) {
    if (signals.length > 0 && signalsConsentVerified !== true) {
      throw new ResearchConsentNotVerifiedError(
        `${signals.length} signal(s) supplied without signalsConsentVerified:true`
      );
    }
  }
}
