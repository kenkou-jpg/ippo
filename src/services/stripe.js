// ============================================================
//  ippo – src/services/stripe.js
//  Stripe 設定 & サブスクリプション チェックアウト
//
//  【移設元】app.html インラインスクリプト
//           (// ===== STRIPE SUBSCRIPTION ===== 以降)
//
//  【設計方針】
//  - Stripe.js SDK は未使用（決済は Supabase Edge Function 経由）
//  - window.stripe は不要（SDK インスタンスが存在しないため）
//  - SUPABASE_URL / supabase client は supabase.js から import
//  - isPremium / state / showToast 等グローバルは window 経由でアクセス
//
//  【絶対条件（変更禁止）】
//  - Edge Function URL: SUPABASE_URL + '/functions/v1/create-checkout'
//  - 認証フロー: supabase.auth.getSession() による token 取得
//  - saveRecord / premiumGate のシグネチャ
// ============================================================

import { supabase, SUPABASE_URL } from './supabase.js';
import { getState } from '../store/state.js';
import { isPremium } from '../modules/premium/premium-service.js';

// Price ID はサーバー側（Edge Function の環境変数）でのみ管理する。
// クライアントには Price ID を公開しない。

// ─── プラン選択状態 ────────────────────────────────────────
// window._selectedPlan も同期して HTML onclick ハンドラから参照可能にする
let _selectedPlan = 'annual';
window._selectedPlan = _selectedPlan;

// ─── プラン UI 切替 ───────────────────────────────────────
export function selectPremiumPlan(planType) {
  _selectedPlan = planType;
  window._selectedPlan = planType; // onclick ハンドラ用に同期

  var mc = document.getElementById('plan-card-monthly');
  var ac = document.getElementById('plan-card-annual');
  var mb = document.getElementById('stripe-main-btn');
  var sb = document.getElementById('stripe-sub-btn');
  if (!mc || !ac) return;

  if (planType === 'annual') {
    ac.classList.add('plan-card--selected');    ac.classList.remove('plan-card--inactive');
    mc.classList.add('plan-card--inactive');   mc.classList.remove('plan-card--selected');
    if (mb) mb.textContent = '年額プランで始める（¥4,800/年）';
    if (sb) sb.textContent = '月額プランで始める（¥580/月）';
  } else {
    mc.classList.add('plan-card--selected');    mc.classList.remove('plan-card--inactive');
    ac.classList.add('plan-card--inactive');   ac.classList.remove('plan-card--selected');
    if (mb) mb.textContent = '月額プランで始める（¥580/月）';
    if (sb) sb.textContent = '年額プランで始める（¥4,800/年）';
  }
}

// ─── Stripe チェックアウト開始 ────────────────────────────
// plan ("monthly" | "annual") のみをサーバーに送信。Price ID はサーバー側で決定。
export async function startStripeCheckout(forcePlan) {
  var plan = forcePlan || _selectedPlan;
  if (plan !== 'monthly' && plan !== 'annual') {
    window.showToast('決済機能は現在準備中です。もうしばらくお待ちください。');
    return;
  }
  var sessionData = (await supabase.auth.getSession()).data?.session;
  if (!sessionData) {
    window.showAlertModal('決済にはログインが必要です。設定画面からログインしてください。');
    window.closePremiumLock();
    return;
  }

  var btn = document.getElementById('stripe-main-btn');
  var origText = btn ? btn.textContent : '';
  if (btn) { btn.textContent = '処理中...'; btn.disabled = true; }

  try {
    var resp = await fetch(SUPABASE_URL + '/functions/v1/stripe-checkout', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + sessionData.access_token,
      },
      body: JSON.stringify({ plan }),
    });
    var data = await resp.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data.error || '決済ページの読み込みに失敗しました');
    }
  } catch (e) {
    window.showAlertModal('エラーが発生しました: ' + e.message);
    if (btn) { btn.textContent = origText; btn.disabled = false; }
  }
}

// ─── Stripe 決済完了後リダイレクト処理 ────────────────────
// stripe-checkout Edge Function が ?checkout=success でリダイレクトする。
// Realtime 購読で subscriptions テーブルの変化を受け取り即時反映。
// setInterval ポーリングは廃止。
(function handleStripeReturn() {
  var params        = new URLSearchParams(window.location.search);
  var checkoutStatus = params.get('checkout');
  if (!checkoutStatus) return;

  history.replaceState({}, '', window.location.pathname);

  if (checkoutStatus === 'success') {
    window.showToast('💳 決済が完了しました。プレミアム機能を有効化中...');

    // Realtime が subscriptions 更新を通知するまで待機 (最大30秒)
    var fallbackTimer = setTimeout(function () {
      if (!isPremium()) {
        window.showToast('決済は受付済みです。有効化に少し時間がかかる場合があります。しばらく後に再起動してください。', 'warn');
      }
    }, 30000);

    window.addEventListener('ippo:premium-updated', function onPremiumUpdated(e) {
      if (e.detail && e.detail.isPremium) {
        clearTimeout(fallbackTimer);
        window.removeEventListener('ippo:premium-updated', onPremiumUpdated);
        window.showToast('🎉 プレミアムプランへようこそ！');
      }
    });
  }
})();

// ─── 3ヶ月後アップセル通知 ───────────────────────────────
export function checkUpsellNotification() {
  if (isPremium()) return;
  var lastShown = localStorage.getItem('ippo_upsell_ts');
  if (lastShown && Date.now() - parseInt(lastShown) < 7 * 24 * 60 * 60 * 1000) return;

  var st = getState();
  if (!st || !st.records || st.records.length < 10) return;

  var firstDate  = st.records.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0].date;
  var daysSince  = (Date.now() - new Date(firstDate).getTime()) / 86400000;
  if (daysSince < 90) return;

  localStorage.setItem('ippo_upsell_ts', Date.now().toString());

  var banner = document.createElement('div');
  banner.id = 'upsell-banner';
  banner.className = 'upsell-banner';
  banner.innerHTML =
    '<div style="display:flex;align-items:center;gap:12px;">'
    + '<div style="flex:1;">'
    + '<div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:2px;">ippoを3ヶ月以上続けています ✨</div>'
    + '<div style="font-size:11px;color:var(--ink-mid);">年額プランで月400円（31%オフ）— より深い分析が使えます</div>'
    + '</div>'
    + '<button class="upsell-banner__cta" onclick="closePremiumLock();document.getElementById(\'upsell-banner\').remove();'
    + 'document.getElementById(\'premiumLockOverlay\').classList.add(\'active\');">詳細を見る</button>'
    + '<button class="upsell-banner__close" onclick="document.getElementById(\'upsell-banner\').remove();">✕</button>'
    + '</div>';
  document.body.appendChild(banner);
  setTimeout(function () {
    var b = document.getElementById('upsell-banner');
    if (b) b.remove();
  }, 12000);
}

// ─── window 互換（移行期間: 非モジュール <script> との共存） ──
window.selectPremiumPlan       = selectPremiumPlan;
window.startStripeCheckout     = startStripeCheckout;
window.checkUpsellNotification = checkUpsellNotification;
