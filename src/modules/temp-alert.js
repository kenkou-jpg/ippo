// ================================================================
//  ippo – src/modules/temp-alert.js
//  PR-087 (Legacy Removal Batch-9): 体温アラート
//
//  app-legacy.js の体温急上昇検知・アラートバナー表示系
//  （checkSuddenTempRise/checkAndShowTempAlert/showTempAlertBanner）を新設・物理移動。
//  Business Logic変更なし。
//
//  ・bare `state` → `window.state`（_ippoStateHooks経由、既存idiomと同型）。
// ================================================================

import { calcTemperaturePhases } from './pro/temp-report.js';

export function checkSuddenTempRise(records, diseases) {
  if (diseases.indexOf('卵巣嚢腫') === -1) return null;

  var tempRecords = records
    .filter(function(r) { return r.temperature; })
    .sort(function(a, b) {
      return new Date(a.date || a.record_date) - new Date(b.date || b.record_date);
    });

  if (tempRecords.length < 2) return null;

  var latest = tempRecords[tempRecords.length - 1];
  var prev   = tempRecords[tempRecords.length - 2];
  var diff   = parseFloat(latest.temperature) - parseFloat(prev.temperature);

  if (diff >= 0.8) {
    return { level: 'caution', diff: diff.toFixed(1), latestTemp: latest.temperature };
  }
  if (parseFloat(latest.temperature) >= 38.0) {
    return { level: 'warning', temp: latest.temperature };
  }
  return null;
}

export function checkAndShowTempAlert() {
  var diseases = window.state.myDiseases || [];
  if (!window.state.records || window.state.records.length < 2) return;

  // 既存 calcTemperaturePhases alerts チェック
  var tempCount = window.state.records.filter(function(r) { return r.temperature; }).length;
  if (tempCount >= 14) {
    var analysis = (window.analyzeTemperatureLegacy || calcTemperaturePhases)(window.state.records);
    if (analysis && analysis.alerts && analysis.alerts.length > 0) {
      var hasEmergency = analysis.alerts.some(function(a) {
        return a.level === 'emergency' || a.level === 'danger';
      });
      if (hasEmergency) {
        showTempAlertBanner('体温に気になるパターンがあります。体温グラフで確認してください', 'warn');
        return;
      }
    }
  }

  // 急激な体温上昇チェック（卵巣嚢腫ユーザーのみ）
  var suddenRise = checkSuddenTempRise(window.state.records, diseases);
  if (suddenRise) {
    var msg = suddenRise.level === 'warning'
      ? '体温が' + suddenRise.temp + '℃と高めです。腹痛や吐き気を伴う場合は医療機関にご相談ください'
      : '前日より体温が' + suddenRise.diff + '℃上昇しています。腹痛や吐き気を伴う場合は医療機関にご相談ください';
    showTempAlertBanner(msg, suddenRise.level === 'warning' ? 'danger' : 'caution');
  }
}

export function showTempAlertBanner(message, level) {
  var existing = document.getElementById('temp-alert-banner');
  if (existing) existing.remove();

  var colors = {
    'danger':  { bg: '#fde8e8', border: '#c4878c', text: '#8a4050', btn: '#c4878c' },
    'caution': { bg: '#fdf3e8', border: '#d4a574', text: '#7a5020', btn: '#d4a574' },
    'warn':    { bg: '#fdf8e8', border: '#d4c474', text: '#6a5820', btn: '#d4c474' }
  };
  var c = colors[level] || colors['warn'];

  var banner = document.createElement('div');
  banner.id = 'temp-alert-banner';
  banner.style.cssText = 'margin:0 20px 12px;background:' + c.bg + ';border:1px solid ' + c.border + ';border-radius:14px;padding:12px 14px;';
  banner.innerHTML =
    '<div style="font-size:12px;color:' + c.text + ';line-height:1.6;margin-bottom:8px;">🌡️ ' + message + '</div>'
    + '<div style="font-size:10px;color:' + c.text + ';opacity:0.75;margin-bottom:8px;">※ これは記録データに基づく参考情報です。医学的診断ではありません。</div>'
    + '<div style="display:flex;gap:8px;">'
    + '<button onclick="premiumGate(openTempReport)" style="flex:1;padding:8px;background:' + c.btn + ';color:white;border:none;border-radius:10px;font-size:11px;font-family:\'Noto Sans JP\',sans-serif;cursor:pointer;">体温グラフを確認する</button>'
    + '<button onclick="document.getElementById(\'temp-alert-banner\').remove()" style="padding:8px 12px;background:transparent;border:1px solid ' + c.border + ';border-radius:10px;font-size:11px;color:' + c.text + ';cursor:pointer;">閉じる</button>'
    + '</div>';

  // CTAカード直後に挿入
  var ctaCard = document.getElementById('home-record-cta');
  if (ctaCard && ctaCard.parentNode) {
    ctaCard.parentNode.insertBefore(banner, ctaCard.nextSibling);
  }
}
