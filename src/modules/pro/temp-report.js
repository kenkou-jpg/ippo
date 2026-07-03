// ================================================================
//  ippo – src/modules/pro/temp-report.js
//  PR-082 (Legacy Removal Batch-4): 体温のリズム（Temp Report）
//
//  app-legacy.js から物理移動。既存挙動は無変更（Business Logic変更なし）。
//  bare `state` 参照は `window.state` に置換（record-screen.js / premium-lock.js
//  と同型。_ippoStateHooks により同一オブジェクト参照、挙動変更なし）。
//
//  calcTemperaturePhases は analysis-module.js の analyzeTemperatureLegacy
//  （Strangler Pattern済み）にフォールバックされる旧ロジック。呼び出し側
//  （openTempReport / showTempEducation）は既存どおり
//  `window.analyzeTemperatureLegacy || calcTemperaturePhases` の順で解決する。
// ================================================================

// ===== 体温フェーズ自動判定エンジン =====
export function calcTemperaturePhases(records) {
  // 体温データを抽出（14日以上必要）
  var temps = [];
  var sorted = records.slice().sort(function(a,b){ return new Date(a.date) - new Date(b.date); });
  sorted.forEach(function(r) {
    if (r.temperature) {
      temps.push({ date: r.date, temp: parseFloat(r.temperature) });
    }
  });

  if (temps.length < 14) {
    return {
      status: 'insufficient',
      count: temps.length,
      required: 14,
      message: 'あと' + (14 - temps.length) + '日分の体温記録が必要です'
    };
  }

  // 基本統計
  var values = temps.map(function(t){ return t.temp; });
  var minTemp = Math.min.apply(null, values);
  var maxTemp = Math.max.apply(null, values);
  var tempDiff = Math.round((maxTemp - minTemp) * 100) / 100;
  var avgTemp = Math.round(values.reduce(function(a,b){return a+b;},0) / values.length * 100) / 100;
  var threshold = Math.round((minTemp + tempDiff * 0.5) * 100) / 100;

  // 各日をフェーズ分類
  var phases = temps.map(function(t) {
    return {
      date: t.date,
      temp: t.temp,
      phase: t.temp < threshold ? 'low' : 'high'
    };
  });

  // 低温期・高温期の平均
  var lowTemps = phases.filter(function(p){ return p.phase === 'low'; }).map(function(p){ return p.temp; });
  var highTemps = phases.filter(function(p){ return p.phase === 'high'; }).map(function(p){ return p.temp; });
  var avgLow = lowTemps.length > 0 ? Math.round(lowTemps.reduce(function(a,b){return a+b;},0) / lowTemps.length * 100) / 100 : null;
  var avgHigh = highTemps.length > 0 ? Math.round(highTemps.reduce(function(a,b){return a+b;},0) / highTemps.length * 100) / 100 : null;

  // 二相性判定
  var biphasic = 'none';
  if (tempDiff >= 0.3) biphasic = 'clear';
  else if (tempDiff >= 0.2) biphasic = 'unclear';
  else biphasic = 'none';

  // M字パターン検出（高温期中に0.3℃以上の一時低下）
  var mPattern = false;
  var inHighPhase = false;
  var highStart = -1;
  for (var i = 0; i < phases.length; i++) {
    if (phases[i].phase === 'high' && !inHighPhase) {
      inHighPhase = true;
      highStart = i;
    }
    if (phases[i].phase === 'low' && inHighPhase) {
      // 高温期中に低温に戻った
      if (i - highStart >= 3 && i + 1 < phases.length && phases[i+1] && phases[i+1].phase === 'high') {
        mPattern = true;
      }
      inHighPhase = false;
    }
  }

  // 高温期の日数
  var highPhaseDays = 0;
  var currentHighStreak = 0;
  var maxHighStreak = 0;
  phases.forEach(function(p) {
    if (p.phase === 'high') {
      currentHighStreak++;
      if (currentHighStreak > maxHighStreak) maxHighStreak = currentHighStreak;
    } else {
      currentHighStreak = 0;
    }
  });
  highPhaseDays = maxHighStreak;

  // 低温期の日数
  var lowPhaseDays = 0;
  var currentLowStreak = 0;
  var maxLowStreak = 0;
  phases.forEach(function(p) {
    if (p.phase === 'low') {
      currentLowStreak++;
      if (currentLowStreak > maxLowStreak) maxLowStreak = currentLowStreak;
    } else {
      currentLowStreak = 0;
    }
  });
  lowPhaseDays = maxLowStreak;

  // 排卵推定日（低温期の最後の日）
  var ovulationDate = null;
  for (var j = phases.length - 1; j >= 1; j--) {
    if (phases[j].phase === 'high' && phases[j-1].phase === 'low') {
      ovulationDate = phases[j-1].date;
      break;
    }
  }

  // 疾患別警戒値チェック
  var diseases = window.state.myDiseases || [];
  var alerts = [];

  // 共通警戒値
  if (avgLow !== null && avgLow >= 37.0) {
    alerts.push({ level: 'danger', message: '低温期の平均が37.0℃以上です。慢性炎症の可能性があります。医師への相談をおすすめします。' });
  } else if (avgLow !== null && avgLow >= 36.5) {
    alerts.push({ level: 'warning', message: '低温期の平均が36.5℃以上です。やや高めの傾向です。' });
  }

  if (avgHigh !== null && avgHigh >= 37.5) {
    alerts.push({ level: 'danger', message: '高温期の平均が37.5℃以上です。異常な高温期の可能性があります。' });
  }

  if (maxTemp >= 38.0) {
    alerts.push({ level: 'emergency', message: '38℃以上の体温が記録されています。感染や嚢腫破裂の可能性があり、早急な受診をおすすめします。' });
  }

  // 卵巣嚢腫固有
  if (diseases.indexOf('卵巣嚢腫') !== -1) {
    if (avgLow !== null && avgLow >= 37.0) {
      alerts.push({ level: 'disease', disease: '卵巣嚢腫', message: '低温期37℃以上は卵巣嚢腫による慢性炎症を示唆する体温パターンです。' });
    }
    if (tempDiff >= 0.8) {
      alerts.push({ level: 'disease', disease: '卵巣嚢腫', message: '温度差が' + tempDiff + '℃と大きく、炎症の悪化が疑われます。' });
    }
  }

  // 子宮内膜症固有
  if (diseases.indexOf('子宮内膜症') !== -1) {
    // 月経初日の高体温チェック
    var cycleRecords = records.filter(function(r){ return r.menstrualCycle && r.menstrualCycle !== 'なし' && r.temperature; });
    var periodHighTemp = cycleRecords.filter(function(r){ return parseFloat(r.temperature) >= 36.5; });
    if (periodHighTemp.length >= 2) {
      alerts.push({ level: 'disease', disease: '子宮内膜症', message: '月経中の体温が36.5℃以上の日が' + periodHighTemp.length + '日あります。骨盤内膜症との関連が報告されているパターンです。' });
    }
  }

  // PCOS固有
  if (diseases.indexOf('PCOS') !== -1) {
    if (biphasic === 'none') {
      alerts.push({ level: 'disease', disease: 'PCOS', message: '二相性が不明確です。排卵障害の可能性があります。' });
    }
    if (lowPhaseDays >= 18) {
      alerts.push({ level: 'disease', disease: 'PCOS', message: '低温期が' + lowPhaseDays + '日と長く、LH/FSH比の異常が疑われます。' });
    }
  }

  // 黄体機能不全パターン（PDFデータ：高温期10日以下、温度差0.2℃以下）
  if (highPhaseDays > 0 && highPhaseDays < 10) {
    alerts.push({ level: 'warning', message: '高温期が' + highPhaseDays + '日と短めです（正常12〜14日）。プロゲステロン不足・黄体機能不全の可能性があります。' });
  }
  if (mPattern) {
    alerts.push({ level: 'warning', message: '高温期中に体温が一時低下するM字パターンが検出されました。黄体ホルモンの分泌が不安定な可能性があります。' });
  }
  // 温度差が小さい（PDFデータ：0.2℃以下で黄体機能不全）
  if (tempDiff > 0 && tempDiff < 0.2) {
    alerts.push({ level: 'warning', message: '低温期と高温期の温度差が' + tempDiff + '℃（正常0.3〜0.5℃）と小さく、黄体機能不全・排卵障害の可能性があります。医師への相談をお勧めします。' });
  } else if (tempDiff >= 0.2 && tempDiff < 0.3) {
    alerts.push({ level: 'caution', message: '温度差が' + tempDiff + '℃とやや小さめです（正常0.3〜0.5℃）。プロゲステロン分泌がやや不十分な可能性があります。' });
  }
  // 低温期が長い（PDFデータ：20日以上で排卵遅延）
  if (lowPhaseDays >= 20) {
    alerts.push({ level: 'warning', message: '低温期が' + lowPhaseDays + '日（正常12〜16日）と長く、排卵遅延の可能性があります。ホルモンバランスの乱れが疑われます。' });
  }
  // 全体的な低体温（PDFデータ：甲状腺機能低下症）
  if (avgLow !== null && avgLow < 35.8) {
    alerts.push({ level: 'warning', message: '低温期の平均が35.8℃未満と低体温傾向です。甲状腺機能低下症との関連が報告されています。受診をお勧めします。' });
  }
  // PMS/PMDDの高温期高体温
  if (diseases.indexOf('PMS/PMDD') !== -1 && avgHigh !== null && avgHigh >= 37.0) {
    alerts.push({ level: 'disease', disease: 'PMS/PMDD', message: '高温期の平均が' + avgHigh + '℃と高めです（BMC研究）。メラトニン低下による体温調節異常が関与する可能性があります。睡眠の質改善もお試しください。' });
  }
  // 更年期障害の低体温
  if (diseases.indexOf('更年期障害') !== -1 && avgTemp !== null && avgTemp < 36.0) {
    alerts.push({ level: 'disease', disease: '更年期障害', message: '平均体温が' + avgTemp + '℃と低め（2025年研究：閉経後女性は中核体温が低下）。代謝低下に注意し、定期的な受診をお勧めします。' });
  }
  // 二相性なし（共通：無排卵症）
  if (biphasic === 'none' && diseases.indexOf('PCOS') === -1) {
    alerts.push({ level: 'warning', message: '二相性が確認できません。排卵が起こっていない可能性（無排卵症）があります。医師への相談をお勧めします。' });
  }

  // 次回月経予測
  var nextPeriod = null;
  if (ovulationDate) {
    var ovDate = new Date(ovulationDate);
    ovDate.setDate(ovDate.getDate() + 14);
    nextPeriod = ovDate.toISOString().split('T')[0];
  }

  return {
    status: 'ready',
    count: temps.length,
    minTemp: minTemp,
    maxTemp: maxTemp,
    tempDiff: tempDiff,
    avgTemp: avgTemp,
    threshold: threshold,
    avgLow: avgLow,
    avgHigh: avgHigh,
    biphasic: biphasic,
    mPattern: mPattern,
    highPhaseDays: highPhaseDays,
    lowPhaseDays: lowPhaseDays,
    ovulationDate: ovulationDate,
    nextPeriod: nextPeriod,
    phases: phases,
    alerts: alerts
  };
}

