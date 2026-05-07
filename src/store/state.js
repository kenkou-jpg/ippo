// ============================================================
//  ippo – src/store/state.js
//  state 初期値 / loadState / saveState を一元管理
//
//  移設元: app.html (state = {...} / function saveState)
//  ロジック変更なし。構造・キーはすべて原形のまま。
// ============================================================

export const STATE_KEY = 'ippo_state';

// ─── デフォルト初期値（app.html から移設） ────────────────────
export const INITIAL_STATE = Object.freeze({
  name:            '',
  records:         [],
  streak:          0,
  totalDays:       0,
  fastingActive:   false,
  fastingStart:    null,
  fastGoal:        12,
  fastTimer:       null,
  rating:          0,
  myVision:        '',
  lastPeriodDate:  null,
  cycleLength:     28,
  cycleIrregular:  false,
  birthYear:       null,
  purpose:         null,
  reminderTime:    null,
});

// ─── saveState ──────────────────────────────────────────────
// ★ window.state を参照: init() が state を再代入（オブジェクト置換）
//   するため、モジュールローカルの参照ではなく常に window.state を読む。
export function saveState() {
  try {
    var s = window.state;
    s.lastSaved = new Date().toISOString();
    localStorage.setItem(STATE_KEY, JSON.stringify(s));
  } catch(e) {
    console.warn('ippo: saveState failed', e);
  }
}

// ─── loadState ──────────────────────────────────────────────
// app.html の init() 内インライン処理を関数化（将来の init 整理用）
// 現時点では init() はそのまま動作させるため、この関数は補助的な役割。
export function loadState() {
  try {
    var saved = localStorage.getItem(STATE_KEY);
    if (saved) {
      window.state = Object.assign({}, window.state || Object.assign({}, INITIAL_STATE), JSON.parse(saved));
    }
  } catch(e) {
    console.warn('ippo: loadState failed', e);
  }
  return window.state;
}

// ─── window 互換（移行期間: 非モジュール <script> との共存） ──
// window.state 本体は app.html の init() が localStorage から設定するため
// ここでは saveState / loadState / STATE_KEY のみ window に公開する。
window.saveState  = saveState;
window.loadState  = loadState;
window.STATE_KEY  = STATE_KEY;
