// ============================================================
// ippo – src/runtime/runtime-debug-overlay.js
// 開発時専用のランタイム状態オーバーレイ。
//
// 有効化:
//   localStorage.setItem('ippo_debug_overlay', '1')
//   または URL に ?ippo_debug=1 を付加
//
// 提供: window.ippoRuntimeDebugOverlay
// ============================================================

// import.meta.env.DEV を try-catch の外でトップレベルに直接使うことで
// Viteが本番ビルド時に false へ静的置換 → dead code elimination が確実に動く。
// try-catch 内では静的解析が止まるため絶対に入れてはいけない。
const _IS_DEV = import.meta.env.DEV;

// _FORCE_ENABLED は開発環境でのみ評価する。
// 本番ビルドでは _IS_DEV === false に置換され、if ブロックごと除去される。
let _FORCE_ENABLED = false;
if (_IS_DEV) {
  try {
    _FORCE_ENABLED =
      window.location.search.includes('ippo_debug=1') ||
      localStorage.getItem('ippo_debug_overlay') === '1';
  } catch (_) {}
}

const _ENABLED = _IS_DEV || _FORCE_ENABLED;

if (!_ENABLED) {
  window.ippoRuntimeDebugOverlay = {
    enabled: false,
    show:    function () {},
    hide:    function () {},
    toggle:  function () {},
    update:  function () {},
  };
} else {
  var _el         = null;
  var _intervalId = null;

  function _createOverlay() {
    var el       = document.createElement('div');
    el.id        = 'ippo-debug-overlay';
    el.style.cssText = [
      'position:fixed',
      'bottom:8px',
      'right:8px',
      'z-index:99999',
      'background:rgba(0,0,0,0.82)',
      'color:#4f4',
      'font:10px/1.5 monospace',
      'padding:8px 12px',
      'border-radius:6px',
      'max-width:260px',
      'pointer-events:none',
      'white-space:pre',
      'border:1px solid #2a2',
    ].join(';');
    document.body.appendChild(el);
    return el;
  }

  function _text() {
    var state    = typeof window.getState === 'function' ? window.getState() : null;
    var health   = typeof window.ippoHealthMonitor === 'object' ? window.ippoHealthMonitor.getHealth() : null;
    var snap     = typeof window.ippoRollbackManager === 'object' ? window.ippoRollbackManager.getLatestSnapshot() : null;
    var sync     = typeof window.ippoSyncConsistencyChecker === 'object' ? window.ippoSyncConsistencyChecker.check() : null;
    var dupes    = typeof window.ippoStartupValidator === 'object' ? window.ippoStartupValidator.getDuplicates() : [];
    var brain    = typeof window.ippoBrain === 'object' ? window.ippoBrain : null;
    var acs      = typeof window.ippoAuthCloudState === 'object' ? window.ippoAuthCloudState : null;
    var orch     = typeof window.ippoRuntime === 'object' ? window.ippoRuntime : null;

    var stateReady = window.__ippoStateReady === true;
    var gate       = typeof window.ippoDeferredRenderQueue === 'object' ? window.ippoDeferredRenderQueue : null;

    var lines = [
      '[ippo runtime debug]',
      'records : ' + (state ? (state.records || []).length : '?'),
      'screen  : ' + (state && state.currentScreen || '?'),
      'saved   : ' + (state && state.lastSaved ? state.lastSaved.slice(11, 19) : '?'),
      'stRdy   : ' + (stateReady ? 'yes' : 'no') + (gate ? (gate.isFlushed() ? ' flush✓' : ' flush…') : ''),
      'errors  : ' + (health ? health.errorCount : '?'),
      'warnings: ' + (health ? health.warningCount : '?'),
      'renders : ' + (health ? health.metrics.renderCount : '?'),
      'saves   : ' + (health ? health.metrics.saveCount : '?'),
      'snap    : ' + (snap ? snap.label + '@' + snap.at.slice(11, 19) + '(' + snap.recordCount + ')' : 'none'),
      'sync    : ' + (sync ? (sync.ok ? 'OK' : 'ISSUES:' + sync.issues.length) : '?'),
    ];

    if (brain) {
      var mode  = brain.getMode();
      var conf  = brain.getConfidence();
      var crit  = brain.getCriticalErrors();
      var rDecs = brain.getRecoveryDecisions();
      var lastDec = rDecs.length > 0 ? rDecs[rDecs.length - 1] : null;

      lines.push('── brain ──────────');
      lines.push('mode    : ' + mode);
      lines.push('startup : ' + (conf.startupConfidence   != null ? conf.startupConfidence   : '?'));
      lines.push('hydrat  : ' + (conf.hydrationConfidence != null ? conf.hydrationConfidence : '?'));
      lines.push('render  : ' + (conf.renderConsistency   != null ? conf.renderConsistency   : '?'));
      lines.push('sync    : ' + (conf.syncConfidence      != null ? conf.syncConfidence      : '?'));
      lines.push('records : ' + (conf.recordsIntegrity    != null ? conf.recordsIntegrity    : '?'));
      lines.push('events  : ' + brain.getAllTimeline().length);
      if (crit.length > 0) {
        var last = crit[crit.length - 1];
        lines.push('CRIT: ' + last.phase + ':' + last.module);
      }
      if (lastDec) {
        lines.push('rec→ ' + lastDec.decision);
      }
    }

    var ctrl = typeof window.ippoRuntimeController === 'object' ? window.ippoRuntimeController : null;
    if (ctrl) {
      var ctrlMode    = ctrl.getMode();
      var lastAction  = ctrl.getLastDecision();
      var isolated    = ctrl.getIsolatedModules();
      var retryQueue  = ctrl.getRenderRetryQueue();
      var degraded    = ctrl.getDegradedSystems();
      var isolatedNames = Object.keys(isolated);
      var degradedNames = Object.keys(degraded);
      var audit       = ctrl.getAuditTrail();
      var lastAudit   = audit.length > 0 ? audit[audit.length - 1] : null;

      lines.push('── controller ─────');
      lines.push('ctrlMode: ' + ctrlMode);
      if (lastAction) {
        lines.push('action  : ' + lastAction.action);
        lines.push('reason  : ' + (lastAction.reason || '').slice(0, 30));
      }
      if (lastAudit && (!lastAction || lastAudit.action !== lastAction.action)) {
        lines.push('lastLog : ' + lastAudit.action);
      }
      if (retryQueue.length > 0) {
        lines.push('retryQ  : ' + retryQueue.map(function (r) { return r.module + '#' + r.attempts; }).join(','));
      }
      if (isolatedNames.length > 0) {
        lines.push('isolated: ' + isolatedNames.join(','));
      }
      if (degradedNames.length > 0) {
        lines.push('degraded: ' + degradedNames.join(','));
      }
      if (ctrl.isLexicalBridgeInjected()) {
        lines.push('lexBrdg : injected');
      }
    }

    // ── Auth / Cloud state ──────────────────────────────
    if (acs) {
      lines.push('── auth/cloud ──────');
      lines.push('auth    : ' + acs.getAuthState());
      lines.push('cloud   : ' + acs.getCloudState());
    }

    // ── Orchestrator readiness ──────────────────────────
    if (orch) {
      var readiness   = orch.getReadiness();
      var safetyLevel = orch.getSafetyLevel();
      lines.push('── orchestrator ────');
      lines.push('safety  : ' + safetyLevel);
      lines.push('healthy : ' + (orch.isHealthy() ? 'yes' : 'NO'));
      lines.push('state   : ' + (readiness.state        ? 'ready'  : 'wait'));
      lines.push('hydrat  : ' + (readiness.hydration     ? 'done'   : 'wait'));
      lines.push('supabase: ' + (readiness.supabase      ? 'ready'  : 'wait'));
      lines.push('cloud   : ' + (readiness.cloudRestore  ? 'done'   : (acs && acs.isCloudSkipped() ? 'skip' : 'wait')));
      var reconcileLog = orch.getReconcileLog();
      if (reconcileLog.length > 0) {
        var lastRec = reconcileLog[reconcileLog.length - 1];
        lines.push('reconcil: ' + lastRec.ctrlModePre + '→' + lastRec.ctrlModePost);
      }
    }

    if (dupes.length > 0) {
      lines.push('DUPES: ' + dupes.map(function (d) { return d.name; }).join(','));
    }

    var blocked = typeof window.ippoSyncConsistencyChecker === 'object' &&
                  window.ippoSyncConsistencyChecker.isCloudSyncBlocked();
    if (blocked) lines.push('⚠ CLOUD SYNC BLOCKED');

    if (window.__ippoCloudRestoreFailed === true) {
      lines.push('⚠ CLOUD RESTORE FAILED');
    }

    return lines.join('\n');
  }

  function update() {
    if (_el) _el.textContent = _text();
  }

  function show() {
    if (!_el) {
      if (document.body) {
        _el = _createOverlay();
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          _el = _createOverlay();
          update();
        });
        return;
      }
    }
    _el.style.display = 'block';
    update();
    if (!_intervalId) {
      _intervalId = setInterval(update, 2000);
    }
  }

  function hide() {
    if (_el) _el.style.display = 'none';
    if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
  }

  function toggle() {
    if (_el && _el.style.display !== 'none') { hide(); } else { show(); }
  }

  window.ippoRuntimeDebugOverlay = {
    enabled: true,
    show:    show,
    hide:    hide,
    toggle:  toggle,
    update:  update,
  };

  // DOM 準備後に自動表示
  if (document.body) { show(); }
  else { document.addEventListener('DOMContentLoaded', show); }
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('runtime-debug-overlay-loaded', { enabled: _ENABLED });
}