var _tempOverlayApi = null;
export function openTempReport(){
  var analysis = (window.analyzeTemperatureLegacy || calcTemperaturePhases)(window.state.records);

  // 分析対象メタ情報
  var tempRecs = window.state.records.filter(function(r){ return r.temperature; });
  var lastTempDate = '';
  if(tempRecs.length > 0){
    var _tSorted = tempRecs.slice().sort(function(a,b){
      return (b.date||'').localeCompare(a.date||'');
    });
    var _tLd = new Date(_tSorted[0].date || '');
    if(!isNaN(_tLd.getTime())) lastTempDate = (_tLd.getMonth()+1)+'月'+_tLd.getDate()+'日';
  }

  if (!_tempOverlayApi) {
    _tempOverlayApi = window.createProOverlay({
      id:        'tempReportOverlay',
      ariaLabel: '体温のリズム',
      title:     '体温のリズム',
      subtitle:  '体温記録から整理しています',
      footer:    [{ id: 'temp-close', label: '閉じる', cls: 'pob-btn pob-btn-secondary' }],
      onClose:   function(){ _tempOverlayApi.close(); },
    });
    _tempOverlayApi.getButton('temp-close').addEventListener('click', function(){ _tempOverlayApi.close(); });
  }
  _tempOverlayApi.overlay.querySelector('.pob-subtitle').textContent = analysis.count + '日分の体温記録から整理しています';

  var bodyHtml = '';
  bodyHtml += '<div class="pha-meta"><span style="font-size:11px;color:var(--ink-light);display:block;margin-bottom:4px;">📋 分析対象</span>'
    + tempRecs.length+'件の体温記録'+(lastTempDate?' ／ 最終記録 '+lastTempDate:'')+'</div>';

  bodyHtml += '<div style="background:rgba(180,160,150,0.12);border-radius:12px;padding:10px 14px;margin-bottom:24px;">'
    + '<div style="font-size:12px;color:var(--ink-light);line-height:1.7;">ℹ️ この画面は記録から体温のリズムを整理するものです。診断や医療判断を行うものではありません。</div>'
    + '</div>';

  if(analysis.status === 'insufficient'){
    bodyHtml += '<div style="text-align:center;padding:40px 0;color:var(--ink-light);font-size:14px;line-height:1.9;">🌡️ '+analysis.message+'<br>毎朝の基礎体温記録を続けましょう。</div>';
  } else {

    // ① 今見えていること
    var diffColor = analysis.tempDiff >= 0.3 ? '#6b9e78' : analysis.tempDiff >= 0.2 ? '#d4a574' : '#c4878c';
    var bLabel = analysis.biphasic === 'clear' ? '明確' : analysis.biphasic === 'unclear' ? 'やや不明瞭' : 'なし';
    var bColor = analysis.biphasic === 'clear' ? '#6b9e78' : analysis.biphasic === 'unclear' ? '#d4a574' : '#c4878c';

    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">今見えていること</div>'
      + '<div class="pha-card" style="margin-bottom:0;"><div class="pha-grid-2">'
      + '<div class="pha-metric"><div style="font-size:10px;color:var(--ink-light);margin-bottom:4px;">低温期の平均</div><div style="font-size:18px;font-weight:600;color:#7ba3c4;">'+(analysis.avgLow||'-')+'℃</div></div>'
      + '<div class="pha-metric"><div style="font-size:10px;color:var(--ink-light);margin-bottom:4px;">高温期の平均</div><div style="font-size:18px;font-weight:600;color:#c4878c;">'+(analysis.avgHigh||'-')+'℃</div></div>'
      + '<div class="pha-metric"><div style="font-size:10px;color:var(--ink-light);margin-bottom:4px;">低温・高温の差</div><div style="font-size:18px;font-weight:600;color:'+diffColor+';">'+analysis.tempDiff+'℃</div></div>'
      + '<div class="pha-metric"><div style="font-size:10px;color:var(--ink-light);margin-bottom:4px;">2段階のリズム</div><div style="font-size:18px;font-weight:600;color:'+bColor+';">'+bLabel+'</div></div>'
      + '</div></div></div>';

    // ② なぜそう考えた？
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">なぜそう考えた？</div>'
      + '<div class="pha-card" style="margin-bottom:0;font-size:14px;color:var(--ink-mid);line-height:1.8;">記録された体温を低温期・高温期に分類し、それぞれの平均と差を計算しています。差が大きいほど体温のリズムが安定していると考えられます。</div>'
      + '</div>';

    // ③ 直近30日の体温マップ
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">直近30日の体温マップ</div>'
      + '<div class="pha-card" style="margin-bottom:0;">'
      + '<div class="pha-temp-map">';
    var recentPhases = analysis.phases.slice(-30);
    recentPhases.forEach(function(p){
      var d = new Date(p.date);
      var dayLabel = (d.getMonth()+1)+'/'+d.getDate();
      var bgColor = p.phase === 'low' ? '#d4e6f1' : '#f5cdd0';
      var textColor = p.phase === 'low' ? '#5b8fb9' : '#b85c6a';
      bodyHtml += '<div class="pha-temp-cell" style="background:'+bgColor+';" title="'+dayLabel+' '+p.temp+'℃">'
        + '<div class="pha-temp-day" style="color:'+textColor+';">'+d.getDate()+'</div>'
        + '<div class="pha-temp-val" style="color:'+textColor+';">'+p.temp.toFixed(1)+'</div>'
        + '</div>';
    });
    bodyHtml += '</div>'
      + '<div style="display:flex;gap:12px;justify-content:center;margin-top:10px;">'
      + '<div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;background:#d4e6f1;border-radius:2px;"></div><span style="font-size:10px;color:var(--ink-light);">低温期</span></div>'
      + '<div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;background:#f5cdd0;border-radius:2px;"></div><span style="font-size:10px;color:var(--ink-light);">高温期</span></div>'
      + '</div></div></div>';

    // ④ 周期の目安
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">周期の目安</div>'
      + '<div class="pha-card" style="margin-bottom:0;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0ebe6;"><div style="font-size:14px;color:var(--ink-mid);">低温期の長さ</div><div style="font-size:14px;font-weight:500;color:var(--ink);">'+(analysis.lowPhaseDays||'-')+'日間</div></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0ebe6;"><div style="font-size:14px;color:var(--ink-mid);">高温期の長さ</div><div style="font-size:14px;font-weight:500;color:var(--ink);">'+(analysis.highPhaseDays||'-')+'日間</div></div>';

    if(analysis.ovulationDate){
      var ovD = new Date(analysis.ovulationDate);
      bodyHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0ebe6;"><div style="font-size:14px;color:var(--ink-mid);">体温変化が見られた時期</div><div style="font-size:14px;font-weight:500;color:var(--ink);">'+(ovD.getMonth()+1)+'月'+ovD.getDate()+'日ごろ</div></div>';
    }
    if(analysis.nextPeriod){
      var npD = new Date(analysis.nextPeriod);
      bodyHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;"><div style="font-size:14px;color:var(--ink-mid);">次回月経の参考時期</div><div style="font-size:14px;font-weight:500;color:var(--rose);">'+(npD.getMonth()+1)+'月'+npD.getDate()+'日ごろ</div></div>';
    }
    if(analysis.mPattern){
      bodyHtml += '<div style="margin-top:10px;padding:10px 12px;background:#fdf3f3;border-radius:10px;"><div style="font-size:12px;color:#c4878c;font-weight:500;">⚠️ M字パターンが見られます</div><div style="font-size:12px;color:var(--ink-light);margin-top:4px;line-height:1.7;">高温期の途中で体温が一時的に下がる日がありました。黄体ホルモンの分泌が不安定な可能性があります。</div></div>';
    }
    bodyHtml += '</div></div>';

    // ⑤ 気になる点（アラート）
    if(analysis.alerts.length > 0){
      bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">気になる点</div>'
        + '<div class="pha-card" style="margin-bottom:0;">';
      analysis.alerts.forEach(function(alert){
        var alertBg, alertBorder, alertText;
        if(alert.level === 'emergency'){ alertBg='#fde0e0'; alertBorder='#c44848'; alertText='#c44848'; }
        else if(alert.level === 'danger'){ alertBg='#fde8e8'; alertBorder='#c4878c'; alertText='#c4878c'; }
        else if(alert.level === 'disease'){ alertBg='#fdf3e8'; alertBorder='#d4a574'; alertText='#a07840'; }
        else { alertBg='#fdf8e8'; alertBorder='#d4c474'; alertText='#8a7a40'; }
        bodyHtml += '<div style="padding:10px 12px;background:'+alertBg+';border-left:3px solid '+alertBorder+';border-radius:8px;margin-bottom:8px;">';
        if(alert.disease) bodyHtml += '<div style="font-size:12px;color:'+alertText+';font-weight:600;margin-bottom:4px;">'+alert.disease+'</div>';
        bodyHtml += '<div style="font-size:14px;color:'+alertText+';line-height:1.7;">'+alert.message+'</div></div>';
      });
      bodyHtml += '<div style="margin-top:10px;padding:10px 12px;background:var(--cream);border-radius:10px;font-size:12px;color:var(--ink-light);line-height:1.7;">※ これらは統計データに基づく参考情報であり、医学的な診断ではありません。気になる場合は医師にご相談ください。</div>'
        + '</div></div>';
    }

    // ⑥ 正常範囲との比較
    var compItems = [
      {label:'低温期の平均', yours:analysis.avgLow, normal:'36.2℃'},
      {label:'高温期の平均', yours:analysis.avgHigh, normal:'36.7℃'},
      {label:'低温・高温の差', yours:analysis.tempDiff, normal:'0.3〜0.5℃'}
    ];
    bodyHtml += '<div style="margin-bottom:16px;"><div class="pha-section-title">一般的な参考値との比較</div>'
      + '<div class="pha-card" style="margin-bottom:0;">'
      + '<div style="font-size:12px;color:var(--ink-light);margin-bottom:12px;">AMED研究（日本人女性31万人）に基づく参考値</div>';
    compItems.forEach(function(item){
      bodyHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0ebe6;">'
        + '<div style="font-size:14px;color:var(--ink-mid);flex:1;">'+item.label+'</div>'
        + '<div style="font-size:14px;font-weight:500;color:var(--ink);flex:1;text-align:center;">'+(item.yours !== null ? item.yours+'℃' : '-')+'</div>'
        + '<div style="font-size:12px;color:var(--ink-light);flex:1;text-align:right;">目安: '+item.normal+'</div>'
        + '</div>';
    });
    bodyHtml += '</div></div>';
  }

  _tempOverlayApi.body.innerHTML = bodyHtml;
  _tempOverlayApi.open();
}

