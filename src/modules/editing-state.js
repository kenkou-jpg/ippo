// ============================================================
//  ippo – src/modules/editing-state.js
//  Phase 3: Record Edit Hydration Extraction
//
//  責務:
//    - 編集中のレコード状態 (date / source) の single source of truth
//
//  API:
//    getEditingState()           → { date, source, at }
//    setEditingState(date, src)  → updates internal state
//    clearEditingState()         → resets state
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
export function setEditingState(date, source) {
  var normalized = String(date || '').trim();
  _editing = {
    date:   normalized,
    source: String(source || ''),
    at:     Date.now(),
  };
  return { date: normalized, source: _editing.source, at: _editing.at };
}

// ─── clearEditingState ────────────────────────────────────
export function clearEditingState() {
  _editing = { date: '', source: '', at: 0 };
}

// ─── Public API ───────────────────────────────────────────
window.ippoEditingState = {
  getEditingState:   getEditingState,
  setEditingState:   setEditingState,
  clearEditingState: clearEditingState,
};
