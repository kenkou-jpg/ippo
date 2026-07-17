// ============================================================
//  ippo – billing-next-adapter.js
//  PR-BILLING-RUNTIME-03/04: Read-only ViewModel Adapter。
//
//  正規経路: Prototype Premium/Pro UI → このAdapter → 既存Application
//  Facade（src/modules/premium/premium-service.js、Supabase
//  `subscriptions`テーブルの唯一の参照源）。
//
//  PR-BILLING-RUNTIME-01の現状確認で判明したとおり、ApiGatewayには
//  Subscription/Billing読み取り用のメソッドが存在しない。
//  premium-service.jsは既にDI/ApiGatewayを介さない独立したApplication
//  Facadeとして確立されており（14箇所以上の既存呼び出し元）、新規に
//  ApiGateway側の配線を追加することは「新しい課金状態管理」の新設に
//  近くなるためこのPRでは行わない。PR-BILLING-RUNTIME-04の設計
//  （"window.app.api または既存Application Facade"）どおり、
//  既存Application Facadeへ直接接続する。
//
//  書き込みは一切行わない（getTierLevel/refreshPremiumStatusはいずれも
//  Read専用。refreshPremiumStatus()はSupabase SELECTのみでUPDATEは
//  stripe-webhook専用、RLSでもクライアント書込みは禁止されている）。
//
//  既知の制約（架空のSubscription状態を作らないための誠実な表明）:
//  - 'premium'状態は現行getTierLevel()から返ることが無い
//    （PR-BILLING-RUNTIME-01確認済み、単一課金のため）。型としては
//    保持するが、実データから到達することはない
//  - premium-service.jsの_fetchPremiumFromDB()は内部でエラーを
//    console.warnするのみで外部へ再送出しないため、'error'状態は
//    現時点では実質的に到達不能（本Adapterの防御的catchのみが頼り）。
//    真の取得失敗検知が必要な場合はpremium-service.js自体の変更が
//    必要（別途Founder確認・別PR）
// ============================================================

import { getTierLevel, refreshPremiumStatus } from '../premium/premium-service.js';

const _TIER_LABEL = { free: 'Free', premium: 'Premium', pro: 'Pro' };

/**
 * @returns {Promise<{
 *   state: 'free'|'premium'|'pro'|'unknown'|'error',
 *   label: string,
 * }>}
 */
export async function getSubscriptionViewModel() {
  try {
    if (typeof getTierLevel !== 'function') {
      return { state: 'unknown', label: '不明' };
    }

    if (typeof refreshPremiumStatus === 'function') {
      await refreshPremiumStatus();
    }

    const tier = getTierLevel();
    if (tier === 'free' || tier === 'premium' || tier === 'pro') {
      return { state: tier, label: _TIER_LABEL[tier] };
    }
    // getTierLevel()が想定外の値を返した場合も、架空のtierを作らず安全側へ倒す
    return { state: 'unknown', label: '不明' };
  } catch (_) {
    return { state: 'error', label: '取得できませんでした' };
  }
}
