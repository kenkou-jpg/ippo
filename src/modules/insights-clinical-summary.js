// ============================================================
//  ippo – insights-clinical-summary.js
//  インサイト > レポートタブ: Clinical Summary Layer
//  "観察結果" として記述、診断表現・警告UIは一切使わない
// ============================================================

import { getState }             from '../store/state.js';
import { getHomeConfiguration } from './home-next/home-next-config.js';

// ── 記録フィルター ────────────────────────────────────────

function getLastNDays(records, n) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - n);
  return (records || []).filter(r => {
    const d = new Date(r.date || r.record_date || '');
    return d >= cutoff && !isNaN(d);
  });
}

// ── 観察サマリー生成 ─────────────────────────────────────

function buildClinicalObservations(records, state, profileKey) {
  const month  = getLastNDays(records, 90);
  const recent = getLastNDays(records, 30);
  const week   = getLastNDays(records, 14);

  if (recent.length < 4) return [];

  const obs = [];

  // ── 全疾患共通: 痛み傾向 ──
  const painDays = recent.filter(r => (r.painLevel ?? 0) >= 2);
  if (painDays.length >= 3) {
    const avgPain = painDays.reduce((s, r) => s + r.painLevel, 0) / painDays.length;
    obs.push({
      category: '疼痛',
      text: `過去30日で${painDays.length}日、痛みの記録があります（平均スコア: ${avgPain.toFixed(1)}/10）`,
    });
  }

  // 生理前後の痛み悪化
  if (state.lastPeriodDate && state.cycleLength) {
    const cl   = state.cycleLength;
    const last = new Date(state.lastPeriodDate + 'T00:00:00');
    const prePeriodPain = recent.filter(r => {
      const d = new Date(r.date || r.record_date || '');
      const dayNum = Math.floor((d - last) / 86400000) + 1;
      return (cl - dayNum) <= 7 && (cl - dayNum) >= 0 && (r.painLevel ?? 0) >= 2;
    });
    if (prePeriodPain.length >= 2) {
      obs.push({ category: '周期', text: '月経前7日以内に疼痛スコアが増加する傾向があります' });
    }
  }

  // 睡眠×翌日の不調
  const sorted = [...recent].sort((a, b) =>
    new Date(a.date || a.record_date) - new Date(b.date || b.record_date)
  );
  let sleepPainCorr = 0, sleepPainTotal = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if ((sorted[i].sleepQuality ?? 0) >= 3) {
      sleepPainTotal++;
      if ((sorted[i + 1].painLevel ?? 0) >= 2) sleepPainCorr++;
    }
  }
  if (sleepPainTotal >= 3 && sleepPainCorr / sleepPainTotal >= 0.5) {
    const pct = Math.round(sleepPainCorr / sleepPainTotal * 100);
    obs.push({
      category: '睡眠',
      text: `睡眠が浅い日の翌日に不調スコアが上昇する傾向があります（${pct}%の確率で観察）`,
    });
  }

  // ── PCOS 固有 ──
  if (profileKey === 'pcos') {
    const fatigueDays = recent.filter(r =>
      (r.symptoms || []).some(s => ['倦怠感', 'だるさ', '食後の眠気'].includes(s))
    ).length;
    if (fatigueDays >= 5) {
      obs.push({ category: 'PCOS', text: `過去30日で${fatigueDays}日、食後の疲労感・眠気が記録されています` });
    }
    if (state.cycleIrregular || (state.cycleLength && state.cycleLength > 35)) {
      obs.push({ category: '周期', text: '月経周期が不規則な状態が継続しています' });
    }
  }

  // ── 子宮内膜症・子宮腺筋症 固有 ──
  if (['endometriosis', 'adenomyosis'].includes(profileKey)) {
    const highPainDays = recent.filter(r => (r.painLevel ?? 0) >= 3).length;
    if (highPainDays >= 3) {
      obs.push({ category: '疼痛', text: `過去30日で${highPainDays}日、強い痛み（スコア3以上）が記録されています` });
    }
    const bowelPain = recent.filter(r =>
      (r.symptoms || []).some(s => ['排便痛', '排便時の痛み'].includes(s))
    ).length;
    if (bowelPain >= 2) {
      obs.push({ category: '疼痛', text: `排便時の痛みが${bowelPain}日記録されています` });
    }
    const sexPain = recent.filter(r =>
      (r.symptoms || []).some(s => ['性交痛'].includes(s))
    ).length;
    if (sexPain >= 1) {
      obs.push({ category: '疼痛', text: '性交時の痛みが記録されています' });
    }
  }

  // ── 卵巣嚢腫 固有 ──
  if (profileKey === 'ovarian_cyst') {
    const tensionDays = recent.filter(r =>
      (r.symptoms || []).some(s => ['腹部膨満', 'お腹の張り', '下腹部の張り'].includes(s))
    ).length;
    if (tensionDays >= 3) {
      obs.push({ category: '腹部', text: `過去30日で${tensionDays}日、腹部膨満感・張りが記録されています` });
    }
  }

  // ── PMS/PMDD 固有 ──
  if (profileKey === 'pms') {
    const moodDays = recent.filter(r =>
      (r.symptoms || []).some(s => ['イライラ', '気分の落ち込み', '情緒不安定'].includes(s))
    ).length;
    if (moodDays >= 6) {
      obs.push({ category: '情緒', text: `過去30日で${moodDays}日、情緒的な症状が記録されています` });
    }
    // 生理前集中
    if (state.lastPeriodDate && state.cycleLength && moodDays >= 3) {
      obs.push({ category: '周期', text: '月経前5〜7日以内に情緒不安定スコアが上昇する傾向があります' });
    }
  }

  // ── 子宮筋腫 固有 ──
  if (profileKey === 'uterine_fibroid') {
    const heavyDays = recent.filter(r =>
      ['heavy', 'very_heavy'].includes(r.menstrualCycle || '')
    ).length;
    if (heavyDays >= 2) {
      obs.push({ category: '出血', text: `過去30日で${heavyDays}日、経血量が多い状態が記録されています` });
    }
    const ironDays = recent.filter(r =>
      (r.symptoms || []).some(s => ['めまい', '立ちくらみ', '動悸', '倦怠感'].includes(s))
    ).length;
    if (ironDays >= 4 && heavyDays >= 1) {
      obs.push({ category: '貧血', text: '経血量増加と倦怠感・めまいが同時期に記録されています' });
    }
  }

  // ── 全疾患共通: 疲労蓄積 ──
  const fatiguePersist = recent.filter(r =>
    (r.energy != null && r.energy <= 2) ||
    (r.symptoms || []).some(s => ['倦怠感', 'だるさ'].includes(s))
  ).length;
  if (fatiguePersist >= 8) {
    obs.push({ category: '疲労', text: `過去30日で${fatiguePersist}日、疲労感が記録されています` });
  }

  return obs.slice(0, 5);
}

