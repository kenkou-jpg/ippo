// ================================================================
//  ippo – src/modules/pro/doctor-summary/doctor-summary.js
//  受診用まとめ — 専用 PRO overlay
//
//  設計ルール: 1 feature = 1 screen owner
//  ・このモジュールは doctor-summary のみが使用する。
//  ・doctorSummaryOverlay（からだサマリー / ds-prefix）とは完全分離。
//  ・責務: 「医師へ渡すため」の観察まとめを生成する。
//
//  Exposed globals:
//    window.openDoctorVisitSummary()
//    window.closeDoctorVisitSummary()
// ================================================================

import './doctor-summary.css';
import { createProOverlay } from '../shared/pro-overlay-base.js';
import {
  getProState, esc,
  getLastNDays,
  calcSymptomFreq,
  calcFlareDays, calcPainDays,
  calcAvgSleep, calcAvgTemp,
  getCycleInfo, getSortedDates,
  calcPeriodComparison, calcSymptomChanges,
} from '../shared/pro-metric-utils.js';
import { copyToClipboard } from '../shared/pro-copy-utils.js';
import {
  renderSummarySection,
  renderStatCard,
  renderAlertBox,
  renderMetricRow,
  renderEmptyState,
} from '../shared/render/index.js';

// ─── Constants ───────────────────────────────────────────────
const DAYS = 30;

// ─── Module state ────────────────────────────────────────────
let _api = null;   // { overlay, body, open, close, ... }

// ─── Lazy init ───────────────────────────────────────────────
function _ensureOverlay() {
  if (_api) return;
  _api = createProOverlay({
    id:         'dvs-overlay',
    ariaLabel:  '受診用まとめ',
    title:      '受診用まとめ',
    subtitle:   '医師へお伝えするための観察サマリー（過去30日）',
    disclaimer: '※ このまとめは記録データをもとにした傾向整理です。医学的診断ではありません。',
    footer: [
      { id: 'dvs-btn-close', label: '閉じる',           cls: 'pob-btn pob-btn-secondary' },
      { id: 'dvs-btn-copy',  label: 'テキストをコピー', cls: 'pob-btn pob-btn-primary'   },
    ],
    onClose: closeDoctorVisitSummary,
  });

  _api.getButton('dvs-btn-close').addEventListener('click', closeDoctorVisitSummary);
  _api.getButton('dvs-btn-copy').addEventListener('click', () => {
    copyToClipboard(
      _buildCopyText(_aggregate()),
      _api.getButton('dvs-btn-copy'),
    );
  });
}

// ─── Data aggregation ────────────────────────────────────────
function _aggregate() {
  const s      = getProState();
  const allRec = s?.records || [];
  const r30    = getLastNDays(allRec, DAYS);
  const dates  = getSortedDates(r30);
  const cmp    = calcPeriodComparison(allRec, DAYS);
  const symChg = calcSymptomChanges(cmp.curr, cmp.prev);

  return {
    totalDays:   r30.length,
    period:      dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    topSymptoms: calcSymptomFreq(r30, 8),
    flareDays:   calcFlareDays(r30, 4),
    painDays:    calcPainDays(r30, 2),
    avgSleep:    calcAvgSleep(r30),
    avgTemp:     calcAvgTemp(r30),
    ...getCycleInfo(s),
    myDiseases:  s?.myDiseases ?? (s?.myDisease ? [s.myDisease] : []),
    comparison:  cmp,
    symChanges:  symChg,
  };
}

