// ============================================================
// ippo – src/modules/tab-navigation.js
// Phase D-1: tab UI 切替ロジックの module 化
//
// app.html の inline switchTab() をここへ移植。
// window.switchTab を上書きし、既存の onclick ハンドラと互換を維持。
// tab-specific な更新関数は window.* 経由で呼び出す（まだ inline に残る）。
// ============================================================

export function switchTab(tab, btn) {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });

  const screen = document.getElementById('screen-' + tab);
  if (screen) screen.classList.add('active');
  if (btn) btn.classList.add('active');

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
