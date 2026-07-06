// ================================================================
//  ippo – src/modules/community.js
//  PR-088 (Legacy Removal Batch-10): Community Voice
//
//  app-legacy.js の Community Voice 機能（loadCommunityTopic/loadCVArchive/
//  toggleArchiveReplies/loadCommunityReplies/postCommunityReply/
//  likeCommunityReply）を物理移動。Business Logic変更なし。
//
//  ・audit文書（phase4d-legacy-migration-audit.md Batch-10節）は上記6関数のみを
//    列挙していたが、実装前調査の結果 switchCVTab/deleteCommunityReply/
//    updateReplyLikeCount/checkMyLikes の未文書化ヘルパー4件が同一機能クラスタ内で
//    密結合（相互呼び出し）していると判明したため、PR-086 buildDayComparison/
//    buildWeekComparisonと同型の「1 feature = 1 owner」判断で本ファイルへ合わせて
//    物理移動（Community Voice以外から参照なしを確認済み）。
//  ・currentTopicId はこのクラスタ内でのみ read/write されるため本ファイルの
//    module-scope 変数として完全内包（app-legacy.js側へのブリッジ不要）。
//  ・bare `SUPABASE_URL`/`supabase` は services/supabase.js から直接 import
//    （audit記載の「supabase.js 経由に整理」に対応）。SUPABASE_KEY は
//    supabase.js が意図的に module export せず window.SUPABASE_KEY のみに
//    設定する設計（同ファイルコメント「app-legacy.js の bare identifier 参照の
//    ために window に設定」）のため、既存 idiom に合わせ window.SUPABASE_KEY を
//    そのまま参照する。
//  ・bare `supabaseUserId`（旧: app-legacy.js側 var）は PR-090-R4
//    (EXPORT_HUB_REFACTOR_COUNCIL 6-2) でsrc/services/supabase.jsへ物理移動済みのため、
//    getSupabaseUserId() 直接importに変更（getSupabaseUserId()経由を廃止）。
//  ・bare `state.name` → `window.state.name`（_ippoStateHooks経由、既存idiomと同型）。
//  ・switchCVTab/deleteCommunityReply は現状 window bridge が存在せず app.html にも
//    対応する onclick / DOM要素（#cv-archive等）が見当たらないため、実質到達不能な
//    pre-existing の状態と判明（PR-080 window.saveRecord/window.closeModal no-opと
//    同型の既存事象）。本PRはPhysical Moveのみが責務のため挙動は変更せず、
//    switchCVTab/deleteCommunityReplyともに従来通り window 非公開のまま移動する。
// ================================================================

import { SUPABASE_URL, supabase, getSupabaseUserId } from '../services/supabase.js';
import { escapeHtml, getTimeAgo } from '../utils/string-utils.js';
import { showToast } from './ui-notifications.js';

var currentTopicId = null;

export function loadCommunityTopic(){
  // 未認証時は 401 になるため、認証済みの場合のみリクエストを送る
  if (!getSupabaseUserId()) {
    var qEl = document.getElementById('community-question');
    if(qEl) qEl.textContent = 'コミュニティ機能は準備中です。もうしばらくお待ちください 🌸';
    return;
  }
  fetch(SUPABASE_URL + '/rest/v1/community_topics?is_active=eq.true&order=created_at.desc&limit=1', {
    headers: {'apikey': window.SUPABASE_KEY}
  })
  .then(function(r){
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(function(data){
    if(!Array.isArray(data) || data.length === 0){
      // テーブル未作成またはトピックなし → フォールバック表示
      var qEl = document.getElementById('community-question');
      if(qEl) qEl.textContent = 'コミュニティ機能は準備中です。もうしばらくお待ちください 🌸';
      return;
    }
    currentTopicId = data[0].id;
    var weekEl = document.getElementById('community-week');
    var qEl = document.getElementById('community-question');
    if(weekEl) weekEl.textContent = data[0].week_label || '';
    if(qEl) qEl.textContent = data[0].question || '';
    loadCommunityReplies();
  })
  .catch(function(e){
    // silent fail — community_topics table policy not set
    var qEl = document.getElementById('community-question');
    if(qEl) qEl.textContent = 'コミュニティ機能は準備中です 🌸';
  });
}

export function switchCVTab(tab){
  var current = document.getElementById('cv-current');
  var archive = document.getElementById('cv-archive');
  var tabCurrent = document.getElementById('cv-tab-current');
  var tabArchive = document.getElementById('cv-tab-archive');
  if(tab === 'current'){
    current.style.display = 'block';
    archive.style.display = 'none';
    tabCurrent.style.background = 'var(--rose)';
    tabCurrent.style.color = 'white';
    tabCurrent.style.borderColor = 'var(--rose)';
    tabArchive.style.background = 'var(--white)';
    tabArchive.style.color = 'var(--ink-mid)';
    tabArchive.style.borderColor = '#e8ddd8';
  } else {
    current.style.display = 'none';
    archive.style.display = 'block';
    tabArchive.style.background = 'var(--rose)';
    tabArchive.style.color = 'white';
    tabArchive.style.borderColor = 'var(--rose)';
    tabCurrent.style.background = 'var(--white)';
    tabCurrent.style.color = 'var(--ink-mid)';
    tabCurrent.style.borderColor = '#e8ddd8';
    loadCVArchive();
  }
}

export function loadCVArchive(){
  var container = document.getElementById('cv-archive-list');
  container.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--ink-light);font-size:13px;">読み込み中...</div>';
  fetch(SUPABASE_URL + '/rest/v1/community_topics?is_active=eq.false&order=created_at.desc&limit=20', {
    headers: { 'apikey': window.SUPABASE_KEY }
  })
  .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(function(topics){
    if(!Array.isArray(topics) || topics.length === 0){
      container.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--ink-light);font-size:13px;">過去のテーマはまだありません</div>';
      return;
    }
    var html = '';
    topics.forEach(function(t){
      var date = new Date(t.created_at);
      var dateStr = date.getFullYear() + '/' + (date.getMonth()+1) + '/' + date.getDate();
      html += '<div class="cv-archive-item" style="background:var(--white);border-radius:12px;padding:14px;margin-bottom:10px;border:1px solid #f0ebe6;cursor:pointer;" onclick="toggleArchiveReplies(this, \''+t.id+'\')">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
      html += '<div style="font-size:13px;color:var(--ink);font-weight:600;line-height:1.6;flex:1;">'+t.question+'</div>';
      html += '<div style="font-size:10px;color:var(--ink-light);flex-shrink:0;margin-left:10px;">'+dateStr+'</div>';
      html += '</div>';
      html += '<div class="cv-archive-replies" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid #f0ebe6;"></div>';
      html += '</div>';
    });
    container.innerHTML = html;
  })
  .catch(function(e){
    container.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--ink-light);font-size:13px;">読み込みに失敗しました</div>';
  });
}

