// ============================================================
//  ippo – home-next-recovery.js
//  PHASE 7: Recovery Journey + Emotional Climate + Seasonal
//
//  目的: 「流れ」「気候」「季節」を静かに提示する
//  - soft rhythm visualization (14-dot sparkline)
//  - emotionally safe tone
//  - data が少ない場合は何も出さない
// ============================================================

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\n/g, '<br>');
}

export function renderRecovery(container) {
  if (!container) return;
  // PHASE 1-D/1-E: 描画停止（recovery-journey・companion-intelligence のロジックは保持）
  container.innerHTML = '';
  return;

  const rj = window.ippoRecoveryJourney;
  const ci = window.ippoCompanionIntelligence;

  if (!rj || !ci) {
    container.innerHTML = '';
    return;
  }

  let ctx;
  try {
    const base = ci.getCompanionContext();
    if (!base) { container.innerHTML = ''; return; }
    ctx = rj.buildLifeRhythmContext(
      Object.assign({}, { records: base.recentRecords || [] }, base)
    );
  } catch (_) {
    container.innerHTML = '';
    return;
  }

  let journey  = null;
  let climate  = null;
  let seasonal = null;

  try { journey  = rj.generateRecoveryJourney(ctx);       } catch (_) {}
  try { climate  = rj.generateEmotionalClimate(ctx);      } catch (_) {}
  try { seasonal = rj.generateSeasonalObservation(ctx);   } catch (_) {}

  if (!journey && !climate && !seasonal) {
    container.innerHTML = '';
    return;
  }

  const journeyHtml = journey ? `
    <div class="hn-recovery-card hn-recovery-${_esc(journey.type)} hn-anim-4">
      <div class="hn-recovery-label">最近の流れ</div>
      <p class="hn-recovery-text">${_esc(journey.text)}</p>
      ${journey.dots ? `<div class="hn-rhythm-track" aria-hidden="true">${journey.dots}</div>` : ''}
    </div>` : '';

  const climateHtml = climate ? `
    <div class="hn-climate-card hn-climate-${_esc(climate.type)}">
      <p class="hn-climate-text">${_esc(climate.text)}</p>
    </div>` : '';

  const seasonalHtml = seasonal ? `
    <div class="hn-seasonal-card">
      <p class="hn-seasonal-text">${_esc(seasonal.text)}</p>
    </div>` : '';

  container.innerHTML = `
    <div class="hn-recovery-section hn-anim-4">
      ${journeyHtml}
      ${climateHtml}
      ${seasonalHtml}
    </div>`;
}

// ─── Gentle Experiment renderer ───────────────────────────

export function renderExperiment(container) {
  if (!container) return;

  const rj = window.ippoRecoveryJourney;
  const ci = window.ippoCompanionIntelligence;

  if (!rj || !ci) {
    container.innerHTML = '';
    return;
  }

  let ctx;
  try {
    const base = ci.getCompanionContext();
    if (!base) { container.innerHTML = ''; return; }
    ctx = rj.buildLifeRhythmContext(
      Object.assign({}, { records: base.recentRecords || [] }, base)
    );
  } catch (_) {
    container.innerHTML = '';
    return;
  }

  let exp = null;
  try { exp = rj.generateGentleExperiment(ctx); } catch (_) {}

  if (!exp) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="hn-experiment-card hn-anim-5">
      <p class="hn-experiment-text">${_esc(exp.text)}</p>
    </div>`;
}
