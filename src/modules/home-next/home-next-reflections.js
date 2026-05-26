// ============================================================
//  ippo – home-next-reflections.js
//  PHASE 6: Gentle Reflection Cards
//
//  目的: 「振り返り」のための静かな観察カード
//  - short / warm / emotionally safe
//  - 「答え」ではなく「気づき」を促す
//  - データが少ない場合は何も出さない
// ============================================================

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\n/g, '<br>');
}

export function renderReflections(container) {
  if (!container) return;

  const ci = window.ippoCompanionIntelligence;
  if (!ci) {
    container.innerHTML = '';
    return;
  }

  let context;
  try {
    context = ci.getCompanionContext();
  } catch (_) {
    container.innerHTML = '';
    return;
  }

  if (!context) {
    container.innerHTML = '';
    return;
  }

  let reflections = [];
  let suggestion  = null;

  try { reflections = ci.generateReflections(context); }  catch (_) { reflections = []; }
  try { suggestion  = ci.generateGentleSuggestion(context); } catch (_) { suggestion = null; }

  if (reflections.length === 0 && !suggestion) {
    container.innerHTML = '';
    return;
  }

  const refHtml = reflections.map(function(r) {
    return `<div class="hn-reflection-card hn-reflection-${_esc(r.type)}">
      <p class="hn-reflection-text">${_esc(r.text)}</p>
    </div>`;
  }).join('');

  const sugHtml = suggestion
    ? `<div class="hn-suggestion-card">
        <p class="hn-suggestion-text">${_esc(suggestion.text)}</p>
      </div>`
    : '';

  container.innerHTML = `
    <div class="hn-reflections hn-anim-3">
      ${refHtml}
      ${sugHtml}
    </div>`;
}