// ─── Data Diagnostics (moved from app-legacy.js Phase 4-B) ───

function _mergeRecordsLocal(local, cloud) {
  var merged = {};
  local.forEach(function(r) { if (r.id) merged[r.id] = r; });
  cloud.forEach(function(r) {
    if (!r.id) return;
    if (!merged[r.id]) { merged[r.id] = r; return; }
    var lt = new Date(merged[r.id].updatedAt || merged[r.id].date || 0).getTime();
    var ct = new Date(r.updatedAt || r.date || 0).getTime();
    if (ct > lt) merged[r.id] = r;
  });
  return Object.values(merged).filter(function(r) { return !r.deleted_at; })
    .sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
}

function runSelfDiagnosis() {
  var s = window.getState ? window.getState() : (window.state || {});
  var results = { local: (s.records || []).length, idb: 0, cloud: 0, history: [] };
  var sb = window.supabase;
  var idbGet = typeof window.idbGetAllRecords === 'function'
    ? window.idbGetAllRecords() : Promise.resolve([]);
  return idbGet.then(function(recs) {
    results.idb = recs.filter(function(r) { return !r.deleted_at; }).length;
    if (!sb) return results;
    return sb.auth.getSession();
  }).then(function(res) {
    if (!res || !res.data || !res.data.session) return results;
    var userId = res.data.session.user.id;
    return sb.from('user_records').select('id', { count: 'exact' })
      .eq('user_id', userId).is('deleted_at', null)
      .then(function(r) {
        results.cloud = r.count || 0;
        return sb.from('user_data_history').select('id,records_count,created_at')
          .eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
      }).then(function(r) { results.history = r.data || []; return results; });
  }).catch(function(e) { console.warn('診断エラー:', e); return results; });
}

