// ================================================================
//  ippo – src/modules/pro/cycle-report.js
//  PR-082 (Legacy Removal Batch-4): 周期ごとの体調の違い（Cycle Phase Report）
//  + ホーム画面プレビューカード（renderPhaseMap / selectPhaseTab）
//
//  app-legacy.js から物理移動。既存挙動は無変更（Business Logic変更なし）。
//
//  【監査メモ】renderPhaseMap() は `#phase-map-content` を対象に描画するが、
//  同IDの要素はapp.html配下のいずれのHTMLにも存在せず、現状は
//  到達不能（呼び出し元 app-legacy.js の bare `renderPhaseMap()` も
//  常にno-op）。PR-079/PR-080系で確認済みの pre-existing 到達不能挙動と
//  同型のため、本PRでは修正せず現状のまま物理移動のみ実施。
//
//  bare `state` 参照は `window.state` に置換（record-screen.js / premium-lock.js
//  と同型。_ippoStateHooks により同一オブジェクト参照、挙動変更なし）。
//  `analyzeCyclePhases` / `isAdminOrPremium` / `premiumGate` は app-legacy.js
//  側に残存する関数のため window.* 経由で参照（premium-lock.js と同型のDI bridge）。
// ================================================================

var _cycleOverlayApi = null;

export function openCyclePhaseReport(){
  var analysis = window.analyzeCyclePhases(window.state.records);
  var phaseNames = ['月経期','卵胞期','排卵期','黄体期'];
  var phaseIcons = {'月経期':'🔴','卵胞期':'🌱','排卵期':'🥚','黄体期':'🌙'};
  var phaseColors = {'月経期':'#c4878c','卵胞期':'#6b9e78','排卵期':'#d4a574','黄体期':'#7ba3c4'};

  var totalRecs = window.state.records.length;
  var lastDate = '';
  if(totalRecs > 0){
    var _sorted = window.state.records.slice().sort(function(a,b){
      return (b.record_date||b.date||'').localeCompare(a.record_date||a.date||'');
    });
    var _ld = new Date(_sorted[0].record_date || _sorted[0].date || '');
    if(!isNaN(_ld.getTime())) lastDate = (_ld.getMonth()+1)+'月'+_ld.getDate()+'日';
  }

  if (!_cycleOverlayApi) {
    _cycleOverlayApi = window.createProOverlay({
      id:        'cyclePhaseOverlay',
      ariaLabel: '周期ごとの体調の違い',
      title:     '周期ごとの体調の違い',
      subtitle:  '周期ごとの記録を整理しています',
      footer:    [{ id: 'cycle-close', label: '閉じる', cls: 'pob-btn pob-btn-secondary' }],
      onClose:   function(){ _cycleOverlayApi.close(); },
    });
    _cycleOverlayApi.getButton('cycle-close').addEventListener('click', function(){ _cycleOverlayApi.close(); });
  }

  var bodyHtml = '';
  bodyHtml += '<div class="pha-meta"><span style="font-size:11px;color:var(--ink-light);display:block;margin-bottom:4px;">📋 分析対象</span>'
    + totalRecs+'件の記録'+(lastDate?' ／ 最終記録 '+lastDate:'')+'</div>';

  if(Object.keys(analysis).length === 0){
    bodyHtml += '<div style="text-align:center;padding:40px 0;color:var(--ink-light);font-size:14px;line-height:1.9;">🌸 生理周期のデータがまだ不足しています。<br>生理日を記録し続けると、フェーズ別の傾向が見えてきます。</div>';
  } else {

    // ① 今見えていること
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">今見えていること</div>'
      + '<div style="display:flex;gap:6px;">';
    phaseNames.forEach(function(name){
      var d = analysis[name];
      var color = phaseColors[name];
      bodyHtml += '<div style="flex:1;background:var(--white);border-radius:12px;padding:10px 6px;text-align:center;box-shadow:0 1px 4px var(--shadow);">'
        + '<div style="font-size:16px;margin-bottom:4px;">'+phaseIcons[name]+'</div>'
        + '<div style="font-size:9px;color:var(--ink-light);margin-bottom:4px;">'+name+'</div>';
      if(d){
        bodyHtml += '<div style="font-size:18px;font-weight:700;color:'+color+';">'+(d.avgWellness!=='-'?d.avgWellness:'-')+'</div>'
          + '<div style="font-size:10px;color:var(--ink-light);">ウェルネス</div>';
      } else {
        bodyHtml += '<div style="font-size:14px;color:var(--ink-light);">—</div>';
      }
      bodyHtml += '</div>';
    });
    bodyHtml += '</div></div>';

    // ② なぜそう考えた？
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">なぜそう考えた？</div>'
      + '<div class="pha-card" style="margin-bottom:0;font-size:14px;color:var(--ink-mid);line-height:1.8;">各フェーズで記録した体調データ（ウェルネス・エネルギー・睡眠の質・痛み）の平均値を比較しています。記録が多いほど、傾向がより正確に見えてきます。</div>'
      + '</div>';

    // ③ 詳しいデータを見る
    bodyHtml += '<div style="margin-bottom:8px;"><div class="pha-section-title">詳しいデータを見る</div>';
    phaseNames.forEach(function(name){
      var d = analysis[name];
      if(!d) return;
      var color = phaseColors[name];

      bodyHtml += '<div class="pha-card" style="border-left:3px solid '+color+';">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
        + '<div style="font-size:15px;font-weight:500;color:var(--ink);">'+phaseIcons[name]+' '+name+'</div>'
        + '<div style="font-size:11px;color:var(--ink-light);background:var(--cream);padding:3px 8px;border-radius:8px;">'+d.days+'日分の記録</div>'
        + '</div>';

      bodyHtml += '<div class="pha-grid-2" style="margin-bottom:10px;">';
      var metrics = [
        {label:'エネルギー', val:d.avgEnergy, max:5, unit:'/5'},
        {label:'睡眠の質', val:d.avgSleep, max:5, unit:'/5'},
        {label:'痛みレベル', val:d.avgPain, max:10, unit:'/10'},
        {label:'ウェルネス', val:d.avgWellness, max:100, unit:'/100'}
      ];
      metrics.forEach(function(m){
        var pct = m.val !== '-' ? Math.round(parseFloat(m.val)/m.max*100) : 0;
        bodyHtml += '<div class="pha-metric">'
          + '<div style="font-size:11px;color:var(--ink-light);margin-bottom:4px;">'+m.label+'</div>'
          + '<div style="font-size:16px;font-weight:600;color:'+color+';">'+m.val+'<span style="font-size:11px;color:var(--ink-light);">'+m.unit+'</span></div>'
          + '<div class="pha-bar"><div style="height:100%;width:'+pct+'%;background:'+color+';border-radius:4px;"></div></div>'
          + '</div>';
      });
      bodyHtml += '</div>';

      if(d.topSymptoms.length > 0){
        bodyHtml += '<div style="margin-bottom:6px;"><span style="font-size:12px;color:var(--ink-light);">この時期に多い症状：</span>';
        d.topSymptoms.forEach(function(s){
          bodyHtml += '<span style="font-size:12px;background:var(--warm-light);color:var(--ink-mid);padding:2px 8px;border-radius:8px;margin-left:4px;">'+s[0]+' ('+s[1]+'日)</span>';
        });
        bodyHtml += '</div>';
      }
      if(d.topFactors.length > 0){
        bodyHtml += '<div><span style="font-size:12px;color:var(--ink-light);">この時期に多い要因：</span>';
        d.topFactors.forEach(function(f){
          bodyHtml += '<span style="font-size:12px;background:#e8f4ec;color:#4a7c5c;padding:2px 8px;border-radius:8px;margin-left:4px;">'+f[0]+' ('+f[1]+'日)</span>';
        });
        bodyHtml += '</div>';
      }
      bodyHtml += '</div>';
    });
    bodyHtml += '</div>';
  }

  _cycleOverlayApi.body.innerHTML = bodyHtml;
  _cycleOverlayApi.open();
}

