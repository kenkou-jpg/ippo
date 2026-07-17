// ============================================================
//  ippo – src/modules/premium/premium-lock.js
//  PR-081 (Legacy Removal Batch-3): Premium Gate & Lock
//
//  app-legacy.js から関数本体をそのまま移植（挙動変更なし）。
//  - isAdminOrPremium() は本PRのScope外（Batch-3対象6関数に含まれない）
//    のため app-legacy.js に残存。bare 呼び出し → window.isAdminOrPremium()
//    （app-legacy.js側で window.isAdminOrPremium = isAdminOrPremium 済み）。
//  - bare `state` 参照 → `window.state`（record-screen.js と同型、
//    _ippoStateHooks により常に同一オブジェクト参照）。
//  - callback 比較（`callback === openTempReport` 等）は app.html の
//    onclick="premiumGate(openTempReport)" 等がグローバル解決される
//    window.openTempReport と同一オブジェクトである必要があるため、
//    すべて window.* 経由に変更（openTempReport/openCorrelationReport/
//    openFlareupReport/openCyclePhaseReport/openExperiments/
//    calcTemperaturePhases/detectFlareups は Batch-4 以降のScopeのため
//    app-legacy.js に残存）。
//  - updatePremiumBadges() 内の updateSettingsHero() 呼び出しのみ例外。
//    settings-display-runtime.js に window.updateSettingsHero を上書きする
//    別実装（initSettingsPanels() 呼び出しを追加で行う）が既に存在し
//    （load順で後着のためwindow.updateSettingsHeroは常にそちらを指す）、
//    本関数が従来呼んでいたのは app-legacy.js のローカル実装だった。
//    挙動を変えないため window.__ippoLegacyUpdateSettingsHero（app-legacy.js
//    側に本PRで追加した専用ブリッジ、PR-080E __ippoGetBowelCount と同型）
//    経由でローカル実装を明示的に呼び出す。updateSettingsHero 自体の
//    重複解消（どちらを正とするか）は製品判断が必要なため本PRのScope外。
//
//  PR-RUNTIME-INTEGRATION-01: premiumGate()にFeature Flag分岐を追加。
//  ippo_billing_ui_v2 ON時はロックオーバーレイの代わりにbilling-next
//  Runtime Screenへ遷移する（OFF=既定時は既存のオーバーレイ挙動を維持）。
// ============================================================

import { isBillingNextEnabled, showBillingNext } from '../billing-next/billing-next-shell.js';

// ===== プレミアム先行登録 =====
export function submitPremiumWaitlist(){
  var emailInput = document.getElementById('premium-email');
  var email = emailInput ? emailInput.value.trim() : '';
  if(!email || email.indexOf('@') === -1){
    window.showAlertModal('メールアドレスを入力してください');
    return;
  }
  if(!window.supabase){ window.showAlertModal('通信エラーが発生しました'); return; }
  window.supabase.auth.getSession().then(function(res){
    var userId = res.data.session ? res.data.session.user.id : null;
    return window.supabase.from('premium_waitlist').insert({ email: email, user_id: userId });
  }).then(function(result){
    if(!result.error){
      document.getElementById('premium-form-area').style.display = 'none';
      document.getElementById('premium-done').style.display = 'block';
      localStorage.setItem('ippo_premium_registered', email);
    } else if(result.error.code === '23505'){
      window.showAlertModal('このメールアドレスは既に登録済みです');
    } else {
      window.showAlertModal('送信に失敗しました。もう一度お試しください');
    }
  }).catch(function(e){
    console.warn('Waitlist error:', e);
    window.showAlertModal('通信エラーが発生しました');
  });
}

// ===== PREMIUM LOCK =====
export function updatePremiumBadges() {
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('updatePremiumBadges', updatePremiumBadges);
    return;
  }
  var unlocked = window.isAdminOrPremium();
  document.querySelectorAll('.pf-lock-badge').forEach(badge => {
    badge.style.display = unlocked ? 'none' : 'inline';
  });
  renderProHero();
  window.__ippoLegacyUpdateSettingsHero();
  // インサイトタブが表示中ならプレミアム確定後に相関分析を再描画
  var insightsEl = document.getElementById('screen-insights');
  if (insightsEl && insightsEl.classList.contains('active')) {
    if (typeof window.updateFoodBodyCorrelation === 'function') window.updateFoodBodyCorrelation();
    if (typeof window.updateCycleSymptomCorrelation === 'function') window.updateCycleSymptomCorrelation();
  }
  if (typeof window.renderPhaseMap === 'function') window.renderPhaseMap();
}

