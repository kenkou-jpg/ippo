// ============================================================
//  ippo – home-next-shell.js v2
//  Calm Insight HOME オーケストレーター
//
//  Feature flag: localStorage['ippo_home_next'] === '1'
//  ON のとき window.showMain を showHomeNext に差し替える。
//  既存の home / calendar / record / persistence は一切変更しない。
//
//  Phase B: settings-store 統合
//  - 設定は window.getSettingsStore() 経由で取得（state.settingsProfile 直接依存を排除）
//  - trackedConditions → getHomeConfiguration() に渡す（state.myDiseases フォールバック付き）
//  - fallback: getSettingsStore が未定義なら state.settingsProfile へ後退（安全な並走）
//
// ─── home-next Feature Parity Map (Phase B: migration prep) ──
// ✅ covered by home-next  ┆  ⬜ legacy-only (未移植)
//
// ✅ Hero / greeting       ┆  ⬜ 今日のCTA状態 (updateHomeCTAState)
// ✅ Status cards          ┆
// ✅ 週間カレンダーバー(buildWeekStrip)┆  ← PR-EXP-04で再有効化（home-next-status.js内）
// ✅ Today insight         ┆  ⬜ 数値ハイライト (updateHomeNumbers)
// ✅ Disease-aware config  ┆  ⬜ フェーズバナー (updateHomePhaseBanner)
// ✅ homeModules filter    ┆  ⬜ todayMessage (updateTodayMessage)
// ✅ displayStyle CSS attr ┆
// ✅ currentMode CSS attr  ┆
// ✅ Quick record CTA      ┆
// ✅ Recovery trend        ┆
// ✅ Daily note            ┆
// ✅ Personalize section   ┆
// ✅ Medical summary       ┆
// ✅ Reflections           ┆
// ✅ Experiment suggestion ┆
//
// Legacy dependency map (home-renderer.js → screen-home):
//   window.buildHomeWeekRow        → home-renderer.js:buildHomeWeekRow
//     （PR-EXP-04以降、home-next側は独自のbuildWeekStrip[home-next-status.js]を使用。
//      window.buildHomeWeekRowはscreen-home専用のまま、下記noOp化の対象は変わらない）
//   window.updateHomeInsightCard   → home-renderer.js:updateHomeInsightCard
//   window.updateHomeDiseaseAdvice → home-renderer.js:updateHomeDiseaseAdvice
//   window.updateHomeNumbers       → home-renderer.js:updateHomeNumbers
//   window.updateHomeCTAState      → home-renderer.js:updateHomeCTAState
//   window.showMain                → app-legacy.js:showMain (→ home-next が上書き)
// ============================================================

import './home-next.css';

import { getState }                  from '../../store/state.js';
import { showScreen }                from '../screen-router.js';
import { renderSharedHeader }        from '../shared-header.js';
import { getHomeConfiguration }      from './home-next-config.js';
import { renderHero }                from './home-next-hero.js';
import { renderStatusCards }         from './home-next-status.js';
import { renderInsights }            from './home-next-insights.js';
import { renderOptionalModules }     from './home-next-optional.js';
import { renderQuickRecord }         from './home-next-quick-record.js';
import { renderPersonalizeSection }  from './home-next-personalize.js';
import { renderDailyNote }           from './home-next-daily-note.js';
import { renderMedicalSummary }      from './home-next-medical-summary.js';
import { renderReflections }         from './home-next-reflections.js';
import { renderRecovery, renderExperiment } from './home-next-recovery.js';

// ── Feature flag ─────────────────────────────────────────

const FLAG_KEY = 'ippo_home_next';

export function isHomeNextEnabled() {
  try {
    const st = getState();
    // 明示的に false が設定された場合のみ無効（デフォルト有効）
    if (st && st.homeNextEnabled === false) return false;
    const flag = localStorage.getItem(FLAG_KEY);
    return flag !== '0';
  } catch {
    return true;
  }
}

export function enableHomeNext()  { try { localStorage.setItem(FLAG_KEY, '1'); }    catch { /* noop */ } }
export function disableHomeNext() { try { localStorage.removeItem(FLAG_KEY); }       catch { /* noop */ } }

// ── ヘッダーバー: shared-header.js に移管 ────────────────