// ── カテゴリーカラー ──────────────────────────────────────

const CAT_COLORS = {
  '疼痛': { bg: '#F5EDE3', color: '#B87F6A' },
  '周期': { bg: '#EEF3EB', color: '#5A8060' },
  '睡眠': { bg: '#EBF2F5', color: '#4A80A0' },
  '情緒': { bg: '#F0ECF5', color: '#8A6AC0' },
  '腹部': { bg: '#F5EDE3', color: '#C4946A' },
  '出血': { bg: '#F5ECF0', color: '#C07080' },
  '貧血': { bg: '#F5ECF0', color: '#C07080' },
  'PCOS': { bg: '#EEF3EB', color: '#9DB095' },
  '疲労': { bg: '#F0ECF0', color: '#8A8090' },
};

// ── プロファイルキー → 疾患名 ────────────────────────────

const PROFILE_NAMES = {
  endometriosis:   '子宮内膜症',
  pcos:            'PCOS',
  ovarian_cyst:    '卵巣嚢腫',
  pms:             'PMS/PMDD',
  uterine_fibroid: '子宮筋腫',
  adenomyosis:     '子宮腺筋症',
  menopause:       '更年期障害',
  chronic_pelvic_pain: '慢性骨盤痛',
  infertility:     '不妊症',
  default:         '',
};

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── メインレンダリング ────────────────────────────────────

