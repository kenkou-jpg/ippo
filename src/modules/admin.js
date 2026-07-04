// ================================================================
//  ippo – src/modules/admin.js
//  PR-088 (Legacy Removal Batch-10): Admin Panel
//
//  app-legacy.js の管理者パネル機能（initAdminPanel/adminSetPremium/
//  adminLoadPremiumUsers）を新設・物理移動。Business Logic変更なし。
//
//  ・ADMIN_USER_ID は isAdminOrPremium()（app-legacy.js側に残置、Batch-10対象外）も
//    参照するため、本ファイルをsource of truthとしexport → app-legacy.js側で
//    import back（fasting.js FAST_PHASE_CONFIGと同型の既存idiom）。
//  ・bare `supabase` は services/supabase.js から直接 import
//    （audit記載の「supabase.js 経由に整理」に対応）。
//  ・bare `supabaseUserId`（app-legacy.js側 var、ログイン処理が更新）は
//    window.__ippoGetSupabaseUserId() 経由の読み取りに変更
//    （PR-080E window.__ippoGetBowelCount と同型パターン。community.jsと共通）。
// ================================================================

import { supabase } from '../services/supabase.js';

export var ADMIN_USER_ID = '723dba96-caf3-48d6-9fdc-4151071bbc89';

export function initAdminPanel(){
  if(window.__ippoGetSupabaseUserId() === ADMIN_USER_ID){
    var panel = document.getElementById('admin-panel');
    if(panel) panel.style.display = 'block';
  }
}

export function adminSetPremium(value){
  var email = document.getElementById('admin-email').value.trim();
  var result = document.getElementById('admin-result');
  if(!email){
    result.innerHTML = '<span style="color:#c9747a;">メールアドレスまたはuser_idを入力してください</span>';
    return;
  }
  result.innerHTML = '<span style="color:var(--ink-light);">処理中...</span>';

  supabase.auth.getSession().then(function(res){
    var session = res.data.session;
    if(!session){ result.innerHTML = '<span style="color:#c9747a;">ログインが必要です</span>'; return; }

    // まずuser_idとして試す
    supabase.from('profiles').update({ is_premium: value }).eq('user_id', email).select().then(function(r){
      if(r.data && r.data.length > 0){
        result.innerHTML = '<span style="color:#8aab96;">✓ ' + email + ' を Premium ' + (value ? 'ON' : 'OFF') + ' に設定しました</span>';
        document.getElementById('admin-email').value = '';
      } else {
        result.innerHTML = '<span style="color:#c9747a;">ユーザーが見つかりません。user_idを確認してください。</span>';
      }
    });
  });
}

export function adminLoadPremiumUsers(){
  var list = document.getElementById('admin-user-list');
  list.innerHTML = '<div style="font-size:12px;color:var(--ink-light);">読み込み中...</div>';

  supabase.from('profiles').select('user_id,name,is_premium,created_at').eq('is_premium', true).then(function(r){
    if(!r.data || r.data.length === 0){
      list.innerHTML = '<div style="font-size:12px;color:var(--ink-light);">プレミアムユーザーはいません</div>';
      return;
    }
    var html = '';
    r.data.forEach(function(u){
      var date = new Date(u.created_at).toLocaleDateString('ja-JP');
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--white);border-radius:10px;margin-bottom:6px;border:1px solid #f0ebe6;">';
      html += '<div><div style="font-size:13px;color:var(--ink);font-weight:500;">' + (u.name || '名前なし') + '</div>';
      html += '<div style="font-size:10px;color:var(--ink-light);">' + u.user_id.substring(0,8) + '... | ' + date + '</div></div>';
      html += '<span style="font-size:10px;background:var(--rose-pale);color:var(--rose);padding:3px 8px;border-radius:8px;">PRO</span>';
      html += '</div>';
    });
    list.innerHTML = html;
  });
}