// ── グリーティング・日付 ─────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 10) return 'おはよう、';
  if (h >= 10 && h < 17) return 'こんにちは、';
  if (h >= 17 && h < 21) return 'こんばんは、';
  return 'おつかれさまです、';
}

// currentMode ごとのサブグリーティング
const MODE_SUB_GREETINGS = {
  tired:       '今日は、ゆっくり過ごす方向でいきましょう。',
  overworked:  '少し立ち止まって、からだを労わる日にしましょう。',
  anxious:     'からだの声を静かに聴いていきましょう。',
  recovery:    '回復を優先できるよう、静かな表示に整えています。',
  fluctuating: '波があるのは自然なことです。今日のあなたを確認してみましょう。',
  slow:        'ゆっくり整えていきましょう。急がなくていいです。',
};

function getSubGreeting(state, records) {
  // Phase B: settings-store 経由で currentMode を取得（直接 state.settingsProfile に依存しない）
  const mode = (typeof window.getSettingsStore === 'function'
    ? window.getSettingsStore().currentMode
    : (state.settingsProfile && state.settingsProfile.currentMode)) || '';
  if (mode && MODE_SUB_GREETINGS[mode]) return MODE_SUB_GREETINGS[mode];

  // 今日の記録があれば状態に合わせた一言
  const today = new Date().toISOString().slice(0, 10);
  const todayRec = (records || []).find(r =>
    (r.date || r.record_date || '').slice(0, 10) === today
  );

  if (!todayRec && records.length === 0) {
    return 'からだの記録を始めましょう。';
  }
  if (!todayRec) {
    return '今日の体調を記録してみましょう。';
  }

  const pain = todayRec.painLevel ?? 0;
  const sleep = todayRec.sleepQuality ?? 0;

  if (pain >= 3) return '今日はつらい日かもしれません。無理しないで。';
  if (sleep >= 3) return '少し疲れが出やすい状態かもしれません。';
  if (pain === 0 && sleep <= 1) return 'あなたの体は、よくがんばっています。';
  return 'からだの状態を確認していきましょう。';
}

// ── グリーティングセクション ─────────────────────────────

function renderGreeting(container, state) {
  const records  = state.records || [];
  const name     = state.name || 'あなた';
  const greeting = getGreeting();
  const sub      = getSubGreeting(state, records);

  container.innerHTML = `
    <div class="hn-greeting hn-anim-0">
      <div class="hn-greeting-time">${greeting}</div>
      <div class="hn-greeting-name">${esc(name)}さん</div>
      <div class="hn-greeting-sub">${esc(sub)}</div>
    </div>`;
}

// ── メインレンダリング ────────────────────────────────────

