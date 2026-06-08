// ================================================================
//  ippo – src/modules/pro/shared/pro-overlay-base.js
//  PRO overlay の共有ファクトリー
//
//  共有するもの: DOM構造・アニメーション・lifecycle・singleton safety
//  共有しないもの: feature の責務・title・data・state・body content
//
//  ── Lifecycle ────────────────────────────────────────────────
//
//    createProOverlay({ … })
//      ↓  DOM生成・ESC handler登録 (named ref, removable)
//    open()
//      ↓  competing overlay を close → self を activeProOverlay に登録
//         pob-open付与・scroll lock・close timer cancel
//    feature: render / bind
//      ↓  feature が body.innerHTML を書き、footer button をバインド
//    close()
//      ↓  activeProOverlay を null に → pob-open除去 → _renderToken++
//         scroll restore を 280ms timer で予約
//         (timer は _activeOverlay === null の時のみ overflow を戻す)
//    cleanup()   ← destroy 専用（app reset / logout / hard unmount）
//      ↓  timer cancel, ESC remove, body clear, overlay.remove()
//
//  ── Singleton safety ─────────────────────────────────────────
//
//  _activeOverlay（module-level）で現在 open 中の overlay を追跡。
//  新 open 時に別 overlay が active なら先に close() する。
//  overlay stack・nested open・multi-open は禁止。
//
//  ── Async render safety (render token) ───────────────────────
//
//  close() は _renderToken をインクリメントする。
//  feature 側は非同期処理の前に nextToken() でトークンを取得し、
//  結果を body へ書く前に isStale(token) を確認する。
//
//    const token = _api.nextToken();
//    const data  = await asyncWork();
//    if (_api.isStale(token)) return;   // close 後なら書かない
//    _api.body.innerHTML = render(data);
//
//  ── Ownership rules ──────────────────────────────────────────
//
//  · document.body.style.overflow  → overlay base のみ変更可
//  · document keydown (ESC)        → overlay base が単独所有
//  · feature code は上記を直接操作しない
//
//  使用例:
//    import { createProOverlay } from '../shared/pro-overlay-base.js';
//
//    const { overlay, body, open, close, cleanup,
//            nextToken, isStale, getButton } =
//      createProOverlay({
//        id:        'dvs-overlay',
//        ariaLabel: '受診用まとめ',
//        title:     '受診用まとめ',
//        subtitle:  '…',
//        footer:    [ { id: 'dvs-close', label: '閉じる', cls: 'pob-btn pob-btn-secondary' } ],
//        onClose:   closeFn,
//      });
// ================================================================

/**
 * @typedef {Object} OverlayButton
 * @property {string} id    - button element id
 * @property {string} label - button text
 * @property {string} cls   - CSS class(es)
 */

// ── Module-level singleton tracker ───────────────────────────
/** @type {{ element: HTMLElement, closeFn: () => void } | null} */
let _activeOverlay = null;

/**
 * @param {Object}           opts
 * @param {string}           opts.id          - overlay element id (feature-unique)
 * @param {string}           opts.ariaLabel   - accessible label
 * @param {string}           opts.title       - header title text
 * @param {string}           opts.subtitle    - header subtitle text
 * @param {OverlayButton[]}  [opts.footer]    - footer button definitions
 * @param {string}           [opts.disclaimer]- disclaimer text (optional)
 * @param {() => void}       opts.onClose     - called when overlay should close
 * @returns {{
 *   overlay:   HTMLElement,
 *   body:      HTMLElement,
 *   open:      () => void,
 *   close:     () => void,
 *   cleanup:   () => void,
 *   nextToken: () => number,
 *   isStale:   (token: number) => boolean,
 *   getButton: (id: string) => HTMLButtonElement | null
 * }}
 */
