// ================================================================
//  ippo – src/modules/pro/flareup-report.js
//  PR-082 (Legacy Removal Batch-4): 症状が強かった日の共通点（Flareup Report）
//
//  app-legacy.js から物理移動。既存挙動は無変更（Business Logic変更なし）。
//  bare `state` 参照は `window.state` に置換（record-screen.js / premium-lock.js
//  と同型。_ippoStateHooks により同一オブジェクト参照、挙動変更なし）。
// ================================================================

// ===== フレアアップ自動検出 =====
export function detectFlareups(records){
  var sorted = records.slice().sort(function(a,b){ return new Date(a.date) - new Date(b.date); });
  var flareups = [];
  for(var i=1; i<sorted.length; i++){
    var prev = sorted[i-1];
    var curr = sorted[i];
    var reasons = [];

    // 痛みが前日比+3以上
    if((curr.painLevel||0) - (prev.painLevel||0) >= 3){
      reasons.push('痛み急上昇 ('+(prev.painLevel||0)+'→'+(curr.painLevel||0)+')');
    }
    // ウェルネスが前日比-20以上
    if((prev.wellnessScore||50) - (curr.wellnessScore||50) >= 20){
      reasons.push('ウェルネス急低下 ('+(prev.wellnessScore||50)+'→'+(curr.wellnessScore||50)+')');
    }
    // 症状が前日比+3以上
    var prevSym = prev.symptoms ? prev.symptoms.length : 0;
    var currSym = curr.symptoms ? curr.symptoms.length : 0;
    if(currSym - prevSym >= 3){
      reasons.push('症状急増 ('+prevSym+'→'+currSym+'個)');
    }
    // エネルギーが前日比-2以上
    if((prev.energy||3) - (curr.energy||3) >= 2){
      reasons.push('エネルギー急低下 ('+(prev.energy||3)+'→'+(curr.energy||3)+')');
    }

    if(reasons.length > 0){
      var d = new Date(curr.date);
      flareups.push({
        date: curr.date,
        dateStr: (d.getMonth()+1)+'/'+d.getDate(),
        reasons: reasons,
        painLevel: curr.painLevel || 0,
        symptoms: curr.symptoms || [],
        factors: curr.factors || [],
        wellness: curr.wellnessScore,
        energy: curr.energy || 0,
        prevFactors: prev.factors || []
      });
    }
  }
  return flareups;
}

