// ================================================================
//  ippo – src/modules/pro/shared/pro-copy-utils.js
//  PRO feature 共有 clipboard utility
//
//  各 PRO feature は copyToClipboard() を使う。
//  個別に navigator.clipboard を呼ばない。
// ================================================================

/**
 * テキストをクリップボードにコピーし、ボタンに完了フィードバックを出す。
 *
 * @param {string}          text       - コピーするテキスト
 * @param {HTMLElement|null} [btn]     - フィードバックを表示するボタン要素
 * @param {string}          [doneText='コピーしました ✓'] - 完了後ボタンに表示するテキスト
 * @param {number}          [resetMs=2200] - 元テキストに戻すまでの ms
 * @returns {Promise<void>}
 */
export async function copyToClipboard(text, btn, doneText = 'コピーしました ✓', resetMs = 2200) {
  if (!text) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // フォールバック: textarea 経由
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (btn) {
      const prev = btn.textContent;
      btn.textContent = doneText;
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = prev;
        btn.disabled = false;
      }, resetMs);
    }
  } catch (_) {
    // コピー失敗は silent
  }
}
