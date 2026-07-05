// ================================================================
//  ippo – src/modules/success-overlay.js
//  PR-090-P1 (Legacy Completion Recovery): 記録完了オーバーレイの
//  クローズ処理（closeSuccess）を新設・物理移動。Business Logic変更なし。
// ================================================================

export function closeSuccess() {
  if (window.__ippoSuccessOverlayTimer) {
    clearTimeout(window.__ippoSuccessOverlayTimer);
    window.__ippoSuccessOverlayTimer = null;
  }
  var overlay = document.getElementById('success-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.opacity = '';
  }
}
