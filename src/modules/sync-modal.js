// ================================================================
//  ippo – src/modules/sync-modal.js
//  PR-083 (Legacy Removal Batch-5): Sync Modal & Auth UI
//
//  app-legacy.js の DEVICE SYNC ブロックから openSyncModal/closeSyncModal/
//  showLoginForm/toggleSyncMode/showMessage/hideMessage を物理移動。
//  Business Logic 変更なし。
//
//  renderSyncUI/submitSync/syncNow/logoutSync/migrateDataToUser は
//  Sync本体ロジックのため app-legacy.js 側に残置（Scope外）。
//  ・openSyncModal → renderSyncUI（残置側）は window.renderSyncUI 経由で参照
//    （PR-080E window.__ippoGetBowelCount と同型パターン）。
//  ・toggleSyncMode → syncMode（残置側 var、submitSyncが参照）は
//    window.__ippoGetSyncMode()/__ippoSetSyncMode() 経由で読み書き
//    （同型パターン）。
//  ・submitSync()/toggleSyncMode() の onclick 文字列呼び出しは
//    window bridge（app-legacy.js末尾）経由でそのまま解決される。
// ================================================================

export function openSyncModal() {
  document.getElementById('syncOverlay').classList.add('active');
  window.renderSyncUI();
}

export function closeSyncModal() {
  document.getElementById('syncOverlay').classList.remove('active');
}

export function showLoginForm() {
  const body = document.getElementById('syncBody');
  body.innerHTML = `
    <div class="sync-status">
      <div class="sync-status-icon">🔄</div>
      <div class="sync-status-text">データを同期する</div>
      <div class="sync-status-sub">メールアドレスでログインすると、<br>どの端末からでも同じ記録にアクセスできます</div>
    </div>
    <div style="background:#FBEAF0;border-radius:10px;padding:10px 14px;margin:12px 0 4px;font-size:11px;color:#72243E;line-height:1.7;">同期データはSupabaseで暗号化管理されます。パスワードは暗号化されており、ippoスタッフも閲覧できません。</div>
    <div id="syncMessage" class="sync-message"></div>
    <div class="sync-form" id="syncLoginForm">
      <div class="sync-form-title" id="syncFormTitle">ログイン</div>
      <input type="email" class="sync-input" id="syncEmail" placeholder="メールアドレス" autocomplete="email">
      <input type="password" class="sync-input" id="syncPassword" placeholder="パスワード（6文字以上）" autocomplete="current-password">
      <button class="sync-form-btn" id="syncSubmitBtn" onclick="submitSync()">ログイン</button>
      <button class="sync-form-toggle" id="syncToggleBtn" onclick="toggleSyncMode()">アカウントをお持ちでない方 → 新規登録</button>
    </div>
  `;
}

export function toggleSyncMode() {
  var mode = window.__ippoGetSyncMode() === 'login' ? 'signup' : 'login';
  window.__ippoSetSyncMode(mode);
  const title = document.getElementById('syncFormTitle');
  const btn = document.getElementById('syncSubmitBtn');
  const toggle = document.getElementById('syncToggleBtn');

  if (mode === 'signup') {
    title.textContent = '新規登録';
    btn.textContent = '登録する';
    toggle.textContent = 'すでにアカウントをお持ちの方 → ログイン';
  } else {
    title.textContent = 'ログイン';
    btn.textContent = 'ログイン';
    toggle.textContent = 'アカウントをお持ちでない方 → 新規登録';
  }

  hideMessage();
}

export function showMessage(text, type) {
  const msg = document.getElementById('syncMessage');
  if (!msg) return;
  msg.className = 'sync-message ' + type;
  msg.textContent = text;
}

export function hideMessage() {
  const msg = document.getElementById('syncMessage');
  if (msg) msg.className = 'sync-message';
}