function renderAll() {
  const state = getState();

  // Phase B: settings-store 経由で設定を取得（state.settingsProfile 直接依存を排除）
  // fallback: getSettingsStore 未定義の場合は state.settingsProfile に後退（安全な並走）
  const store       = typeof window.getSettingsStore === 'function'
    ? window.getSettingsStore()
    : (state.settingsProfile || {});
  const profile      = store; // alias: 既存の読み箇所との互換
  const displayStyle = profile.displayStyle || 'balanced';

  // trackedConditions: settings-store に統一。未設定なら state.myDiseases にフォールバック。
  const conditions = (Array.isArray(store.trackedConditions) && store.trackedConditions.length)
    ? store.trackedConditions
    : (state.myDiseases || []);
  const config = getHomeConfiguration(conditions);

  const header         = document.getElementById('hn-header');
  const greeting       = document.getElementById('hn-greeting');
  const hero           = document.getElementById('hn-hero');
  const status         = document.getElementById('hn-status');
  const insights       = document.getElementById('hn-insights');
  const medicalSummary = document.getElementById('hn-medical-summary');
  const record         = document.getElementById('hn-record');
  const experiment      = document.getElementById('hn-experiment');

  // PHASE 1: 除外セクションのコンテナをクリア（ファイル・ロジックは保持）
  // PR-P2-01 (Phase2 Implementation): hn-experimentはPHASE2_IMPLEMENTATION_COUNCIL.mdの
  // Value Ladder③改善ギャップを埋めるため再有効化。
  // PR-HOME-02 (IMPLEMENTATION_PLAN_V1.1 Phase2): hn-heroも既存renderHero()を
  // 再接続して有効化。残る4セクションはScope外のため無変更のまま維持
  ['hn-daily-note','hn-personalize','hn-optional',
   'hn-recovery','hn-reflections'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });

  // Adaptive Calmness: currentMode + displayStyle を data 属性でスクリーンに付与
  const screenEl = document.getElementById('screen-home-next');
  if (screenEl) {
    const currentMode = profile.currentMode || '';
    screenEl.setAttribute('data-mode', currentMode);
    screenEl.setAttribute('data-display', displayStyle);
    // PHASE 4: context-engine の emotionalTone / uiDensity を data 属性として付与
    // CSS セレクタ [data-tone] / [data-density] でテーマ調整に利用可能
    const ctx = typeof window.getCompanionContext === 'function'
      ? window.getCompanionContext()
      : null;
    if (ctx) {
      screenEl.setAttribute('data-tone',    ctx.emotionalTone || '');
      screenEl.setAttribute('data-density', ctx.uiDensity     || '');
    }
  }

  if (header)         renderSharedHeader(header);
  if (greeting)       renderGreeting(greeting, state);
  if (hero)           renderHero(hero, config, state);
  if (medicalSummary) renderMedicalSummary(medicalSummary, config, state);
  if (status)         renderStatusCards(status, config, state);
  if (insights)       renderInsights(insights, state, config);
  if (record)         renderQuickRecord(record, state);
  // PR-P2-01 (Phase2 Implementation): Gentle Experiment Card再有効化。
  // renderExperiment内部でcompanion-intelligence.js/recovery-journey.js（非LLM・rule-based）
  // の3日クールダウン・データ閾値により、記録不足時・クールダウン中は自動的に非表示になる
  if (experiment)     renderExperiment(experiment);

  // 既存 window bridge 関数も更新
  if (typeof window.updateSettingsHero === 'function') window.updateSettingsHero();
  if (typeof window.updateUnlock       === 'function') window.updateUnlock();
  // PHASE 6: initReminders() 呼び出しを削除
  // home-next.html には #reminder-list が存在しないため完全な no-op だった
  // リマインダーは settings 画面側の reminders-ui.js が担当
}

// settings-profile-changed イベントでホームを再描画
window.addEventListener('ippo:settings-profile-changed', function() {
  try {
    const screenEl = document.getElementById('screen-home-next');
    if (screenEl && screenEl.classList.contains('active')) renderAll();
  } catch (_) {}
});

// ── showHomeNext ─────────────────────────────────────────

export async function showHomeNext() {
  await showScreen('home-next');
  renderAll();
}

// ── tab-navigation との統合 ──────────────────────────────

function patchTabNavigation() {
  const originalSwitchTab = window.switchTab;

  window.switchTab = async function (tab, btn) {
    if (tab === 'home') {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      if (btn) btn.classList.add('active');
      window.scrollTo(0, 0);
      await showHomeNext();
    } else {
      if (typeof originalSwitchTab === 'function') await originalSwitchTab(tab, btn);
    }
  };

  // tab-nav が個別に呼ぶ update 関数を no-op に (home-next が一括担う)
  const noOp = () => {};
  window.buildHomeWeekRow        = noOp;
  window.updateHomeInsightCard   = noOp;
  window.updateHomeNumbers       = noOp;
  window.updateHomeDiseaseAdvice = noOp;
  window.updateHomeCTAState      = noOp;
  window.updateHomePhaseBanner   = noOp;
  window.updateTodayMessage      = noOp;
}

// ── 初期化 ───────────────────────────────────────────────

export function initHomeNext() {
  if (!isHomeNextEnabled()) return;

  window.showMain = showHomeNext;
  patchTabNavigation();

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('home-next-init');
  }
}

// ── DevTools ヘルパー ─────────────────────────────────────
// コンソールから:
//   window.ippoHomeNext.enable()   → 有効化 (その場でプレビュー)
//   window.ippoHomeNext.disable()  → 無効化してリロード
//   window.ippoHomeNext.preview()  → フラグ操作なしでプレビュー

window.ippoHomeNext = {
  enable()  { enableHomeNext();  initHomeNext(); showHomeNext(); },
  disable() { disableHomeNext(); location.reload(); },
  preview() { initHomeNext(); showHomeNext(); },
  isEnabled: isHomeNextEnabled,
  render: renderAll,
};

// ── 自動起動 ─────────────────────────────────────────────
// tab-navigation.js より後にロードされるため window.switchTab 上書き安全

initHomeNext();

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
