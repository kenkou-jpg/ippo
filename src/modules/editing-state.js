// ============================================================
//  ippo – src/modules/editing-state.js
//  Phase 3: Record Edit Hydration Extraction
//
//  責務:
//    - 編集中のレコード状態 (date / source) の single source of truth
//    - window.state.currentEditingDate / editingDate / recordDate
//      への直接 mutation を排除する
//    - window.__ippoActiveEditDate 等の window-level bridge は
//      transitional compat として維持する
//
//  API:
//    getEditingState()           → { date, source, at }
//    setEditingState(date, src)  → updates internal state + window bridges
//    clearEditingState()         → resets state + window bridges
//
//  提供: window.ippoEditingState
//  依存: なし (state.js 非依存・window.state 非依存)
// ============================================================

// ─── Internal state ───────────────────────────────────────
var _editing = {
  date:   '',
  source: '',
  at:     0,
};

// ─── getEditingState ──────────────────────────────────────
export function getEditingState() {
  return { date: _editing.date, source: _editing.source, at: _editing.at };
}

// ─── setEditingState ──────────────────────────────────────
// window.state を一切 mutate しない。
// window-level bridge (transitional) のみ更新する。
export function setEditingState(date, source) {
  var normalized = String(date || '').trim();
  _editing = {
    date:   normalized,
    source: String(source || ''),
    at:     Date.now(),
  };
  _syncWindowBridges(normalized);
  return { date: normalized, source: _editing.source, at: _editing.at };
}

// ─── clearEditingState ────────────────────────────────────
export function clearEditingState() {
  _editing = { date: '', source: '', at: 0 };
  _syncWindowBridges('');
}

// ─── Window bridge sync (transitional compat) ─────────────
// 他モジュールが window.currentEditingDate 等を直接読む場合の後方互換。
// window.state への書き込みは行わない。
function _syncWindowBridges(date) {
  try { window.__ippoActiveEditDate = date || null; } catch (_) {}
  try { window.currentEditingDate   = date || null; } catch (_) {}
  try { window.editingDate          = date || null; } catch (_) {}
}

// ─── Public API ───────────────────────────────────────────
window.ippoEditingState = {
  getEditingState:   getEditingState,
  setEditingState:   setEditingState,
  clearEditingState: clearEditingState,
};
