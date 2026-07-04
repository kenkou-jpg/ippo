// ============================================================
//  ippo – src/modules/quick-log.js
//  PR-089F-4 (Legacy Removal Batch-11分割⑥-4): クイック症状ログ（後方互換のため残す）
//  initQuickLog / selectQuickPain / saveQuickLog / showQuickLogDone を
//  src/app-legacy.js から物理移動。
//
//  saveAndSyncはapp-legacy.js残置（Cloud Sync周辺、PR-089F-6以降で判断）のbare関数だが、
//  window.saveAndSyncは既にrecord-modal-controller.jsの別実装に取られているため、
//  app-legacy.js側の専用ブリッジ window.__ippoLegacySaveAndSync（PR-085由来）経由で呼び出す
//  （挙動変更なし）。updateHomeSummaryは同一関数をhome-renderer.jsから直接import。
// ============================================================

import { getState } from '../store/state.js';
import { updateHomeSummary } from './home-renderer.js';
import { DISEASE_CONFIG } from '../constants/disease.js';

// ===== クイック症状ログ（後方互換のため残す） =====
var _quickPainLevel = -1;
var _quickSelectedSymptoms = [];

function initQuickLog() {
  // 疾患設定から症状チップを生成（最大6個）
  var chips = [];
  var s = getState();
  var diseases = s.myDiseases || [];
  diseases.forEach(function(d) {
    var cfg = DISEASE_CONFIG[d];
    if (!cfg || !cfg.specificSymptoms) return;
    cfg.specificSymptoms.forEach(function(sym) {
      if (chips.indexOf(sym) === -1 && chips.length < 6) chips.push(sym);
    });
  });
  // 疾患設定がない場合のデフォルト
  if (chips.length === 0) {
    chips = ['下腹部痛', '腰痛', '頭痛', '骨盤周りの痛み', 'だるさ', '気分の落ち込み'];
  }

  var container = document.getElementById('quick-symptom-chips');
  if (!container) return;
  container.innerHTML = '';
  _quickSelectedSymptoms = [];
  chips.forEach(function(sym) {
    var btn = document.createElement('button');
    btn.textContent = sym;
    btn.style.cssText = 'padding:6px 13px;border-radius:20px;border:1.5px solid #e8ddd8;background:var(--white);font-size:12px;font-family:\'Noto Sans JP\',sans-serif;color:var(--ink);cursor:pointer;transition:all 0.2s;';
    btn.onclick = function() {
      var idx = _quickSelectedSymptoms.indexOf(sym);
      if (idx !== -1) {
        _quickSelectedSymptoms.splice(idx, 1);
        btn.style.background = 'var(--white)';
        btn.style.borderColor = '#e8ddd8';
        btn.style.color = 'var(--ink)';
      } else {
        _quickSelectedSymptoms.push(sym);
        btn.style.background = 'var(--rose-pale)';
        btn.style.borderColor = 'var(--rose)';
        btn.style.color = 'var(--plum)';
      }
    };
    container.appendChild(btn);
  });

  // 今日すでに記録済みかチェック
  var today = new Date().toISOString().slice(0, 10);
  var todayRecord = (s.records || []).find(function(r) {
    return r.date && r.date.slice(0, 10) === today;
  });
  if (todayRecord) {
    showQuickLogDone();
  }
}

function selectQuickPain(level, btn) {
  _quickPainLevel = level;
  document.querySelectorAll('#quick-pain-scale button').forEach(function(b) {
    b.style.background = 'var(--white)';
    b.style.borderColor = '#e8ddd8';
  });
  btn.style.background = 'var(--rose-pale)';
  btn.style.borderColor = 'var(--rose)';
}

function saveQuickLog() {
  var s = getState();
  var today = new Date().toISOString().slice(0, 10);
  // 既存の今日のレコードに追記、なければ新規作成
  var existing = (s.records || []).find(function(r) {
    return r.date && r.date.slice(0, 10) === today;
  });
  if (existing) {
    if (_quickSelectedSymptoms.length > 0) {
      existing.symptoms = existing.symptoms || [];
      _quickSelectedSymptoms.forEach(function(sym) {
        if (existing.symptoms.indexOf(sym) === -1) existing.symptoms.push(sym);
      });
    }
    if (_quickPainLevel >= 0) existing.painLevel = _quickPainLevel;
    existing.updatedAt = new Date().toISOString();
  } else {
    var rec = {
      id: (typeof window.generateRecordId === 'function' ? window.generateRecordId() : Date.now().toString(36) + Math.random().toString(36).substr(2,8)),
      date: today,
      record_date: today,
      symptoms: _quickSelectedSymptoms.slice(),
      painLevel: _quickPainLevel >= 0 ? _quickPainLevel : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    s.records = s.records || [];
    s.records.push(rec);
  }
  if (typeof window.__ippoLegacySaveAndSync === 'function') window.__ippoLegacySaveAndSync();
  showQuickLogDone();
  _quickSelectedSymptoms = [];
  _quickPainLevel = -1;
  updateHomeSummary();
}

function showQuickLogDone() {
  var btn = document.getElementById('quick-log-btn');
  var status = document.getElementById('quick-log-status');
  if (btn) {
    btn.textContent = '✓ 今日の記録済み';
    btn.style.background = 'var(--sage)';
    btn.disabled = true;
  }
  if (status) {
    status.textContent = '記録済み';
    status.style.color = 'var(--sage)';
  }
}

export {
  initQuickLog,
  selectQuickPain,
  saveQuickLog,
  showQuickLogDone
};
