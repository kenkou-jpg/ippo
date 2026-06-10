// src/modules/pain-scale.js
// Phase 4-C: renderPainScale を app-legacy.js から移植

export function renderPainScale(currentValue, fieldName) {
  var faces = [
    { icon: 'faceVeryGood', label: '痛みなし', v: 0 },
    { icon: 'faceGood',     label: '軽い',     v: 1 },
    { icon: 'faceNeutral',  label: '中程度',   v: 2 },
    { icon: 'faceBad',      label: '強い',     v: 3 },
    { icon: 'faceVeryBad',  label: 'とても強い', v: 4 }
  ];
  var ICONS = window.ICONS || {};
  var html = '<div style="display:flex;gap:6px;">';
  faces.forEach(function(f) {
    var isSelected = currentValue === f.v;
    var strokeColor = isSelected ? 'var(--rose)' : '#9a8e88';
    html += '<button onclick="selectBodyCheckItem(\'' + fieldName + '\',' + f.v + ',this)" '
      + 'style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;'
      + 'padding:8px 4px;border-radius:10px;border:1.5px solid '
      + (isSelected ? 'var(--rose)' : '#e8ddd8') + ';'
      + 'background:' + (isSelected ? 'var(--rose-pale)' : 'var(--white)') + ';'
      + 'cursor:pointer;transition:all 0.15s;">'
      + (ICONS[f.icon] ? ICONS[f.icon](22, strokeColor) : '')
      + '<span style="font-size:8px;color:' + (isSelected ? 'var(--rose)' : 'var(--ink-light)') + ';">'
      + f.label + '</span>'
      + '</button>';
  });
  html += '</div>';
  return html;
}

window.renderPainScale = renderPainScale;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('pain-scale-loaded');
}

export {};
