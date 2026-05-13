// ============================================================
// ippo – src/modules/record-modal-controller.js
// Phase D-1: record modal open/close の module 化（所有権確立フェーズ）
//
// openRecordModal / closeModal の実装は app.html inline に残る。
// ここでは module 境界を確立し、window.* 経由で inline 実装を委譲する。
// Phase D-2 でモーダル内の currentRecord/currentStep を module 変数に移行し、
// 実装をここへ移植する予定。
//
// 依存: closeModal → switchTab（tab-navigation.js に移植済み）
// ============================================================

// Vite module はすべての inline <script> 実行後にロードされるため、
// この時点で window.openRecordModal / window.closeModal は inline 実装を指している。
const _inlineOpenRecordModal = typeof window.openRecordModal === 'function'
  ? window.openRecordModal
  : null;

const _inlineCloseModal = typeof window.closeModal === 'function'
  ? window.closeModal
  : null;

export function openRecordModal() {
  if (typeof _inlineOpenRecordModal === 'function') {
    return _inlineOpenRecordModal.apply(this, arguments);
  }
}

export function closeModal() {
  if (typeof _inlineCloseModal === 'function') {
    return _inlineCloseModal.apply(this, arguments);
  }
}

window.openRecordModal = openRecordModal;
window.closeModal = closeModal;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('record-modal-controller-loaded');
}