export function renderProHero() {
  var hero = document.getElementById('pro-hero');
  if (!hero) return;
  if (window.isAdminOrPremium()) {
    hero.innerHTML =
      '<div style="background:linear-gradient(135deg,var(--plum) 0%,var(--rose) 100%);border-radius:22px;padding:22px 24px;color:white;position:relative;overflow:hidden;">'
      + '<div style="position:absolute;top:-24px;right:-24px;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>'
      + '<div style="font-size:10px;letter-spacing:0.18em;opacity:0.75;margin-bottom:5px;">PREMIUM MEMBER</div>'
      + '<div style="font-family:\'Shippori Mincho\',serif;font-size:20px;font-weight:700;margin-bottom:6px;">プレミアム会員中 ✨</div>'
      + '<div style="font-size:12px;opacity:0.85;line-height:1.6;">すべての分析・レポート機能をご利用いただけます</div>'
      + '</div>';
  } else {
    hero.innerHTML =
      '<div style="background:linear-gradient(135deg,var(--plum) 0%,var(--rose) 100%);border-radius:22px;padding:22px 24px;color:white;position:relative;overflow:hidden;">'
      + '<div style="position:absolute;top:-24px;right:-24px;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>'
      + '<div style="font-size:10px;letter-spacing:0.18em;opacity:0.75;margin-bottom:5px;">PREMIUM PLAN</div>'
      + '<div style="font-family:\'Shippori Mincho\',serif;font-size:20px;font-weight:700;margin-bottom:10px;">からだの声を、もっと深く</div>'
      + '<div style="display:flex;align-items:center;gap:20px;margin-bottom:16px;">'
      +   '<div style="text-align:center;">'
      +     '<div style="font-size:24px;font-weight:800;line-height:1;">¥580</div>'
      +     '<div style="font-size:10px;opacity:0.7;margin-top:2px;">/月</div>'
      +   '</div>'
      +   '<div style="opacity:0.45;font-size:12px;">または</div>'
      +   '<div style="text-align:center;">'
      +     '<div style="font-size:24px;font-weight:800;line-height:1;">¥4,800</div>'
      +     '<div style="font-size:10px;opacity:0.7;margin-top:2px;">/年&nbsp;<span style="background:rgba(255,255,255,0.2);padding:1px 6px;border-radius:6px;font-size:9px;font-weight:700;">31%オフ</span></div>'
      +   '</div>'
      + '</div>'
      + '<button onclick="startStripeCheckout()" style="width:100%;background:white;color:var(--plum);border:none;border-radius:50px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;font-family:\'Noto Sans JP\',sans-serif;letter-spacing:0.03em;">プレミアムを始める →</button>'
      + '</div>';
  }
}

export function premiumGate(callback) {
  if (window.isAdminOrPremium()) {
    callback();
  } else if (isBillingNextEnabled()) {
    showBillingNext();
  } else {
    // 動的な価値説明を追加
    var dynamicMsg = document.getElementById('premium-dynamic-msg');
    if(dynamicMsg){
      var msg = '';
      if(callback === window.openTempReport){
        var tempCount = window.state.records.filter(function(r){return r.temperature;}).length;
        if(tempCount >= 14){
          var analysis = (window.analyzeTemperatureLegacy || window.calcTemperaturePhases)(window.state.records);
          if(analysis.status === 'ready' && analysis.alerts.length > 0){
            msg = '⚠️ あなたの体温データから'+analysis.alerts.length+'件の気になるパターンが検出されています。詳細な分析と医師相談の目安を確認できます。';
          } else {
            msg = '🌡️ '+tempCount+'日分の体温データから、低温期・高温期の判定、二相性分析、排卵推定、AMED研究（31万人）との比較が可能です。';
          }
        }
      } else if(callback === window.openCorrelationReport){
        msg = '🔬 あなたの生活要因と症状の相関を分析。「カフェインを摂った日は痛みが2.4倍」のような具体的な発見ができます。';
      } else if(callback === window.openFlareupReport){
        var flareCount = window.detectFlareups(window.state.records).length;
        if(flareCount > 0){
          msg = '🔥 '+flareCount+'件のフレアアップ（体調急変）を検出。トリガーとなった要因を特定できます。';
        }
      } else if(callback === window.openCyclePhaseReport){
        msg = '🌸 生理周期の各フェーズ（月経期・卵胞期・排卵期・黄体期）ごとの体調傾向を比較できます。';
      } else if(callback === window.openExperiments){
        msg = '🧪 「グルテンフリー30日」「毎日運動」など、仮説を立てて体調変化を検証できます。';
      }

      if(msg){
        dynamicMsg.innerHTML = '<div style="padding:12px 16px;background:linear-gradient(135deg,#fdf8f6,#f8f0ec);border-radius:12px;margin-bottom:16px;font-size:11px;color:var(--ink-mid);line-height:1.7;">'+msg+'</div>';
        dynamicMsg.style.display = 'block';
      } else {
        dynamicMsg.style.display = 'none';
      }
    }

    document.getElementById('premiumLockOverlay').classList.add('active');
  }
}

export function closePremiumLock() {
  document.getElementById('premiumLockOverlay').classList.remove('active');
}

// PR-090-R6 (Legacy Removal, EXPORT_HUB_REFACTOR_COUNCIL Step D): 自己export化。
// app-legacy.js側の重複export行（guarded window.X = X）は削除済み。
window.closePremiumLock       = closePremiumLock;
window.premiumGate            = premiumGate;
window.renderProHero          = renderProHero;
window.submitPremiumWaitlist  = submitPremiumWaitlist;
window.updatePremiumBadges    = updatePremiumBadges;
