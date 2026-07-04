// ============================================================
//  ippo – src/modules/record-draft-guard.js
//  P0-FIX-4: 記録入力中ドラフト保護
//
//  目的:
//  - 記録入力中にリロード / SW更新 / pagehide が発生しても
//    入力内容を ippo_record_draft に退避し、次回起動時に復元を促す。
//  - 三カード・legacy record 両経路に対応。
//  - saveState / cloudBackupAll には触れない（読み取り・退避のみ）。
//
//  保存タイミング:
//    visibilitychange (hidden)
//    pagehide
//    beforeunload
//    （任意: 三カードの input/change — P0-FIX-5 と合わせて将来追加）
//
//  復元プロンプト:
//    起動時に ippo_record_draft が存在し、
//    records に正式保存されていない場合に表示する。
// ============================================================

// PR-013: route draft persistence through StorageService adapter
import { LocalStorageAdapter } from '../adapters/storage/local-storage-adapter.js';
var _draftStorage = new LocalStorageAdapter();

var DRAFT_KEY = 'ippo_record_draft';
var _dirtyFlag = false; // 入力中フラグ（P0-FIX-5 SW更新ガードとも共有）

// ─── dirty マーク ─────────────────────────────────────────
export function markRecordDirty() {
  _dirtyFlag = true;
}
export function markRecordClean() {
  _dirtyFlag = false;
}
export function isRecordDirty() {
  return _dirtyFlag;
}