// ===== フェーズ別症状マップ =====
export function renderPhaseMap() {
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('renderPhaseMap', renderPhaseMap);
    return;
  }
  var container = document.getElementById('phase-map-content');
  if (!container) return;

  // PRO以外はロックカードを表示
  if (!window.isAdminOrPremium()) {
    container.innerHTML =
      '<div onclick="premiumGate(openCyclePhaseReport)" style="background:linear-gradient(135deg,#fdf3f3,#f9edd8);border-radius:18px;padding:18px 20px;cursor:pointer;position:relative;overflow:hidden;">'
      + '<div style="position:absolute;top:0;right:0;bottom:0;width:50%;background:linear-gradient(135deg,rgba(200,169,110,0.08),transparent);"></div>'
      + '<div style="font-size:13px;font-weight:500;color:var(--ink);margin-bottom:6px;">周期フェーズ × 症状のパターンを見る</div>'
      + '<div style="font-size:11px;color:var(--ink-light);line-height:1.7;margin-bottom:14px;">どのフェーズで骨盤痛が集中しているか、黄体期のエネルギーレベルはどうかがわかります。診察前の確認にも役立ちます。</div>'
      + '<div style="display:flex;gap:8px;margin-bottom:12px;">'
      + _buildPhaseBarPreview()
      + '</div>'
      + '<div style="background:var(--rose);color:white;border-radius:12px;padding:10px;text-align:center;font-size:13px;font-weight:500;">🔓 PROで全フェーズを確認する</div>'
      + '</div>';
    return;
  }

  // PROユーザー：実データを描画
  var analysis = window.analyzeCyclePhases(window.state.records || []);
  var phaseNames = ['月経期', '卵胞期', '排卵期', '黄体期'];
  var phaseColors = { '月経期': '#c4878c', '卵胞期': '#6b9e78', '排卵期': '#d4a574', '黄体期': '#7ba3c4' };
  var phaseIcons  = { '月経期': '🔴', '卵胞期': '🌱', '排卵期': '🥚', '黄体期': '🌙' };

  if (Object.keys(analysis).length === 0) {
    container.innerHTML =
      '<div style="background:var(--white);border-radius:16px;padding:20px;text-align:center;color:var(--ink-light);font-size:12px;line-height:1.8;box-shadow:0 1px 6px var(--shadow);">'
      + '🌸 生理周期のデータがまだ不足しています。<br>生理日を記録し続けると、フェーズ別の傾向が見えてきます。'
      + '</div>';
    return;
  }

  // フェーズ選択タブ
  var html = '<div id="phase-tab-row" style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;padding-bottom:2px;">';
  phaseNames.forEach(function(name, idx) {
    var active = idx === 0 ? 'background:var(--rose);color:white;border-color:var(--rose);' : 'background:var(--white);color:var(--ink-light);border-color:#e8ddd8;';
    html += '<button onclick="selectPhaseTab(\'' + name + '\')" id="phase-tab-' + name + '" style="flex-shrink:0;padding:7px 14px;border-radius:20px;border:1.5px solid;font-size:12px;font-family:\'Noto Sans JP\',sans-serif;cursor:pointer;transition:all 0.2s;' + active + '">'
      + phaseIcons[name] + ' ' + name + '</button>';
  });
  html += '</div>';

  // 各フェーズのパネル
  phaseNames.forEach(function(name) {
    var d = analysis[name];
    var color = phaseColors[name];
    var display = name === '月経期' ? 'block' : 'none';

    html += '<div id="phase-panel-' + name + '" style="display:' + display + ';">';
    if (!d) {
      html += '<div style="background:var(--white);border-radius:16px;padding:16px;text-align:center;color:var(--ink-light);font-size:12px;box-shadow:0 1px 6px var(--shadow);">'
        + 'このフェーズのデータがまだありません。</div>';
    } else {
      html += '<div style="background:var(--white);border-radius:18px;padding:18px;box-shadow:0 1px 8px var(--shadow);border-top:3px solid ' + color + ';">';

      // 指標グリッド
      html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px;">';
      var metrics = [
        { label: '平均痛みレベル', val: d.avgPain,     unit: '/10',  max: 10,  warn: 5    },
        { label: 'エネルギー',     val: d.avgEnergy,   unit: '/5',   max: 5,   warn: null },
        { label: '睡眠の質',       val: d.avgSleep,    unit: '/5',   max: 5,   warn: null },
        { label: 'ウェルネス',     val: d.avgWellness, unit: '/100', max: 100, warn: 40   }
      ];
      metrics.forEach(function(m) {
        var pct = m.val !== '-' ? Math.round(parseFloat(m.val) / m.max * 100) : 0;
        var valColor = (m.warn && m.val !== '-' && parseFloat(m.val) >= m.warn) ? '#c4878c' : color;
        html += '<div style="background:var(--cream);border-radius:12px;padding:12px;">';
        html += '<div style="font-size:10px;color:var(--ink-light);margin-bottom:4px;">' + m.label + '</div>';
        html += '<div style="font-size:18px;font-weight:600;color:' + valColor + ';line-height:1;">' + m.val + '<span style="font-size:10px;color:var(--ink-light);">' + m.unit + '</span></div>';
        html += '<div style="height:4px;background:#e8ddd8;border-radius:2px;margin-top:6px;overflow:hidden;">';
        html += '<div style="height:100%;width:' + pct + '%;background:' + valColor + ';border-radius:2px;transition:width 0.4s;"></div>';
        html += '</div></div>';
      });
      html += '</div>';

      // 多い症状
      if (d.topSymptoms && d.topSymptoms.length > 0) {
        html += '<div style="margin-bottom:12px;">';
        html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:7px;">このフェーズで多い症状</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
        d.topSymptoms.slice(0, 5).forEach(function(s) {
          html += '<span style="font-size:11px;background:#fdf0f2;color:#c4878c;padding:4px 10px;border-radius:12px;">'
            + s[0] + ' <span style="font-size:10px;opacity:0.7;">(' + s[1] + '日)</span></span>';
        });
        html += '</div></div>';
      }

      // 多い生活要因
      if (d.topFactors && d.topFactors.length > 0) {
        html += '<div style="margin-bottom:12px;">';
        html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:7px;">このフェーズで多い要因</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
        d.topFactors.slice(0, 4).forEach(function(f) {
          html += '<span style="font-size:11px;background:#e8f4ec;color:#4a7c5c;padding:4px 10px;border-radius:12px;">'
            + f[0] + ' <span style="font-size:10px;opacity:0.7;">(' + f[1] + '日)</span></span>';
        });
        html += '</div></div>';
      }

      // 詳細レポートへのリンク
      html += '<button onclick="openCyclePhaseReport()" style="width:100%;padding:11px;background:var(--cream);border:1.5px solid #e8ddd8;border-radius:12px;font-family:\'Noto Sans JP\',sans-serif;font-size:12px;color:var(--ink-light);cursor:pointer;margin-top:4px;">全フェーズの詳細比較を見る →</button>';

      html += '</div>';
    }
    html += '</div>';
  });

  container.innerHTML = html;
}