export function createProOverlay({ id, ariaLabel, title, subtitle, footer = [], disclaimer = '', onClose }) {
  // ── Build DOM ───────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.className = 'pob-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', ariaLabel);

  const footerHTML = footer.length
    ? `<div class="pob-footer">${
        footer.map(b => `<button id="${b.id}" class="${b.cls}">${b.label}</button>`).join('')
      }</div>`
    : '';

  const disclaimerHTML = disclaimer
    ? `<div class="pob-disclaimer">${disclaimer}</div>`
    : '';

  overlay.innerHTML = `
    <div class="pob-sheet">
      <div class="pob-handle"></div>
      <div class="pob-header">
        <div>
          <div class="pob-title">${title}</div>
          <div class="pob-subtitle">${subtitle}</div>
        </div>
        <button class="pob-close-btn pob-close-x" aria-label="閉じる">✕</button>
      </div>
      <div class="pob-body"></div>
      ${disclaimerHTML}
      ${footerHTML}
    </div>`;

  const mountRoot = document.getElementById('app') || document.body;
  mountRoot.appendChild(overlay);

  const body = overlay.querySelector('.pob-body');

  // ── Per-instance state ──────────────────────────────────────
  let _closeTimer  = null;
  let _renderToken = 0;

  // Named ESC handler — stored so it can be removed in cleanup()
  const _escHandler = (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('pob-open')) onClose();
  };
  document.addEventListener('keydown', _escHandler);

  // Backdrop click
  overlay.addEventListener('click', e => {
    if (e.target === overlay) onClose();
  });

  // Close-X button
  overlay.querySelector('.pob-close-x').addEventListener('click', onClose);

  // ── close() defined first so open() can reference it ───────
  const closeSelf = () => {
    // Release singleton slot
    if (_activeOverlay?.element === overlay) _activeOverlay = null;

    overlay.classList.remove('pob-open');

    // Invalidate any in-flight async renders
    _renderToken++;

    // Cancel any previous close timer before scheduling a new one
    if (_closeTimer) clearTimeout(_closeTimer);
    _closeTimer = setTimeout(() => {
      _closeTimer = null;
      // Restore scroll only if this overlay is still closed AND
      // no other PRO overlay has since become active
      if (!overlay.classList.contains('pob-open') && _activeOverlay === null) {
        document.body.style.overflow = '';
      }
    }, 280);
  };

  // ── open() ─────────────────────────────────────────────────
  const openSelf = () => {
    // Singleton safety: close any other active PRO overlay first
    if (_activeOverlay && _activeOverlay.element !== overlay) {
      _activeOverlay.closeFn();
    }

    // Register self as the active overlay
    _activeOverlay = { element: overlay, closeFn: closeSelf };

    // Cancel any pending close-animation timer for this overlay
    if (_closeTimer) { clearTimeout(_closeTimer); _closeTimer = null; }

    overlay.classList.add('pob-open');
    document.body.style.overflow = 'hidden';
  };

  return {
    overlay,
    body,

    /** Open the overlay. Closes any competing PRO overlay first. */
    open: openSelf,

    /** Close the overlay. Restores scroll after animation completes. */
    close: closeSelf,

    /**
     * Full teardown — destroy mode only (app reset / logout / hard unmount).
     * Normal open/close cycles do NOT need this.
     */
    cleanup() {
      if (_activeOverlay?.element === overlay) _activeOverlay = null;
      if (_closeTimer) { clearTimeout(_closeTimer); _closeTimer = null; }
      _renderToken++;
      document.removeEventListener('keydown', _escHandler);
      body.innerHTML = '';
      overlay.remove();
    },

    /**
     * Mint a render token. Call just before starting any async work.
     * @returns {number} token
     */
    nextToken() { return ++_renderToken; },

    /**
     * Returns true if the token is outdated — the overlay was closed
     * (or re-opened) since the token was minted.
     * @param {number} token
     * @returns {boolean}
     */
    isStale(token) { return token !== _renderToken; },

    /**
     * Get a footer button by id.
     * @param {string} btnId
     * @returns {HTMLButtonElement | null}
     */
    getButton(btnId) {
      return overlay.querySelector(`#${btnId}`);
    },
  };
}