export function renderInsClinicalSummary() {
  const container = document.getElementById('ins-clinical-summary');
  if (!container) return;

  const state      = getState();
  const records    = state.records || [];
  const diseases   = state.myDiseases || [];
  const config     = getHomeConfiguration(diseases);
  const profileKey = config.profileKey || 'default';
  const month30    = getLastNDays(records, 30);

  // 疾患未設定 or データ不足
  if (!diseases.length || month30.length < 4) {
    container.innerHTML = `
      <div style="background:rgba(255,255,255,0.88);border-radius:20px;padding:24px;border:1px solid rgba(0,0,0,0.03);box-shadow:0 1px 6px rgba(0,0,0,0.012);">
        <div style="font-size:10px;letter-spacing:0.1em;color:rgba(44,36,31,0.4);margin-bottom:10px;font-weight:500;">OBSERVATION SUMMARY</div>
        <div style="font-family:'Shippori Mincho',serif;font-size:16px;color:#2C241F;margin-bottom:10px;letter-spacing:-0.01em;">観察サマリー</div>
        <div style="font-size:12.5px;color:rgba(44,36,31,0.46);line-height:1.8;">
          ${!diseases.length
            ? '疾患を設定すると、あなたに合わせた観察サマリーを表示します。'
            : '記録を続けることで、傾向が見えてきます。（30日分の記録が集まると表示されます）'}
        </div>
        ${!diseases.length ? `<button onclick="if(typeof window.switchTab==='function')window.switchTab('settings',null)"
          style="margin-top:16px;display:inline-block;background:transparent;border:1px solid rgba(44,36,31,0.12);border-radius:12px;padding:10px 20px;font-size:12px;color:rgba(44,36,31,0.52);cursor:pointer;font-family:'Noto Sans JP',sans-serif;">
          設定で疾患を選ぶ →
        </button>` : ''}
      </div>`;
    return;
  }

  const observations = buildClinicalObservations(records, state, profileKey);
  const diseaseName  = PROFILE_NAMES[profileKey] || diseases[0] || '';

  const obsHtml = observations.length > 0
    ? observations.map(obs => {
        const style = CAT_COLORS[obs.category] || { bg: '#EEF3EB', color: '#6A9060' };
        return `<div style="display:flex;align-items:flex-start;gap:9px;padding:10px 0;border-bottom:1px solid rgba(44,36,31,0.04);">
          <span style="flex-shrink:0;font-size:9.5px;padding:2px 8px;border-radius:99px;background:${style.bg};color:${style.color};font-weight:500;line-height:1.6;margin-top:3px;">${esc(obs.category)}</span>
          <span style="font-size:12.5px;color:#2C241F;line-height:1.75;letter-spacing:-0.01em;">${esc(obs.text)}</span>
        </div>`;
      }).join('')
    : `<div style="font-size:12.5px;color:rgba(44,36,31,0.46);line-height:1.8;padding:10px 0;">現時点では特定のパターンは見られていません。記録を続けることで傾向が見えてきます。</div>`;

  container.innerHTML = `
    <div style="background:rgba(255,255,255,0.88);border-radius:20px;padding:24px;border:1px solid rgba(0,0,0,0.03);box-shadow:0 1px 6px rgba(0,0,0,0.012);">
      <div style="font-size:10px;letter-spacing:0.1em;color:rgba(44,36,31,0.4);margin-bottom:10px;font-weight:500;">OBSERVATION SUMMARY · ${esc(diseaseName.toUpperCase())}</div>
      <div style="font-family:'Shippori Mincho',serif;font-size:16px;color:#2C241F;margin-bottom:6px;letter-spacing:-0.01em;">観察サマリー</div>
      <div style="font-size:11.5px;color:rgba(44,36,31,0.46);line-height:1.7;margin-bottom:16px;">
        過去30日の記録から導いた観察結果です。「診断」ではなく「傾向」として参考にしてください。
      </div>
      <div style="display:flex;flex-direction:column;">${obsHtml}</div>
      <div style="margin-top:14px;padding:12px 14px;background:rgba(44,36,31,0.03);border-radius:12px;">
        <div style="font-size:10.5px;color:rgba(44,36,31,0.38);line-height:1.7;">
          このサマリーは記録データをもとにした観察です。症状の原因や治療の判断は必ず医師にご相談ください。
        </div>
      </div>
    </div>`;
}

// ── window 公開 ───────────────────────────────────────────

window.renderInsClinicalSummary = renderInsClinicalSummary;