// ─── Section builders ────────────────────────────────────────
function _buildSections(data) {
  if (!data || data.totalDays === 0) {
    return [renderEmptyState({
      desc: `過去${DAYS}日間の記録がありません。<br>毎日の記録を続けると、受診用まとめが自動生成されます。`,
    })];
  }

  const s = [];

  // ── 対象期間
  if (data.period) {
    s.push(renderSummarySection('対象期間',
      renderStatCard([
        { label: '記録日数', value: `${data.totalDays} 日分` },
        { label: '期間',     value: `${esc(data.period.from)} 〜 ${esc(data.period.to)}` },
      ])
    ));
  }

  // ── 症状の頻度
  if (data.topSymptoms.length > 0) {
    s.push(renderSummarySection('症状の頻度（上位）',
      renderStatCard(
        data.topSymptoms.map(([sym, cnt]) => ({
          name:  esc(sym),
          badge: `${cnt} 日 / ${DAYS}日中`,
        }))
      )
    ));
  }

  // ── 痛み・不調
  if (data.painDays > 0) {
    const flareNote = data.flareDays > 0
      ? ` うち <strong>${data.flareDays}日</strong> は強い症状（レベル4以上）でした。` : '';
    s.push(renderSummarySection('痛み・不調の状況',
      renderAlertBox('alert',
        `過去${DAYS}日のうち <strong>${data.painDays}日</strong> に痛み・不調の記録があります。${flareNote}`
      )
    ));
  }

  // ── 周期
  if (data.lastPeriod) {
    const cycleLabel = data.cycleDay ? `周期 ${data.cycleDay} 日目` : '計算できません';
    s.push(renderSummarySection('周期の状況',
      renderStatCard([
        { label: '最終生理開始日', value: esc(data.lastPeriod) },
        { label: '周期長',         value: `${data.cycleLength} 日` },
        { label: '現在',           value: cycleLabel },
      ])
    ));
  }

  // ── 睡眠
  if (data.avgSleep) {
    s.push(renderSummarySection('睡眠の傾向',
      renderStatCard([{ label: '平均睡眠時間', value: `${data.avgSleep} 時間 / 日` }])
    ));
  }

  // ── 体温
  if (data.avgTemp) {
    s.push(renderSummarySection('体温の傾向',
      renderStatCard([{ label: '平均基礎体温', value: `${data.avgTemp} ℃` }])
    ));
  }

  // ── 追跡中の疾患
  if (data.myDiseases.length > 0) {
    s.push(renderSummarySection('追跡中の疾患',
      renderStatCard(data.myDiseases.map(d => ({ name: esc(d) })))
    ));
  }

  // ── 最近の変化（前30日比）
  const { delta, prev } = data.comparison;
  if (prev.count >= 3) {
    const changeRows = [];
    if (delta.painDays.val !== 0)
      changeRows.push(renderMetricRow({
        label: '痛みの日数',
        value: delta.painDays.str + (delta.painDays.val > 0 ? ' ▲' : ' ▼'),
      }));
    if (delta.flareDays.val !== 0)
      changeRows.push(renderMetricRow({
        label: 'フレア日数',
        value: delta.flareDays.str + (delta.flareDays.val > 0 ? ' ▲' : ' ▼'),
      }));
    if (Math.abs(delta.avgSleep.val) >= 0.3)
      changeRows.push(renderMetricRow({
        label: '睡眠時間',
        value: delta.avgSleep.str + (delta.avgSleep.val > 0 ? ' ▲' : ' ▼'),
      }));
    if (delta.recordFreq.val !== 0)
      changeRows.push(renderMetricRow({
        label: '記録頻度',
        value: delta.recordFreq.str,
      }));
    if (changeRows.length > 0) {
      s.push(renderSummarySection('最近の変化（前の30日比）',
        `<div class="pob-card">${changeRows.join('')}</div>`
      ));
    }
  }

  // ── 受診メモ（増えた症状・減った症状・一番困っている症状）
  const { increased, decreased, topCurrent } = data.symChanges;
  const memoLines = [];
  if (topCurrent)
    memoLines.push(`<li>一番困っている症状：<strong>${esc(topCurrent)}</strong></li>`);
  if (increased.length > 0)
    memoLines.push(`<li>最近増えた症状：${increased.map(esc).join('、')}</li>`);
  if (decreased.length > 0)
    memoLines.push(`<li>最近減った症状：${decreased.map(esc).join('、')}</li>`);
  if (memoLines.length > 0) {
    s.push(renderSummarySection('受診時に伝えたいこと',
      renderAlertBox('info',
        `<div class="pob-info-label">📋 受診メモ（自動生成）</div><ul style="margin:.4rem 0 0 1.2rem;padding:0;line-height:1.7">${memoLines.join('')}</ul>`
      )
    ));
  }

  // ── 受診のポイント
  s.push(renderSummarySection(null,
    renderAlertBox('info',
      `<div class="pob-info-label">🏥 受診のポイント</div>
      このまとめを医師にお見せいただくか、「コピー」ボタンでテキストをコピーしてメモアプリへ貼り付けてください。<br>
      症状の記録日数・強さ・周期との関連をそのままお伝えいただけます。`
    )
  ));

  return s;
}