// ===== 体温教育カード =====
export function showTempEducation(){
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('showTempEducation', showTempEducation);
    return;
  }
  var card = document.getElementById('temp-edu-card');
  if(!card) return;

  var diseases = window.state.myDiseases || [];
  var tempCount = window.state.records.filter(function(r){ return r.temperature; }).length;
  var analysis = tempCount >= 14 ? (window.analyzeTemperatureLegacy || calcTemperaturePhases)(window.state.records) : null;

  // 表示条件：体温データ0件、または3日以上記録が途切れている
  var lastTempDate = null;
  for(var i = window.state.records.length - 1; i >= 0; i--){
    if(window.state.records[i].temperature){
      lastTempDate = new Date(window.state.records[i].date);
      break;
    }
  }
  var daysSinceLast = lastTempDate ? Math.floor((Date.now() - lastTempDate.getTime()) / 86400000) : 999;
  var showCard = tempCount === 0 || daysSinceLast >= 3 || (tempCount > 0 && tempCount < 14);

  if(!showCard && !analysis){
    card.style.display = 'none';
    return;
  }

  var html = '';

  if(tempCount === 0){
    // 初めて：なぜ記録するか
    html += '<div style="font-size:12px;font-weight:500;color:var(--ink);margin-bottom:6px;">🌡️ なぜ基礎体温を記録するの？</div>';
    html += '<div style="font-size:11px;color:var(--ink-mid);line-height:1.7;">';

    if(diseases.indexOf('卵巣嚢腫') !== -1){
      html += '卵巣嚢腫では、慢性炎症により低温期でも体温が高くなることがあります。毎日の記録で<strong>炎症の変化</strong>を早期に察知できます。';
    } else if(diseases.indexOf('子宮内膜症') !== -1){
      html += '研究により、月経初日の体温が36.5℃以上の場合、骨盤内膜症との関連が報告されています。毎日の記録で<strong>あなたのパターン</strong>を把握しましょう。';
    } else if(diseases.indexOf('PCOS') !== -1){
      html += 'PCOSでは排卵障害により<strong>二相性（低温期と高温期の区別）が不明確</strong>になることがあります。基礎体温は排卵の有無を知る重要な手がかりです。';
    } else if(diseases.indexOf('更年期障害') !== -1){
      html += '更年期ではホルモンバランスの変化により<strong>体温リズムが乱れやすく</strong>なります。記録を続けることで変化の傾向を把握できます。';
    } else if(diseases.indexOf('不妊症・排卵障害') !== -1){
      html += '基礎体温の二相性は<strong>排卵の有無を判断する最も基本的な方法</strong>です。14日以上の記録で排卵日の推定も可能になります。';
    } else {
      html += '日本人女性31万人の研究（AMED）によると、低温期の平均は36.2℃、高温期は36.7℃。<strong>14日以上の記録</strong>であなたのパターンが見えてきます。';
    }

    html += '</div>';
    html += '<div style="font-size:10px;color:var(--rose);margin-top:8px;">💡 朝起きてすぐ、動く前に舌の下で測定するのがポイントです</div>';

  } else if(tempCount < 14){
    // 記録途中：進捗を励ます
    var progress = Math.round(tempCount / 14 * 100);
    html += '<div style="font-size:12px;font-weight:500;color:var(--ink);margin-bottom:6px;">📊 体温パターン分析まであと'+(14-tempCount)+'日</div>';
    html += '<div style="height:6px;background:#e8ddd8;border-radius:3px;overflow:hidden;margin-bottom:8px;">';
    html += '<div style="height:100%;width:'+progress+'%;background:linear-gradient(90deg,var(--rose),#e8b4b8);border-radius:3px;"></div>';
    html += '</div>';
    html += '<div style="font-size:11px;color:var(--ink-mid);line-height:1.7;">';

    if(tempCount < 5){
      html += '記録を始めたばかりですね。毎朝の測定を習慣にすると、自分の体温リズムが見えてきます。';
    } else if(tempCount < 10){
      html += '順調です！もう少しで低温期と高温期のパターンが判定できるようになります。';
    } else {
      html += 'あともう少し！14日分のデータが揃うと、二相性の判定・排卵推定・警戒値チェックが利用可能になります。';
    }

    html += '</div>';

  } else if(daysSinceLast >= 3){
    // 記録が途切れている：再開を促す
    html += '<div style="font-size:12px;font-weight:500;color:var(--ink);margin-bottom:6px;">🌡️ 基礎体温の記録が'+daysSinceLast+'日途切れています</div>';
    html += '<div style="font-size:11px;color:var(--ink-mid);line-height:1.7;">';
    html += '連続した記録ほどパターンの精度が高まります。今日から再開しましょう。';

    if(diseases.indexOf('卵巣嚢腫') !== -1){
      html += '<br>卵巣嚢腫の炎症モニタリングには、できるだけ毎日の記録が重要です。';
    }

    html += '</div>';
  }

  // 14日以上データあり → 医学的パターン解釈カードを追加
  if(analysis && tempCount >= 14 && daysSinceLast < 3){
    var biphasic = analysis.biphasic;
    var tempDiff = analysis.tempDiff;
    var avgLow = analysis.avgLow;
    var avgHigh = analysis.avgHigh;
    var highDays = analysis.highPhaseDays;
    var lowDays = analysis.lowPhaseDays;

    // 二相性ラベル
    var biphasicLabel = biphasic === 'clear' ? '二相性あり（明瞭）' :
                        biphasic === 'unclear' ? '二相性あり（不明瞭）' : '二相性なし';
    var biphasicColor = biphasic === 'clear' ? '#4caf80' :
                        biphasic === 'unclear' ? '#e8a04a' : '#e05c5c';

    // パターン解釈テキスト
    var interpretation = '';
    if(biphasic === 'none'){
      interpretation = '二相性が確認できません。排卵が起こっていない可能性（無排卵症）があります。';
      if(diseases.indexOf('PCOS') !== -1) interpretation += ' PCOSでは排卵障害が原因となることがあります。';
    } else if(tempDiff !== null && tempDiff < 0.2){
      interpretation = '温度差が'+tempDiff.toFixed(2)+'℃と小さく（正常0.3〜0.5℃）、黄体機能不全・排卵障害の可能性があります。';
    } else if(tempDiff !== null && tempDiff < 0.3){
      interpretation = '温度差が'+tempDiff.toFixed(2)+'℃とやや小さめです（正常0.3〜0.5℃）。プロゲステロン分泌がやや不十分な可能性があります。';
    } else if(highDays !== null && highDays < 10){
      interpretation = '高温期が'+highDays+'日（正常12〜14日）と短め。黄体機能不全の可能性があります。';
    } else if(lowDays !== null && lowDays >= 20){
      interpretation = '低温期が'+lowDays+'日（正常12〜16日）と長く、排卵遅延が疑われます。';
    } else if(avgLow !== null && avgLow < 35.8){
      interpretation = '低温期の平均が'+avgLow.toFixed(1)+'℃と低体温傾向です。甲状腺機能低下症との関連が報告されています。';
    } else {
      interpretation = '体温パターンは概ね正常範囲内です。引き続き記録を続けましょう。';
    }

    html += '<div style="margin-top:10px;padding:10px;background:rgba(232,176,184,0.12);border-radius:10px;border-left:3px solid var(--rose);">';
    html += '<div style="font-size:12px;font-weight:500;color:var(--ink);margin-bottom:6px;">📈 現在の体温パターン分析</div>';
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">';

    // 二相性バッジ
    html += '<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:'+biphasicColor+';color:#fff;">'+biphasicLabel+'</span>';

    // 温度差バッジ
    if(tempDiff !== null){
      var diffColor = tempDiff >= 0.3 ? '#4caf80' : tempDiff >= 0.2 ? '#e8a04a' : '#e05c5c';
      html += '<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:'+diffColor+';color:#fff;">温度差 '+tempDiff.toFixed(2)+'℃</span>';
    }

    // 低温期・高温期日数バッジ
    if(lowDays !== null){
      var ldColor = (lowDays >= 12 && lowDays <= 16) ? '#4caf80' : '#e8a04a';
      html += '<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:'+ldColor+';color:#fff;">低温期 '+lowDays+'日</span>';
    }
    if(highDays !== null){
      var hdColor = (highDays >= 12 && highDays <= 14) ? '#4caf80' : '#e8a04a';
      html += '<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:'+hdColor+';color:#fff;">高温期 '+highDays+'日</span>';
    }

    html += '</div>';
    html += '<div style="font-size:11px;color:var(--ink-mid);line-height:1.7;">'+interpretation+'</div>';

    // 疾患別補足
    var diseaseNote = '';
    if(diseases.indexOf('子宮内膜症') !== -1 && avgLow !== null && avgLow >= 36.5){
      diseaseNote = '子宮内膜症：月経初日の体温が36.5℃以上は骨盤内膜症との関連が報告されています（Fertil Steril 2020）。';
    } else if(diseases.indexOf('PMS/PMDD') !== -1 && avgHigh !== null && avgHigh >= 37.0){
      diseaseNote = 'PMS/PMDD：高温期の平均が'+avgHigh.toFixed(1)+'℃と高めです。メラトニン低下による体温調節異常の関与が報告されています（BMC研究）。';
    } else if(diseases.indexOf('PCOS') !== -1 && biphasic === 'none'){
      diseaseNote = 'PCOS：二相性がない場合、無排卵の可能性があります。婦人科での検査をお勧めします。';
    } else if(diseases.indexOf('更年期障害') !== -1){
      diseaseNote = '更年期障害：ホルモン変動により体温リズムが不規則になりやすい時期です。定期的な受診を継続してください。';
    } else if(diseases.indexOf('甲状腺疾患') !== -1 && avgLow !== null && avgLow < 36.0){
      diseaseNote = '甲状腺機能低下症：低体温傾向があります。甲状腺ホルモン値の定期チェックをお勧めします。';
    }
    if(diseaseNote){
      html += '<div style="font-size:10px;color:var(--rose);margin-top:6px;line-height:1.6;">💊 '+diseaseNote+'</div>';
    }

    html += '<div style="font-size:10px;color:#aaa;margin-top:6px;">※ この情報は参考目的です。診断は医師にご相談ください。</div>';
    html += '</div>';
  }

  if(html){
    card.innerHTML = html;
    card.style.display = 'block';
  } else {
    card.style.display = 'none';
  }
}
