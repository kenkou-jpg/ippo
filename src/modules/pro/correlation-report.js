// ================================================================
//  ippo – src/modules/pro/correlation-report.js
//  PR-082 (Legacy Removal Batch-4): 一緒に起きやすいこと（Correlation Report）
//
//  app-legacy.js から物理移動。既存挙動は無変更（Business Logic変更なし）。
//
//  【監査メモ】phase4d-legacy-migration-audit.md のBatch-4対象関数一覧は
//  calcFactorCorrelations / renderComparisonChart / openCorrelationReport の
//  3件のみを挙げていたが、実装調査の結果 renderComparisonChart は
//  setCGRange / toggleCGFactor / getMetricValue / getMetricLabel / getMetricMax
//  および module-scope 変数 _cgRange / _cgFactors と不可分に結合している
//  （比較グラフのUI状態を共有）ことが判明した。3関数のみを移動すると
//  状態共有が壊れるため、この一体化されたクラスタごと本ファイルへ
//  同梱移動した（PR-080Eの prefillRecordFromModal 同梱と同型の判断）。
//  なお `#cg-chart` 等の対象DOM要素はapp.html配下のいずれのHTMLにも
//  存在せず、現状は到達不能（renderPhaseMap と同型のpre-existing事象、
//  本PRでは修正せず現状のまま移動のみ実施）。
//
//  bare `state` 参照は `window.state` に置換（record-screen.js / premium-lock.js
//  と同型。_ippoStateHooks により同一オブジェクト参照、挙動変更なし）。
// ================================================================

// ===== ファクター相関計算 =====
export function calcFactorCorrelations(records){
  // 各ファクターの有無で、他のメトリクスの平均を比較する
  var factorSet = {};
  records.forEach(function(r){
    if(r.factors && r.factors.length){
      r.factors.forEach(function(f){ factorSet[f] = true; });
    }
  });

  var factors = Object.keys(factorSet);
  if(!factors.length) return {};

  var results = {};

  factors.forEach(function(factor){
    var withDays = [];
    var withoutDays = [];

    records.forEach(function(r){
      var hasFactor = r.factors && r.factors.indexOf(factor) !== -1;
      var day = {
        energy: r.energy || null,
        sleepQuality: r.sleepQuality || null,
        sleepHours: r.sleepHours || null,
        painLevel: r.painLevel || null,
        symptomCount: (r.symptoms && r.symptoms.length) || 0,
        wellnessScore: r.wellnessScore !== undefined ? r.wellnessScore : null
      };
      if(hasFactor) withDays.push(day);
      else withoutDays.push(day);
    });

    if(withDays.length < 2 || withoutDays.length < 2) return;

    var metrics = ['energy','sleepQuality','sleepHours','painLevel','symptomCount','wellnessScore'];
    var comparison = { days: withDays.length, totalDays: records.length };

    metrics.forEach(function(m){
      var wVals = withDays.filter(function(d){ return d[m] !== null; }).map(function(d){ return d[m]; });
      var woVals = withoutDays.filter(function(d){ return d[m] !== null; }).map(function(d){ return d[m]; });
      if(wVals.length >= 2 && woVals.length >= 2){
        var wAvg = wVals.reduce(function(a,b){ return a+b; },0) / wVals.length;
        var woAvg = woVals.reduce(function(a,b){ return a+b; },0) / woVals.length;
        var diff = wAvg - woAvg;
        var pct = woAvg !== 0 ? Math.round((diff / Math.abs(woAvg)) * 100) : 0;
        comparison[m] = {
          with: Math.round(wAvg * 10) / 10,
          without: Math.round(woAvg * 10) / 10,
          diff: Math.round(diff * 10) / 10,
          pct: pct
        };
      }
    });

    // 症状別の出現率比較
    var symptomWithRate = {};
    var symptomWithoutRate = {};
    withDays.forEach(function(d, idx){
      var r = records.filter(function(rec){ return rec.factors && rec.factors.indexOf(factor) !== -1; })[idx];
      if(r && r.symptoms){
        r.symptoms.forEach(function(s){ symptomWithRate[s] = (symptomWithRate[s]||0) + 1; });
      }
    });
    withoutDays.forEach(function(d, idx){
      var r = records.filter(function(rec){ return !rec.factors || rec.factors.indexOf(factor) === -1; })[idx];
      if(r && r.symptoms){
        r.symptoms.forEach(function(s){ symptomWithoutRate[s] = (symptomWithoutRate[s]||0) + 1; });
      }
    });

    var symptomEffects = {};
    Object.keys(symptomWithRate).forEach(function(s){
      var wRate = symptomWithRate[s] / withDays.length;
      var woRate = (symptomWithoutRate[s] || 0) / withoutDays.length;
      if(wRate > 0 && woRate > 0){
        symptomEffects[s] = {
          withRate: Math.round(wRate * 100),
          withoutRate: Math.round(woRate * 100),
          ratio: Math.round((wRate / woRate) * 10) / 10
        };
      } else if(wRate > 0){
        symptomEffects[s] = {
          withRate: Math.round(wRate * 100),
          withoutRate: 0,
          ratio: '∞'
        };
      }
    });

    if(Object.keys(symptomEffects).length > 0){
      comparison.symptomEffects = symptomEffects;
    }

    results[factor] = comparison;
  });

  return results;
}