// ─── Copy text builder ───────────────────────────────────────
function _buildCopyText(data) {
  if (!data || data.totalDays === 0) return 'データがありません。';
  const lines = ['【受診用まとめ（ippo アプリより）】', ''];
  if (data.period) {
    lines.push(`記録期間: ${data.period.from} 〜 ${data.period.to}（${data.totalDays}日分）`, '');
  }
  if (data.topSymptoms.length > 0) {
    lines.push('◆ 症状の頻度（過去30日）');
    data.topSymptoms.forEach(([sym, cnt]) => lines.push(`  ${sym}: ${cnt}日`));
    lines.push('');
  }
  if (data.painDays > 0) {
    lines.push(`◆ 痛み・不調: ${data.painDays}日 / 30日`);
    if (data.flareDays > 0) lines.push(`  強い症状（レベル4以上）: ${data.flareDays}日`);
    lines.push('');
  }
  if (data.lastPeriod) {
    lines.push('◆ 周期の状況');
    lines.push(`  最終生理開始日: ${data.lastPeriod}`);
    lines.push(`  周期長: ${data.cycleLength}日`);
    if (data.cycleDay) lines.push(`  現在: 周期${data.cycleDay}日目`);
    lines.push('');
  }
  if (data.avgSleep) lines.push(`◆ 平均睡眠: ${data.avgSleep}時間 / 日`, '');
  if (data.avgTemp)  lines.push(`◆ 平均基礎体温: ${data.avgTemp}℃`, '');
  if (data.myDiseases.length > 0) {
    lines.push(`◆ 追跡中の疾患: ${data.myDiseases.join('、')}`, '');
  }
  // 最近の変化
  const { delta, prev } = data.comparison;
  if (prev.count >= 3) {
    const changeItems = [];
    if (delta.painDays.val !== 0)  changeItems.push(`  痛みの日数 ${delta.painDays.str}`);
    if (delta.flareDays.val !== 0) changeItems.push(`  フレア日数 ${delta.flareDays.str}`);
    if (Math.abs(delta.avgSleep.val) >= 0.3) changeItems.push(`  睡眠時間 ${delta.avgSleep.str}`);
    if (changeItems.length > 0) {
      lines.push('◆ 最近の変化（前の30日比）');
      changeItems.forEach(l => lines.push(l));
      lines.push('');
    }
  }
  // 受診メモ
  const { increased, decreased, topCurrent } = data.symChanges;
  if (topCurrent || increased.length > 0 || decreased.length > 0) {
    lines.push('◆ 受診時に伝えたいこと');
    if (topCurrent)        lines.push(`  一番困っている症状: ${topCurrent}`);
    if (increased.length)  lines.push(`  最近増えた症状: ${increased.join('、')}`);
    if (decreased.length)  lines.push(`  最近減った症状: ${decreased.join('、')}`);
    lines.push('');
  }
  lines.push('※ このまとめは ippo アプリの記録データをもとに生成しています。医学的診断ではありません。');
  return lines.join('\n');
}

// ─── Render ──────────────────────────────────────────────────
function _render() {
  _api.body.innerHTML = _buildSections(_aggregate()).join('');
}

// ─── Public API ──────────────────────────────────────────────
export function openDoctorVisitSummary() {
  _ensureOverlay();
  _api.open();
  _render();
}

export function closeDoctorVisitSummary() {
  _api?.close();
}

// ─── Expose globally ─────────────────────────────────────────
window.openDoctorVisitSummary  = openDoctorVisitSummary;
window.closeDoctorVisitSummary = closeDoctorVisitSummary;

// ================================================================
//  PR-082 (Legacy Removal Batch-4): からだサマリー（ds-prefix）
//  app-legacy.js から物理移動。上記 dvs-prefix（受診用まとめ）とは
//  完全に別の overlay・別の観察ロジック。既存挙動は無変更（Business
//  Logic変更なし）。bare `state` → `window.state` に置換のみ実施
//  （_ippoStateHooks により同一オブジェクト参照、挙動変更なし）。
// ================================================================

export function openDoctorSummary() {
  document.getElementById('doctorSummaryOverlay').classList.add('active');
  generateDoctorSummary();
}

export function closeDoctorSummary() {
  document.getElementById('doctorSummaryOverlay').classList.remove('active');
}

async function generateDoctorSummary() {
  const body = document.getElementById('doctorSummaryBody');
  body.innerHTML = '<div class="ds-empty">データを読み込み中...</div>';

  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];
    const monthLabel = (today.getMonth() + 1) + '月';

    // ローカルのstate.recordsから過去30日分を取得
    const records = window.state.records.filter(function(r) {
      var d = r.record_date || (r.date ? r.date.slice(0, 10) : '');
      return d >= fromDate && d <= toDate;
    }).map(function(r) {
      return { record_date: r.record_date || (r.date ? r.date.slice(0, 10) : ''), data: r };
    });

    if (records.length === 0) {
      body.innerHTML = '<div class="ds-empty">過去30日間の記録がありません。<br>毎日の記録を続けると、ここにからだサマリーが届きます。</div>';
      return;
    }

    // データ集計
    const totalDays = records.length;
    const symptomCounts = {};
    const temperatures = [];
    const fastingHours = [];
    const cycleStatuses = [];
    const mealCounts = [];
    const diseaseChecks = [];
    const energyLevels = [];
