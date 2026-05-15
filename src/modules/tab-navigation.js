// ============================================================
// ippo – src/modules/tab-navigation.js
// Phase D-1: tab UI 切替ロジックの module 化
//
// app.html の inline switchTab() をここへ移植。
// window.switchTab を上書きし、既存の onclick ハンドラと互換を維持。
// tab-specific な更新関数は window.* 経由で呼び出す（まだ inline に残る）。
// ============================================================

import { ensureScreenLoaded, showScreen } from './screen-router.js';

export async function switchTab(tab, btn) {
  // calendar / insights は静的 DOM に存在しないため fetch して注入
  await ensureScreenLoaded(tab);

  // showScreen() 経由で state.currentScreen を更新する。
  // welcome-reset-guard が setTimeout(0) で showScreen(getCurrentScreen()) を
  // 呼ぶため、ここで currentScreen を正しいタブに更新しないと home に戻される。
  await showScreen(tab);

  // nav ボタンのアクティブ状態を同期（showScreen は data-tab-for を見るが
  // ボトムナビは data-tab 属性のため手動で合わせる）
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  if (btn) btn.classList.add('active');

  window.scrollTo(0, 0);

  if (tab === 'insights') {
    let activePaneName = 'free';
    const proPan = document.getElementById('ins-pane-pro');
    const docPan = document.getElementById('ins-pane-doctor');
    if (proPan && proPan.style.display === 'block') activePaneName = 'pro';
    if (docPan && docPan.style.display === 'block') activePaneName = 'doctor';
    if (typeof window.switchInsTab === 'function') window.switchInsTab(activePaneName);
    if (typeof window.renderInsightDiscoveries === 'function') window.renderInsightDiscoveries();
  }

  if (tab === 'home') {
    if (typeof window.buildHomeWeekRow === 'function') window.buildHomeWeekRow();
    if (typeof window.updateHomeInsightCard === 'function') window.updateHomeInsightCard();
    if (typeof window.updateHomeNumbers === 'function') window.updateHomeNumbers();
    if (typeof window.updateHomeDiseaseAdvice === 'function') window.updateHomeDiseaseAdvice();
    if (typeof window.updateHomeCTAState === 'function') window.updateHomeCTAState();
    if (typeof window.updateHomePhaseBanner === 'function') window.updateHomePhaseBanner();
    if (typeof window.updateTodayMessage === 'function') window.updateTodayMessage();
  }

  if (tab === 'calendar') {
    if (typeof window.buildCalendar === 'function') window.buildCalendar();
  }
}

// inline の function 宣言より後に実行されるため安全に上書きできる
window.switchTab = switchTab;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('tab-navigation-module-loaded');
}
