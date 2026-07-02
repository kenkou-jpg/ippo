// release-readiness-types.js — SSOT for Release Readiness Recovery (PR-077).
// docs/RELEASE_READINESS_COUNCIL.md (IPPO-RELEASE-001) — Critical findings C-1/C-2/C-3.
//
// This domain does NOT re-derive or duplicate Wave2ExitAuditService (PR-075) — it is a
// separate, additive gate. Wave2ExitAudit already certifies BD-001〜043 technical exit
// criteria and is Founder-approved (Append-Only, untouched by this PR). This domain
// closes two gaps the Council report found in that certification:
//
//   C-2: REGULATORY_MEDICAL_COUNCIL.md CONDITIONAL GO 条件一覧 (C-1〜C-5) are entirely
//        outside Wave2ExitAudit's scope (BD-044〜060 excluded by design — see
//        wave2-exit-audit-types.js header) and have no completion record anywhere.
//   C-3: 34 of 43 in-scope BDs are FOUNDER_REVIEW_REQUIRED and Wave2ExitAudit's
//        wave3ReadyForFounderApproval gate does not require them to be individually
//        reviewed before passing.
//
// This service provides Founder with an explicit, Append-Only place to record that
// review — it never fabricates a PASS on the Founder's behalf.

import { BD_SCOPE_LIST, MECHANICALLY_AUDITED_BDS } from '../wave2-exit-audit/wave2-exit-audit-types.js';

export const RELEASE_READINESS_SCHEMA_VERSION = '1';

export const CONFIRMATION_CATEGORY = Object.freeze({
  REGULATORY_CONDITION: 'REGULATORY_CONDITION', // C-1〜C-5 (REGULATORY_MEDICAL_COUNCIL.md)
  BD_FOUNDER_REVIEW:    'BD_FOUNDER_REVIEW',      // FOUNDER_REVIEW_REQUIRED BDs from Wave2ExitAudit
});

/** REGULATORY_MEDICAL_COUNCIL.md 13章「条件一覧」(C-1〜C-5) — CONDITIONAL GO の前提条件。 */
export const REGULATORY_CONDITIONS = Object.freeze([
  { id: 'C-1', description: 'プライバシーポリシー弁護士レビュー完了 + 要配慮個人情報対応', deadline: 'Wave2 Phase A 前' },
  { id: 'C-2', description: '医師アドバイザー1名の招聘', deadline: 'Wave2 Phase D 前' },
  { id: 'C-3', description: 'SaMD非該当の書面見解取得（BD-051）', deadline: 'Wave2 Phase D 前' },
  { id: 'C-4', description: 'Research Consent の Consent フローへの追加（BD-049）', deadline: 'Wave2 Phase B 前' },
  { id: 'C-5', description: 'Research Dataset提供契約書雛形の作成', deadline: 'Wave2 Phase F 前' },
]);

/**
 * The 34 BD-001〜043 entries NOT mechanically audited by Wave2ExitAuditService (PR-075).
 * Derived from wave2-exit-audit-types.js — never duplicated by hand, so it cannot drift
 * from the actual mechanical-audit source of truth.
 */
export const FOUNDER_REVIEW_BD_LIST = Object.freeze(
  BD_SCOPE_LIST.filter(({ bd }) => !MECHANICALLY_AUDITED_BDS.includes(bd))
);

export const CONFIRMABLE_ITEM_IDS = Object.freeze(new Set([
  ...REGULATORY_CONDITIONS.map(c => c.id),
  ...FOUNDER_REVIEW_BD_LIST.map(b => b.bd),
]));