const sleepData = [];
const wellnessScores = [];
const smiScores = [];
const factorCounts = {};
const bowelCounts = {};
const painData = [];
const medicationCounts = {};

    records.forEach(function(r) {
      var d = r.data || {};

      if (d.symptoms && d.symptoms.length > 0) {
        d.symptoms.forEach(function(s) {
          symptomCounts[s] = (symptomCounts[s] || 0) + 1;
        });
      }

      if (d.temperature) {
        temperatures.push({ date: r.record_date, value: parseFloat(d.temperature) });
      }

      if (d.fasting && parseFloat(d.fasting) >= 12) {
        fastingHours.push({ date: r.record_date, value: parseFloat(d.fasting) });
      }

      if (d.menstrualCycle && d.menstrualCycle.trim() && d.menstrualCycle !== 'なし') {
        cycleStatuses.push({ date: r.record_date, status: d.menstrualCycle });
      }

      if (d.mealCount) {
        mealCounts.push(d.mealCount);
      }

      if (d.diseaseCheck && Object.keys(d.diseaseCheck).length > 0) {
        diseaseChecks.push({ date: r.record_date, check: d.diseaseCheck });
      }
            if (d.energy) {
        energyLevels.push(d.energy);
      }

      if (d.sleepHours || d.sleepQuality) {
        sleepData.push({
          date: r.record_date,
          hours: d.sleepHours || null,
          quality: d.sleepQuality || null,
          bed: d.sleepBed || '',
          wake: d.sleepWake || ''
        });
      }

      if (d.wellnessScore !== undefined) {
        wellnessScores.push(d.wellnessScore);
      }

      if (d.smiScore !== undefined) {
        smiScores.push(d.smiScore);
      }

      if (d.factors && d.factors.length) {
        d.factors.forEach(function(f) {
          factorCounts[f] = (factorCounts[f] || 0) + 1;
        });
      }

      if (d.bowel) {
        bowelCounts[d.bowel] = (bowelCounts[d.bowel] || 0) + 1;
      }

      if (d.painLevel && d.painLevel > 0) {
        painData.push({
          date: r.record_date,
          level: d.painLevel,
          location: d.painLocation || '',
          type: d.painType || ''
        });
      }

      if (d.medication && d.medication.length) {
        d.medication.forEach(function(m) {
          medicationCounts[m] = (medicationCounts[m] || 0) + 1;
        });
      }
    });

    // ===== 文章生成 =====
    var html = '';

    // ヘッダー
    html += '<div style="text-align:center;margin-bottom:24px;">';
    html += '<div style="font-size:11px;letter-spacing:0.15em;color:var(--ink-light);margin-bottom:4px;">BODY SUMMARY</div>';
    html += '<div style="font-family:Shippori Mincho,serif;font-size:20px;color:var(--ink);">' + monthLabel + 'のからだサマリー</div>';
    html += '<div style="font-size:12px;color:var(--ink-light);margin-top:6px;">' + fromDate + ' 〜 ' + toDate + '（' + totalDays + '日間の記録）</div>';
    html += '</div>';

    // ① 体温のリズム
    html += '<div class="ds-section">';
    html += '<div class="ds-section-title">🌡 体温のリズム</div>';
    if (temperatures.length >= 3) {
      var avgTemp = (temperatures.reduce(function(s, t) { return s + t.value; }, 0) / temperatures.length).toFixed(2);
      var minTemp = Math.min.apply(null, temperatures.map(function(t) { return t.value; })).toFixed(2);
      var maxTemp = Math.max.apply(null, temperatures.map(function(t) { return t.value; })).toFixed(2);
      var tempRange = (maxTemp - minTemp).toFixed(2);

      html += '<div class="ds-narrative">';
      html += '今月の基礎体温は平均 <strong>' + avgTemp + '℃</strong> でした。';
      html += '最低 ' + minTemp + '℃ 〜 最高 ' + maxTemp + '℃ の範囲で、';
      if (tempRange >= 0.3) {
        html += '高温期と低温期の差が <strong>' + tempRange + '℃</strong> あり、二相性のリズムが見られます。';
      } else {
        html += '変動幅は ' + tempRange + '℃ と小さめです。引き続き記録を続けると、リズムがより明確になります。';
      }
      html += '</div>';
    } else {
      html += '<div class="ds-narrative">体温の記録が' + temperatures.length + '日分です。あと' + (3 - temperatures.length) + '日記録すると、リズムの傾向が見えてきます。</div>';
    }
    html += '</div>';

    // ② 食事とからだの関係
    html += '<div class="ds-section">';
    html += '<div class="ds-section-title">🍽 食事とからだの関係</div>';
    html += '<div class="ds-narrative">';
    if (fastingHours.length >= 3) {
      var avgFast = (fastingHours.reduce(function(s, h) { return s + h.value; }, 0) / fastingHours.length).toFixed(1);
      var longFastDays = fastingHours.filter(function(h) { return h.value >= 16; }).length;
      html += '今月の平均ファスティングは <strong>' + avgFast + '時間</strong> でした。';
      if (longFastDays > 0) {
        html += '16時間以上のファスティングを達成した日は <strong>' + longFastDays + '日</strong> あります。';

        // ファスティングが長い日と症状の関係を分析
        var longFastDates = fastingHours.filter(function(h) { return h.value >= 16; }).map(function(h) { return h.date; });
        var symptomOnFastDay = {};
        records.forEach(function(r) {
          if (longFastDates.indexOf(r.record_date) !== -1 && r.data.symptoms) {
            r.data.symptoms.forEach(function(s) {
              symptomOnFastDay[s] = (symptomOnFastDay[s] || 0) + 1;
            });
          }
        });
        if (Object.keys(symptomOnFastDay).length > 0) {
          var topSymptom = Object.entries(symptomOnFastDay).sort(function(a, b) { return b[1] - a[1]; })[0];
          html += 'ファスティングが長い日には「' + topSymptom[0] + '」の記録が目立ちます。';
        } else {
          html += 'ファスティングが長い日に特定の症状は記録されていません。良い傾向です。';
        }
      }
    } else if (mealCounts.length > 0) {
      var avgMeals = (mealCounts.reduce(function(s, m) { return s + m; }, 0) / mealCounts.length).toFixed(1);
      html += '1日あたりの平均食事回数は <strong>' + avgMeals + '回</strong> でした。';
    } else {
      html += '食事の記録をもう少し増やすと、食事と体調の関係が見えてきます。';
    }
    html += '</div>';
    html += '</div>';

    // ③ 気になるパターン
    html += '<div class="ds-section">';
    html += '<div class="ds-section-title">🔍 気になるパターン</div>';
    html += '<div class="ds-narrative">';
    var sortedSymptoms = Object.entries(symptomCounts).sort(function(a, b) { return b[1] - a[1]; });
    if (sortedSymptoms.length > 0) {
      html += '今月もっとも多く記録された症状は「<strong>' + sortedSymptoms[0][0] + '</strong>」で、' + sortedSymptoms[0][1] + '日間記録されています。';
      if (sortedSymptoms.length > 1) {
        html += '次いで「' + sortedSymptoms[1][0] + '」が' + sortedSymptoms[1][1] + '日間です。';
      }

      // 症状と生理周期の関係
      if (cycleStatuses.length > 0) {
        var cycleDates = cycleStatuses.map(function(c) { return c.date; });
        var symptomNearCycle = 0;
        records.forEach(function(r) {
          if (r.data.symptoms && r.data.symptoms.length > 0) {
            var rDate = new Date(r.record_date);
            cycleDates.forEach(function(cd) {
              var diff = Math.abs(rDate - new Date(cd));
              if (diff <= 3 * 86400000) symptomNearCycle++;
            });
          }
        });
        if (symptomNearCycle > 0) {
          html += '<br>生理前後に症状の記録が集中する傾向が見られます。来月も同じ時期に注目してみましょう。';
        }
      }
    } else {
      html += '今月は症状の記録がありません。体調が安定していた月かもしれません。';
    }

    // 疾患チェックの傾向
    if (diseaseChecks.length > 0) {
      var checkCounts = {};
      diseaseChecks.forEach(function(dc) {
        Object.entries(dc.check).forEach(function(entry) {
          var key = entry[0];
          var val = entry[1];
          if (val !== 'なし') {
            checkCounts[key] = (checkCounts[key] || 0) + 1;
          }
        });
      });
      var sortedChecks = Object.entries(checkCounts).sort(function(a, b) { return b[1] - a[1]; });
      if (sortedChecks.length > 0) {
        var topCheck = sortedChecks[0];
        var topKey = topCheck[0];
        var topParts = topKey.split('__');
        var topDKey = topParts.length > 1 ? topParts[0] : '';
        var topQId = topParts.length > 1 ? topParts[1] : topKey;
        var topQCfg = (typeof DISEASE_CONFIG !== 'undefined' && topDKey) ? DISEASE_CONFIG[topDKey] : null;
        var checkName = topQId;
        if(topQCfg && topQCfg.questions){
          for(var cqi=0;cqi<topQCfg.questions.length;cqi++){
            if(topQCfg.questions[cqi].id === topQId){ checkName = topQCfg.questions[cqi].text.replace('？',''); break; }
          }
        }
        html += '<br>疾患チェックでは「' + checkName + '」が' + topCheck[1] + '日間記録されています。';
      }
    }
    html += '</div>';
    html += '</div>';
        // ④ エネルギー・睡眠・生活の傾向
    html += '<div class="ds-section">';
    html += '<div class="ds-section-title">⚡ エネルギー・睡眠・生活の傾向</div>';
    html += '<div class="ds-narrative">';

    if(energyLevels.length > 0){
      var avgEnergy = (energyLevels.reduce(function(a,b){return a+b;},0) / energyLevels.length).toFixed(1);
      var lowDays = energyLevels.filter(function(e){return e <= 2;}).length;
      html += '平均エネルギーレベルは <strong>' + avgEnergy + '/5</strong> です（' + energyLevels.length + '日分）。';
      if(lowDays > 0) html += '低エネルギー（2以下）の日が <strong>' + lowDays + '日</strong> ありました。';
      html += '<br>';
    }

    if(sleepData.length > 0){
      var sleepHrs = sleepData.filter(function(s){return s.hours;}).map(function(s){return s.hours;});
      var sleepQuals = sleepData.filter(function(s){return s.quality;}).map(function(s){return s.quality;});
      if(sleepHrs.length > 0){
        var avgSH = (sleepHrs.reduce(function(a,b){return a+b;},0) / sleepHrs.length).toFixed(1);
        var shortDays = sleepHrs.filter(function(h){return h < 6;}).length;
        html += '平均睡眠時間は <strong>' + avgSH + '時間</strong>（' + sleepHrs.length + '日分）。';
        if(shortDays > 0) html += '6時間未満の日が <strong>' + shortDays + '日</strong>。';
      }
      if(sleepQuals.length > 0){
        var avgSQ = (sleepQuals.reduce(function(a,b){return a+b;},0) / sleepQuals.length).toFixed(1);
        html += '睡眠の質の平均は <strong>' + avgSQ + '/5</strong>。';
      }
      html += '<br>';
    }

    if(wellnessScores.length > 0){
      var avgWS = Math.round(wellnessScores.reduce(function(a,b){return a+b;},0) / wellnessScores.length);
      var minWS = Math.min.apply(null, wellnessScores);
      var maxWS = Math.max.apply(null, wellnessScores);
      html += 'ウェルネススコアは平均 <strong>' + avgWS + '/100</strong>（最低 ' + minWS + '、最高 ' + maxWS + '）。';
      if(avgWS < 40) html += '全体的に低めの傾向が続いています。';
      html += '<br>';
    }

    if(smiScores.length > 0){
      var avgSMI = Math.round(smiScores.reduce(function(a,b){return a+b;},0) / smiScores.length);
      html += '更年期指数（SMI）の平均は <strong>' + avgSMI + '/94</strong>（' + smiScores.length + '日分）。';
      if(avgSMI > 50) html += '症状が強めに出ている傾向があります。';
      html += '<br>';
    }

    if(energyLevels.length === 0 && sleepData.length === 0 && wellnessScores.length === 0){
      html += 'エネルギー・睡眠の記録がまだありません。記録を始めると、ここに傾向が表示されます。';
    }

    html += '</div>';
    html += '</div>';

    // ⑤ 痛み・服薬の傾向
    if(painData.length > 0 || Object.keys(medicationCounts).length > 0){
      html += '<div class="ds-section">';
      html += '<div class="ds-section-title">💊 痛み・服薬の傾向</div>';
      html += '<div class="ds-narrative">';

      if(painData.length > 0){
        var avgPain = (painData.reduce(function(a,p){return a+p.level;},0) / painData.length).toFixed(1);
        var maxPain = Math.max.apply(null, painData.map(function(p){return p.level;}));
        var locationCounts = {};
        painData.forEach(function(p){
          if(p.location){
            var locs = Array.isArray(p.location) ? p.location : [p.location];
            locs.forEach(function(l){ locationCounts[l] = (locationCounts[l]||0)+1; });
          }
        });
        var topLocations = Object.entries(locationCounts).sort(function(a,b){return b[1]-a[1];}).slice(0,3);
        html += '痛みの記録が <strong>' + painData.length + '日</strong> あり、平均強度は <strong>' + avgPain + '/10</strong>（最大 ' + maxPain + '）。';
        if(topLocations.length > 0){
          html += '主な部位は「' + topLocations.map(function(t){return t[0]+'（'+t[1]+'日）';}).join('、') + '」。';
        }
        html += '<br>';
      }

      if(Object.keys(medicationCounts).length > 0){
        var sortedMeds = Object.entries(medicationCounts).sort(function(a,b){return b[1]-a[1];});
        var totalMedDays = new Set(painData.filter(function(p){return p.level>0;}).map(function(p){return p.date;})).size;
        html += '服薬記録：';
        sortedMeds.forEach(function(m){
          html += '「' + m[0] + '」' + m[1] + '日、';
        });
        html = html.slice(0,-1) + '。';
      }

      html += '</div>';
      html += '</div>';
    }

    // ⑥ 生活ファクター・お通じの傾向
    if(Object.keys(factorCounts).length > 0 || Object.keys(bowelCounts).length > 0){
      html += '<div class="ds-section">';
      html += '<div class="ds-section-title">📋 生活ファクター・お通じ</div>';
      html += '<div class="ds-narrative">';

      if(Object.keys(factorCounts).length > 0){
        var sortedFactors = Object.entries(factorCounts).sort(function(a,b){return b[1]-a[1];});
        html += '記録された生活ファクター：';
        sortedFactors.slice(0,5).forEach(function(f){
          html += '「' + f[0] + '」' + f[1] + '日、';
        });
        html = html.slice(0,-1) + '。<br>';
      }

      if(Object.keys(bowelCounts).length > 0){
        var sortedBowel = Object.entries(bowelCounts).sort(function(a,b){return b[1]-a[1];});
        html += 'お通じの傾向：';
        sortedBowel.forEach(function(b){
          html += '「' + b[0] + '」' + b[1] + '日、';
        });
        html = html.slice(0,-1) + '。';
        if(bowelCounts['なし'] && bowelCounts['なし'] >= 5){
          html += '<br>お通じなしの日が多く見られます。';
        }
      }

      html += '</div>';
      html += '</div>';
    }
    // ⑦ 来月のセルフケアヒント
    html += '<div class="ds-section">';
    html += '<div class="ds-section-title">💡 来月のセルフケアヒント</div>';
    html += '<div class="ds-narrative">';
    var hints = [];
    if (temperatures.length < 15) {
      hints.push('基礎体温の記録を増やすと、高温期・低温期のリズムがより明確になります。');
    }
    if (fastingHours.length > 0) {
      var avgF = fastingHours.reduce(function(s, h) { return s + h.value; }, 0) / fastingHours.length;
      if (avgF >= 16) {
        hints.push('ファスティングが安定しています。この習慣を続けましょう。');
      } else {
        hints.push('ファスティングを少し延ばすと、体調の変化が見えやすくなるかもしれません。');
      }
    }
    if (sortedSymptoms.length > 0 && cycleStatuses.length > 0) {
      hints.push('生理前後の症状に注目して記録すると、周期ごとのパターンが見つかりやすくなります。');
    }
    if (totalDays < 20) {
      hints.push('記録日数を増やすと、より正確なパターンが見えてきます。毎日1〜2分の記録を習慣にしてみましょう。');
    }
        if(energyLevels.length > 0){
      var lowEDays = energyLevels.filter(function(e){return e<=2;}).length;
      if(lowEDays >= 5) hints.push('低エネルギーの日が目立ちます。睡眠時間や生活ファクターとの関連を確認してみましょう。');
    }
    if(sleepData.length > 0){
      var shortSleep = sleepData.filter(function(s){return s.hours && s.hours<6;}).length;
      if(shortSleep >= 5) hints.push('睡眠時間が6時間未満の日が多いようです。就寝時間を少し早めることを試してみましょう。');
    }
    if(smiScores.length > 0){
      var highSMI = smiScores.filter(function(s){return s>50;}).length;
      if(highSMI >= 3) hints.push('更年期症状が強めに出ている日があります。この記録を持って専門医に相談されることも検討してみてください。');
    }
    if (hints.length === 0) {
      hints.push('今月の記録は充実しています。来月も同じペースで続けると、長期的なパターンが見えてきます。');
    }
    hints.forEach(function(h) {
      html += '・' + h + '<br>';
    });
    html += '</div>';
    html += '</div>';

    // ⑧ PDF保存への案内
    html += '<div style="margin-top:20px;padding:14px;background:var(--warm-light);border-radius:12px;font-size:12px;color:var(--ink-light);line-height:1.7;text-align:center;">';
    html += '📄 このサマリーをPDFで保存して、婦人科に持参することもできます。';
    html += '</div>';

    body.innerHTML = html;

  } catch (err) {
    console.error('Body summary error:', err);
    body.innerHTML = '<div class="ds-empty">データの読み込みに失敗しました。<br>もう一度お試しください。</div>';
  }
}

