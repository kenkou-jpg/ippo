// ================================================================
//  ippo – src/modules/pro/pro-ux-enhancer.js
//  PRO UX 改善:
//    1. AIパターン解析: .ai-result の前に「今見えていること」3行サマリーを注入
//    2. ヘルス実験: 実験ゼロ状態で「何をする場所か」説明カードを注入
//
//  制約: state 読み取り専用。saveState / supabase / records 書き込み禁止。
// ================================================================

import './pro-ux-enhancer.css';

// ─── AI解析: 今見えていること サマリー計算 ──────────────────────
function _computeAISummary() {
  const s = typeof window.getState === 'function' ? window.getState() : null;
  if (!s) return null;

  const records = s.records || [];
  const now = new Date();
  const r90 = records.filter(r => {
    const d = new Date(r.date || r.record_date || '');
    return !isNaN(d.getTime()) && (now - d) / 86400000 <= 90;
  });

  if (r90.length < 3) return null;

  // 最多症状
  const symMap = {};
  r90.forEach(r => (r.symptoms || []).forEach(sym => { symMap[sym] = (symMap[sym] || 0) + 1; }));
  const topSym = Object.entries(symMap).sort((a, b) => b[1] - a[1])[0] ?? null;

  // 平均睡眠
  const sleepRecs = r90.filter(r => r.sleepHours > 0);
  const avgSleep = sleepRecs.length
    ? (sleepRecs.reduce((a, r) => a + r.sleepHours, 0) / sleepRecs.length).toFixed(1)
    : null;

  // 症状が強い日（痛みレベル4以上 or ウェルネス40以下）
  const flareDays = r90.filter(r => (r.painLevel >= 4) || (r.wellnessScore != null && r.wellnessScore <= 40)).length;

  return { topSym, avgSleep, flareDays, count: r90.length };
}

function _buildSummaryCard(data) {
  const lines = [];
  if (data.topSym) {
    lines.push(`もっとも多かった症状は <strong>${data.topSym[0]}</strong>（${data.topSym[1]}日）`);
  }
  if (data.avgSleep) {
    lines.push(`平均睡眠は <strong>${data.avgSleep}時間</strong> / 日`);
  }
  lines.push(
    data.flareDays > 0
      ? `症状が強めだった日は <strong>${data.flareDays}日</strong>`
      : '強い症状は見られませんでした'
  );

  const lineHtml = lines.map(l => `<div class="ai-ux-summary-line">・${l}</div>`).join('');
  return `<div class="ai-ux-summary">
    <div class="ai-ux-summary-label">今見えていること</div>
    ${lineHtml}
  </div>`;
}

function _enhanceAIAnalysis() {
  const body = document.getElementById('aiAnalysisBody');
  if (!body) return;

  const observer = new MutationObserver(() => {
    const result = body.querySelector('.ai-result');
    if (!result || body.querySelector('.ai-ux-summary')) return;

    const data = _computeAISummary();
    if (!data) return;

    result.insertAdjacentHTML('beforebegin', _buildSummaryCard(data));
  });

  observer.observe(body, { childList: true });
}

// ─── ヘルス実験: 空状態説明カード ───────────────────────────────
const _EXP_INTRO = `<div class="ai-ux-exp-intro">
  <div class="ai-ux-exp-intro-title">🧪 小さく試して、記録で確かめる場所です</div>
  <div class="ai-ux-exp-intro-body">「睡眠を増やしたら体調は良くなるか」「カフェインを控えると症状が変わるか」など、生活の変化を仮説として立てて、記録で結果を確かめられます。下のプリセットから気軽に始められます。</div>
</div>`;

function _enhanceExperiments() {
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1 || node.id !== 'expOverlay') continue;
        const aiBody = node.querySelector('.ai-body');
        if (!aiBody || aiBody.querySelector('.ai-ux-exp-intro')) continue;

        // 「進行中」「完了済み」セクションがなければ空状態
        const titles = [...aiBody.querySelectorAll('.pha-section-title')]
          .map(el => el.textContent.trim());
        const isEmpty = !titles.includes('進行中') && !titles.includes('完了済み');
        if (!isEmpty) continue;

        const firstTitle = aiBody.querySelector('.pha-section-title');
        if (firstTitle) firstTitle.insertAdjacentHTML('beforebegin', _EXP_INTRO);
      }
    }
  });

  observer.observe(document.body, { childList: true });
}

// ─── Init ────────────────────────────────────────────────────────
function _init() {
  _enhanceAIAnalysis();
  _enhanceExperiments();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _init, { once: true });
} else {
  _init();
}