export function toggleArchiveReplies(el, topicId){
  var repliesDiv = el.querySelector('.cv-archive-replies');
  if(repliesDiv.style.display === 'block'){
    repliesDiv.style.display = 'none';
    return;
  }
  repliesDiv.style.display = 'block';
  repliesDiv.innerHTML = '<div style="font-size:12px;color:var(--ink-light);">読み込み中...</div>';
  fetch(SUPABASE_URL + '/rest/v1/community_replies?topic_id=eq.'+topicId+'&order=created_at.desc&limit=20', {
    headers: { 'apikey': window.SUPABASE_KEY }
  })
  .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(function(replies){
    if(!Array.isArray(replies) || replies.length === 0){
      repliesDiv.innerHTML = '<div style="font-size:12px;color:var(--ink-light);">まだ回答がありません</div>';
      return;
    }
    var html = '';
    replies.forEach(function(r){
      html += '<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #f5f0eb;">';
      html += '<div style="font-size:11px;color:var(--ink-mid);font-weight:600;margin-bottom:4px;">'+(r.display_name || '匿名さん')+'</div>';
      html += '<div style="font-size:13px;color:var(--ink);line-height:1.7;">'+escapeHtml(r.body)+'</div>';
      html += '</div>';
    });
    repliesDiv.innerHTML = html;
  })
  .catch(function(e){
    console.warn('アーカイブ回答読込スキップ:', e.message);
    repliesDiv.innerHTML = '<div style="font-size:12px;color:var(--ink-light);">読み込みに失敗しました</div>';
  });
}

export function loadCommunityReplies(){
  if(!currentTopicId) return;
  fetch(SUPABASE_URL + '/rest/v1/community_replies?topic_id=eq.' + currentTopicId + '&order=likes.desc,created_at.desc&limit=20', {
    headers: {'apikey': window.SUPABASE_KEY}
  })
  .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(function(replies){
    var container = document.getElementById('community-replies');
    if(!container) return;
    if(!Array.isArray(replies) || replies.length === 0){
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ink-light);font-size:13px;">まだ回答がありません。最初の声を届けてみませんか？</div>';
      return;
    }
    var html = '';
    for(var i=0; i<replies.length; i++){
      var r = replies[i];
      var timeAgo = getTimeAgo(r.created_at);
      var isMyLike = false; // 後で確認
      html += '<div style="background:var(--white);border-radius:12px;padding:14px;margin-bottom:10px;border:1px solid #f0ebe6;">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
      html += '<div style="font-size:12px;color:var(--ink-mid);font-weight:600;">' + (r.display_name || '匿名さん') + '</div>';
      html += '<div style="font-size:10px;color:var(--ink-light);">' + timeAgo + '</div>';
      html += '</div>';
      html += '<div style="font-size:13px;color:var(--ink);line-height:1.7;margin-bottom:10px;">' + escapeHtml(r.body) + '</div>';
      html += '<div style="display:flex;align-items:center;gap:4px;">';
      html += '<button onclick="likeCommunityReply(\'' + r.id + '\', this)" style="background:none;border:1px solid #e8ddd8;border-radius:16px;padding:4px 12px;font-size:11px;color:var(--ink-light);cursor:pointer;">';
      html += '♡ 共感</button>';
      if(getSupabaseUserId() && r.user_id === getSupabaseUserId()){
        html += '<button onclick="deleteCommunityReply(\'' + r.id + '\', this)" style="background:none;border:1px solid #e8ddd8;border-radius:16px;padding:4px 12px;font-size:11px;color:var(--ink-light);cursor:pointer;">削除</button>';
      }
      html += '</div>';
      html += '</div>';
    }
    container.innerHTML = html;
    checkMyLikes(replies);
  })
  .catch(function(e){ console.log('回答読込エラー:', e); });
}

