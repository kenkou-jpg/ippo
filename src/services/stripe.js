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

// ─── Price ID（Stripe ダッシュボードで設定） ─────────────────
export const STRIPE_PRICE_MONTHLY = 'price_XXXXXXXXXXXXXXXXXX'; // ¥580/月
export const STRIPE_PRICE_ANNUAL  = 'price_YYYYYYYYYYYYYYYYYY'; // ¥4,800/年

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
    ac.style.borderColor = 'var(--rose)';
    ac.style.background  = 'linear-gradient(135deg,#fff8f8,#fdf3f3)';
    mc.style.borderColor = '#e8ddd8';
    mc.style.background  = 'transparent';
    if (mb) mb.textContent = '年額プランで始める（¥4,800/年）';
    if (sb) sb.textContent = '月額プランで始める（¥580/月）';
  } else {
    mc.style.borderColor = 'var(--rose)';
    mc.style.background  = 'linear-gradient(135deg,#fff8f8,#fdf3f3)';
    ac.style.borderColor = '#e8ddd8';
    ac.style.background  = 'transparent';
    if (mb) mb.textContent = '月額プランで始める（¥580/月）';
    if (sb) sb.textContent = '年額プランで始める（¥4,800/年）';
  }
}

// ─── Price ID プレースホルダー検出 ───────────────────────
function isPlaceholderPrice(id) {
  return !id || /^price_[XY]+$/.test(id);
}

// ─── Stripe チェックアウト開始 ────────────────────────────
// ※ Edge Function URL 変更禁止 / 認証フロー変更禁止
export async function startStripeCheckout(forcePlan) {
  var plan = forcePlan || _selectedPlan;
  var priceId = plan === 'annual' ? STRIPE_PRICE_ANNUAL : STRIPE_PRICE_MONTHLY;
  if (isPlaceholderPrice(priceId)) {
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
    var base    = window.location.href.split('?')[0];
    var resp    = await fetch(SUPABASE_URL + '/functions/v1/create-checkout', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + sessionData.access_token,
      },
      body: JSON.stringify({
        price_id:    priceId,
        success_url: base + '?stripe=success&plan=' + plan,
        cancel_url:  base + '?stripe=cancel',
      }),
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
// IIFE: モジュール読み込み時（DOM パース完了後）に即実行
(function handleStripeReturn() {
  var params      = new URLSearchParams(window.location.search);
  var stripeStatus = params.get('stripe');
  var plan        = params.get('plan');
  if (!stripeStatus) return;

  history.replaceState({}, '', window.location.pathname);

  if (stripeStatus === 'success') {
    window.showToast('💳 決済が完了しました。プレミアム機能を有効化中...');
    var attempts = 0;
    var poll = setInterval(function () {
      attempts++;
      window.checkPremiumStatus();
      if (window.isPremium || attempts >= 12) {
        clearInterval(poll);
        if (window.isPremium) {
          window.showToast('🎉 ' + (plan === 'annual' ? '年額' : '月額') + 'プランへようこそ！');
        }
      }
    }, 2500);
  }
})();

// ─── 3ヶ月後アップセル通知 ───────────────────────────────
export function checkUpsellNotification() {
  if (window.isPremium) return;
  var lastShown = localStorage.getItem('ippo_upsell_ts');
  if (lastShown && Date.now() - parseInt(lastShown) < 7 * 24 * 60 * 60 * 1000) return;

  var st = window.state;
  if (!st || !st.records || st.records.length < 10) return;

  var firstDate  = st.records.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0].date;
  var daysSince  = (Date.now() - new Date(firstDate).getTime()) / 86400000;
  if (daysSince < 90) return;

  localStorage.setItem('ippo_upsell_ts', Date.now().toString());

  var banner = document.createElement('div');
  banner.id = 'upsell-banner';
  banner.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);'
    + 'width:calc(100% - 32px);max-width:420px;background:var(--cream);'
    + 'border:1.5px solid var(--rose-light);border-radius:16px;padding:14px 16px;'
    + 'z-index:400;box-shadow:0 4px 20px rgba(184,112,122,0.2);'
    + 'animation:popIn 0.4s cubic-bezier(0.34,1.56,0.64,1);';
  banner.innerHTML =
    '<div style="display:flex;align-items:center;gap:12px;">'
    + '<div style="flex:1;">'
    + '<div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:2px;">ippoを3ヶ月以上続けています ✨</div>'
    + '<div style="font-size:11px;color:var(--ink-mid);">年額プランで月400円（31%オフ）— より深い分析が使えます</div>'
    + '</div>'
    + '<button onclick="closePremiumLock();document.getElementById(\'upsell-banner\').remove();'
    + 'document.getElementById(\'premiumLockOverlay\').classList.add(\'active\');" '
    + 'style="background:var(--rose);color:white;border:none;border-radius:20px;'
    + 'padding:7px 14px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;">詳細を見る</button>'
    + '<button onclick="document.getElementById(\'upsell-banner\').remove();" '
    + 'style="background:none;border:none;color:var(--ink-light);font-size:18px;cursor:pointer;line-height:1;">✕</button>'
    + '</div>';
  document.body.appendChild(banner);
  setTimeout(function () {
    var b = document.getElementById('upsell-banner');
    if (b) b.remove();
  }, 12000);
}

// ─── window 互換（移行期間: 非モジュール <script> との共存） ──
window.STRIPE_PRICE_MONTHLY    = STRIPE_PRICE_MONTHLY;
window.STRIPE_PRICE_ANNUAL     = STRIPE_PRICE_ANNUAL;
window.selectPremiumPlan       = selectPremiumPlan;
window.startStripeCheckout     = startStripeCheckout;
window.checkUpsellNotification = checkUpsellNotification;
