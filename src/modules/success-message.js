// ================================================================
//  ippo – src/modules/success-message.js
//  PR-087 (Legacy Removal Batch-9): 記録完了メッセージ
//
//  app-legacy.js のパーソナライズされた記録完了メッセージ生成（getSuccessMessage）を
//  新設・物理移動。Business Logic変更なし。
//
//  ・audit文書はgetSuccessMessageの移植先を明示していなかったため、実装前調査を
//    実施: 隣接するcloseSuccess（overlay開閉制御）はBatch-9対象外でapp-legacy.js
//    残置のため、record-input.js等の既存モジュールに同居させず
//    cycle-utils.js/temp-alert.js等と同型の「1 feature = 1 owner」判断で専用新設
//    ファイルへ分離。
//  ・bare `state` → `window.state`、bare `ICONS` → `window.ICONS`
//    （home-renderer.js等の既存idiomと同型）。
// ================================================================

// ===== パーソナライズされた記録完了メッセージ =====
export function getSuccessMessage(record) {
  var streak = window.state.streak || 0;
  var pain = record && record.painLevel !== undefined ? record.painLevel : -1;

  var iconSvg = window.ICONS.check(32, 'var(--rose)');
  var title = '記録できました';
  var msg = '今日もからだの声を聴いてくれてありがとう。';

  // 連続記録マイルストーン
  if (streak === 7)  { iconSvg = window.ICONS.star(32, 'var(--gold)'); title = '7日連続達成！'; msg = '1週間、続けられました。パターンが見え始めてきます。'; }
  else if (streak === 14) { iconSvg = window.ICONS.star(32, 'var(--gold)'); title = '2週間連続！'; msg = 'この記録が、次の診察を変えてくれます。'; }
  else if (streak === 30) { iconSvg = window.ICONS.star(32, 'var(--gold)'); title = '1ヶ月達成！'; msg = 'AIパターン解析でこの30日間を振り返りましょう。'; }

  // 痛みがある日
  else if (pain >= 3) { iconSvg = window.ICONS.heart(32, 'var(--rose)'); title = '記録できました'; msg = 'つらい日も記録してくれてありがとう。この積み重ねが大切です。'; }
  else if (pain === 0) { iconSvg = window.ICONS.sun(32, 'var(--gold)'); title = '今日は楽な日ですね'; msg = 'こういう日のデータも、パターン発見に役立ちます。'; }

  return { icon: iconSvg, title: title, msg: msg };
}
