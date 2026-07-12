// ================================================================
//  ippo – src/modules/share.js
//  PR-087 (Legacy Removal Batch-9): Share & Add-to-Home
//
//  app-legacy.js の共有・ホーム画面追加系（shareApp/addToHome）を新設・物理移動。
//  Business Logic変更なし。
// ================================================================

import { showAlertModal } from './ui-notifications.js';

export function shareApp() {
  if (navigator.share) {
    navigator.share({
      title: 'ippo - 卵巣ケア記録アプリ',
      text: '生理周期・卵巣ケアのセルフ記録アプリです。一緒に続けましょう！',
      url: window.location.href
    });
  } else {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showAlertModal('URLをコピーしました！友だちに送ってください。');
    });
  }
}

export function addToHome() {
  showAlertModal('ブラウザの「ホーム画面に追加」からアプリとして追加できます。<br>iOS: 共有ボタン → 「ホーム画面に追加」<br>Android: メニュー → 「ホーム画面に追加」');
  // バグ18: フラグを保存してリロード後も非表示を維持
  try { localStorage.setItem('ippo_hide_add_home', '1'); } catch(e) {}
  document.getElementById('add-home-banner').style.display = 'none';
}

// PR-090-R2 (EXPORT_HUB_REFACTOR_COUNCIL Step A): 自己export追加。
// app-legacy.js側の重複export行は削除済み。
window.shareApp = shareApp;
window.addToHome = addToHome;