export function postCommunityReply(){
  var input = document.getElementById('community-input');
  if(!input || !input.value.trim()) return;
  if(!currentTopicId){ showToast('テーマが読み込まれていません', 'warn'); return; }
  if(input.value.trim().length < 10){ showToast('10文字以上で入力してください', 'warn'); return; }

  var body = {
    topic_id: currentTopicId,
    user_id: getSupabaseUserId() || null,
    display_name: (window.state.name || '匿名') + 'さん',
    body: input.value.trim()
  };

  fetch(SUPABASE_URL + '/rest/v1/community_replies', {
    method: 'POST',
    headers: {
      'apikey': window.SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(body)
  })
  .then(function(r){
    if(r.ok){
      input.value = '';
      loadCommunityReplies();
      showToast('投稿しました ✓', 'success');
    } else {
      showToast('投稿に失敗しました。もう一度お試しください。', 'warn');
    }
  })
  .catch(function(e){ showToast('通信エラーが発生しました', 'warn'); });
}

export function likeCommunityReply(replyId, btn){
  if(!getSupabaseUserId()){ showToast('いいねするにはログインが必要です', 'warn'); return; }

  fetch(SUPABASE_URL + '/rest/v1/community_likes', {
    method: 'POST',
    headers: {
      'apikey': window.SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ reply_id: replyId, user_id: getSupabaseUserId() })
  })
  .then(function(r){
    if(r.ok){
      // likes カウントを更新（RPC使わずクライアント側で+1）
      var span = btn.querySelector('span');
      var current = parseInt(span.textContent) || 0;
      span.textContent = current + 1;
      btn.style.color = 'var(--rose)';
      btn.style.borderColor = 'var(--rose)';
      btn.disabled = true;
      // DBのlikesカウントも更新
      updateReplyLikeCount(replyId, current + 1);
    }
  })
  .catch(function(e){ console.log('いいねエラー:', e); });
}

export function deleteCommunityReply(replyId, btn){
  showToast('この投稿を削除しました', 'info');
  supabase.auth.getSession().then(function(res){
    var session = res.data.session;
    if(!session){
      showToast('ログインが必要です', 'warn');
      return;
    }
    fetch(SUPABASE_URL + '/rest/v1/community_replies?id=eq.' + replyId + '&user_id=eq.' + session.user.id, {
      method: 'DELETE',
      headers: {
        'apikey': window.SUPABASE_KEY,
        'Authorization': 'Bearer ' + session.access_token
      }
    })
    .then(function(r){
      if(r.ok){
        var card = btn.closest('div[style*="background:var(--white)"]');
        if(card) card.remove();
      } else {
        showToast('削除に失敗しました', 'warn');
      }
    })
    .catch(function(e){ showToast('通信エラーが発生しました', 'warn'); });
  });
}

export function updateReplyLikeCount(replyId, newCount){
  fetch(SUPABASE_URL + '/rest/v1/community_replies?id=eq.' + replyId, {
    method: 'PATCH',
    headers: {
      'apikey': window.SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ likes: newCount })
  });
}

export function checkMyLikes(replies){
  if(!getSupabaseUserId()) return;
  var ids = replies.map(function(r){ return r.id; });
  fetch(SUPABASE_URL + '/rest/v1/community_likes?user_id=eq.' + getSupabaseUserId() + '&reply_id=in.(' + ids.join(',') + ')', {
    headers: {'apikey': window.SUPABASE_KEY}
  })
  .then(function(r){ return r.json(); })
  .then(function(likes){
    var likedIds = {};
    likes.forEach(function(l){ likedIds[l.reply_id] = true; });
    var buttons = document.querySelectorAll('#community-replies button');
    buttons.forEach(function(btn){
      var onclick = btn.getAttribute('onclick') || '';
      var match = onclick.match(/likeCommunityReply\('([^']+)'/);
      if(match && likedIds[match[1]]){
        btn.style.color = 'var(--rose)';
        btn.style.borderColor = 'var(--rose)';
        var span = btn.querySelector('span');btn.innerHTML = '♥ ' + (span ? span.textContent : '共感');
        btn.disabled = true;
      }
    });
  });
}