function showDiagnosisUI() {
  var overlay = document.createElement('div');
  overlay.id = 'diagnosis-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
  var box = document.createElement('div');
  box.style.cssText = 'background:white;border-radius:20px;padding:24px;margin:20px;max-width:360px;width:100%;';
  box.innerHTML = '<div style="text-align:center;font-size:15px;font-weight:600;margin-bottom:16px;">🔍 データ診断中...</div><div id="diagnosis-result" style="font-size:13px;color:#666;text-align:center;">確認しています...</div>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); }, { once: true });
  runSelfDiagnosis().then(function(r) {
    var best = Math.max(r.local, r.idb, r.cloud);
    var source = best === r.cloud ? 'クラウド' : best === r.idb ? 'IndexedDB' : 'ローカル';
    var needsRepair = r.local < best;
    var html = '<div style="text-align:left;margin-bottom:16px;">';
    html += '<div style="padding:8px 0;border-bottom:1px solid #f0ebe6;">📱 ローカル: <b>' + r.local + '件</b></div>';
    html += '<div style="padding:8px 0;border-bottom:1px solid #f0ebe6;">💾 IndexedDB: <b>' + r.idb + '件</b></div>';
    html += '<div style="padding:8px 0;border-bottom:1px solid #f0ebe6;">☁️ クラウド: <b>' + r.cloud + '件</b></div>';
    html += '<div style="padding:8px 0;">📦 バックアップ: <b>' + r.history.length + '世代</b></div></div>';
    if (needsRepair) {
      html += '<div style="background:#fef3f2;border-radius:12px;padding:12px;margin-bottom:16px;font-size:12px;color:#c44848;">⚠️ データの不一致を検出。' + source + 'に' + best + '件あります。</div>';
      html += '<button onclick="window.repairFromBest&&window.repairFromBest()" style="width:100%;padding:14px;background:#c4878c;color:white;border:none;border-radius:14px;font-size:14px;font-weight:600;cursor:pointer;">🔧 自動修復する</button>';
    } else {
      html += '<div style="background:#e8f4ec;border-radius:12px;padding:12px;font-size:12px;color:#2d6a3f;">✅ データは正常です。3箇所すべて一致しています。</div>';
    }
    if (r.history.length > 0) {
      html += '<div style="margin-top:12px;font-size:12px;color:#888;">過去のバックアップ:';
      r.history.forEach(function(h) {
        html += '<div style="margin-top:6px;padding:8px;background:#f8f5f0;border-radius:8px;cursor:pointer;" onclick="window.restoreFromHistory&&window.restoreFromHistory(\'' + h.id + '\')">';
        html += new Date(h.created_at).toLocaleString('ja-JP') + ' (' + h.records_count + '件) →復元</div>';
      });
      html += '</div>';
    }
    html += '<button onclick="document.getElementById(\'diagnosis-overlay\').remove()" style="width:100%;margin-top:12px;padding:12px;background:none;border:1px solid #ddd;border-radius:14px;font-size:13px;color:#888;cursor:pointer;">閉じる</button>';
    document.getElementById('diagnosis-result').innerHTML = html;
  });
}

