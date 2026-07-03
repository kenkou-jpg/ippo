// ================================================================
//  ippo – src/modules/pro/monthly-report.js
//  PR-082 (Legacy Removal Batch-4): 月次レポート（Monthly Report）
//
//  app-legacy.js から物理移動。既存挙動は無変更（Business Logic変更なし）。
//  bare `state` 参照は `window.state` に置換（record-screen.js / premium-lock.js
//  と同型。_ippoStateHooks により同一オブジェクト参照、挙動変更なし）。
// ================================================================

var _mrOverlayApi = null;

function _getMrOverlay() {
  if (!_mrOverlayApi) {
    _mrOverlayApi = window.createProOverlay({
      id: 'mr-pro-overlay',
      ariaLabel: '月次レポート',
      title: '月次レポート',
      subtitle: '月ごとの体調データを可視化',
      footer: [
        { id: 'mr-close-btn', label: '閉じる', cls: 'pob-btn pob-btn-secondary' },
        { id: 'mr-pdf-btn', label: 'PDF ダウンロード', cls: 'pob-btn pob-btn-primary' },
      ],
      onClose: closeMonthlyReport,
    });
    _mrOverlayApi.body.innerHTML =
      '<div class="mr-month-selector">' +
        '<button class="mr-month-btn" onclick="changeReportMonth(-1)">←</button>' +
        '<div class="mr-month-label" id="mrMonthLabel"></div>' +
        '<button class="mr-month-btn" onclick="changeReportMonth(1)">→</button>' +
      '</div>' +
      '<div id="monthlyReportBody"></div>';
    _mrOverlayApi.getButton('mr-close-btn').addEventListener('click', closeMonthlyReport);
    _mrOverlayApi.getButton('mr-pdf-btn').addEventListener('click', downloadReportPDF);
  }
  return _mrOverlayApi;
}

let reportYear = new Date().getFullYear();
let reportMonth = new Date().getMonth(); // 0-indexed

export function openMonthlyReport() {
  reportYear = new Date().getFullYear();
  reportMonth = new Date().getMonth();
  _getMrOverlay().open();
  updateMonthLabel();
  generateMonthlyReport();
}

export function closeMonthlyReport() {
  if (_mrOverlayApi) _mrOverlayApi.close();
}

export function changeReportMonth(delta) {
  reportMonth += delta;
  if (reportMonth > 11) { reportMonth = 0; reportYear++; }
  if (reportMonth < 0) { reportMonth = 11; reportYear--; }
  updateMonthLabel();
  generateMonthlyReport();
}

export function updateMonthLabel() {
  document.getElementById('mrMonthLabel').textContent = reportYear + '年' + (reportMonth + 1) + '月';
}