export function downloadDoctorPDF(){
  var btn = event.target;
  var original = btn.textContent;
  btn.textContent = 'PDF生成中…';
  btn.style.pointerEvents = 'none';

  try {
    if(!window.jspdf){
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = function(){ _generateDoctorPDF(btn, original); };
      document.head.appendChild(script);
    } else {
      _generateDoctorPDF(btn, original);
    }
  } catch(e){
    console.error('Doctor PDF error:', e);
    btn.textContent = '生成に失敗しました';
    setTimeout(function(){ btn.textContent = original; btn.style.pointerEvents = ''; }, 2000);
  }
}

function _generateDoctorPDF(btn, original){
  var body = document.getElementById('doctorSummaryBody');
  if(!body){ btn.textContent = original; btn.style.pointerEvents = ''; return; }

  var { jsPDF } = window.jspdf;
  var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  var pageW = doc.internal.pageSize.getWidth();
  var margin = 15;
  var maxW = pageW - margin * 2;
  var y = 20;

  // フォント設定
  doc.setFont('Helvetica');

  // タイトル
  doc.setFontSize(16);
  doc.setTextColor(44,36,32);
  doc.text('ippo からだサマリー（受診用）', margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(154,136,128);
  var today = new Date();
  doc.text('生成日: ' + today.getFullYear() + '/' + (today.getMonth()+1) + '/' + today.getDate(), margin, y);
  y += 4;

  doc.setDrawColor(232,221,216);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // セクションを取得して描画
  var sections = body.querySelectorAll('.ds-section');
  doc.setFontSize(10);

  sections.forEach(function(section){
    var title = section.querySelector('.ds-section-title');
    var narrative = section.querySelector('.ds-narrative');

    if(y > 265){ doc.addPage(); y = 20; }

    if(title){
      doc.setFontSize(12);
      doc.setTextColor(44,36,32);
      var titleText = title.textContent.replace(/[^\x00-\x7F]/g, function(c){ return c; });
      doc.text(titleText, margin, y);
      y += 7;
    }

    if(narrative){
      doc.setFontSize(9);
      doc.setTextColor(90,74,68);
      var text = narrative.innerText || narrative.textContent;
      var lines = doc.splitTextToSize(text, maxW);
      lines.forEach(function(line){
        if(y > 275){ doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 4.5;
      });
      y += 4;
    }
  });

  // フッター
  if(y > 265){ doc.addPage(); y = 20; }
  y += 8;
  doc.setFontSize(7);
  doc.setTextColor(180,170,165);
  doc.text('※ このレポートはippoアプリのセルフチェック記録に基づく参考情報です。医学的な診断ではありません。', margin, y);
  y += 4;
  doc.text('https://www.ippo-app.com', margin, y);

  // ダウンロード
  var monthLabel = (today.getMonth()+1) + '月';
  doc.save('ippo-doctor-summary-' + monthLabel + '.pdf');

  btn.textContent = 'ダウンロード完了 ✓';
  btn.style.background = '#8aab96';
  setTimeout(function(){
    btn.textContent = original;
    btn.style.background = '';
    btn.style.pointerEvents = '';
  }, 2000);
}

// テキストコピー機能
export function copyDoctorSummary() {
  const body = document.getElementById('doctorSummaryBody');
  let text = '【ippo 体調サマリー】\n';
  text += '生成日: ' + new Date().toLocaleDateString('ja-JP') + '\n\n';

  const sections = body.querySelectorAll('.ds-section');
  sections.forEach(section => {
    const title = section.querySelector('.ds-section-title');
    if (title) text += '■ ' + title.textContent + '\n';

    const rows = section.querySelectorAll('.ds-row');
    rows.forEach(row => {
      const label = row.querySelector('.ds-row-label');
      const value = row.querySelector('.ds-row-value');
      if (label && value) text += '  ' + label.textContent + ': ' + value.textContent + '\n';
    });

    const notes = section.querySelectorAll('.ds-note-item');
    notes.forEach(note => {
      const date = note.querySelector('.ds-note-date');
      const noteText = note.querySelector('.ds-note-text');
      if (date && noteText) text += '  ' + date.textContent + ' — ' + noteText.textContent + '\n';
    });

    const meals = section.querySelectorAll('.ds-meal-day');
    meals.forEach(meal => {
      const date = meal.querySelector('.ds-meal-date');
      const items = meal.querySelector('.ds-meal-items');
      if (date) text += '  ' + date.textContent + '\n';
      if (items) text += '  ' + items.textContent.replace(/<br>/g, ' / ') + '\n';
    });

    text += '\n';
  });

  text += '※ このサマリーはippoアプリの記録データを整理したものです。医学的診断ではありません。';

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.ds-btn.primary');
    const original = btn.textContent;
    btn.textContent = 'コピーしました ✓';
    btn.style.background = '#8aab96';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
    }, 2000);
  }).catch(() => {
    // フォールバック
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}
