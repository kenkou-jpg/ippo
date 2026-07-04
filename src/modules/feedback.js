// ================================================================
//  ippo – src/modules/feedback.js
//  PR-087 (Legacy Removal Batch-9): Feedback
//
//  app-legacy.js のフィードバック評価系（setRating/submitFeedback）を新設・物理移動。
//  Business Logic変更なし。
//
//  ・bare `state` → `window.state`（_ippoStateHooks経由、既存idiomと同型）。
// ================================================================

import { showAlertModal } from './ui-notifications.js';

export function setRating(n) {
  window.state.rating = n;
  document.querySelectorAll('.fb-star').forEach((s, i) => {
    s.classList.toggle('active', i < n);
  });
}

export function submitFeedback() {
  if (!window.state.rating) { showAlertModal('評価を選んでください'); return; }
  var comment = document.getElementById('fb-comment') ? document.getElementById('fb-comment').value.trim() : '';
  var subject = encodeURIComponent('ippoフィードバック - ' + window.state.rating + '星');
  var body = encodeURIComponent('評価: ' + window.state.rating + '/5\n\n感想:\n' + (comment || '（なし）') + '\n\nユーザー: ' + (window.state.name || '匿名') + '\n日時: ' + new Date().toLocaleString('ja-JP'));
  window.location.href = 'mailto:YOUR_EMAIL@example.com?subject=' + subject + '&body=' + body;
  showAlertModal('ありがとうございます！メーラーが開きます 🌸');
  window.state.rating = 0;
  document.querySelectorAll('.fb-star').forEach(function(s){ s.classList.remove('active'); });
  if(document.getElementById('fb-comment')) document.getElementById('fb-comment').value = '';
}