// ===== 比較グラフ =====
var _cgRange = 30;
var _cgFactors = {};

export function setCGRange(days, btn){
  _cgRange = days;
  if(btn){
    document.querySelectorAll('.cg-range-btn').forEach(function(b){
      b.style.background='var(--white)'; b.style.color='var(--ink-mid)'; b.style.borderColor='#e8ddd8';
    });
    btn.style.background='var(--rose-pale)'; btn.style.color='var(--rose)'; btn.style.borderColor='var(--rose)';
  }
  renderComparisonChart();
}

export function toggleCGFactor(factor, btn){
  _cgFactors[factor] = !_cgFactors[factor];
  btn.style.background = _cgFactors[factor] ? 'var(--rose-pale)' : 'var(--white)';
  btn.style.color = _cgFactors[factor] ? 'var(--rose)' : 'var(--ink-mid)';
  btn.style.borderColor = _cgFactors[factor] ? 'var(--rose)' : '#e8ddd8';
  renderComparisonChart();
}

export function getMetricValue(rec, metric){
  if(metric === 'symptomCount') return rec.symptoms ? rec.symptoms.length : 0;
  return rec[metric] || 0;
}

export function getMetricLabel(metric){
  var labels = {
    energy:'エネルギー', sleepQuality:'睡眠の質', sleepHours:'睡眠時間',
    painLevel:'痛み', wellnessScore:'ウェルネス', smiScore:'SMI', symptomCount:'症状数'
  };
  return labels[metric] || metric;
}

export function getMetricMax(metric){
  var maxes = {
    energy:5, sleepQuality:5, sleepHours:12,
    painLevel:10, wellnessScore:100, smiScore:94, symptomCount:15
  };
  return maxes[metric] || 10;
}