// ─── ドラフト収集 ─────────────────────────────────────────
function _gatherDraft() {
  // 三カード: window._rtcCurrentPayload or window.getState().records から最新未同期を取得
  // legacy: draftRecordScreen() は既存の ippo_draft に書く
  //         ここでは getState の直近レコードを退避する

  // P0-A 修正②: dirtyFlag が立っていない（編集中でない）ならドラフト収集不要
  if (!_dirtyFlag) return null;

  var s = (typeof window.getState === 'function') ? window.getState() : null;
  if (!s) return null;

  // 三カード入力中の payload が window に公開されていれば優先
  var payload = window.__rtcDraftPayload || null;

  // なければ state.records の最新レコードを退避候補にする
  if (!payload && Array.isArray(s.records) && s.records.length > 0) {
    var today = new Date().toISOString().slice(0, 10);
    var todayRec = s.records.find(function(r) {
      return r && (r.record_date || (r.date || '').slice(0, 10)) === today;
    });
    // 同期済み・保存済み (syncedAt / record_date あり) なら退避不要
    if (todayRec && !todayRec.syncedAt && !todayRec.syncPending && !todayRec.record_date) {
      payload = todayRec;
    }
  }

  if (!payload) return null;

  return {
    targetDate:  payload.record_date || (payload.date || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
    draft:       payload,
    updatedAt:   new Date().toISOString(),
    screen:      (s.currentScreen || 'record'),
  };
}

// ─── ドラフト保存 ─────────────────────────────────────────
function _saveDraft() {
  if (!_dirtyFlag) return; // P0-A: markClean() 後は再作成しない
  try {
    var draft = _gatherDraft();
    if (!draft) return;
    _draftStorage.set(DRAFT_KEY, draft); // PR-013: via StorageService adapter
    console.log('[record-draft-guard] draft saved:', draft.targetDate);
  } catch(e) {
    console.warn('[record-draft-guard] draft save error:', e);
  }
}

// ─── ドラフト照合（正式保存済みなら不要） ─────────────────
function _isDraftAlreadySaved(draft) {
  try {
    if (!draft || !draft.targetDate) return false;
    var s = (typeof window.getState === 'function') ? window.getState() : null;
    var records = (s && s.records) || [];
    // P0-A 修正③: state 未ハイドレート時は StorageService 経由で取得 (PR-013)
    if (records.length === 0) {
      try {
        var ls = _draftStorage.get('ippo_state') || {};
        records = ls.records || [];
      } catch(_) {}
    }
    return records.some(function(r) {
      var d = r && (r.record_date || (r.date || '').slice(0, 10));
      return d === draft.targetDate && (r.syncedAt || r.updatedAt || r.record_date);
    });
  } catch(e) {
    return false;
  }
}

// ─── 復元プロンプト ───────────────────────────────────────
function _showRestorePrompt(draft) {
  if (!draft || !draft.draft) return;
  if (_isDraftAlreadySaved(draft)) {
    _draftStorage.remove(DRAFT_KEY);
    return;
  }

  // 既存の通知 UI があれば使う、なければ最小限のバナーを挿入
  var banner = document.createElement('div');
  banner.id = 'ippo-draft-restore-banner';
  banner.style.cssText = [
    'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);',
    'background:#18245a;color:#fff;border-radius:12px;',
    'padding:12px 16px;font-size:13px;z-index:9999;',
    'box-shadow:0 4px 20px rgba(0,0,0,.25);max-width:320px;width:90%;',
    'display:flex;flex-direction:column;gap:8px;',
  ].join('');
  banner.innerHTML = [
    '<div style="font-weight:700;font-size:14px;">前回の入力途中があります</div>',
    '<div style="opacity:.85;">',
    draft.targetDate + ' の記録が未保存の可能性があります。',
    '</div>',
    '<div style="display:flex;gap:8px;margin-top:4px;">',
    '<button id="ippo-draft-restore-btn" style="flex:1;background:#8b7fd6;border:none;',
    'color:#fff;border-radius:8px;padding:8px;font-size:13px;cursor:pointer;">復元する</button>',
    '<button id="ippo-draft-dismiss-btn" style="flex:1;background:rgba(255,255,255,.15);border:none;',
    'color:#fff;border-radius:8px;padding:8px;font-size:13px;cursor:pointer;">破棄する</button>',
    '</div>',
  ].join('');

  document.body.appendChild(banner);

  document.getElementById('ippo-draft-restore-btn').addEventListener('click', function() {
    banner.remove();
    // ドラフトを state に書き戻す（保存はユーザーが再度行う）
    try {
      var s = (typeof window.getState === 'function') ? window.getState() : null;
      if (s && draft.draft) {
        var records = s.records || [];
        var idx = records.findIndex(function(r) {
          return r && (r.record_date || (r.date || '').slice(0, 10)) === draft.targetDate;
        });
        if (idx >= 0) {
          s.records[idx] = Object.assign({}, draft.draft, { _restoredFromDraft: true });
        } else {
          var restored = Object.assign({}, draft.draft, { _restoredFromDraft: true });
          s.records.push(restored);
        }
        // 画面を記録画面へ
        if (typeof window.switchTab === 'function') window.switchTab('record');
        // 通知
        if (typeof window.showToast === 'function') {
          window.showToast('前回の入力を復元しました。確認して保存してください。');
        }
      }
    } catch(e) {
      console.warn('[record-draft-guard] restore error:', e);
    }
    _draftStorage.remove(DRAFT_KEY);
  });

  document.getElementById('ippo-draft-dismiss-btn').addEventListener('click', function() {
    banner.remove();
    _draftStorage.remove(DRAFT_KEY);
    markRecordClean();
  });

  // 10秒後に自動で折りたたむ（邪魔にならないように）
  setTimeout(function() {
    if (document.getElementById('ippo-draft-restore-banner')) {
      banner.style.opacity = '0.5';
    }
  }, 10000);
}

// ─── 起動時チェック ───────────────────────────────────────
export function checkAndShowDraftRestore() {
  try {
    // PR-013: read via StorageService adapter (returns parsed object directly)
    var draft = _draftStorage.get(DRAFT_KEY);
    if (!draft) return;
    if (!draft.targetDate) { _draftStorage.remove(DRAFT_KEY); return; }

    // 24時間以上古いドラフトは破棄
    var age = Date.now() - new Date(draft.updatedAt || 0).getTime();
    if (age > 86400000) { _draftStorage.remove(DRAFT_KEY); return; }

    // 正式保存済みなら不要
    if (_isDraftAlreadySaved(draft)) { _draftStorage.remove(DRAFT_KEY); return; }

    // プロンプト表示（DOM ready を待つ）
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(function() { _showRestorePrompt(draft); }, 1500);
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() { _showRestorePrompt(draft); }, 1500);
      });
    }
  } catch(e) {
    console.warn('[record-draft-guard] check error:', e);
    try { _draftStorage.remove(DRAFT_KEY); } catch(_) {}
  }
}

// ─── イベントリスナー登録 ─────────────────────────────────
// visibilitychange / pagehide / beforeunload でドラフトを退避する
document.addEventListener('visibilitychange', function() {
  if (document.hidden) _saveDraft();
});

window.addEventListener('pagehide', function() {
  _saveDraft();
});

window.addEventListener('beforeunload', function() {
  _saveDraft();
});

// ─── 公開 API ─────────────────────────────────────────────
window.ippoRecordDraftGuard = {
  markDirty:             markRecordDirty,
  markClean:             markRecordClean,
  isDirty:               isRecordDirty,
  saveDraft:             _saveDraft,
  checkAndShowRestore:   checkAndShowDraftRestore,
  DRAFT_KEY:             DRAFT_KEY,
};

console.log('[record-draft-guard] installed');
