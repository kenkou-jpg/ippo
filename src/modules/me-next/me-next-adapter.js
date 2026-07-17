// ============================================================
//  ippo – me-next-adapter.js
//  PR-ME-RUNTIME-03/04: Read-only ViewModel Adapter。
//
//  「現在のプラン」は billing-next-adapter.js の getSubscriptionViewModel()
//  をそのまま再利用する（二重実装防止 — このセッションでresolveMainInsight
//  について指摘されたのと同じ原則: Subscription状態の算出ロジックは
//  billing-next-adapter.jsをSSOTとし、me-nextは呼び出すのみで独自ロジックを
//  持たない）。
//
//  プロフィール名（アバター・表示名）は、対応する既存Read facadeが見当たら
//  なかったため本PRのスコープ外とし、明示的な未接続状態（空/hidden）の
//  ままにする（PR-ME-RUNTIME-01の方針: 架空のプロフィールデータを作らない）。
// ============================================================

import { getSubscriptionViewModel } from '../billing-next/billing-next-adapter.js';

const _STATE_LABEL_PREFIX = {
  free:    '現在のプラン: ',
  premium: '現在のプラン: ',
  pro:     '現在のプラン: ',
  unknown: '',
  error:   '',
};

/**
 * @returns {Promise<{ text: string } | null>}
 *   nullの場合、呼び出し元は「現在のプラン」欄を非表示のままにする
 *   （unknown/error時、架空の情報を出さない）。
 */
export async function getMeProfileViewModel() {
  const sub = await getSubscriptionViewModel();
  const prefix = _STATE_LABEL_PREFIX[sub.state] ?? '';
  if (!prefix) return null;
  return { text: prefix + sub.label };
}