export function renderComparisonChart(){
  var svg = document.getElementById('cg-chart');
  var legend = document.getElementById('cg-legend');
  var toggles = document.getElementById('cg-factor-toggles');
  if(!svg) return;

  var m1 = (document.getElementById('cg-metric1')||{}).value || 'energy';
  var m2 = (document.getElementById('cg-metric2')||{}).value || '';

  // 期間内レコード取得
  var now = new Date();
  var cutoff = new Date(now.getTime() - _cgRange * 86400000);
  var recs = window.state.records.filter(function(r){
    return new Date(r.date) >= cutoff;
  }).sort(function(a,b){ return new Date(a.date) - new Date(b.date); });

  if(recs.length < 2){
    svg.innerHTML = '<text x="50%" y="100" text-anchor="middle" fill="#9a8880" font-size="12">データが不足しています（2日以上の記録が必要）</text>';
    if(legend) legend.innerHTML = '';
    return;
  }

  // ファクタートグル生成
  var allFactors = {};
  recs.forEach(function(r){
    if(r.factors) r.factors.forEach(function(f){ allFactors[f] = true; });
  });
  if(toggles){
    var tHtml = '';
    Object.keys(allFactors).forEach(function(f){
      var active = _cgFactors[f];
      tHtml += '<button onclick="toggleCGFactor(\''+f+'\',this)" style="padding:3px 8px;border:1px solid '+(active?'var(--rose)':'#e8ddd8')+';border-radius:6px;font-size:9px;background:'+(active?'var(--rose-pale)':'var(--white)')+';color:'+(active?'var(--rose)':'var(--ink-mid)')+';cursor:pointer;">'+f+'</button>';
    });
    toggles.innerHTML = tHtml;
  }

  // SVG描画設定
  var W = Math.max(300, recs.length * 28);
  var H = 180;
  var padL = 30, padR = 10, padT = 15, padB = 30;
  var chartW = W - padL - padR;
  var chartH = H - padT - padB;

  svg.setAttribute('width', W);
  svg.setAttribute('height', H);

  var html = '';

  // 背景のファクターハイライト
  var activeFactors = Object.keys(_cgFactors).filter(function(f){ return _cgFactors[f]; });
  if(activeFactors.length > 0){
    recs.forEach(function(r, idx){
      var hasAny = r.factors && activeFactors.some(function(f){ return r.factors.indexOf(f) !== -1; });
      if(hasAny){
        var x = padL + (idx / (recs.length - 1)) * chartW;
        html += '<rect x="'+(x-8)+'" y="'+padT+'" width="16" height="'+chartH+'" fill="rgba(255,107,107,0.08)" rx="4"/>';
      }
    });
  }

  // グリッド線
  for(var g=0;g<=4;g++){
    var gy = padT + (g/4) * chartH;
    html += '<line x1="'+padL+'" y1="'+gy+'" x2="'+(W-padR)+'" y2="'+gy+'" stroke="#f0ebe6" stroke-width="1"/>';
  }

  // 指標1の折れ線
  var max1 = getMetricMax(m1);
  var points1 = [];
  recs.forEach(function(r, idx){
    var x = padL + (idx / Math.max(1, recs.length - 1)) * chartW;
    var v = getMetricValue(r, m1);
    var y = padT + chartH - (v / max1) * chartH;
    points1.push(x+','+y);
  });
  html += '<polyline points="'+points1.join(' ')+'" fill="none" stroke="var(--rose)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  // ドット
  points1.forEach(function(p){
    var xy = p.split(',');
    html += '<circle cx="'+xy[0]+'" cy="'+xy[1]+'" r="3" fill="var(--rose)"/>';
  });

  // 指標2の折れ線
  if(m2){
    var max2 = getMetricMax(m2);
    var points2 = [];
    recs.forEach(function(r, idx){
      var x = padL + (idx / Math.max(1, recs.length - 1)) * chartW;
      var v = getMetricValue(r, m2);
      var y = padT + chartH - (v / max2) * chartH;
      points2.push(x+','+y);
    });
    html += '<polyline points="'+points2.join(' ')+'" fill="none" stroke="var(--sage)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4,3"/>';
    points2.forEach(function(p){
      var xy = p.split(',');
      html += '<circle cx="'+xy[0]+'" cy="'+xy[1]+'" r="3" fill="var(--sage)"/>';
    });
  }

  // X軸ラベル（間引き）
  var step = Math.max(1, Math.floor(recs.length / 6));
  recs.forEach(function(r, idx){
    if(idx % step === 0 || idx === recs.length - 1){
      var x = padL + (idx / Math.max(1, recs.length - 1)) * chartW;
      var d = new Date(r.date);
      var label = (d.getMonth()+1)+'/'+d.getDate();
      html += '<text x="'+x+'" y="'+(H-5)+'" text-anchor="middle" fill="#9a8880" font-size="9">'+label+'</text>';
    }
  });

  svg.innerHTML = html;

  // 凡例
  if(legend){
    var lHtml = '<span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:3px;background:var(--rose);border-radius:2px;"></span>'+getMetricLabel(m1)+'</span>';
    if(m2){
      lHtml += '<span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:3px;background:var(--sage);border-radius:2px;border-top:1px dashed var(--sage);"></span>'+getMetricLabel(m2)+'</span>';
    }
    if(activeFactors.length > 0){
      lHtml += '<span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:8px;background:rgba(255,107,107,0.15);border-radius:2px;"></span>'+activeFactors.join('・')+'</span>';
    }
    legend.innerHTML = lHtml;
  }
}