var _flareupOverlayApi = null;
export function openFlareupReport(){
  var flareups = detectFlareups(window.state.records);

  // 分析対象メタ情報
  var totalRecs = window.state.records.length;
  var lastDate = '';
  if(totalRecs > 0){
    var _flSorted = window.state.records.slice().sort(function(a,b){
      return (b.record_date||b.date||'').localeCompare(a.record_date||a.date||'');
    });
    var _flLd = new Date(_flSorted[0].record_date || _flSorted[0].date || '');
    if(!isNaN(_flLd.getTime())) lastDate = (_flLd.getMonth()+1)+'月'+_flLd.getDate()+'日';
  }
  var firstDate = '';
  if(totalRecs > 0){
    var _flFirst = window.state.records.slice().sort(function(a,b){
      return (a.record_date||a.date||'').localeCompare(b.record_date||b.date||'');
    });
    var _flFd = new Date(_flFirst[0].record_date || _flFirst[0].date || '');
    if(!isNaN(_flFd.getTime())) firstDate = (_flFd.getMonth()+1)+'月'+_flFd.getDate()+'日';
  }

  if (!_flareupOverlayApi) {
    _flareupOverlayApi = window.createProOverlay({
      id:        'flareupOverlay',
      ariaLabel: '症状が強かった日の共通点',
      title:     '症状が強かった日の共通点',
      subtitle:  '症状が急に強くなった日とその前後を整理します',
      footer:    [{ id: 'flareup-close', label: '閉じる', cls: 'pob-btn pob-btn-secondary' }],
      onClose:   function(){ _flareupOverlayApi.close(); },
    });
    _flareupOverlayApi.getButton('flareup-close').addEventListener('click', function(){ _flareupOverlayApi.close(); });
  }

  var bodyHtml = '';
  bodyHtml += '<div class="pha-meta"><span style="font-size:11px;color:var(--ink-light);display:block;margin-bottom:4px;">📋 分析対象</span>'
    + totalRecs+'件の記録'+(firstDate&&lastDate?' ／ '+firstDate+' 〜 '+lastDate:'')+'</div>';

  if(totalRecs < 2){
    bodyHtml += '<div style="text-align:center;padding:40px 0;color:var(--ink-light);font-size:14px;line-height:1.9;">📋 分析できる記録がまだ十分ではありません。<br>記録を続けると傾向が見えてきます。</div>';
  } else if(flareups.length === 0){
    bodyHtml += '<div style="text-align:center;padding:40px 0;color:var(--ink-light);font-size:14px;line-height:1.9;">✨ 急な変化は見られませんでした。<br><span style="font-size:12px;">（'+totalRecs+'件の記録を確認しました）</span></div>';
  } else {

    // ① 今見えていること
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">今見えていること</div>'
      + '<div style="background:var(--rose-pale);border-radius:14px;padding:14px 16px;">'
      + '<div style="font-size:15px;color:var(--ink-mid);line-height:1.7;">'+flareups.length+'日、症状が急に強くなった日が見つかりました</div>'
      + '</div></div>';

    // ② なぜそう考えた？
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">なぜそう考えた？</div>'
      + '<div class="pha-card" style="margin-bottom:0;font-size:14px;color:var(--ink-mid);line-height:1.8;">前日と比べて、痛み・ウェルネス・症状の数・エネルギーのうちいずれかが急変した日を検出しています。</div>'
      + '</div>';

    // ③ 詳しいデータ
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">詳しいデータを見る</div>';
    flareups.slice().reverse().forEach(function(f){
      bodyHtml += '<div class="pha-card" style="border-left:3px solid var(--rose);">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
        + '<div style="font-size:15px;font-weight:600;color:var(--ink);">'+f.dateStr+'</div>'
        + '<div style="display:flex;gap:4px;">';
      if(f.wellness !== undefined) bodyHtml += '<span style="font-size:11px;background:#fde8e8;color:#c4878c;padding:2px 8px;border-radius:8px;">WS:'+f.wellness+'</span>';
      if(f.energy) bodyHtml += '<span style="font-size:11px;background:#e8f4ec;color:#4a7c5c;padding:2px 8px;border-radius:8px;">⚡'+f.energy+'</span>';
      if(f.painLevel) bodyHtml += '<span style="font-size:11px;background:#fde8e8;color:#c4878c;padding:2px 8px;border-radius:8px;">痛み'+f.painLevel+'</span>';
      bodyHtml += '</div></div>';

      bodyHtml += '<div style="margin-bottom:8px;">';
      f.reasons.forEach(function(r){
        bodyHtml += '<div style="font-size:13px;color:var(--rose);margin-bottom:4px;">🔺 '+r+'</div>';
      });
      bodyHtml += '</div>';

      if(f.symptoms.length > 0){
        bodyHtml += '<div style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:4px;">';
        f.symptoms.forEach(function(s){
          bodyHtml += '<span style="font-size:12px;background:var(--warm-light);color:var(--ink-mid);padding:3px 10px;border-radius:8px;">'+s+'</span>';
        });
        bodyHtml += '</div>';
      }
      if(f.factors.length > 0) bodyHtml += '<div style="font-size:12px;color:var(--ink-light);margin-top:6px;">📋 当日の要因：'+f.factors.join('・')+'</div>';
      if(f.prevFactors.length > 0) bodyHtml += '<div style="font-size:12px;color:var(--ink-light);margin-top:3px;">📋 前日の要因：'+f.prevFactors.join('・')+'</div>';
      bodyHtml += '</div>';
    });
    bodyHtml += '</div>';

    // ④ 共通点（トリガー分析）
    var triggerCounts = {};
    flareups.forEach(function(f){
      f.factors.concat(f.prevFactors).forEach(function(fac){
        triggerCounts[fac] = (triggerCounts[fac] || 0) + 1;
      });
    });
    var triggers = Object.entries(triggerCounts).sort(function(a,b){ return b[1]-a[1]; });
    if(triggers.length > 0){
      bodyHtml += '<div style="margin-bottom:16px;"><div class="pha-section-title">症状が強かった日に多かった要因</div>'
        + '<div class="pha-card" style="margin-bottom:0;">';
      triggers.slice(0,5).forEach(function(t){
        var pct = Math.round(t[1] / flareups.length * 100);
        bodyHtml += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
          + '<div style="font-size:13px;color:var(--ink-mid);">'+t[0]+'</div>'
          + '<div style="display:flex;align-items:center;gap:6px;flex:1;margin-left:12px;">'
          + '<div class="pha-bar" style="flex:1;"><div style="height:100%;width:'+pct+'%;background:var(--rose);border-radius:4px;"></div></div>'
          + '<div style="font-size:11px;color:var(--ink-light);min-width:32px;text-align:right;">'+t[1]+'日</div>'
          + '</div></div>';
      });
      bodyHtml += '</div></div>';
    }
  }

  _flareupOverlayApi.body.innerHTML = bodyHtml;
  _flareupOverlayApi.open();
}

// PR-090-R6 (Legacy Removal, EXPORT_HUB_REFACTOR_COUNCIL Step D): 自己export化。
// app-legacy.js側の重複export行（guarded window.X = X）は削除済み。
window.detectFlareups   = detectFlareups;
window.openFlareupReport = openFlareupReport;