export function selectPhaseTab(name) {
  var phaseNames = ['月経期', '卵胞期', '排卵期', '黄体期'];
  var phaseColors = { '月経期': '#c4878c', '卵胞期': '#6b9e78', '排卵期': '#d4a574', '黄体期': '#7ba3c4' };
  phaseNames.forEach(function(n) {
    var tab = document.getElementById('phase-tab-' + n);
    var panel = document.getElementById('phase-panel-' + n);
    if (tab) {
      if (n === name) {
        tab.style.background = phaseColors[n] || 'var(--rose)';
        tab.style.color = 'white';
        tab.style.borderColor = phaseColors[n] || 'var(--rose)';
      } else {
        tab.style.background = 'var(--white)';
        tab.style.color = 'var(--ink-light)';
        tab.style.borderColor = '#e8ddd8';
      }
    }
    if (panel) panel.style.display = n === name ? 'block' : 'none';
  });
}

// 非PROユーザー向けのぼかしプレビューバーを生成
export function _buildPhaseBarPreview() {
  var phases = [
    { name: '月経期', color: '#c4878c', val: 65 },
    { name: '卵胞期', color: '#6b9e78', val: 85 },
    { name: '排卵期', color: '#d4a574', val: 80 },
    { name: '黄体期', color: '#7ba3c4', val: 60 }
  ];
  return phases.map(function(p) {
    return '<div style="flex:1;text-align:center;">'
      + '<div style="height:40px;background:' + p.color + '33;border-radius:8px;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;">'
      + '<div style="width:70%;height:' + p.val + '%;background:' + p.color + '88;border-radius:4px 4px 0 0;filter:blur(1px);"></div>'
      + '</div>'
      + '<div style="font-size:9px;color:var(--ink-light);margin-top:4px;">' + p.name + '</div>'
      + '</div>';
  }).join('');
}