async function generateMonthlyReport() {
  const token = _mrOverlayApi ? _mrOverlayApi.nextToken() : null;
  const body = document.getElementById('monthlyReportBody');
  body.innerHTML = '<div class="mr-generating">データを読み込み中...</div>';

  try {
    const firstDay = new Date(reportYear, reportMonth, 1);
    const lastDay = new Date(reportYear, reportMonth + 1, 0);
    const fromDate = firstDay.toISOString().split('T')[0];
    const toDate = lastDay.toISOString().split('T')[0];
    const daysInMonth = lastDay.getDate();

    // ローカルから取得
    const records = window.state.records.filter(function(r) {
      var d = r.record_date || (r.date ? r.date.slice(0, 10) : '');
      return d >= fromDate && d <= toDate;
    }).map(function(r) {
      return { record_date: r.record_date || (r.date ? r.date.slice(0, 10) : ''), data: r };
    });

    if (records.length === 0) {
      body.innerHTML = '<div class="ds-empty">この月の記録はありません。</div>';
      return;
    }

    // 集計
    const totalDays = records.length;
    const emotionCounts = {};
    const symptomCounts = {};
    const temperatures = [];
    const fastingHours = [];
    let mealRecordDays = 0;
    let noteCount = 0;
    const scores = [];

    records.forEach(r => {
      const d = r.data || {};
      if (d.emotion) emotionCounts[d.emotion] = (emotionCounts[d.emotion] || 0) + 1;
      if (d.symptoms && d.symptoms.length > 0) {
        d.symptoms.forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; });
      }
      if (d.temperature) temperatures.push(parseFloat(d.temperature));
      if (d.meals && (d.meals.morning || d.meals.lunch || d.meals.dinner || d.meals.free || d.mealCount)) mealRecordDays++;
      if (d.note && d.note.trim()) noteCount++;
      if (d.score) scores.push(Number(d.score));
      if (d.firstMealTime && d.lastMealTime) {
        const first = d.firstMealTime.split(':').map(Number);
        const last = d.lastMealTime.split(':').map(Number);
        const eating = (last[0] * 60 + last[1]) - (first[0] * 60 + first[1]);
        if (eating > 0) fastingHours.push(24 - (eating / 60));
      }
    });

    let html = '';

    // プレビューカード
    html += '<div class="mr-preview">';
    html += '<div class="mr-preview-title">ippo 月次レポート</div>';
    html += '<div class="mr-preview-period">' + fromDate + ' 〜 ' + toDate + '</div>';

    // 統計グリッド
    html += '<div class="mr-stat-grid">';
    html += '<div class="mr-stat-box"><div class="mr-stat-num">' + totalDays + '</div><div class="mr-stat-label">記録日数 / ' + daysInMonth + '日</div></div>';
    html += '<div class="mr-stat-box"><div class="mr-stat-num">' + Math.round(totalDays / daysInMonth * 100) + '%</div><div class="mr-stat-label">記録率</div></div>';

    if (temperatures.length > 0) {
      const avgTemp = (temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(2);
      html += '<div class="mr-stat-box"><div class="mr-stat-num">' + avgTemp + '</div><div class="mr-stat-label">平均基礎体温 ℃</div></div>';
    }
    if (fastingHours.length > 0) {
      const avgFast = (fastingHours.reduce((a, b) => a + b, 0) / fastingHours.length).toFixed(1);
      html += '<div class="mr-stat-box"><div class="mr-stat-num">' + avgFast + '</div><div class="mr-stat-label">平均ファスティング h</div></div>';
    }
    if (scores.length > 0) {
      const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      html += '<div class="mr-stat-box"><div class="mr-stat-num">' + avgScore + '</div><div class="mr-stat-label">平均体調スコア</div></div>';
    }
    html += '<div class="mr-stat-box"><div class="mr-stat-num">' + mealRecordDays + '</div><div class="mr-stat-label">食事記録日</div></div>';
    html += '</div>';

       // ファスティングの達成率
    if (fastingHours.length > 0) {
      var longFast = fastingHours.filter(function(h){ return h >= 16; }).length;
      var shortFast = fastingHours.filter(function(h){ return h >= 12 && h < 16; }).length;
      var longPct = Math.round(longFast / fastingHours.length * 100);
      var shortPct = Math.round(shortFast / fastingHours.length * 100);
      html += '<div class="mr-chart-section">';
      html += '<div class="mr-chart-title">ファスティング 達成率</div>';
      html += '<div class="mr-bar-chart">';
      html += '<div class="mr-bar-row"><div class="mr-bar-label">16h+</div><div class="mr-bar-track"><div class="mr-bar-fill" style="width:' + longPct + '%;background:var(--rose);"></div></div><div class="mr-bar-count">' + longFast + '日 (' + longPct + '%)</div></div>';
      html += '<div class="mr-bar-row"><div class="mr-bar-label">12-16h</div><div class="mr-bar-track"><div class="mr-bar-fill" style="width:' + shortPct + '%;background:#f0c9a6;"></div></div><div class="mr-bar-count">' + shortFast + '日 (' + shortPct + '%)</div></div>';
      html += '</div></div>';
    }

    // 症状の週別推移
    if (Object.keys(symptomCounts).length > 0) {
      var weekSymptoms = [{},{},{},{}];
      records.forEach(function(r){
        var day = new Date(r.date).getDate();
        var weekIdx = Math.min(3, Math.floor((day - 1) / 7));
        (r.symptoms || []).forEach(function(s){
          weekSymptoms[weekIdx][s] = (weekSymptoms[weekIdx][s] || 0) + 1;
        });
      });
      html += '<div class="mr-chart-section">';
      html += '<div class="mr-chart-title">症状の週別推移</div>';
      html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:11px;">';
      ['第1週','第2週','第3週','第4週'].forEach(function(label, idx){
        var ws = weekSymptoms[idx];
        var top = Object.entries(ws).sort(function(a,b){ return b[1]-a[1]; }).slice(0,2);
        html += '<div style="background:var(--white);border-radius:10px;padding:10px;text-align:center;border:1px solid #f0ebe6;">';
        html += '<div style="font-weight:600;color:var(--ink);margin-bottom:4px;">' + label + '</div>';
        if(top.length > 0){
          top.forEach(function(t){ html += '<div style="color:var(--ink-light);">' + t[0] + ' ' + t[1] + '日</div>'; });
        } else {
          html += '<div style="color:var(--ink-light);">記録なし</div>';
        }
        html += '</div>';
      });
      html += '</div></div>';
    }

    // 感情棒グラフ
    if (Object.keys(emotionCounts).length > 0) {
      const maxEmotion = Math.max(...Object.values(emotionCounts));
      html += '<div class="mr-chart-section">';
      html += '<div class="mr-chart-title">感情・気分の傾向</div>';
      html += '<div class="mr-bar-chart">';
      Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]).forEach(([key, count]) => {
        const pct = Math.round(count / maxEmotion * 100);
        html += '<div class="mr-bar-row">';
        html += '<div class="mr-bar-label">' + key + '</div>';
        html += '<div class="mr-bar-track"><div class="mr-bar-fill" style="width:' + pct + '%"></div></div>';
        html += '<div class="mr-bar-count">' + count + '日</div>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    // 症状棒グラフ
    if (Object.keys(symptomCounts).length > 0) {
      const maxSymptom = Math.max(...Object.values(symptomCounts));
      html += '<div class="mr-chart-section">';
      html += '<div class="mr-chart-title">記録された症状</div>';
      html += '<div class="mr-bar-chart">';
      Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).forEach(([key, count]) => {
        const pct = Math.round(count / maxSymptom * 100);
        html += '<div class="mr-bar-row">';
        html += '<div class="mr-bar-label">' + key + '</div>';
        html += '<div class="mr-bar-track"><div class="mr-bar-fill" style="width:' + pct + '%"></div></div>';
        html += '<div class="mr-bar-count">' + count + '日</div>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    // サマリーテキスト
    html += '<div class="mr-summary-text">';
    html += reportYear + '年' + (reportMonth + 1) + '月は、' + daysInMonth + '日中 ' + totalDays + '日の記録がありました。';
    if (temperatures.length > 0) {
      const avgT = (temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(2);
      html += '基礎体温の平均は ' + avgT + '℃ でした。';
    }
    if (fastingHours.length > 0) {
      const avgF = (fastingHours.reduce((a, b) => a + b, 0) / fastingHours.length).toFixed(1);
      html += 'ファスティングは平均 ' + avgF + ' 時間を維持しました。';
    }
    html += '</div>';

    html += '</div>'; // mr-preview 閉じ

    if (token !== null && _mrOverlayApi.isStale(token)) return;
    body.innerHTML = html;

  } catch (err) {
    console.error('Monthly report error:', err);
    if (token === null || !_mrOverlayApi.isStale(token)) {
      body.innerHTML = '<div class="ds-empty">データの読み込みに失敗しました。</div>';
    }
  }
}

// PDF ダウンロード
export async function downloadReportPDF() {
  const btn = _mrOverlayApi ? _mrOverlayApi.getButton('mr-pdf-btn') : null;
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = 'PDF 生成中...';
  btn.style.pointerEvents = 'none';

  try {
    // jsPDF を動的に読み込み
    if (!window.jspdf) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // フォント設定（日本語対応のためシンプルなテキストベース）
    doc.setFontSize(18);
    doc.setTextColor(44, 36, 32);
    doc.text('ippo Monthly Report', 20, 25);

    doc.setFontSize(10);
    doc.setTextColor(154, 136, 128);
    const monthLabel = reportYear + '/' + String(reportMonth + 1).padStart(2, '0');
    doc.text(monthLabel, 20, 33);

    // 区切り線
    doc.setDrawColor(200, 180, 170);
    doc.line(20, 37, 190, 37);

    // レポート内容をテキストとして取得
    const preview = document.querySelector('.mr-preview');
    if (!preview) throw new Error('No report data');

    let y = 45;
    const lineHeight = 6;

    // 統計ボックスからデータ取得
    const statBoxes = preview.querySelectorAll('.mr-stat-box');
    if (statBoxes.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(44, 36, 32);
      doc.text('Summary', 20, y);
      y += 8;

      doc.setFontSize(10);
      statBoxes.forEach(box => {
        const num = box.querySelector('.mr-stat-num')?.textContent || '';
        const label = box.querySelector('.mr-stat-label')?.textContent || '';
        doc.setTextColor(44, 36, 32);
        doc.text(num, 25, y);
        doc.setTextColor(154, 136, 128);
        doc.text(' — ' + label, 25 + doc.getTextWidth(num) + 2, y);
        y += lineHeight;
      });
      y += 4;
    }

    // 棒グラフデータ
    const chartSections = preview.querySelectorAll('.mr-chart-section');
    chartSections.forEach(section => {
      const title = section.querySelector('.mr-chart-title')?.textContent || '';
      doc.setFontSize(12);
      doc.setTextColor(44, 36, 32);
      doc.text(title, 20, y);
      y += 8;

      const rows = section.querySelectorAll('.mr-bar-row');
      doc.setFontSize(9);
      rows.forEach(row => {
        const label = row.querySelector('.mr-bar-label')?.textContent || '';
        const count = row.querySelector('.mr-bar-count')?.textContent || '';
        doc.setTextColor(90, 74, 68);
        doc.text(label + ': ' + count, 25, y);
        y += 5;
      });
      y += 4;

      // ページ溢れ防止
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    // サマリーテキスト
    const summaryEl = preview.querySelector('.mr-summary-text');
    if (summaryEl) {
      y += 2;
      doc.setFontSize(10);
      doc.setTextColor(90, 74, 68);
      const summaryLines = doc.splitTextToSize(summaryEl.textContent, 165);
      doc.text(summaryLines, 20, y);
      y += summaryLines.length * 5 + 8;
    }

    // 免責
    doc.setFontSize(7);
    doc.setTextColor(180, 170, 165);
    doc.text('This report is generated by ippo. It is not a medical diagnosis.', 20, 285);
    doc.text('https://www.ippo-app.com', 20, 289);

    // ダウンロード
    doc.save('ippo-report-' + monthLabel + '.pdf');

    btn.textContent = 'ダウンロード完了 ✓';
    btn.style.background = '#8aab96';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
      btn.style.pointerEvents = '';
    }, 2000);

  } catch (err) {
    console.error('PDF generation error:', err);
    btn.textContent = 'PDF生成に失敗しました';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.pointerEvents = '';
    }, 2000);
  }
}