// ===== 要因効果レポート =====
var _corrOverlayApi = null;
export function openCorrelationReport(){
  var corr = calcFactorCorrelations(window.state.records);
  var factors = Object.keys(corr);

  // 分析対象メタ情報
  var totalRecs = window.state.records.length;
  var lastDate = '';
  if(totalRecs > 0){
    var _crSorted = window.state.records.slice().sort(function(a,b){
      return (b.record_date||b.date||'').localeCompare(a.record_date||a.date||'');
    });
    var _crLd = new Date(_crSorted[0].record_date || _crSorted[0].date || '');
    if(!isNaN(_crLd.getTime())) lastDate = (_crLd.getMonth()+1)+'月'+_crLd.getDate()+'日';
  }

  if (!_corrOverlayApi) {
    _corrOverlayApi = window.createProOverlay({
      id:        'corrReportOverlay',
      ariaLabel: '一緒に起きやすいこと',
      title:     '一緒に起きやすいこと',
      subtitle:  '生活習慣と体調の記録を整理しています',
      footer:    [{ id: 'corr-close', label: '閉じる', cls: 'pob-btn pob-btn-secondary' }],
      onClose:   function(){ _corrOverlayApi.close(); },
    });
    _corrOverlayApi.getButton('corr-close').addEventListener('click', function(){ _corrOverlayApi.close(); });
  }

  var bodyHtml = '';
  bodyHtml += '<div class="pha-meta"><span style="font-size:11px;color:var(--ink-light);display:block;margin-bottom:4px;">📋 分析対象</span>'
    + totalRecs+'件の記録'+(lastDate?' ／ 最終記録 '+lastDate:'')+'</div>';

  bodyHtml += '<div style="background:rgba(180,160,150,0.12);border-radius:12px;padding:10px 14px;margin-bottom:24px;">'
    + '<div style="font-size:12px;color:var(--ink-light);line-height:1.7;">ℹ️ この結果は傾向を整理したものであり、因果関係を示すものではありません。</div>'
    + '</div>';

  if(factors.length === 0){
    bodyHtml += '<div style="text-align:center;padding:40px 0;color:var(--ink-light);font-size:14px;line-height:1.9;">📊 まだ十分なデータがありません。<br>生活ファクターを記録した日が<br>各要因3日以上になると表示されます。</div>';
  } else {

    // ① 今見えていること
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">今見えていること</div>'
      + '<div class="pha-card" style="margin-bottom:0;padding:14px;">';
    factors.slice(0,5).forEach(function(factor, fi){
      var data = corr[factor];
      var wsData = data['wellnessScore'];
      var diff = wsData ? wsData.diff : null;
      var arrow = diff === null ? '—' : diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
      var color = diff === null ? '#9a8880' : diff > 0 ? '#6b9e78' : diff < 0 ? '#c4878c' : '#9a8880';
      bodyHtml += '<div style="display:flex;justify-content:space-between;align-items:center;'+(fi>0?'margin-top:8px;padding-top:8px;border-top:1px solid #f5f0ec;':'')+'">'
        + '<div style="font-size:14px;color:var(--ink);">'+factor+'</div>'
        + '<div style="font-size:13px;font-weight:600;color:'+color+';">'+arrow+(diff !== null ? ' ウェルネス'+(diff > 0 ? '+' : '')+diff : '')+'</div>'
        + '</div>';
    });
    bodyHtml += '</div></div>';

    // ② なぜそう考えた？
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">なぜそう考えた？</div>'
      + '<div class="pha-card" style="margin-bottom:0;font-size:14px;color:var(--ink-mid);line-height:1.8;">「その習慣があった日」と「なかった日」の体調データの平均を比べています。差が大きいほど関連が強い傾向があります。</div>'
      + '</div>';

    // ③ 詳しいデータ
    bodyHtml += '<div style="margin-bottom:8px;"><div class="pha-section-title">詳しいデータを見る</div>';
    var metricLabels = {energy:'エネルギー',sleepQuality:'睡眠の質',painLevel:'痛み',symptomCount:'症状の数',wellnessScore:'ウェルネス'};

    factors.forEach(function(factor){
      var data = corr[factor];
      bodyHtml += '<div class="pha-card">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
        + '<div style="font-size:15px;font-weight:500;color:var(--ink);">'+factor+'</div>'
        + '<div style="font-size:12px;color:var(--ink-light);background:var(--cream);padding:3px 8px;border-radius:8px;">'+data.days+'日あり / '+data.totalDays+'日中</div>'
        + '</div>';

      ['energy','sleepQuality','painLevel','symptomCount','wellnessScore'].forEach(function(m){
        if(!data[m]) return;
        var d = data[m];
        var isNegative = (m === 'painLevel' || m === 'symptomCount');
        var isGood = isNegative ? d.diff < 0 : d.diff > 0;
        var color = isGood ? '#6b9e78' : d.diff === 0 ? '#9a8880' : '#c4878c';
        var arrow = d.diff > 0 ? '↑' : d.diff < 0 ? '↓' : '→';
        var pctText = d.pct > 0 ? '+'+d.pct+'%' : d.pct+'%';
        var maxVal = Math.max(d.with, d.without) || 1;

        bodyHtml += '<div style="margin-bottom:12px;">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">'
          + '<div style="font-size:13px;color:var(--ink-mid);">'+metricLabels[m]+'</div>'
          + '<div style="font-size:12px;font-weight:600;color:'+color+';">'+arrow+' '+pctText+'</div>'
          + '</div>'
          + '<div style="display:flex;gap:8px;align-items:center;">'
          + '<div style="flex:1;"><div style="font-size:12px;color:var(--ink-light);margin-bottom:3px;">あった日：'+d.with+'</div>'
          + '<div class="pha-bar"><div style="height:100%;width:'+Math.round(d.with/maxVal*100)+'%;background:'+color+';border-radius:4px;"></div></div></div>'
          + '<div style="flex:1;"><div style="font-size:12px;color:var(--ink-light);margin-bottom:3px;">なかった日：'+d.without+'</div>'
          + '<div class="pha-bar"><div style="height:100%;width:'+Math.round(d.without/maxVal*100)+'%;background:#b8b0a8;border-radius:4px;"></div></div></div>'
          + '</div></div>';
      });

      if(data.symptomEffects){
        var effects = Object.keys(data.symptomEffects);
        if(effects.length > 0){
          bodyHtml += '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #f0ebe6;">'
            + '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">一緒に出やすい症状</div>';
          effects.sort(function(a,b){
            var ra = data.symptomEffects[a].ratio === '∞' ? 999 : data.symptomEffects[a].ratio;
            var rb = data.symptomEffects[b].ratio === '∞' ? 999 : data.symptomEffects[b].ratio;
            return rb - ra;
          });
          effects.slice(0,5).forEach(function(s){
            var eff = data.symptomEffects[s];
            var ratioText = eff.ratio === '∞' ? '∞' : eff.ratio + '倍';
            var ratioColor = (eff.ratio === '∞' || eff.ratio >= 1.5) ? '#c4878c' : eff.ratio >= 1.1 ? '#d4a574' : '#6b9e78';
            bodyHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;">'
              + '<div style="font-size:13px;color:var(--ink-mid);">'+s+'</div>'
              + '<div style="font-size:12px;font-weight:600;color:'+ratioColor+';">'+ratioText+'<span style="font-size:12px;color:var(--ink-light);margin-left:4px;">('+eff.withRate+'% / '+eff.withoutRate+'%)</span></div>'
              + '</div>';
          });
          bodyHtml += '</div>';
        }
      }
      bodyHtml += '</div>';
    });
    bodyHtml += '</div>';
  }

  _corrOverlayApi.body.innerHTML = bodyHtml;
  _corrOverlayApi.open();
}

// PR-090-R6 (Legacy Removal, EXPORT_HUB_REFACTOR_COUNCIL Step D): 自己export化。
// app-legacy.js側の重複export行（guarded window.X = X）は削除済み。
window.calcFactorCorrelations = calcFactorCorrelations;
window.getMetricLabel         = getMetricLabel;
window.getMetricMax           = getMetricMax;
window.getMetricValue         = getMetricValue;
window.openCorrelationReport  = openCorrelationReport;
window.renderComparisonChart  = renderComparisonChart;
window.setCGRange             = setCGRange;
window.toggleCGFactor         = toggleCGFactor;