function repairFromBest() {
  var sb = window.supabase;
  runSelfDiagnosis().then(function(r) {
    var best = Math.max(r.local, r.idb, r.cloud);
    var s = window.getState ? window.getState() : (window.state || {});
    if (best === r.idb && r.idb > r.local) {
      (typeof window.idbGetAllRecords === 'function' ? window.idbGetAllRecords() : Promise.resolve([]))
        .then(function(recs) {
          var merged = _mergeRecordsLocal(s.records || [], recs.filter(function(x) { return !x.deleted_at; }));
          if (typeof window.setState === 'function') window.setState(Object.assign({}, s, { records: merged }));
          if (typeof window.saveState === 'function') window.saveState();
          if (typeof window.showRecoveryBanner === 'function') window.showRecoveryBanner(true, merged.length);
          var el = document.getElementById('diagnosis-overlay');
          if (el) el.remove();
        });
    } else if (best === r.cloud && r.cloud > r.local && sb) {
      sb.auth.getSession().then(function(res) {
        var userId = res.data.session.user.id;
        return sb.from('user_records').select('data').eq('user_id', userId).is('deleted_at', null);
      }).then(function(result) {
        var cloudRecs = (result.data || []).map(function(row) { return row.data; });
        var merged = _mergeRecordsLocal(s.records || [], cloudRecs);
        if (typeof window.setState === 'function') window.setState(Object.assign({}, s, { records: merged }));
        if (typeof window.saveState === 'function') window.saveState();
        if (typeof window.showRecoveryBanner === 'function') window.showRecoveryBanner(true, merged.length);
        var el = document.getElementById('diagnosis-overlay');
        if (el) el.remove();
      });
    } else {
      if (typeof window.showAlertModal === 'function') window.showAlertModal('ローカルデータが最新です。');
      var el = document.getElementById('diagnosis-overlay');
      if (el) el.remove();
    }
  });
}

function openRestoreUI() {
  var sb = window.supabase;
  if (!sb) { if (typeof window.showAlertModal === 'function') window.showAlertModal('通信エラー'); return; }
  sb.auth.getSession().then(function(res) {
    if (!res.data.session) { if (typeof window.showAlertModal === 'function') window.showAlertModal('ログインが必要です'); return; }
    var userId = res.data.session.user.id;
    sb.from('user_data_history').select('id,records_count,created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
      .then(function(r) {
        if (!r.data || r.data.length === 0) {
          if (typeof window.showAlertModal === 'function') window.showAlertModal('バックアップ履歴がありません');
          return;
        }
        var msg = 'バックアップ履歴:\n\n';
        r.data.forEach(function(h, i) {
          msg += (i + 1) + '. ' + new Date(h.created_at).toLocaleString('ja-JP') + ' (' + h.records_count + '件)\n';
        });
        msg += '\n最新のバックアップから復元しますか？';
        if (typeof window.showConfirmModal === 'function') {
          window.showConfirmModal(msg, function() {
            if (typeof window.restoreFromHistory === 'function') window.restoreFromHistory(r.data[0].id);
          });
        }
      });
  });
}

window.runSelfDiagnosis  = runSelfDiagnosis;
window.showDiagnosisUI   = showDiagnosisUI;
window.repairFromBest    = repairFromBest;
window.openRestoreUI     = openRestoreUI;

export {};
